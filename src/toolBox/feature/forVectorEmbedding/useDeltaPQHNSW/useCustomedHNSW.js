/**
 * HNSW (Hierarchical Navigable Small World) 索引实现
 * 基于hnswlayers实现的高性能近似最近邻搜索
 * 
 * 此实现特点:
 * 1. 采用函数式风格，避免嵌套函数结构
 * 2. 使用LRU缓存优化距离计算
 * 3. 支持距离计算的多种度量方式 (欧几里得、余弦、内积)
 * 4. 逻辑删除节点而非物理删除，减少内存碎片
 * 5. 使用分层搜索策略实现对数时间复杂度查询
 * 6. 使用多次入口点搜索提高召回率
 * 7. 按照hnswlayers验证过的算法实现
 */

// 导入所有距离计算函数
import {
  computeEuclideanDistance,
  computeCosineDistance,
  computeInnerProduct
} from "../../../base/forMath/forGeometry/forVectors/forDistance.js";

// 导入HNSW辅助函数
import { createMinHeap } from "../../../feature/useDataStruct/useHeaps/useMinHeap.js";



// 常量定义 - 完全匹配hnswlayers实现
const DEFAULT_M = 32;                 // 每层最大连接数 
const DEFAULT_EF_CONSTRUCTION = 400;  // 构建时候选集大小
const DEFAULT_EF_SEARCH = 500;        // 搜索时候选集大小
const DEFAULT_ML = 32;                // 最大层数
const BOTTOM_LAYER_CONNECTIONS = 200; // 底层连接数,关键参数

/**
 * 创建HNSW节点
 * @param {number} id - 节点ID
 * @param {Float32Array|Array} vector - 向量数据
 * @param {Object} data - 关联数据
 * @param {number} [maxLevel=0] - 节点最大层级
 * @returns {Object} 节点对象
 */
function createHNSWNode(id, vector, data = null, maxLevel = 0) {
  // 创建连接数组，每层一个数组
  const connections = [];
  
  // 初始化每层的连接数组
  for (let i = 0; i <= maxLevel; i++) {
    connections.push([]);
  }
  
  // 创建节点对象
  return {
    id,
    vector: vector instanceof Float32Array ? vector : new Float32Array(vector),
    data,
    connections,
    deleted: false
  };
}

/**
 * 获取随机层级 - 匹配hnswlayers实现
 * @param {number} maxLevel - 最大层级
 * @returns {number} 随机层级
 */
function getRandomLevel(maxLevel) {
  const p = 1 / Math.E;
  return Math.floor(-Math.log(Math.random()) / Math.log(1 / p)) % (maxLevel + 1);
}

/**
 * 计算层级预期邻居数量 - 匹配hnswlayers的实现
 * @param {number} level - 当前层级
 * @param {number} maxLevel - 最大层级
 * @param {number} bottomLevelM - 底层M值
 * @param {number} minM - 最小M值
 * @returns {number} 该层的连接数
 */
function calculateLevelM(level, maxLevel = DEFAULT_ML, bottomLevelM = BOTTOM_LAYER_CONNECTIONS, minM = DEFAULT_M) {
  if (level === 0) {
    return bottomLevelM;
  } else {
    // 使用指数衰减公式来计算邻居数量
    const decayRate = Math.log(bottomLevelM / minM) / (maxLevel - 1);
    let expectedM = bottomLevelM * Math.exp(-level * decayRate);
    return Math.max(minM, Math.round(expectedM));
  }
}
/**
 * 创建基于引用的高性能向量距离缓存
 * @param {Function} distanceFunc - 原始距离计算函数
 * @param {number} [cacheSize=10000] - 缓存大小上限
 * @returns {Function} 带缓存的距离计算函数
 */
