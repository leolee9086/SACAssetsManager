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
  computeInnerProduct
} from "../../../base/forMath/forGeometry/forVectors/forDistance.js";

// 导入最小堆实现
import { createMinHeap } from "../../../feature/useDataStruct/useHeaps/useMinHeap.js";

// 常量定义
const DEFAULT_M = 16;              // 每个节点最大连接数
const DEFAULT_EF_CONSTRUCTION = 200; // 构建时的候选集大小
const DEFAULT_EF_SEARCH = 50;      // 搜索时的候选集大小
const DEFAULT_ML = 16;            // 最大层数
const DEFAULT_DISTANCE_CACHE_SIZE = 100000; // 距离计算缓存大小

/**
 * 创建距离计算缓存器
 * 使用LRU策略缓存距离计算结果提高性能
 * @param {Function} distanceFunc - 距离计算函数
 * @param {number} cacheSize - 缓存大小
 * @returns {Function} 带缓存的距离函数
 */
export function createDistanceCache(distanceFunc, cacheSize = DEFAULT_DISTANCE_CACHE_SIZE) {
  const cache = new Map();
  const keyQueue = [];
  
  return function(a, b) {
    const id1 = a.id || a;
    const id2 = b.id || b;
    const key = `${id1}_${id2}`;
    const reverseKey = `${id2}_${id1}`;
    
    if (cache.has(key)) return cache.get(key);
    if (cache.has(reverseKey)) return cache.get(reverseKey);
    
    const distance = distanceFunc(a, b);
    
    // 缓存管理 (LRU)
    if (keyQueue.length >= cacheSize) {
      const oldestKey = keyQueue.shift();
      cache.delete(oldestKey);
    }
    
    // 使用 reverseKey 一致性存储，防止两种排序的键都存在
    const storeKey = id1 < id2 ? key : reverseKey;
    keyQueue.push(storeKey);
    cache.set(storeKey, distance);
    
    return distance;
  };
}

/**
 * 创建HNSW图节点
 * @param {number} id - 节点唯一ID
 * @param {Float32Array} vector - 向量数据
 * @param {Object} data - 关联元数据
 * @returns {Object} HNSW节点对象
 */
export function createHNSWNode(id, vector, data = null) {
  return {
    id,
    vector,
    data,
    connections: [], // 各层的连接: [[level0连接], [level1连接], ...]
    deleted: false   // 标记是否被删除
  };
}

/**
 * 获取随机层数
 * 实现分层策略，大多数节点在底层，少数节点在高层
 * @param {number} ml - 最大层数
 * @param {number} M - 每层最大连接数
 * @returns {number} - 随机层数
 */
export function getRandomLevel(ml, M) {
  const r = Math.random();
  return Math.floor(-Math.log(r) * (ml / Math.log(M)));
}

/**
 * 在指定层查找K个最近邻节点，使用最小堆优化
 * @param {Object} q - 查询节点
 * @param {number} k - 返回的邻居数量
 * @param {number} ef - 搜索候选集大小
 * @param {number} level - 搜索的层级
 * @param {Map} nodes - 节点存储
 * @param {Object} entryPoint - 入口点
 * @param {Function} distanceFunc - 距离计算函数
 * @param {Set<number>} [excludeIds] - 要排除的节点ID集合
 * @returns {Array<{id: number, distance: number}>} 最近邻节点列表
 */
export function searchLayer(q, k, ef, level, nodes, entryPoint, distanceFunc, excludeIds = new Set()) {
  if (!entryPoint || !entryPoint.id) return [];
  
  // 从入口点开始
  const ep = nodes.get(entryPoint.id);
  if (!ep || ep.deleted) return [];
  
  // 初始化已访问集
  const visited = new Set([ep.id]);
  
  // 计算到入口点的距离
  const distance = distanceFunc(q.vector, ep.vector);
  
  // 使用最小堆存储候选集 - 按距离从小到大排序
  const candidatesHeap = createMinHeap((a, b) => a.distance - b.distance);
  candidatesHeap.push({ id: ep.id, distance });
  
  // 使用最小堆存储结果集 - 按距离从小到大排序
  const resultsHeap = createMinHeap((a, b) => a.distance - b.distance);
  resultsHeap.push({ id: ep.id, distance });
  
  // 当候选集不为空时继续搜索
  while (candidatesHeap.size() > 0) {
    // 获取当前最近的候选节点
    const current = candidatesHeap.pop();
    
    // 如果当前候选的距离大于结果集中最远的距离，终止搜索
    if (resultsHeap.size() >= ef && current.distance > resultsHeap.getWorst().distance) {
      break;
    }
    
    // 获取节点并检查其连接
    const currentNode = nodes.get(current.id);
    if (!currentNode || currentNode.deleted) continue;
    
    // 检查当前层的连接
    const connections = currentNode.connections[level] || [];
    
    for (const neighborId of connections) {
      if (visited.has(neighborId) || excludeIds.has(neighborId)) continue;
      
      const neighbor = nodes.get(neighborId);
      if (!neighbor || neighbor.deleted) continue;
      
      visited.add(neighborId);
      const distance = distanceFunc(q.vector, neighbor.vector);
      
      // 判断是否应加入结果集
      const shouldAddToResults = resultsHeap.size() < ef || distance < resultsHeap.getWorst().distance;
      
      if (shouldAddToResults) {
        candidatesHeap.push({ id: neighborId, distance });
        resultsHeap.push({ id: neighborId, distance });
        
        // 保持结果集大小不超过ef
        if (resultsHeap.size() > ef) {
          resultsHeap.popWorst();
        }
      }
    }
  }
  
  // 转换为数组
  const results = [];
  while (resultsHeap.size() > 0) {
    results.push(resultsHeap.pop());
  }
  
  // 排序并返回前k个结果
  results.sort((a, b) => a.distance - b.distance);
  return results.slice(0, Math.min(k, results.length));
}

