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



// 常量定义 - 参照hnswlayers实现
const DEFAULT_M = 48;                 // 每层最大连接数
const DEFAULT_EF_CONSTRUCTION = 600;  // 构建时候选集大小
const DEFAULT_EF_SEARCH = 150;        // 搜索时候选集大小
const DEFAULT_ML = 48;                // 最大层数
const BOTTOM_LAYER_CONNECTIONS = 300; // 底层连接数

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
 * 获取随机层级
 * @param {number} maxLevel - 最大层级
 * @returns {number} 随机层级，在0到maxLevel之间
 */
function getRandomLevel(maxLevel) {
  const p = 1 / Math.E;
  return Math.floor(-Math.log(Math.random()) / Math.log(1 / p)) % (maxLevel + 1);
}

/**
 * 创建距离计算缓存装饰器
 * @param {Function} distanceFunc - 原始距离计算函数
 * @param {number} [cacheSize=1000] - 缓存大小
 * @returns {Function} 带缓存的距离计算函数
 */
function createDistanceCache(distanceFunc, cacheSize = 1000) {
  const cache = new Map();
  const keys = [];
  
  return function cachedDistance(a, b) {
    // 创建缓存键（向量的哈希）
    const keyA = a.length + ':' + a[0] + ':' + a[a.length - 1];
    const keyB = b.length + ':' + b[0] + ':' + b[b.length - 1];
    const cacheKey = keyA < keyB ? keyA + '|' + keyB : keyB + '|' + keyA;
    
    // 检查缓存
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }
    
    // 计算距离
    const distance = distanceFunc(a, b);
    
    // 更新缓存
    cache.set(cacheKey, distance);
    keys.push(cacheKey);
    
    // 如果缓存超出大小限制，删除最早的条目
    if (keys.length > cacheSize) {
      const oldestKey = keys.shift();
      cache.delete(oldestKey);
    }
    
    return distance;
  };
}

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
function addConnections(nodeId, connectionIds, level, nodes, M, distanceFunc, preferNewConnections = false, forceAddAll = false) {
  const node = nodes.get(nodeId);
  if (!node) return;
  
  // 如果没有要添加的连接，直接返回
  if (!connectionIds || connectionIds.length === 0) return;
  
  // 确保连接数组存在
  while (node.connections.length <= level) {
    node.connections.push([]);
  }
  
  const existingConnections = node.connections[level] || [];
  
  // 底层使用更大的连接数限制以提高召回率
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
    
    // 使用hnswlayers中的邻居选择策略
    // 先选择最近的一部分邻居
    const selectedConnections = [];
    
    // 首先添加一部分最近的邻居
    const initialSelectCount = Math.min(Math.floor(effectiveM * 0.4), connectionDistances.length);
    for (let i = 0; i < initialSelectCount; i++) {
      selectedConnections.push(connectionDistances[i].id);
    }
    
    // 然后对剩余候选进行筛选，确保它们与已选邻居不太相似
    const remainingCandidates = connectionDistances.slice(initialSelectCount);
    
    for (const candidate of remainingCandidates) {
      if (selectedConnections.length >= effectiveM) break;
      
      const candidateNode = nodes.get(candidate.id);
      if (!candidateNode || !candidateNode.vector) continue;
      
      let shouldAdd = true;
      
      // 检查候选节点是否为已选节点提供了新的信息
      for (const selectedId of selectedConnections) {
        const selectedNode = nodes.get(selectedId);
        if (!selectedNode || !selectedNode.vector) continue;
        
        try {
          const distanceBetween = distanceFunc(candidateNode.vector, selectedNode.vector);
          
          // 如果候选节点到某个已选节点的距离小于候选到查询节点的距离
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
    
    // 如果筛选后连接数量不足，继续添加最近的连接
    if (selectedConnections.length < effectiveM) {
      for (const candidate of connectionDistances) {
        if (selectedConnections.length >= effectiveM) break;
        if (!selectedConnections.includes(candidate.id)) {
          selectedConnections.push(candidate.id);
        }
      }
    }
    
    allConnections = selectedConnections;
  }
  
  // 更新节点的连接
  node.connections[level] = allConnections;
  
  // 建立双向连接
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
        addConnections(connId, [], level, nodes, M, distanceFunc, false, false);
      }
    }
  }
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
 * 在指定层级查找K个最近邻节点
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
  
  // 初始化已访问节点集合
  const visited = new Set([...visitedNodes]);
  visited.add(entryPoint.id);
  
  // 计算到入口点的距离
  let initialDistance;
  try {
    initialDistance = distanceFunc(q.vector, ep.vector);
  } catch (error) {
    console.error('计算距离失败:', error);
    return [];
  }
  
  // 用于确定下一个要搜索的节点的优先队列(最小堆) - 按距离从小到大排序
  const candidateQueue = createMinHeap((a, b) => a.distance - b.distance);
  candidateQueue.push({ id: entryPoint.id, distance: initialDistance, node: ep });
  
  // 用于保存已找到的最近邻的队列(最大堆) - 按距离从大到小排序
  const resultQueue = createMinHeap((a, b) => b.distance - a.distance);
  resultQueue.push({ id: entryPoint.id, distance: initialDistance, node: ep });
  
  // 设置当前最远距离为初始距离 - 随后会不断更新
  let currentFurthestDistance = initialDistance;
  
  // 当候选队列非空时继续搜索
  while (candidateQueue.size() > 0) {
    // 取出当前最近的候选节点
    const currentNearest = candidateQueue.pop();
    if (!currentNearest) continue;
    
    // 如果当前候选的距离比结果集中最远的还要远，且结果集已经满了，则停止搜索
    if (resultQueue.size() >= effectiveEf && currentNearest.distance > currentFurthestDistance) {
      break;
    }
    
    // 获取当前节点的连接
    const currentNode = currentNearest.node || nodes.get(currentNearest.id);
    if (!currentNode || currentNode.deleted) continue;
    
    // 获取当前层的连接列表
    let connections = [];
    if (currentNode.connections && level < currentNode.connections.length) {
      connections = currentNode.connections[level];
    }
    
    // 遍历所有邻居
    for (const neighborId of connections) {
      // 跳过已访问的节点和排除的节点
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
      
      // 如果当前结果数量不足ef或者新邻居比当前最远的节点更近，加入结果集
      if (resultQueue.size() < effectiveEf || neighborDistance < currentFurthestDistance) {
        // 将邻居添加到候选队列和结果队列
        candidateQueue.push({ id: neighborId, distance: neighborDistance, node: neighbor });
        resultQueue.push({ id: neighborId, distance: neighborDistance, node: neighbor });
        
        // 如果结果队列大小超过ef，移除最远的节点
        if (resultQueue.size() > effectiveEf) {
          resultQueue.pop(); // 移除最远的节点
          
          // 更新最远距离
          const worstCandidate = resultQueue.peek();
          if (worstCandidate) {
            currentFurthestDistance = worstCandidate.distance;
          }
        }
      }
    }
  }
  
  // 收集结果，按距离从小到大排序
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
  
  // 按距离排序
  allResults.sort((a, b) => a.distance - b.distance);
  
  // 返回前k个结果
  return allResults.slice(0, k);
}