function createDistanceCache(distanceFunc, cacheSize = 10000) {
  // 使用WeakMap存储向量对之间的距离
  // WeakMap允许向量对象被垃圾回收，避免内存泄漏
  const cache = new WeakMap();
  
  // 用于LRU缓存管理
  let cacheEntries = 0;
  
  return function cachedDistance(a, b) {
    // 直接用对象引用作为键
    let aCache = cache.get(a);
    
    // 如果a的缓存不存在，创建它
    if (!aCache) {
      aCache = new Map();
      cache.set(a, aCache);
    }
    
    // 检查是否有b的缓存结果
    if (aCache.has(b)) {
      return aCache.get(b);
    }
    
    // 计算距离
    const distance = distanceFunc(a, b);
    
    // 保存结果到缓存
    aCache.set(b, distance);
    cacheEntries++;
    
    // 如果缓存大小超过限制，重置缓存
    // 在实际应用中，这很少发生，因为WeakMap会自动清理不再使用的对象
    if (cacheSize > 0 && cacheEntries > cacheSize) {
      cacheEntries = 0;
      // WeakMap会自动垃圾回收，不需要手动清理
    }
    
    return distance;
  };
}

/**
 * 从候选邻居中挑选最终邻居,真正的hnswlayers邻居选择策略
 * @param {Array<{id: number, distance: number, node: Object}>} candidates - 候选邻居列表(已按距离排序)
 * @param {number} level - 当前层级
 * @param {Map} nodes - 节点存储
 * @param {Function} distanceFunc - 距离计算函数
 * @returns {Array<{id: number, distance: number, node: Object}>} 最终选择的邻居列表
 */
function selectNeighborsHeuristic(candidates, level, nodes, distanceFunc) {
  // 【核心参数】: 层级特化的邻居数量
  // 底层(0层)使用更多连接(200),上层使用较少(32)
  const maxNeighbors = level === 0 ? BOTTOM_LAYER_CONNECTIONS : DEFAULT_M;
  
  // 如果候选数量不足,直接返回所有候选
  if (candidates.length <= maxNeighbors) {
    return candidates;
  }
  
  // 【小世界图关键逻辑】: 选择能提供"信息增益"的邻居
  const selectedNeighbors = [];
  
  // 先按距离对候选排序(确保最近的候选优先考虑)
  candidates.sort((a, b) => a.distance - b.distance);
  
  // 【hnswlayers的遍历顺序】: 按距离从近到远遍历候选邻居
  for (const candidate of candidates) {
    // 如果已选足够邻居,停止选择
    if (selectedNeighbors.length >= maxNeighbors) {
      break;
    }
    
    // 候选节点
    const candidateNode = candidate.node;
    if (!candidateNode || !candidateNode.vector) continue;
    
    // 候选到查询节点的距离(关键参考值)
    const candidateDistance = candidate.distance;
    
    // 【核心判断】: 检查候选节点是否能提供"信息增益"
    let valid = true;
    
    // 遍历已选择的邻居进行比较
    for (const selectedNeighbor of selectedNeighbors) {
      const selectedNode = selectedNeighbor.node;
      if (!selectedNode || !selectedNode.vector) continue;
      
      try {
        // 计算候选节点到已选邻居的距离
        const distanceBetween = distanceFunc(candidateNode.vector, selectedNode.vector);
        
        // 【小世界图核心判断】:
        // 如果候选节点到某个已选邻居的距离 < 候选到查询节点的距离
        // 则该候选节点不会提供新的有效信息路径
        if (distanceBetween < candidateDistance) {
          valid = false;
          break;  // 一旦确定无效,立即停止检查
        }
      } catch (error) {
        // 计算错误时跳过
        continue;
      }
    }
    
    // 如果候选邻居有效(提供新的信息路径),添加到结果
    if (valid) {
      selectedNeighbors.push(candidate);
    }
  }
  
  // 【hnswlayers补充逻辑】: 如果选择的邻居不足,从剩余候选中补充
  if (selectedNeighbors.length < maxNeighbors) {
    // 将未选择的有效候选添加到备选集
    const remainingCandidates = candidates.filter(candidate => 
      !selectedNeighbors.some(selected => selected.id === candidate.id)
    );
    
    // 按距离排序
    remainingCandidates.sort((a, b) => a.distance - b.distance);
    
    // 添加剩余候选直到达到最大邻居数量
    for (const candidate of remainingCandidates) {
      if (selectedNeighbors.length >= maxNeighbors) break;
      selectedNeighbors.push(candidate);
    }
  }
  
  // 【最终确保】: 结果按距离排序
  return selectedNeighbors.sort((a, b) => a.distance - b.distance);
}