/**
 * 向指定层级中特定节点添加连接
 * @param {number} nodeId - 节点ID
 * @param {Array<number>} connectionIds - 要添加的连接节点ID数组
 * @param {number} level - 操作的层级
 * @param {Map} nodes - 节点存储
 * @param {number} M - 每层最大连接数
 * @param {Function} distanceFunc - 距离计算函数
 */
export function addConnections(nodeId, connectionIds, level, nodes, M, distanceFunc) {
  const node = nodes.get(nodeId);
  if (!node) return;
  
  // 确保连接数组存在
  while (node.connections.length <= level) {
    node.connections.push([]);
  }
  
  // 添加新连接
  const existingConnections = new Set(node.connections[level]);
  for (const connId of connectionIds) {
    if (connId === nodeId || existingConnections.has(connId)) continue;
    
    const connNode = nodes.get(connId);
    if (!connNode || connNode.deleted) continue;
    
    node.connections[level].push(connId);
    existingConnections.add(connId);
  }
  
  // 限制连接数量
  if (node.connections[level].length > M) {
    // 获取连接距离
    const connectionDistances = node.connections[level].map(connId => {
      const connNode = nodes.get(connId);
      return {
        id: connId,
        distance: distanceFunc(node.vector, connNode.vector)
      };
    });
    
    // 保留最近的M个连接
    connectionDistances.sort((a, b) => a.distance - b.distance);
    node.connections[level] = connectionDistances.slice(0, M).map(conn => conn.id);
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
export function insertNode(vector, data = null, nodes, entryPoint, M, ml, efConstruction, distanceFunc, state) {
  const nodeId = ++state.maxId;
  const level = getRandomLevel(ml, M);
  const newNode = createHNSWNode(nodeId, vector, data);
  
  // 初始化各层连接数组
  for (let i = 0; i <= level; i++) {
    newNode.connections.push([]);
  }
  
  nodes.set(nodeId, newNode);
  state.nodeCount++;
  
  // 如果是第一个节点
  if (entryPoint.id === null) {
    entryPoint.id = nodeId;
    entryPoint.level = level;
    state.maxLevel = level;
    return nodeId;
  }
  
  // 如果新节点层级高于当前最高层级，更新入口点
  if (level > state.maxLevel) {
    entryPoint.id = nodeId;
    entryPoint.level = level;
    state.maxLevel = level;
    return nodeId;
  }
  
  // 查找插入位置
  let currentNode = entryPoint;
  
  // 从最高层开始，找到合适的起点
  for (let lc = state.maxLevel; lc > level; lc--) {
    let changed = true;
    while (changed) {
      changed = false;
      
      // 获取当前节点的连接
      const currNodeObj = nodes.get(currentNode.id);
      if (!currNodeObj) break;
      
      const currConnections = currNodeObj.connections[lc] || [];
      
      // 遍历连接，查找更近的节点
      for (const connId of currConnections) {
        const connNode = nodes.get(connId);
        if (!connNode || connNode.deleted) continue;
        
        if (distanceFunc(newNode.vector, connNode.vector) < 
            distanceFunc(newNode.vector, currNodeObj.vector)) {
          currentNode = { id: connId, level: lc };
          changed = true;
          break;
        }
      }
    }
  }
  
  // 为每一层添加连接
  for (let lc = Math.min(level, state.maxLevel); lc >= 0; lc--) {
    // 在当前层查找ef个最近邻
    const neighbors = searchLayer(
      newNode, 
      lc === 0 ? efConstruction : M, 
      efConstruction, 
      lc,
      nodes,
      currentNode,
      distanceFunc
    );
    
    // 添加连接
    addConnections(
      nodeId, 
      neighbors.map(n => n.id),
      lc,
      nodes,
      M,
      distanceFunc
    );
    
    // 反向连接 (双向图)
    for (const neighbor of neighbors) {
      addConnections(
        neighbor.id, 
        [nodeId], 
        lc,
        nodes,
        M,
        distanceFunc
      );
    }
    
    // 更新当前节点为邻居中最近的节点
    if (neighbors.length > 0) {
      currentNode = { id: neighbors[0].id, level: lc };
    }
  }
  
  return nodeId;
}

/**
 * 搜索K个最近邻，使用最小堆优化
 * @param {Float32Array} queryVector - 查询向量
 * @param {Map} nodes - 节点存储
 * @param {Object} entryPoint - 入口点
 * @param {number} maxLevel - 最大层级
 * @param {number} efSearch - 搜索参数
 * @param {Function} distanceFunc - 距离计算函数
 * @param {number} [k=10] - 返回的邻居数量
 * @param {number} [ef] - 搜索参数，如果未提供则使用efSearch
 * @param {Set<number>} [excludeIds] - 要排除的节点ID集合
 * @returns {Array<{id: number, distance: number, node: Object}>} 最近邻结果
 */
export function searchKNN(queryVector, nodes, entryPoint, maxLevel, efSearch, distanceFunc, k = 10, ef = null, excludeIds = new Set()) {
  ef = ef || Math.max(efSearch, k);
  
  if (!entryPoint.id || nodes.size === 0) return [];
  
  // 创建查询节点
  const queryNode = { vector: queryVector };
  
  // 从顶层开始搜索
  let currentNode = entryPoint;
  
  // 自顶向下搜索 - 通过层次确定一个好的入口点
  for (let lc = maxLevel; lc > 0; lc--) {
    const neighbors = searchLayer(queryNode, 1, 1, lc, nodes, currentNode, distanceFunc, excludeIds);
    if (neighbors.length > 0) {
      currentNode = { id: neighbors[0].id, level: lc };
    }
  }
  
  // 底层进行精确搜索
  const results = searchLayer(queryNode, k, ef, 0, nodes, currentNode, distanceFunc, excludeIds);
  
  // 返回完整节点信息
  return results.map(r => {
    const node = nodes.get(r.id);
    if (!node || node.deleted) {
      return {
        id: r.id,
        distance: r.distance,
        node: null
      };
    }
    return {
      id: r.id,
      distance: r.distance,
      node: { ...node, vector: node.vector, data: node.data }
    };
  }).filter(r => r.node !== null);
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
 * 创建HNSW (Hierarchical Navigable Small World) 索引实现
 * 支持高性能近似最近邻搜索
 */
export function createHNSWIndex({
  distanceFunction = 'euclidean',
  M = DEFAULT_M,
  efConstruction = DEFAULT_EF_CONSTRUCTION,
  efSearch = DEFAULT_EF_SEARCH,
  ml = DEFAULT_ML,
  useDistanceCache = true
} = {}) {
  // 选择距离函数
  let rawDistanceFunc;
  
  switch (distanceFunction) {
    case 'euclidean':
      rawDistanceFunc = computeEuclideanDistance;
      break;
    case 'cosine':
      rawDistanceFunc = (a, b) => 1 - computeCosineDistance(a, b);
      break;
    case 'inner_product':
      rawDistanceFunc = (a, b) => -computeInnerProduct(a, b);
      break;
    default:
      rawDistanceFunc = computeEuclideanDistance;
  }
  
  // 通过缓存包装距离函数
  const distanceFunc = useDistanceCache 
    ? createDistanceCache(rawDistanceFunc) 
    : rawDistanceFunc;
  
  // 索引状态
  const nodes = new Map();
  const entryPoint = { id: null, level: -1 };
  const state = {
    maxLevel: -1,
    maxId: -1,
    nodeCount: 0
  };
  
  // 参数对象
  const parameters = {
    M,
    efConstruction,
    efSearch,
    ml
  };
  
  return {
    insertNode: (vector, data = null) => insertNode(
      vector, data, nodes, entryPoint, M, ml, efConstruction, distanceFunc, state
    ),
    
    searchKNN: (queryVector, k = 10, ef = null, excludeIds = new Set()) => searchKNN(
      queryVector, nodes, entryPoint, state.maxLevel, efSearch, distanceFunc, k, ef, excludeIds
    ),
    
    removeNode: (id) => removeNode(id, nodes, entryPoint, state),
    
    getStats: () => getStats(state, nodes, parameters),
    
    // 序列化和反序列化
    serialize: () => serializeIndex(nodes, entryPoint, state),
    restore: (data) => deserializeIndex(nodes, entryPoint, state, data),
    
    // 暴露一些内部引用以便DeltaPQ算法集成
    _nodes: nodes,
    _distanceFunc: distanceFunc,
    _getEntryPoint: () => entryPoint,
    _getRawDistanceFunc: () => rawDistanceFunc
  };
}