/**
 * 在索引中搜索k个最近邻
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
  
  // 确保参数有效
  const effectiveEf = ef || Math.max(efSearch, k * 2);
  const effectiveK = Math.min(k, nodes.size);
  
  // 包装查询向量以便于传递
  const queryObj = { vector: queryVector };
  
  // 创建已访问节点集合
  const visited = new Set(excludeIds);
  
  // 从最高层开始逐层向下搜索
  let currentEp = entryPoint;
  
  // 逐层向下搜索，找到最近的入口点
  for (let level = Math.min(maxLevel, currentEp.level); level > 0; level--) {
    try {
      const nearestResult = greedySearchLayer(
        queryObj,
        currentEp,
        level,
        nodes,
        distanceFunc,
        visited
      );
      
      if (nearestResult && nearestResult.id !== null) {
        currentEp = { id: nearestResult.id, level };
      }
    } catch (error) {
      console.warn(`层级${level}搜索失败:`, error);
    }
  }
  
  // 在最底层进行k近邻搜索
  const results = searchLayer(
    queryObj,
    effectiveK,
    effectiveEf,
    0,
    nodes,
    currentEp,
    distanceFunc,
    excludeIds,
    visited
  );
  
  // 处理搜索结果，添加节点数据
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
    let currObj = { ...entryPoint };
    
    // 调整构建时的ef值
    const effectiveEf = Math.max(efConstruction, M * 4); 
    
    // 自顶向下遍历层级
    for (let lc = Math.min(level, entryPoint.level); lc >= 0; lc--) {
      // 在当前层根据hnswlayers方式查找最近邻
      // 先使用贪心搜索找到当前层的最近点
      const nearestResult = greedySearchLayer(
        q,
        currObj,
        lc,
        nodes,
        distanceFunc
      );
      
      // 如果找到最近点，继续搜索此层的候选邻居
      if (nearestResult && nearestResult.id !== null) {
        currObj = { id: nearestResult.id };
        
        // 使用searchLayer查找更多邻居
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
          
          // 更新当前入口点为最近邻点，用于下一层搜索
          currObj = { id: neighbors[0].id };
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
 * 序列化索引数据
 * @param {Map} nodes - 节点存储
 * @param {Object} entryPoint - 入口点
 * @param {Object} state - 状态对象
 * @returns {Object} 可序列化的索引数据
 */