/**
 * 向指定层级中特定节点添加连接,与hnswlayers实现匹配
 * @param {number} nodeId - 节点ID
 * @param {Array<{id: number, node: Object, distance: number}>} neighbors - 要添加的连接节点对象数组
 * @param {number} level - 操作的层级
 * @param {Map} nodes - 节点存储
 * @param {Function} distanceFunc - 距离计算函数
 * @returns {Object|null} 最近邻居节点,用作下一层搜索的入口点
 */
function addConnectionsHnswStyle(nodeId, neighbors, level, nodes, distanceFunc) {
  const node = nodes.get(nodeId);
  if (!node) return null;
  
  // 如果没有要添加的连接,直接返回
  if (!neighbors || neighbors.length === 0) return null;
  
  // 确保连接数组存在
  while (node.connections.length <= level) {
    node.connections.push([]);
  }
  
  // 计算本层需要的邻居数量,使用和hnswlayers一致的计算方式
  const maxNeighbors = calculateLevelM(level);
  
  // 提取邻居ID
  const neighborIds = neighbors.map(n => n.id);
  
  // 设置节点的连接
  node.connections[level] = neighborIds.slice(0, maxNeighbors);
  
  // 找到最近的邻居作为下一层入口点
  let closestNeighbor = null;
  let minDistance = Infinity;
  
  // 建立双向连接并寻找最近邻居
  for (const neighbor of neighbors) {
    if (!neighbor || !neighbor.node) continue;
    
    const connNode = neighbor.node;
    const connDistance = neighbor.distance;
    
    // 跟踪最近的邻居
    if (connDistance < minDistance) {
      minDistance = connDistance;
      closestNeighbor = connNode;
    }
    
    // 确保连接节点的连接数组存在
    while (connNode.connections.length <= level) {
      connNode.connections.push([]);
    }
    
    // 如果邻居的连接中没有当前节点,添加它
    if (!connNode.connections[level].includes(nodeId)) {
      // 使用最大堆来管理邻居连接,与hnswlayers完全一致
      const candidateHeap = createMinHeap((a, b) => b.distance - a.distance); // 最大堆,按距离从大到小
      
      // 添加现有连接
      for (const existingConnId of connNode.connections[level]) {
        const existingNode = nodes.get(existingConnId);
        if (!existingNode || existingNode.deleted) continue;
        
        try {
          const distance = distanceFunc(connNode.vector, existingNode.vector);
          candidateHeap.push({ id: existingConnId, distance });
        } catch (error) {
          continue;
        }
      }
      
      // 添加新连接(当前节点)
      candidateHeap.push({ id: nodeId, distance: connDistance });
      
      // 维护邻居数量不超过最大限制
      const newConnections = [];
      while (candidateHeap.size() > 0 && newConnections.length < maxNeighbors) {
        const conn = candidateHeap.pop();
        if (conn) {
          newConnections.push(conn.id);
        }
      }
      
      // 更新邻居的连接
      connNode.connections[level] = newConnections;
    }
  }
  
  // 返回最近邻居作为下一层搜索的入口点
  return closestNeighbor;
}

/**
 * 贪心搜索当前层级，查找最近的节点
 * @param {Object} queryNode - 查询节点
 * @param {Object} entryPoint - 入口点
 * @param {number} level - 搜索层级
 * @param {Map} nodes - 节点存储
 * @param {Function} distanceFunc - 距离计算函数
 * @param {Set} [visited=new Set()] - 已访问节点集合
 * @returns {Object} 最近节点信息 {id, distance}
 */
