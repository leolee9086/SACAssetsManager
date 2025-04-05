/**
 * HNSW核心模块
 * 提供HNSW索引的主要接口和配置
 */

import { createHNSWNode, getRandomLevel } from './forHNSWNode.js';
import { insertNode, batchInsertNodes } from './forHNSWInsert.js';
import { searchKNN } from './forHNSWSearch.js';
import { 
  createDistanceCache, 
  computeEuclideanDistance, 
  computeCosineDistance,
  computeInnerProductDistance
} from './forHNSWDistance.js';
import { serializeIndex, deserializeIndex } from './forHNSWSerialization.js';

// 默认配置常量 - 全面优化以提高召回率和性能
export const DEFAULT_M = 24;              // 每个节点的最大连接数量，从16增加到24
export const DEFAULT_EF_CONSTRUCTION = 200; // 构建索引时的默认搜索宽度，从40大幅提高到200
export const DEFAULT_EF_SEARCH = 100;      // 搜索时的默认搜索宽度，从20大幅提高到100
export const DEFAULT_ML = 16;             // 默认最大层级
export const DEFAULT_DISTANCE_CACHE_SIZE = 50000; // 默认距离缓存大小，显著提高到50000
export const USE_HEURISTIC = true;        // 是否使用启发式连接选择

/**
 * 获取索引统计信息
 * @param {Map} nodes - 节点存储
 * @param {Object} entryPoint - 入口点
 * @returns {Object} 索引统计信息
 */
export function getStats(nodes, entryPoint) {
  // 计算实际节点数量（不包括已删除节点）
  let activeCount = 0;
  let deletedCount = 0;
  let maxConnections = 0;
  let totalConnections = 0;
  let connectionsPerNode = 0;
  
  for (const node of nodes.values()) {
    if (node.deleted) {
      deletedCount++;
    } else {
      activeCount++;
      
      // 统计连接信息
      let nodeConnections = 0;
      if (node.connections) {
        for (const levelConns of node.connections) {
          if (Array.isArray(levelConns)) {
            nodeConnections += levelConns.length;
            maxConnections = Math.max(maxConnections, levelConns.length);
          }
        }
      }
      totalConnections += nodeConnections;
    }
  }
  
  // 计算每节点平均连接数
  connectionsPerNode = activeCount > 0 ? totalConnections / activeCount : 0;
  
  // 统计层级分布
  const levelDistribution = new Map();
  for (const node of nodes.values()) {
    if (!node.deleted) {
      const level = node.connections ? node.connections.length - 1 : 0;
      levelDistribution.set(level, (levelDistribution.get(level) || 0) + 1);
    }
  }
  
  // 格式化层级分布
  const levelStats = Array.from(levelDistribution.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([level, count]) => ({
      level, 
      count, 
      percentage: Math.round((count / activeCount) * 10000) / 100
    }));
  
  return {
    totalNodes: nodes.size,
    activeNodes: activeCount,
    deletedNodes: deletedCount,
    entryPointId: entryPoint.id,
    entryPointLevel: entryPoint.level,
    maxConnections,
    avgConnectionsPerNode: Math.round(connectionsPerNode * 100) / 100,
    totalConnections,
    levelDistribution: levelStats,
    memoryUsageMB: estimateMemoryUsage(nodes) / (1024 * 1024)
  };
}

/**
 * 估算索引内存占用
 * @param {Map} nodes - 节点存储
 * @returns {number} 估算的内存占用（字节）
 */
function estimateMemoryUsage(nodes) {
  let totalBytes = 0;
  
  // Map本身的基础开销
  totalBytes += 16 * nodes.size; // Map每个键值对约16字节开销
  
  // 遍历所有节点
  for (const node of nodes.values()) {
    // 基本对象开销
    totalBytes += 56; // 对象基础开销约56字节
    
    // ID开销
    totalBytes += 8; // 数字类型8字节
    
    // 向量开销
    if (node.vector) {
      totalBytes += 24; // 数组基础开销约24字节
      totalBytes += node.vector.length * 4; // Float32Array每个元素4字节
    }
    
    // 连接数组开销
    if (node.connections) {
      totalBytes += 24; // 数组基础开销
      for (const levelConns of node.connections) {
        if (Array.isArray(levelConns)) {
          totalBytes += 24; // 数组基础开销
          totalBytes += levelConns.length * 8; // 每个ID 8字节
        }
      }
    }
    
    // 关联数据开销（粗略估计）
    if (node.data) {
      totalBytes += 100; // 假设关联数据平均100字节
    }
  }
  
  return totalBytes;
}

