/**
 * HNSW (Hierarchical Navigable Small World) 索引实现
 * 用于高性能近似最近邻搜索的层次化图结构
 * 
 * 此实现特点:
 * 1. 采用函数式风格，避免嵌套函数结构
 * 2. 使用LRU缓存优化距离计算
 * 3. 支持距离计算的多种度量方式 (欧几里得、余弦、内积)
 * 4. 逻辑删除节点而非物理删除，减少内存碎片
 * 5. 使用分层搜索策略实现对数时间复杂度查询
 * 6. 针对JavaScript执行环境进行了优化
 * 
 * 性能考量:
 * - 时间复杂度: 构建O(n log n)，查询O(log n) 
 * - 空间复杂度: O(n * M * L)，其中M为最大连接数，L为平均层数
 * - 距离计算缓存用于减少重复计算
 * - 搜索参数ef和efConstruction可调整精度与速度的平衡
 */

// 导入所有距离计算函数
import {
  computeEuclideanDistance,
  computeCosineDistance,
  computeCosineSimilarity,
  computeInnerProduct
} from "../../../base/forMath/forGeometry/forVectors/forDistance.js";

// 导入HNSW辅助函数
import {
  createDistanceCache,
  getRandomLevel,
  createHNSWNode
} from "./forHNSWHelpers.js";

// 导入ID映射辅助函数
import {
  ensureNodeIdMapping
} from "./forHNSWIdMapping.js";

// 导入搜索函数
import {
  searchLayer,
  searchKNN,
  greedySearchLayer
} from "./forHNSWSearch.js";

// 导入优化函数
import {
  optimizeIndexConnectivity,
  calculateAvgConnections
} from "./forHNSWOptimize.js";

// 导入批量操作函数
import {
  batchInsertNodes
} from "./forHNSWBatch.js";

// 常量定义 - 调整参数与经典实现更接近
const DEFAULT_M = 32;                 // 默认连接数从16提高到32，接近经典实现
const DEFAULT_EF_CONSTRUCTION = 400;  // 构建时候选集从200提高到400，与经典实现构建过程动态候选数量一致
const DEFAULT_EF_SEARCH = 500;        // 搜索时候选集从200提高到500，与经典实现搜索过程动态候选数量一致
const DEFAULT_ML = 32;                // 最大层数从8提高到32，与经典实现的最大层级一致
const BOTTOM_LAYER_CONNECTIONS = 200; // 底层连接数，与经典实现底层的预期邻居数量一致

/**
 * 向指定层级中特定节点添加连接
 * @param {number} nodeId - 节点ID
 * @param {Array<number>} connectionIds - 要添加的连接节点ID数组
 * @param {number} level - 操作的层级
 * @param {Map} nodes - 节点存储
 * @param {number} M - 每层最大连接数
 * @param {Function} distanceFunc - 距离计算函数
 * @param {boolean} [preferNewConnections=false] - 是否优先保留新连接
 * @param {boolean} [forceAddAll=false] - 是否强制添加所有连接而不考虑M限制（底层特殊处理）
 */