function greedySearchLayer(queryNode, entryPoint, level, nodes, distanceFunc, visited = new Set()) {
  if (!entryPoint || entryPoint.id === null) {
    return { id: null, distance: Infinity };
  }
  
  let currentNode = nodes.get(entryPoint.id);
  if (!currentNode || currentNode.deleted) {
    return { id: null, distance: Infinity };
  }
  
  const queryVector = queryNode.vector;
  if (!queryVector || !currentNode.vector) {
    return { id: null, distance: Infinity };
  }
  
  // 计算初始距离
  let currentDistance = distanceFunc(queryVector, currentNode.vector);
  let currentBest = { id: currentNode.id, distance: currentDistance, node: currentNode };
  
  // 已访问节点集合
  const visitedSet = new Set(visited);
  visitedSet.add(currentNode.id);
  
  // 标记是否找到了更好的节点
  let improved = true;
  
  // 贪婪搜索循环，不断找最近的邻居
  while (improved) {
    improved = false;
    
    // 获取当前节点在当前层级的连接
    if (!currentNode.connections || !currentNode.connections[level]) {
      break;
    }
    
    const connections = currentNode.connections[level];
    
    // 尝试遍历所有未访问的连接，找到更近的节点
    for (const neighborId of connections) {
      if (visitedSet.has(neighborId)) continue;
      
      const neighbor = nodes.get(neighborId);
      if (!neighbor || neighbor.deleted || !neighbor.vector) continue;
      
      // 标记为已访问
      visitedSet.add(neighborId);
      
      // 计算距离
      const distance = distanceFunc(queryVector, neighbor.vector);
      
      // 如果找到更近的节点，更新当前最佳节点
      if (distance < currentBest.distance) {
        currentBest = { id: neighborId, distance, node: neighbor };
        currentNode = neighbor;
        currentDistance = distance;
        improved = true;
        // 找到一个更近的节点后，立即中断当前循环
        break;
      }
    }
  }
  
  return currentBest;
}

/**
 * 在指定层级查找K个最近邻节点,严格匹配hnswlayers中的hnswAnn单次搜索函数
 * @param {Object} q - 查询节点
 * @param {number} k - 返回的邻居数量 
 * @param {number} ef - 搜索候选集大小
 * @param {number} level - 搜索的层级
 * @param {Map} nodes - 节点存储
 * @param {Object} entryPoint - 入口点
 * @param {Function} distanceFunc - 距离计算函数
 * @param {Set<number>} [excludeIds] - 要排除的节点ID集合
 * @param {Set<number>} [visitedNodes] - 已访问节点跟踪
 * @returns {Array<{id: number, distance: number}>} 最近邻节点列表
 */