/**
 * 创建HNSW索引
 * @param {Object} options - 配置选项
 * @param {Function} [options.distanceFunction] - 自定义距离函数
 * @param {string} [options.distanceType='euclidean'] - 距离类型：'euclidean', 'cosine', 'innerProduct'
 * @param {boolean} [options.normalizeVectors=false] - 是否规范化向量（对于cosine和innerProduct很重要）
 * @param {number} [options.m=DEFAULT_M] - 每个节点的最大连接数
 * @param {number} [options.maxM=DEFAULT_M*2] - 基础层每个节点的最大连接数
 * @param {number} [options.maxLayers=DEFAULT_ML] - 最大层数
 * @param {number} [options.efConstruction=DEFAULT_EF_CONSTRUCTION] - 构建时的搜索宽度
 * @param {number} [options.efSearch=DEFAULT_EF_SEARCH] - 搜索时的默认搜索宽度
 * @param {number} [options.distanceCacheSize=DEFAULT_DISTANCE_CACHE_SIZE] - 距离缓存大小
 * @param {boolean} [options.delaunay=false] - 是否使用德劳内三角剖分启发式（实验性）
 * @returns {Object} HNSW索引对象
 */
export function createHNSWIndex(options = {}) {
  // 解构配置项并设置默认值
  const { 
    distanceFunction,
    distanceType = 'euclidean',
    normalizeVectors = false,
    m = DEFAULT_M,
    maxM = m * 2,
    maxLayers = DEFAULT_ML,
    efConstruction = DEFAULT_EF_CONSTRUCTION,
    efSearch = DEFAULT_EF_SEARCH,
    distanceCacheSize = DEFAULT_DISTANCE_CACHE_SIZE,
    delaunay = false
  } = options;
  
  // 节点存储
  const nodes = new Map();
  
  // 入口点
  const entryPoint = { id: null, level: 0 };
  
  // 确定距离函数
  let baseDistanceFunc;
  
  if (distanceFunction) {
    // 使用自定义距离函数
    baseDistanceFunc = distanceFunction;
  } else {
    // 使用内置距离函数
    switch (distanceType.toLowerCase()) {
      case 'cosine':
        baseDistanceFunc = computeCosineDistance;
        break;
      case 'innerproduct':
        baseDistanceFunc = computeInnerProductDistance;
        break;
      case 'euclidean':
      default:
        baseDistanceFunc = computeEuclideanDistance;
        break;
    }
  }
  
  // 创建带缓存的距离函数
  const { getDistance, getStats: getDistanceStats } = createDistanceCache(baseDistanceFunc, distanceCacheSize);
  
  /**
   * 添加单个向量到索引
   * @param {Float32Array|Array<number>} vector - 要添加的向量
   * @param {*} [data=null] - 与向量关联的数据
   * @returns {number} 插入节点的ID
   */
  function addItem(vector, data = null) {
    // 验证向量
    if (!vector || vector.length === 0) {
      throw new Error('无效的向量数据');
    }
    
    // 向量预处理
    let processedVector = vector;
    if (normalizeVectors) {
      processedVector = normalizeVector(vector);
    }
    
    // 生成节点ID
    const nodeId = nodes.size > 0 ? Math.max(...nodes.keys()) + 1 : 1;
    
    // 随机分配层级
    const level = getRandomLevel(maxLayers);
    
    // 创建节点
    const node = createHNSWNode(nodeId, processedVector, data, level);
    
    // 插入节点
    const newEntryPoint = insertNode(
      node,
      nodes,
      entryPoint,
      entryPoint.level,
      maxLayers,
      m,
      maxM,
      efConstruction,
      getDistance,
      distanceCacheSize
    );
    
    // 更新入口点
    if (newEntryPoint.id !== entryPoint.id || newEntryPoint.level !== entryPoint.level) {
      entryPoint.id = newEntryPoint.id;
      entryPoint.level = newEntryPoint.level;
    }
    
    return nodeId;
  }
  
  /**
   * 批量添加向量到索引
   * @param {Array<Float32Array|Array<number>>} vectors - 要添加的向量数组
   * @param {Array} [dataList=null] - 与向量关联的数据数组
   * @param {Function} [progressCallback] - 进度回调函数
   * @returns {Array<number>} 插入节点的ID数组
   */
  function addItems(vectors, dataList = null, progressCallback = null) {
    if (!vectors || vectors.length === 0) {
      return [];
    }
    
    // 验证数据长度匹配
    if (dataList && dataList.length !== vectors.length) {
      throw new Error(`数据数组长度(${dataList.length})与向量数组长度(${vectors.length})不匹配`);
    }
    
    // 预处理所有向量
    const processedVectors = normalizeVectors ? 
      vectors.map(v => normalizeVector(v)) : 
      vectors;
    
    // 准备批量节点
    const batchNodes = [];
    const startId = nodes.size > 0 ? Math.max(...nodes.keys()) + 1 : 1;
    
    for (let i = 0; i < processedVectors.length; i++) {
      const nodeId = startId + i;
      const level = getRandomLevel(maxLayers);
      const node = createHNSWNode(
        nodeId, 
        processedVectors[i], 
        dataList ? dataList[i] : null,
        level
      );
      batchNodes.push(node);
    }
    
    // 批量插入
    const newEntryPoint = batchInsertNodes(
      batchNodes,
      nodes,
      entryPoint,
      entryPoint.level,
      maxLayers,
      m,
      maxM,
      efConstruction,
      getDistance,
      distanceCacheSize,
      progressCallback
    );
    
    // 更新入口点
    if (newEntryPoint.id !== entryPoint.id || newEntryPoint.level !== entryPoint.level) {
      entryPoint.id = newEntryPoint.id;
      entryPoint.level = newEntryPoint.level;
    }
    
    return batchNodes.map(node => node.id);
  }
  
  /**
   * 搜索K个最近邻
   * @param {Float32Array|Array<number>} queryVector - 查询向量
   * @param {number} [k=10] - 返回的邻居数量
   * @param {number} [ef=null] - 搜索参数，如果未提供则使用efSearch
   * @returns {Array<{id: number, distance: number, data: *}>} 查询结果
   */
  function searchKnn(queryVector, k = 10, ef = null) {
    if (!queryVector || queryVector.length === 0) {
      throw new Error('无效的查询向量');
    }
    
    if (nodes.size === 0 || !entryPoint.id) {
      return [];
    }
    
    // 向量预处理
    let processedVector = queryVector;
    if (normalizeVectors) {
      processedVector = normalizeVector(queryVector);
    }
    
    // 确定ef值
    const effectiveEf = ef || Math.max(efSearch, k);
    
    // 执行KNN搜索
    const searchResults = searchKNN(
      processedVector,
      nodes,
      entryPoint,
      entryPoint.level,
      effectiveEf,
      getDistance,
      k,
      effectiveEf
    );
    
    // 格式化结果
    return searchResults.map(result => ({
      id: result.id,
      distance: result.distance,
      data: result.node ? result.node.data : null
    }));
  }
  
  /**
   * 获取节点数据
   * @param {number} id - 节点ID
   * @returns {*} 节点关联数据或null
   */
  function getItem(id) {
    const node = nodes.get(id);
    if (!node || node.deleted) {
      return null;
    }
    return node.data;
  }
  
  /**
   * 检查节点是否存在
   * @param {number} id - 节点ID
   * @returns {boolean} 存在且未删除返回true
   */
  function hasItem(id) {
    const node = nodes.get(id);
    return node && !node.deleted;
  }
  
  /**
   * 标记节点为已删除
   * @param {number} id - 节点ID
   * @returns {boolean} 操作是否成功
   */
  function removeItem(id) {
    const node = nodes.get(id);
    if (!node) {
      return false;
    }
    
    // 标记为已删除
    node.deleted = true;
    
    // 如果是入口点，重置入口点
    if (entryPoint.id === id) {
      let newEntryId = null;
      let maxLevel = 0;
      
      // 查找新的最高级节点
      for (const [nodeId, node] of nodes.entries()) {
        if (!node.deleted && node.level > maxLevel) {
          newEntryId = nodeId;
          maxLevel = node.level;
        }
      }
      
      // 更新入口点
      if (newEntryId !== null) {
        entryPoint.id = newEntryId;
        entryPoint.level = maxLevel;
      } else {
        // 如果没有节点，重置入口点
        entryPoint.id = null;
        entryPoint.level = 0;
      }
    }
    
    return true;
  }
  
  /**
   * 规范化向量
   * @param {Float32Array|Array<number>} vector - 输入向量
   * @returns {Float32Array} 规范化后的向量
   */
  function normalizeVector(vector) {
    // 计算向量长度
    let sum = 0;
    for (let i = 0; i < vector.length; i++) {
      sum += vector[i] * vector[i];
    }
    const norm = Math.sqrt(sum);
    
    // 避免除零错误
    if (norm === 0) {
      return vector instanceof Float32Array ? 
        new Float32Array(vector.length) : 
        Array(vector.length).fill(0);
    }
    
    // 创建结果向量
    const result = vector instanceof Float32Array ? 
      new Float32Array(vector.length) : 
      new Array(vector.length);
    
    // 规范化
    for (let i = 0; i < vector.length; i++) {
      result[i] = vector[i] / norm;
    }
    
    return result;
  }
  
  return {
    // 添加操作
    addItem,
    addItems,
    
    // 搜索操作
    searchKnn,
    
    // 数据管理
    getItem,
    hasItem,
    removeItem,
    
    // 序列化/反序列化
    serialize: () => serializeIndex(nodes, entryPoint),
    
    // 统计和诊断信息
    getStats: () => getStats(nodes, entryPoint),
    getDistanceStats,
    
    // 用于测试和调试的方法
    _internals: {
      nodes,
      entryPoint,
      getDistance
    }
  };
}

/**
 * 从序列化数据加载HNSW索引
 * @param {Object} serializedData - 序列化的索引数据
 * @param {Object} options - 配置选项，与createHNSWIndex相同
 * @returns {Object} 重新加载的HNSW索引对象
 */
export function loadHNSWIndex(serializedData, options = {}) {
  if (!serializedData || !serializedData.nodes || !serializedData.entryPoint) {
    throw new Error('无效的序列化数据');
  }
  
  // 创建一个基础索引
  const index = createHNSWIndex(options);
  
  // 反序列化
  const { nodes, entryPoint } = deserializeIndex(serializedData);
  
  // 替换内部数据
  index._internals.nodes.clear();
  for (const [id, node] of nodes.entries()) {
    index._internals.nodes.set(id, node);
  }
  
  index._internals.entryPoint.id = entryPoint.id;
  index._internals.entryPoint.level = entryPoint.level;
  
  return index;
} 