export function addConnections(nodeId, connectionIds, level, nodes, M, distanceFunc, preferNewConnections = false, forceAddAll = false) {
  const node = nodes.get(nodeId);
  if (!node) return;
  
  // 如果没有要添加的连接，直接返回
  if (!connectionIds || connectionIds.length === 0) return;
  
  // 确保连接数组存在
  while (node.connections.length <= level) {
    node.connections.push([]);
  }
  
  const existingConnections = node.connections[level] || [];
  
  // 底层使用更大的连接数限制以提高召回率 - 参照经典实现的底层预期邻居数量
  const effectiveM = level === 0 ? BOTTOM_LAYER_CONNECTIONS : M;
  
  // 过滤有效的新连接
  const newConnectionIds = [];
  for (const connId of connectionIds) {
    // 跳过自连接或已存在的连接
    if (connId === nodeId || existingConnections.includes(connId)) continue;
    
    const connNode = nodes.get(connId);
    if (!connNode || connNode.deleted) continue;
    
    newConnectionIds.push(connId);
  }
  
  if (newConnectionIds.length === 0) return;
  
  // 合并现有连接和新连接
  let allConnections = [...existingConnections, ...newConnectionIds];
  
  // 如果超过了最大连接数且不是强制添加所有，需要筛选连接
  if (allConnections.length > effectiveM && !forceAddAll) {
    // 计算所有连接的距离
    const nodeVector = node.vector;
    const connectionDistances = [];
    
    for (const connId of allConnections) {
      const connNode = nodes.get(connId);
      if (!connNode || !connNode.vector) continue;
      
      try {
        const distance = distanceFunc(nodeVector, connNode.vector);
        connectionDistances.push({ id: connId, distance });
      } catch (error) {
        console.error('计算连接距离失败', error);
      }
    }
    
    // 按距离排序
    connectionDistances.sort((a, b) => a.distance - b.distance);
    
    // 使用与经典HNSW类似的连接筛选策略
    const selectedConnections = [];
    
    // 首先，保留一定比例最近的连接（贪心策略）
    const initialSelectCount = Math.min(Math.floor(effectiveM * 0.4), connectionDistances.length);
    for (let i = 0; i < initialSelectCount; i++) {
      selectedConnections.push(connectionDistances[i].id);
    }
    
    // 其次，使用算法选择能够提高图连通性的连接
    const remainingCandidates = connectionDistances.slice(initialSelectCount);
    
    for (const candidate of remainingCandidates) {
      if (selectedConnections.length >= effectiveM) break;
      
      const candidateNode = nodes.get(candidate.id);
      if (!candidateNode || !candidateNode.vector) continue;
      
      // 检查候选节点与已选节点的关系
      let shouldAdd = true;
      
      for (const selectedId of selectedConnections) {
        const selectedNode = nodes.get(selectedId);
        if (!selectedNode || !selectedNode.vector) continue;
        
        try {
          // 计算候选节点到已选节点的距离
          const distanceBetween = distanceFunc(candidateNode.vector, selectedNode.vector);
          
          // 采用经典HNSW实现的连接筛选条件：
          // 如果候选节点到某个已选节点的距离小于候选节点到当前节点的距离
          // 则该候选节点不会提供新的有效路径
          if (distanceBetween < candidate.distance) {
            shouldAdd = false;
            break;
          }
        } catch (error) {
          continue;
        }
      }
      
      if (shouldAdd) {
        selectedConnections.push(candidate.id);
      }
    }
    
    // 如果筛选后连接数量不足，继续添加最近的连接以确保充分利用连接额度
    if (selectedConnections.length < effectiveM) {
      for (const candidate of connectionDistances) {
        if (selectedConnections.length >= effectiveM) break;
        if (!selectedConnections.includes(candidate.id)) {
          selectedConnections.push(candidate.id);
        }
      }
    }
    
    // 最终连接集为筛选后的连接
    allConnections = selectedConnections;
  }
  
  // 更新节点的连接
  node.connections[level] = allConnections;
  
  // 建立双向连接 - 这是HNSW图结构的核心特性
  for (const connId of newConnectionIds) {
    const connNode = nodes.get(connId);
    if (!connNode) continue;
    
    // 确保连接节点的连接数组存在
    while (connNode.connections.length <= level) {
      connNode.connections.push([]);
    }
    
    // 如果邻居的连接中没有当前节点，添加它
    if (!connNode.connections[level].includes(nodeId)) {
      connNode.connections[level].push(nodeId);
      
      // 如果邻居的连接超过限制，也需要进行筛选
      if (connNode.connections[level].length > effectiveM && !forceAddAll) {
        // 递归调用以优化邻居的连接
        // 但传入false避免循环调用
        addConnections(connId, [], level, nodes, M, distanceFunc, false, false);
      }
    }
  }
}

/**
 * 向索引中插入新节点
 * @param {Float32Array} vector - 要插入的向量
 * @param {Object} [data] - 关联数据
 * @param {Map} nodes - 节点存储
 * @param {Object} entryPoint - 入口点
 * @param {number} M - 每层最大连接数
 * @param {number} ml - 最大层数
 * @param {number} efConstruction - 构建参数
 * @param {Function} distanceFunc - 距离计算函数
 * @param {Object} state - 状态对象 {maxId, maxLevel, nodeCount}
 * @returns {number} 插入节点的ID
 */