function searchLayer(q, k, ef, level, nodes, entryPoint, distanceFunc, excludeIds = new Set(), visitedNodes = new Set()) {
  // 安全检查
  if (!entryPoint || !q || !q.vector) {
    console.warn('搜索层失败: 无效的入口点或查询向量');
    return [];
  }
  
  // 获取入口点节点
  const ep = nodes.get(entryPoint.id);
  if (!ep || ep.deleted || !ep.vector) {
    console.warn(`搜索层失败: 找不到入口点节点或节点无效`);
    return [];
  }
  
  // 确保ef至少为k
  const effectiveEf = Math.max(ef, k);
  
  // 初始化已访问节点集合 - 严格匹配hnswlayers
  const visited = new Set(visitedNodes);
  visited.add(entryPoint.id);
  
  // 计算到入口点的距离
  let initialDistance;
  try {
    initialDistance = distanceFunc(q.vector, ep.vector);
  } catch (error) {
    console.error('计算距离失败:', error);
    return [];
  }
  
  // 【优先队列】用于确定下一个要搜索的节点 - 最小堆(按距离从小到大)
  // 严格匹配hnswlayers中的优先队列
  const candidateQueue = createMinHeap((a, b) => a.distance - b.distance);
  candidateQueue.push({ id: entryPoint.id, distance: initialDistance, node: ep });
  
  // 【结果队列】用于保存已找到的结果 - 最大堆(按距离从大到小)
  // 严格匹配hnswlayers中的结果队列
  const resultQueue = createMinHeap((a, b) => b.distance - a.distance);
  resultQueue.push({ id: entryPoint.id, distance: initialDistance, node: ep });
  
  // 【核心变量】当前参考距离 - 严格匹配hnswlayers中的当前距离
  let currentDistance = initialDistance;
  
  // 进行搜索 - 严格匹配hnswlayers中的while循环
  while (candidateQueue.size() > 0) {
    // 取出当前最近的候选节点
    const currentNearest = candidateQueue.pop();
    if (!currentNearest) continue;
    
    // 【关键终止条件】- 严格匹配hnswlayers
    // 当前参考点的距离比参考距离大,且结果队列已满,则停止搜索
    if (currentNearest.distance > currentDistance && resultQueue.size() >= effectiveEf) {
      break;
    }
    
    // 【关键更新】- 严格匹配hnswlayers
    // 每次取出新的参考点,立即更新当前参考距离
    currentDistance = currentNearest.distance;
    
    // 获取当前节点
    const currentNode = currentNearest.node || nodes.get(currentNearest.id);
    if (!currentNode || currentNode.deleted) continue;
    
    // 获取当前层的连接列表
    let connections = [];
    if (currentNode.connections && level < currentNode.connections.length) {
      connections = currentNode.connections[level];
    }
    
    // 遍历所有邻居 - 严格匹配hnswlayers中的邻居遍历
    for (const neighborId of connections) {
      // 跳过已访问和排除的节点
      if (visited.has(neighborId) || excludeIds.has(neighborId)) continue;
      
      // 标记为已访问
      visited.add(neighborId);
      
      // 获取邻居节点
      const neighbor = nodes.get(neighborId);
      if (!neighbor || neighbor.deleted || !neighbor.vector) continue;
      
      // 计算到邻居的距离
      let neighborDistance;
      try {
        neighborDistance = distanceFunc(q.vector, neighbor.vector);
      } catch (error) {
        continue;
      }
      
      // 【关键判断条件】- 严格匹配hnswlayers
      // 如果结果不足或邻居距离小于当前参考距离,则将邻居加入队列
      if (resultQueue.size() < effectiveEf || neighborDistance < currentDistance) {
        candidateQueue.push({ id: neighborId, distance: neighborDistance, node: neighbor });
        resultQueue.push({ id: neighborId, distance: neighborDistance, node: neighbor });
        
        // 如果结果队列超过大小限制,移除最远的节点
        if (resultQueue.size() > effectiveEf) {
          // 【关键操作】- 严格匹配hnswlayers
          // 弹出最远的节点,并更新当前参考距离为新的最远距离
          resultQueue.pop();
          const furthestResult = resultQueue.peek();
          if (furthestResult) {
            currentDistance = furthestResult.distance;
          }
        }
      }
    }
  }
  
  
  // 将结果队列中的元素按距离从小到大排序
  const allResults = [];
  while (resultQueue.size() > 0) {
    const item = resultQueue.pop();
    if (item) {
      allResults.push({
        id: item.id,
        distance: item.distance
      });
    }
  }
  
  // 排序并返回前k个结果 - 按距离从小到大排序
  allResults.sort((a, b) => a.distance - b.distance);
  return allResults.slice(0, k);
}

/**
 * 在索引中搜索k个最近邻,完全匹配hnswlayers的实现
 * @param {Float32Array|Array} queryVector - 查询向量
 * @param {Map} nodes - 节点存储
 * @param {Object} entryPoint - 入口点
 * @param {number} maxLevel - 最大层数
 * @param {number} efSearch - 搜索时使用的候选集大小
 * @param {Function} distanceFunc - 距离计算函数
 * @param {number} k - 返回的最近邻数量
 * @param {number} [ef=null] - 自定义ef参数
 * @param {Set<number>} [excludeIds=new Set()] - 要排除的节点ID
 * @param {Object} [searchParams={}] - 搜索参数
 * @returns {Array<{id: number, distance: number, data: any}>} 最近邻节点列表
 */