function serializeIndex(nodes, entryPoint, state) {
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
 * @returns {boolean} 是否成功还原
 */
function deserializeIndex(nodes, entryPoint, state, data) {
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
  } catch (error) {
    console.error('还原入口点失败:', error);
    return false;
  }
  
  try {
    Object.assign(state, data.state);
  } catch (error) {
    console.error('还原状态失败:', error);
    return false;
  }
  
  console.log('HNSW索引反序列化成功');
  return true;
}

/**
 * 优化索引连接结构
 * @param {Map} nodes - 节点存储
 * @param {Object} entryPoint - 入口点
 * @param {Function} distanceFunc - 距离计算函数
 * @param {number} M - 每层最大连接数
 * @param {Object} state - 状态对象
 * @param {Object} options - 优化选项
 * @returns {Object} 优化结果统计
 */
function optimizeIndexConnectivity(nodes, entryPoint, distanceFunc, M, state, options = {}) {
  const { repairBrokenLinks = true, balanceConnections = true } = options;
  
  let repairedLinks = 0;
  let balancedNodes = 0;
  
  // 修复断开的连接
  if (repairBrokenLinks) {
    for (const [nodeId, node] of nodes.entries()) {
      if (node.deleted) continue;
      
      for (let level = 0; level < node.connections.length; level++) {
        const connections = node.connections[level];
        if (!connections) continue;
        
        const validConnections = [];
        
        for (const connId of connections) {
          const connNode = nodes.get(connId);
          if (connNode && !connNode.deleted) {
            validConnections.push(connId);
          } else {
            repairedLinks++;
          }
        }
        
        // 更新为有效连接
        if (validConnections.length !== connections.length) {
          node.connections[level] = validConnections;
        }
      }
    }
  }
  
  // 平衡连接数量
  if (balanceConnections) {
    for (const [nodeId, node] of nodes.entries()) {
      if (node.deleted) continue;
      
      for (let level = 0; level < node.connections.length; level++) {
        const connections = node.connections[level];
        const effectiveM = level === 0 ? BOTTOM_LAYER_CONNECTIONS : M;
        
        // 如果连接太少，尝试添加更多连接
        if (connections.length < Math.floor(effectiveM * 0.5)) {
          // 查找潜在的新连接
          const potentialConnections = [];
          
          // 从现有连接的连接中寻找二级连接
          for (const connId of connections) {
            const connNode = nodes.get(connId);
            if (!connNode || connNode.deleted) continue;
            
            if (connNode.connections.length > level) {
              for (const secondConnId of connNode.connections[level]) {
                if (secondConnId !== nodeId && !connections.includes(secondConnId)) {
                  const secondNode = nodes.get(secondConnId);
                  if (secondNode && !secondNode.deleted) {
                    try {
                      const distance = distanceFunc(node.vector, secondNode.vector);
                      potentialConnections.push({ id: secondConnId, distance });
                    } catch (error) {
                      continue;
                    }
                  }
                }
              }
            }
          }
          
          // 按距离排序，选择最近的节点添加为连接
          if (potentialConnections.length > 0) {
            potentialConnections.sort((a, b) => a.distance - b.distance);
            
            const newConnectionIds = potentialConnections
              .slice(0, effectiveM - connections.length)
              .map(conn => conn.id);
            
            if (newConnectionIds.length > 0) {
              addConnections(nodeId, newConnectionIds, level, nodes, M, distanceFunc);
              balancedNodes++;
            }
          }
        }
      }
    }
  }
  
  return {
    repairedLinks,
    balancedNodes
  };
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
 * 按照hnswlayers实现的多次入口点搜索机制
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
    excludeIds = new Set(),
    multipleSearches = true
  } = searchParams;
  
  // 使用Map存储结果以避免重复
  const resultMap = new Map();
  // 跟踪已尝试过的入口点
  const visitedEntryPoints = new Set();
  // 搜索尝试计数器
  let attemptCount = 0;
  
  // 提高ef值以提升召回率
  const effectiveEf = ef || Math.max(efSearch, k * 4);
  
  // 增加最大搜索次数到3次，完全匹配hnswlayers的实现
  const MAX_ATTEMPTS = multipleSearches ? 3 : 1;
  
  while (resultMap.size < k && attemptCount < MAX_ATTEMPTS) {
    // 计算本轮所需结果数量
    const neededResults = Math.ceil(Math.max(k * 1.5, effectiveEf)) - resultMap.size;
    attemptCount++;
    
    // 选择入口点 - 首先使用全局入口点，然后尝试其他点
    let currentEntryPoint;
    
    if (attemptCount === 1) {
      // 第一次搜索使用全局入口点
      currentEntryPoint = entryPoint;
    } else {
      // 寻找新入口点 - 从最高层级开始查找
      let bestEntryPointLevel = -1;
      let bestEntryPointId = null;
      
      // 尝试找未访问过的最高层级节点作为新入口点
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
        visitedEntryPoints.add(bestEntryPointId);
      } else {
        // 如果找不到未访问的节点，随机选择一个非入口点的节点
        for (const [nodeId, node] of nodes.entries()) {
          if (!node.deleted && 
              nodeId !== entryPoint.id && 
              !visitedEntryPoints.has(nodeId)) {
            const level = node.connections.length - 1;
            currentEntryPoint = { id: nodeId, level: Math.max(0, level) };
            visitedEntryPoints.add(nodeId);
            break;
          }
        }
      }
      
      // 如果仍然找不到入口点，跳出循环
      if (!currentEntryPoint) break;
    }
    
    // 如果没有找到入口点，跳出循环
    if (!currentEntryPoint || !currentEntryPoint.id) break;
    
    // 记录已访问的入口点
    visitedEntryPoints.add(currentEntryPoint.id);
    
    // 对每次搜索使用递增的ef值，显著提高召回率
    const searchEf = ef || Math.max(effectiveEf, effectiveEf * attemptCount);
    
    // 执行单次搜索
    const searchResults = searchKNN(
      queryVector,
      nodes,
      currentEntryPoint,
      maxLevel,
      effectiveEf,
      distanceFunc,
      neededResults,
      searchEf,
      new Set([...excludeIds, ...visitedEntryPoints])
    );
    
    // 合并结果到结果Map
    if (searchResults && searchResults.length > 0) {
      for (const result of searchResults) {
        if (result && result.id) {
          // 如果新结果比已有结果更好，更新结果
          if (!resultMap.has(result.id) || resultMap.get(result.id).distance > result.distance) {
            resultMap.set(result.id, result);
          }
        }
      }
    }
    
    // 如果搜索结果已足够，提前退出
    if (resultMap.size >= k) {
      break;
    }
  }
  
  // 更积极地触发部分暴力搜索，当结果数量不足预期的70%时
  if (resultMap.size < k * 0.7 && nodes.size > 0 && nodes.size < 10000) {
    console.warn(`常规搜索结果不足(${resultMap.size}/${k})，尝试部分暴力搜索`);
    
    // 排除已知的节点
    const allExcludedIds = new Set([...excludeIds, ...visitedEntryPoints]);
    // 已有结果的ID
    for (const id of resultMap.keys()) {
      allExcludedIds.add(id);
    }
    
    // 动态调整采样率，较小数据集搜索更多节点
    const samplingRate = nodes.size < 1000 ? 0.5 : 
                        (nodes.size < 5000 ? 0.3 : 0.2);
    
    const maxNodesToSearch = Math.min(nodes.size, Math.ceil(nodes.size * samplingRate));
    let nodesSearched = 0;
    
    // 暴力搜索部分节点
    for (const [nodeId, node] of nodes.entries()) {
      if (nodesSearched >= maxNodesToSearch) break;
      
      if (node.deleted || allExcludedIds.has(nodeId)) continue;
      nodesSearched++;
      
      try {
        const distance = distanceFunc(queryVector, node.vector);
        
        // 如果新结果比已有结果更好或结果不足k个，加入结果集
        if (resultMap.size < k || distance < Array.from(resultMap.values())
                                          .sort((a, b) => b.distance - a.distance)[0].distance) {
          resultMap.set(nodeId, {
            id: node.data?.id || nodeId,
            internalId: nodeId,
            distance,
            data: node.data
          });
          
          // 保持结果数量为k
          if (resultMap.size > k) {
            // 找出距离最远的结果并移除
            const sortedResults = Array.from(resultMap.entries())
              .sort((a, b) => b[1].distance - a[1].distance);
            
            if (sortedResults.length > 0) {
              resultMap.delete(sortedResults[0][0]);
            }
          }
        }
      } catch (error) {
        continue;
      }
    }
  }
  
  // 转换结果为数组，并按距离排序
  const results = Array.from(resultMap.values())
    .sort((a, b) => a.distance - b.distance)
    .slice(0, k);
  
  return results;
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
    
    // 优化连接结构函数
    optimizeConnectivity: (options = {}) => optimizeIndexConnectivity(
      nodes, entryPoint, distanceFunc, effectiveM, state, options
    )
  };
}