export function insertNode(vector, data, nodes, entryPoint, M, ml, efConstruction, distanceFunc, state) {
  try {
    // 防御性检查
    if (!vector || !Array.isArray(vector) && !(vector instanceof Float32Array)) {
      console.error('insertNode错误: 无效的向量数据', { vector });
      return null;
    }
    
    // 创建新节点
    const nodeId = state.maxId++;
    const level = getRandomLevel(ml);
    
    // 当前最大层级
    state.maxLevel = Math.max(state.maxLevel, level);
    
    // 创建节点对象
    const node = createHNSWNode(nodeId, vector, data, level);
    
    // 将节点添加到图中
    nodes.set(nodeId, node);
    state.nodeCount++;
    
    // 如果这是第一个节点，设置为入口点并返回
    if (entryPoint.id === null) {
      entryPoint.id = nodeId;
      entryPoint.level = level;
      return nodeId;
    }
    
    // 如果结点层级比当前最高层级还高，则需要更新入口点
    if (level > entryPoint.level) {
      entryPoint.id = nodeId;
      entryPoint.level = level;
    }
    
    // 从入口点开始，自顶向下遍历所有层级
    const q = { id: nodeId, vector };
    let currObj = { ...entryPoint };
    
    // 调整构建时的ef值，与经典实现对齐
    const effectiveEf = Math.max(efConstruction, M * 4); 
    
    // 自顶向下遍历层级
    for (let lc = Math.min(level, entryPoint.level); lc >= 0; lc--) {
      // 在当前层查找最近邻
      // 增加搜索的邻居数量以提高召回率
      const neighbors = searchLayer(
        q, 
        Math.min(effectiveEf, lc === 0 ? BOTTOM_LAYER_CONNECTIONS : M * 2), 
        effectiveEf,  
        lc, 
        nodes, 
        currObj, 
        distanceFunc
      );
      
      // 如果找到邻居，则与新结点建立连接
      if (neighbors.length > 0) {
        // 提取邻居IDs
        const neighborIds = neighbors.map(n => n.id);
        
        // 底层使用更多连接提高召回率
        const isBottomLayer = lc === 0;
        
        // 添加连接 - 确保双向连接
        addConnections(nodeId, neighborIds, lc, nodes, M, distanceFunc, true, isBottomLayer);
        
        // 更新当前节点，用于下一层搜索
        // 使用最近邻点作为入口点继续搜索
        currObj = { id: neighbors[0].id };
      }
    }
    
    return nodeId;
  } catch (error) {
    console.error('insertNode执行出错:', error);
    return null;
  }
}

/**
 * 从索引中删除节点 (标记删除，不物理移除)
 * @param {number} id - 要删除的节点ID
 * @param {Map} nodes - 节点存储
 * @param {Object} entryPoint - 入口点
 * @param {Object} state - 状态对象，包含 maxLevel 和 nodeCount
 * @returns {boolean} 删除是否成功
 */
export function removeNode(id, nodes, entryPoint, state) {
  const node = nodes.get(id);
  if (!node) return false;
  
  // 将节点标记为已删除
  node.deleted = true;
  state.nodeCount--;
  
  // 如果删除的是入口点，需要找新的入口点
  if (entryPoint.id === id) {
    // 查找新的入口点
    for (const [nodeId, node] of nodes.entries()) {
      if (!node.deleted && node.connections.length > entryPoint.level) {
        entryPoint.id = nodeId;
        entryPoint.level = node.connections.length - 1;
        break;
      }
    }
    
    // 如果没有合适的入口点，重置
    if (entryPoint.id === id) {
      entryPoint.id = null;
      entryPoint.level = -1;
      state.maxLevel = -1;
    }
  }
  
  return true;
}

/**
 * 获取索引当前状态统计
 * @param {Object} state - 状态对象
 * @param {Map} nodes - 节点存储
 * @param {Object} parameters - 参数对象
 * @returns {Object} 索引统计信息
 */
export function getStats(state, nodes, parameters) {
  return {
    nodeCount: state.nodeCount,
    maxLevel: state.maxLevel,
    totalNodes: nodes.size,
    parameters
  };
}

/**
 * 序列化索引数据
 * @param {Map} nodes - 节点存储
 * @param {Object} entryPoint - 入口点
 * @param {Object} state - 状态对象
 * @returns {Object} 可序列化的索引数据
 */