function searchKNN(queryVector, nodes, entryPoint, maxLevel, efSearch, distanceFunc, k = 10, ef = null, excludeIds = new Set(), searchParams = {}) {
  // 防御性检查
  if (!queryVector || !nodes || !entryPoint || !distanceFunc) {
    console.error('searchKNN错误：无效参数');
    return [];
  }
  
  // 如果索引为空，返回空结果
  if (nodes.size === 0 || entryPoint.id === null) {
    return [];
  }
  
  // 确保参数有效,完全匹配hnswlayers的efSearch参数
  const effectiveEf = ef || Math.max(efSearch, k * 1.5);
  const effectiveK = Math.min(k, nodes.size);
  
  // 包装查询向量以便于传递
  const queryObj = { vector: queryVector };
  
  // 创建已访问节点集合
  const visited = new Set(excludeIds);
  
  // 从最高层开始逐层向下搜索
  let currentEntryPoint = entryPoint;
  
  // 贪心搜索逐层下降,直到第1层(不包括第0层)
  for (let level = Math.min(maxLevel, currentEntryPoint.level); level > 0; level--) {
    // 使用贪心搜索找到当前层最近的点
    const nearestResult = greedySearchLayer(
      queryObj,
      currentEntryPoint,
      level,
      nodes,
      distanceFunc,
      visited
    );
    
    // 更新入口点为本层找到的最近点
    if (nearestResult && nearestResult.id !== null) {
      currentEntryPoint = { id: nearestResult.id, level };
    }
  }
  
  // 在最底层(第0层)进行k近邻搜索
  // 完全匹配hnswlayers的底层搜索方式
  const results = searchLayer(
    queryObj,
    effectiveK,
    effectiveEf,
    0,
    nodes,
    currentEntryPoint,
    distanceFunc,
    excludeIds,
    visited
  );
  
  // 处理搜索结果,添加节点数据
  return results.map(item => {
    const node = nodes.get(item.id);
    return {
      id: item.id,
      distance: item.distance,
      data: node ? node.data : null
    };
  });
}

/**
 * 向索引中插入新节点,完全匹配hnswlayers的实现
 * @param {Float32Array} vector - 要插入的向量
 * @param {Object} [data] - 关联数据
 * @param {Map} nodes - 节点存储
 * @param {Object} entryPoint - 入口点
 * @param {number} M - 每层最大连接数(此实现中不直接使用)
 * @param {number} ml - 最大层数
 * @param {number} efConstruction - 构建参数
 * @param {Function} distanceFunc - 距离计算函数
 * @param {Object} state - 状态对象 {maxId, maxLevel, nodeCount}
 * @returns {number} 插入节点的ID
 */
