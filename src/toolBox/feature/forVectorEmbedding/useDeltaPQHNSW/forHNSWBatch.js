/**
 * HNSW批量操作模块
 * 提供批量插入和高性能批处理功能
 */

/**
 * 批量插入向量到索引中，比单个插入更高效
 * @param {Array<Float32Array>} vectors - 要插入的向量数组
 * @param {Array} [dataList] - 关联数据数组
 * @param {Map} nodes - 节点存储
 * @param {Object} entryPoint - 入口点
 * @param {number} M - 每层最大连接数
 * @param {number} ml - 最大层数
 * @param {number} efConstruction - 构建参数
 * @param {Function} distanceFunc - 距离计算函数
 * @param {Object} state - 状态对象 {maxId, maxLevel, nodeCount}
 * @param {number} [batchSize=10] - 每批处理的向量数量
 * @returns {Array<number>} 插入节点的ID数组
 */
export function batchInsertNodes(vectors, dataList = [], nodes, entryPoint, M, ml, efConstruction, distanceFunc, state, batchSize = 10) {
  if (!vectors || vectors.length === 0) return [];
  
  // 验证输入
  if (dataList && dataList.length > 0 && dataList.length !== vectors.length) {
    console.warn(`数据数组长度(${dataList.length})与向量数组长度(${vectors.length})不匹配，部分向量将没有关联数据`);
  }
  
  const nodeIds = [];
  const distanceCache = new Map(); // 路径距离缓存
  
  // 创建高效的距离缓存函数
  const cachedDistanceFunc = (v1, v2) => {
    // 使用向量ID或内存地址作为键
    const id1 = v1.id !== undefined ? v1.id : v1;
    const id2 = v2.id !== undefined ? v2.id : v2;
    
    // 确保id1 <= id2以避免重复键
    const [smallerId, largerId] = id1 <= id2 ? [id1, id2] : [id2, id1];
    const key = `${smallerId}_${largerId}`;
    
    if (distanceCache.has(key)) {
      return distanceCache.get(key);
    }
    
    const distance = distanceFunc(v1.vector || v1, v2.vector || v2);
    
    // 只缓存当前批次中的距离计算结果
    distanceCache.set(key, distance);
    return distance;
  };
  
  // 分批处理向量
  for (let i = 0; i < vectors.length; i += batchSize) {
    // 清空上一批次的距离缓存，避免缓存过大
    distanceCache.clear();
    
    // 当前批次的向量
    const batchVectors = vectors.slice(i, i + batchSize);
    const batchData = dataList.slice(i, i + batchSize);
    
    // 预计算当前批次内向量之间的距离，有助于提高批量插入效率
    for (let j = 0; j < batchVectors.length; j++) {
      for (let k = j + 1; k < batchVectors.length; k++) {
        const distance = distanceFunc(batchVectors[j], batchVectors[k]);
        const key = `${i + j}_${i + k}`;
        distanceCache.set(key, distance);
      }
    }
    
    // 处理当前批次的每个向量
    for (let j = 0; j < batchVectors.length; j++) {
      // 获取原始数据，如果有
      const originalData = j < batchData.length ? batchData[j] : null;
      
      // 确保数据对象存在，并包含正确的ID映射
      const enhancedData = originalData || {};
      
      // 如果是简单数据类型，转换为对象
      const nodeData = typeof enhancedData !== 'object' || enhancedData === null ? 
        { value: enhancedData } : { ...enhancedData };
      
      // 保存批量索引，可用于追踪数据来源
      nodeData.batchIndex = i + j;
      
      // 确保originalId存在
      if (nodeData.originalId === undefined) {
        // 如果有id字段，使用它作为originalId
        nodeData.originalId = nodeData.id !== undefined ? nodeData.id : (i + j);
      }
      
      // 保持id字段与originalId一致，以便兼容旧代码
      if (nodeData.id === undefined) {
        nodeData.id = nodeData.originalId;
      }
      
      const nodeId = insertNode(
        batchVectors[j],
        nodeData,  // 使用增强的数据对象
        nodes,
        entryPoint,
        M,
        ml,
        efConstruction,
        cachedDistanceFunc,
        state
      );
      nodeIds.push(nodeId);
      
      // 不再与所有现有节点计算距离，HNSW算法只需要计算搜索路径上的距离
    }
    
    // 每批次结束后输出进度信息
    if (vectors.length > batchSize) {
      const progress = Math.min(i + batchSize, vectors.length);
      console.log(`已处理 ${progress}/${vectors.length} 个向量 (${Math.round(progress/vectors.length*100)}%)`);
    }
  }
  
  return nodeIds;
}

/**
 * 批量搜索多个查询向量
 * @param {Array<Float32Array>} queryVectors - 查询向量数组
 * @param {number} k - 每个查询返回的最近邻数量
 * @param {Map} nodes - 节点存储
 * @param {Object} entryPoint - 入口点
 * @param {number} maxLevel - 最大层级
 * @param {number} efSearch - 搜索参数
 * @param {Function} distanceFunc - 距离计算函数
 * @param {Object} [options] - 搜索选项
 * @returns {Array<Array>} 每个查询的最近邻结果数组
 */
export function batchSearchKNN(queryVectors, k, nodes, entryPoint, maxLevel, efSearch, distanceFunc, options = {}) {
  if (!queryVectors || !Array.isArray(queryVectors) || queryVectors.length === 0) {
    return [];
  }
  
  const { 
    batchSize = 10,
    progressCallback = null,
    excludeIds = new Set()
  } = options;
  
  const results = [];
  const distanceCache = new Map();
  
  // 创建缓存距离函数
  const cachedDistanceFunc = (v1, v2) => {
    // 简单的缓存键生成策略
    const id1 = v1.id !== undefined ? v1.id : v1;
    const id2 = v2.id !== undefined ? v2.id : v2;
    
    // 检查是否可以缓存，仅对带ID的向量缓存
    if (typeof id1 !== 'number' || typeof id2 !== 'number') {
      return distanceFunc(v1.vector || v1, v2.vector || v2);
    }
    
    const [smallerId, largerId] = id1 <= id2 ? [id1, id2] : [id2, id1];
    const key = `${smallerId}_${largerId}`;
    
    if (distanceCache.has(key)) {
      return distanceCache.get(key);
    }
    
    const distance = distanceFunc(v1.vector || v1, v2.vector || v2);
    distanceCache.set(key, distance);
    
    return distance;
  };
  
  // 分批处理查询
  for (let i = 0; i < queryVectors.length; i += batchSize) {
    // 定期清空距离缓存避免内存占用过大
    if (distanceCache.size > 10000) {
      distanceCache.clear();
    }
    
    const batchQueries = queryVectors.slice(i, i + batchSize);
    const batchResults = [];
    
    // 处理每个查询
    for (let j = 0; j < batchQueries.length; j++) {
      const queryResult = searchKNN(
        batchQueries[j],
        nodes,
        entryPoint,
        maxLevel,
        efSearch,
        cachedDistanceFunc,
        k,
        null,
        excludeIds
      );
      
      batchResults.push(queryResult);
    }
    
    // 合并结果
    results.push(...batchResults);
    
    // 回调进度信息
    if (progressCallback && typeof progressCallback === 'function') {
      const progress = Math.min(i + batchSize, queryVectors.length);
      const percent = Math.round((progress / queryVectors.length) * 100);
      progressCallback(progress, queryVectors.length, percent);
    }
  }
  
  return results;
}

// 导入所需的函数
import { insertNode } from "./useCustomedHNSW.js";
import { searchKNN } from "./forHNSWSearch.js"; 