export function serializeIndex(nodes, entryPoint, state) {
  console.log(`开始序列化HNSW索引，节点数量: ${nodes.size}`);
  
  const serializedNodes = [];
  let validNodeCount = 0;
  
  // 序列化节点数据
  for (const node of nodes.values()) {
    if (node.deleted) continue; // 排除已删除节点
    
    try {
      // 验证节点数据的有效性
      if (!node.vector || node.vector.length === 0) {
        console.warn(`节点 ${node.id} 的向量数据无效，跳过该节点`);
        continue;
      }
      
      if (!node.connections || !Array.isArray(node.connections)) {
        console.warn(`节点 ${node.id} 的连接数据无效，跳过该节点`);
        continue;
      }
      
      serializedNodes.push({
        id: node.id,
        vector: Array.from(node.vector), // 将向量转为普通数组
        data: node.data,
        connections: node.connections.map(level => Array.from(level)) // 深拷贝连接数组
      });
      
      validNodeCount++;
    } catch (error) {
      console.error(`序列化节点 ${node.id} 时出错:`, error);
    }
  }
  
  console.log(`序列化完成，有效节点: ${validNodeCount}/${nodes.size}`);
  console.log(`入口点: ${JSON.stringify(entryPoint)}`);
  console.log(`索引状态: ${JSON.stringify(state)}`);
  
  const result = {
    nodes: serializedNodes,
    entryPoint: { ...entryPoint },
    state: { ...state }
  };
  
  return result;
}

/**
 * 从序列化数据还原索引
 * @param {Map} nodes - 目标节点存储
 * @param {Object} entryPoint - 目标入口点
 * @param {Object} state - 目标状态对象
 * @param {Object} data - 序列化的索引数据
 */
export function deserializeIndex(nodes, entryPoint, state, data) {
  console.log(`开始反序列化HNSW索引，节点数量: ${data.nodes ? data.nodes.length : 0}`);
  
  if (!data || !data.nodes || !Array.isArray(data.nodes)) {
    console.error('反序列化失败: 无效的节点数据');
    return false;
  }
  
  if (!data.entryPoint) {
    console.error('反序列化失败: 缺少入口点');
    return false;
  }
  
  if (!data.state) {
    console.error('反序列化失败: 缺少状态数据');
    return false;
  }
  
  // 清空现有数据
  nodes.clear();
  
  // 还原节点
  let restoredCount = 0;
  for (const nodeData of data.nodes) {
    try {
      if (!nodeData.vector || !Array.isArray(nodeData.vector)) {
        console.warn(`节点 ${nodeData.id} 的向量数据无效，跳过该节点`);
        continue;
      }
      
      const node = createHNSWNode(
        nodeData.id,
        new Float32Array(nodeData.vector),
        nodeData.data
      );
      
      if (!nodeData.connections || !Array.isArray(nodeData.connections)) {
        console.warn(`节点 ${nodeData.id} 的连接数据无效，设置为空连接`);
        node.connections = [];
      } else {
        node.connections = nodeData.connections.map(level => 
          Array.isArray(level) ? Array.from(level) : []
        );
      }
      
      nodes.set(node.id, node);
      restoredCount++;
    } catch (error) {
      console.error(`还原节点 ${nodeData.id} 时出错:`, error);
    }
  }
  
  console.log(`节点还原完成，成功还原 ${restoredCount}/${data.nodes.length} 个节点`);
  
  // 还原入口点和状态
  try {
    Object.assign(entryPoint, data.entryPoint);
    console.log(`入口点还原成功: ${JSON.stringify(entryPoint)}`);
  } catch (error) {
    console.error('还原入口点失败:', error);
    return false;
  }
  
  try {
    Object.assign(state, data.state);
    console.log(`状态还原成功: ${JSON.stringify(state)}`);
  } catch (error) {
    console.error('还原状态失败:', error);
    return false;
  }
  
  console.log('HNSW索引反序列化成功');
  return true;
}

/**
 * 计算查询向量与数据库向量之间的距离
 * @param {string} distanceName - 距离函数名称
 * @returns {Function} 距离计算函数
 */
export function getDistanceFunction(distanceName) {
  if (distanceName === 'euclidean') {
    return computeEuclideanDistance;
  } else if (distanceName === 'cosine') {
    // 直接使用余弦距离函数，它已经返回距离而非相似度
    return computeCosineDistance;
  } else if (distanceName === 'inner_product') {
    // 内积也是相似度，越大越相似，需要取负变为距离度量
    return (a, b) => -computeInnerProduct(a, b);
  } else {
    console.warn(`未知的距离函数: ${distanceName}, 使用默认的欧几里得距离`);
    return computeEuclideanDistance;
  }
}