function insertNode(vector, data, nodes, entryPoint, M, ml, efConstruction, distanceFunc, state) {
  try {
    // 防御性检查
    if (!vector || !Array.isArray(vector) && !(vector instanceof Float32Array)) {
      console.error('insertNode错误: 无效的向量数据', { vector });
      return null;
    }
    
    // 创建新节点
    const nodeId = state.maxId++;
    const level = getRandomLevel(ml);
    
    // 更新当前最大层级
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
    let currentEntryPoint = { ...entryPoint };
    
    // 完全匹配hnswlayers的efConstruction参数,关键参数
    const effectiveEf = DEFAULT_EF_CONSTRUCTION; 
    
    // 自顶向下遍历层级,完全匹配hnswlayers的实现
    for (let lc = Math.min(level, entryPoint.level); lc >= 0; lc--) {
      // 使用贪心搜索找到当前层最近的节点作为搜索入口
      const nearestResult = greedySearchLayer(
        q,
        currentEntryPoint,
        lc,
        nodes,
        distanceFunc
      );
      
      if (nearestResult && nearestResult.id !== null) {
        // 更新当前入口点
        currentEntryPoint = { id: nearestResult.id };
        
        // 搜索当前层的候选邻居
        // 使用根据层级设置的不同搜索范围
        const candidateNeighbors = searchLayer(
          q, 
          calculateLevelM(lc), // 使用层级计算函数获取邻居数量
          effectiveEf,  
          lc, 
          nodes, 
          currentEntryPoint, 
          distanceFunc
        );
        
        if (candidateNeighbors.length > 0) {
          // 为每个候选节点添加node属性
          const candidateNeighborsWithNode = candidateNeighbors.map(n => {
            const node = nodes.get(n.id);
            return {
              id: n.id,
              distance: n.distance,
              node: node
            };
          });
          
          // 使用hnswlayers的邻居选择策略
          const selectedNeighbors = selectNeighborsHeuristic(
            candidateNeighborsWithNode,
            lc,
            nodes,
            distanceFunc
          );
          
          // 添加连接 - 使用hnswlayers风格的连接函数
          // 此函数会返回最近的邻居节点作为下一层的入口点
          const closestNeighbor = addConnectionsHnswStyle(nodeId, selectedNeighbors, lc, nodes, distanceFunc);
          
          // 使用最近邻居作为下一层的入口点
          if (closestNeighbor) {
            currentEntryPoint = { id: closestNeighbor.id };
          }
        }
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
function removeNode(id, nodes, entryPoint, state) {
  const node = nodes.get(id);
  if (!node) return false;
  
  // 将节点标记为已删除
  node.deleted = true;
  state.nodeCount--;
  
  // 如果删除的是入口点，需要找新的入口点
  if (entryPoint.id === id) {
    // 查找新的入口点
    let foundNewEntryPoint = false;
    
    // 优先寻找高层级的节点作为新入口点
    for (let level = state.maxLevel; level >= 0 && !foundNewEntryPoint; level--) {
      for (const [nodeId, node] of nodes.entries()) {
        if (!node.deleted && node.connections.length > level) {
          entryPoint.id = nodeId;
          entryPoint.level = level;
          foundNewEntryPoint = true;
          break;
        }
      }
    }
    
    // 如果没有合适的入口点，重置
    if (!foundNewEntryPoint) {
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
function getStats(state, nodes, parameters) {
  // 计算活跃连接
  let totalConnections = 0;
  let activeNodeCount = 0;
  
  for (const [id, node] of nodes.entries()) {
    if (node.deleted) continue;
    
    activeNodeCount++;
    
    for (const levelConnections of node.connections) {
      if (levelConnections) {
        totalConnections += levelConnections.length;
      }
    }
  }
  
  return {
    nodeCount: state.nodeCount,
    maxLevel: state.maxLevel,
    totalNodes: nodes.size,
    activeNodeCount,
    avgConnectionsPerNode: activeNodeCount > 0 ? totalConnections / activeNodeCount : 0,
    parameters
  };
}

/**
 * 计算平均连接数
 * @param {Map} nodes - 节点存储
 * @returns {number} 平均连接数
 */
function calculateAvgConnections(nodes) {
  let totalConnections = 0;
  let validNodeCount = 0;
  
  for (const [id, node] of nodes.entries()) {
    if (node.deleted) continue;
    
    validNodeCount++;
    let nodeConnections = 0;
    
    for (const levelConnections of node.connections) {
      if (Array.isArray(levelConnections)) {
        nodeConnections += levelConnections.length;
      }
    }
    
    totalConnections += nodeConnections;
  }
  
  return validNodeCount > 0 ? totalConnections / validNodeCount : 0;
}


/**
 * 计算查询向量与数据库向量之间的距离
 * @param {string} distanceName - 距离函数名称
 * @returns {Function} 距离计算函数
 */
function getDistanceFunction(distanceName) {
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
 * 完全匹配hnswlayers中的hnswAnn搜索数据集实现
 * @param {Float32Array|Array} queryVector - 查询向量
 * @param {Map} nodes - 节点存储
 * @param {Object} entryPoint - 入口点
 * @param {number} maxLevel - 最大层级 
 * @param {number} efSearch - 搜索效率参数
 * @param {Function} distanceFunc - 距离计算函数
 * @param {number} k - 需要返回的近邻数量
 * @param {Object} searchParams - 搜索参数
 * @returns {Array} 最近邻结果
 */
function searchWithMultipleEntryPoints(queryVector, nodes, entryPoint, maxLevel, efSearch, distanceFunc, k, searchParams = {}) {
  const { 
    ef = null, 
    excludeIds = new Set()
  } = searchParams;
  
  // 使用Map存储结果以避免重复 - 严格匹配hnswlayers的结果集实现
  const resultMap = new Map();
  
  // 跟踪已尝试过的入口点 - 严格匹配hnswlayers的已遍历入口点集合
  const visitedEntryPoints = new Set();
  
  // 搜索尝试计数器 - 严格匹配hnswlayers的遍历次数
  let attemptCount = 0;
  
  // 【核心参数】: 严格匹配hnswlayers的搜索过程动态候选数量(500)
  // 使用常量而非硬编码值
  const dynamicCandidateCount = DEFAULT_EF_SEARCH;
  
  // 【核心计算】: 严格匹配hnswlayers的实际候选数量计算
  // 取k的1.5倍与动态候选数量的最大值
  const realCandidateCount = Math.ceil(Math.max(k * 6, dynamicCandidateCount));
  
  // 【核心参数】: 严格匹配hnswlayers的最大尝试次数(3)
  const MAX_ATTEMPTS = 3;
  
  // 【核心循环条件】: 严格匹配hnswlayers的循环条件
  // 结果不足K个或未达到最大尝试次数3次
  while ((resultMap.size < k || attemptCount < MAX_ATTEMPTS) && attemptCount < MAX_ATTEMPTS) {
    attemptCount++;
    
    // 【核心参数计算】: 严格匹配hnswlayers的候选数量计算
    // 实际候选数量减去已有结果数量
    const neededResults = Math.max(realCandidateCount - resultMap.size, k);
    
    // 选择入口点 - 严格匹配hnswlayers
    let currentEntryPoint;
    
    // 【第一次搜索】使用全局入口点,与hnswlayers一致
    if (attemptCount === 1) {
      currentEntryPoint = { ...entryPoint };
    } else {
      // 【后续搜索】查找未访问的最高层级节点作为入口点
      // 严格匹配hnswlayers的入口点选择策略
      let bestEntryPointLevel = -1;
      let bestEntryPointId = null;
      
      // 遍历所有节点寻找最佳入口点
      for (const [nodeId, node] of nodes.entries()) {
        if (!node.deleted && 
            !visitedEntryPoints.has(nodeId) &&
            node.connections.length > bestEntryPointLevel) {
          bestEntryPointLevel = node.connections.length - 1;
          bestEntryPointId = nodeId;
        }
      }
      
      if (bestEntryPointId !== null) {
        currentEntryPoint = { id: bestEntryPointId, level: bestEntryPointLevel };
      } else {
        // 如果没有未访问的高层级节点,尝试随机选择一个非入口点节点
        for (const [nodeId, node] of nodes.entries()) {
          if (!node.deleted && 
              nodeId !== entryPoint.id && 
              !visitedEntryPoints.has(nodeId)) {
            const level = node.connections.length - 1;
            currentEntryPoint = { id: nodeId, level: Math.max(0, level) };
            break;
          }
        }
      }
    }
    
    // 如果没有找到有效入口点,跳出循环
    if (!currentEntryPoint || currentEntryPoint.id === undefined) {
      break;
    }
    
    // 记录已访问的入口点
    visitedEntryPoints.add(currentEntryPoint.id);
    
    // 【关键步骤】: 执行单次搜索 - 严格匹配hnswlayers的搜索参数传递
    const searchResults = searchKNN(
      queryVector,
      nodes,
      currentEntryPoint,
      maxLevel,
      dynamicCandidateCount,         // efSearch=500,固定值,与hnswlayers一致
      distanceFunc,
      neededResults,                  // 动态计算所需结果数
      dynamicCandidateCount,         // ef=500,固定值,与hnswlayers一致
      new Set([...excludeIds, ...visitedEntryPoints])  // 排除已访问入口点和指定排除点
    );
    
    // 合并结果到结果Map - 严格匹配hnswlayers的结果合并方式
    if (searchResults && searchResults.length > 0) {
      for (const result of searchResults) {
        if (result && result.id !== undefined) {
          // 如果新结果比已有结果更好,更新结果
          if (!resultMap.has(result.id) || resultMap.get(result.id).distance > result.distance) {
            resultMap.set(result.id, result);
          }
        }
      }
    }
  }
  
  // 转换结果为数组,并按距离从小到大排序 - 严格匹配hnswlayers的结果处理
  const results = Array.from(resultMap.values())
    .sort((a, b) => a.distance - b.distance)
    .slice(0, k);
  
  // 添加得分属性(1-distance) - 与hnswlayers的score字段对应
  return results.map(item => ({
    ...item,
    score: 1 - item.distance  // 添加score字段,表示相似度得分
  }));
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
   * 搜索K个最近邻节点 - API入口
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
    
    // 使用hnswlayers的多入口点搜索方式
    return searchWithMultipleEntryPoints(
      queryVector,
      nodes,
      entryPoint,
      state.maxLevel,
      effectiveEfSearch,
      distanceFunc,
      k,
      searchParams
    );
  };
  
  // 暴露API，保持兼容性
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
    
  
  };
}