/**
 * 创建HNSW索引
 * @param {Object} options - 配置选项
 * @returns {Object} HNSW索引实例
 */
export function createHNSWIndex({
  distanceFunction = 'cosine', // 使用余弦距离作为默认
  M = DEFAULT_M,
  efConstruction = DEFAULT_EF_CONSTRUCTION,
  efSearch = DEFAULT_EF_SEARCH,
  ml = DEFAULT_ML,
  useDistanceCache = true
} = {}) {
  // 参数安全检查和调整
  const effectiveM = Math.max(16, M);
  const effectiveEfConstruction = Math.max(200, efConstruction);
  const effectiveEfSearch = Math.max(200, efSearch);
  const effectiveMl = Math.max(16, ml);
  
  // 1. 初始化内部状态
  const nodes = new Map();
  const state = {
    maxId: 0,
    maxLevel: 0,
    nodeCount: 0,
    deletedCount: 0,
    distanceCalculations: 0
  };
  
  // 2. 设置距离函数
  let distanceFunc = getDistanceFunction(distanceFunction);
  
  // 3. 优化：如果启用了缓存，创建距离计算缓存
  if (useDistanceCache) {
    const originalDistanceFunc = distanceFunc;
    distanceFunc = createDistanceCache(originalDistanceFunc);
  }
  
  // 索引状态
  const entryPoint = { id: null, level: -1 };
  
  // 参数对象
  const parameters = {
    M: effectiveM,
    efConstruction: effectiveEfConstruction,
    efSearch: effectiveEfSearch,
    ml: effectiveMl
  };
  
  /**
   * 搜索K个最近邻节点
   * @param {Float32Array|Array} queryVector - 查询向量
   * @param {number} k - 返回的最近邻数量
   * @param {Object} [searchParams={}] - 搜索参数
   * @returns {Array<{id: number, distance: number, data: any}>} 最近邻节点列表
   */
  const searchKNNMethod = (queryVector, k = 10, searchParams = {}) => {
    if (!queryVector || k <= 0) {
      console.error('搜索参数无效', { queryVector, k });
      return [];
    }
    
    // 提取搜索参数
    const { 
      ef = null, 
      excludeIds = new Set(),
      debug = false
    } = searchParams || {};
    
    // 直接复制经典实现的逻辑 - hnswAnn搜索数据集
    // 使用Map存储结果以避免重复
    const resultMap = new Map();
    // 跟踪已尝试过的入口点
    const visitedEntryPoints = new Set();
    // 搜索尝试计数器
    let attemptCount = 0;
    
    // 设置有效的搜索参数
    const effectiveEf = ef || Math.max(efSearch, k * 3);
    
    // 类似经典实现的多次搜索循环
    while (resultMap.size < k && attemptCount < 3) {
      // 计算本轮需要的结果数量
      const neededResults = Math.ceil(Math.max(k * 1.5, effectiveEfSearch)) - resultMap.size;
      attemptCount++;
      
      // 选择入口点 - 首先使用全局入口点，然后尝试其他点
      let currentEntryPoint;
      
      if (attemptCount === 1) {
        // 第一次搜索使用全局入口点
        currentEntryPoint = entryPoint;
      } else {
        // 后续搜索尝试找未访问过的高层级节点
        // 从最高层级开始查找
        for (let level = state.maxLevel; level >= 0; level--) {
          let found = false;
          
          for (const [nodeId, node] of nodes.entries()) {
            if (!node.deleted && 
                node.connections.length > level && 
                !visitedEntryPoints.has(nodeId)) {
              currentEntryPoint = { id: nodeId, level };
              visitedEntryPoints.add(nodeId);
              found = true;
              break;
            }
          }
          
          if (found) break;
        }
        
        // 如果仍然找不到入口点，跳出循环
        if (!currentEntryPoint) break;
      }
      
      // 如果没有找到入口点，跳出循环
      if (!currentEntryPoint || !currentEntryPoint.id) break;
      
      // 记录已访问的入口点
      visitedEntryPoints.add(currentEntryPoint.id);
      
      // 执行单次搜索
      const searchResults = searchKNN(
        queryVector,
        nodes,
        currentEntryPoint,
        state.maxLevel,
        effectiveEfSearch,
        distanceFunc,
        neededResults,
        effectiveEf,
        new Set([...excludeIds, ...visitedEntryPoints]), // 排除已知的入口点
        { debug }
      );
      
      // 合并结果到结果Map
      if (searchResults && searchResults.length > 0) {
        for (const result of searchResults) {
          if (result && result.id) {
            resultMap.set(result.id, result);
          }
        }
      }
    }
    
    // 如果多次搜索后仍没有结果，尝试暴力搜索作为最后的手段
    if (resultMap.size === 0 && nodes.size > 0) {
      console.warn('常规搜索无结果，尝试暴力搜索');
      
      // 排除已知的节点
      const allExcludedIds = new Set([...excludeIds, ...visitedEntryPoints]);
      
      // 暴力搜索所有节点
      const bruteForceResults = [];
      
      for (const [nodeId, node] of nodes.entries()) {
        if (node.deleted || allExcludedIds.has(nodeId)) continue;
        
        try {
          const distance = distanceFunc(queryVector, node.vector);
          
          bruteForceResults.push({
            id: node.data?.id || nodeId,
            internalId: nodeId,
            distance,
            data: node.data
          });
        } catch (error) {
          continue;
        }
      }
      
      // 排序并返回前k个结果
      bruteForceResults.sort((a, b) => a.distance - b.distance);
      return bruteForceResults.slice(0, k);
    }
    
    // 转换结果为数组，并按距离排序
    const results = Array.from(resultMap.values())
      .sort((a, b) => a.distance - b.distance)
      .slice(0, k);
    
    return results;
  };
  
  return {
    insertNode: (vector, data = null) => insertNode(
      vector, data, nodes, entryPoint, effectiveM, effectiveMl, effectiveEfConstruction, distanceFunc, state
    ),
    
    searchKNN: searchKNNMethod,
    
    removeNode: (id) => removeNode(id, nodes, entryPoint, state),
    
    getNode: (id) => {
      const node = nodes.get(id);
      if (!node || node.deleted) return null;
      return { 
        id: node.id, 
        data: node.data,
        vector: node.vector ? new Float32Array(node.vector) : null
      };
    },
    
    getStats: () => {
      const stats = getStats(state, nodes, parameters);
      stats.avgConnectionsPerNode = calculateAvgConnections(nodes);
      return stats;
    },
    
    serialize: () => serializeIndex(nodes, entryPoint, state),
    restore: (data) => deserializeIndex(nodes, entryPoint, state, data),
    
    getNodeConnections: (id) => {
      const node = nodes.get(id);
      if (!node || node.deleted) return null;
      
      // 返回所有层级的连接
      return node.connections.map((levelConns, level) => {
        // 获取连接节点的详细信息
        const connections = [];
        for (const connId of levelConns) {
          const connNode = nodes.get(connId);
          if (connNode && !connNode.deleted) {
            connections.push({
              id: connId,
              data: connNode.data,
              // 计算距离
              distance: distanceFunc(node.vector, connNode.vector)
            });
          }
        }
        return { level, connections };
      });
    },
    
    // 验证索引结构
    validateConnections: () => {
      let bidirectionalCount = 0;
      let totalConnections = 0;
      let missingConnections = 0;
      
      // 遍历所有节点检查连接
      for (const [nodeId, node] of nodes.entries()) {
        if (node.deleted) continue;
        
        // 检查各层连接
        for (let level = 0; level < node.connections.length; level++) {
          const connections = node.connections[level];
          if (!connections) continue;
          
          for (const connId of connections) {
            totalConnections++;
            
            // 检查连接节点是否存在
            const connNode = nodes.get(connId);
            if (!connNode || connNode.deleted) {
              missingConnections++;
              continue;
            }
            
            // 检查是否有反向连接（双向连接检查）
            if (level < connNode.connections.length && 
                connNode.connections[level].includes(parseInt(nodeId))) {
              bidirectionalCount++;
            }
          }
        }
      }
      
      return {
        totalConnections,
        bidirectionalCount,
        bidirectionalRate: totalConnections > 0 ? bidirectionalCount / totalConnections : 0,
        missingConnections
      };
    },
    
    // 用于测试的内部属性
    _nodes: nodes,
    
    // 优化连接结构函数
    optimizeConnectivity: (options = {}) => optimizeIndexConnectivity(
      nodes, entryPoint, distanceFunc, effectiveM, state, options
    )
  };
}



