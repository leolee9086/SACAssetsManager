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
const DEFAULT_EF_SEARCH = 200;      // 搜索时的候选集大小，从50增加到200提高召回率
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
 * @param {Set<number>} [visitedNodes] - 已访问节点跟踪，可传入跨层次共享的访问记录
 * @returns {Array<{id: number, distance: number}>} 最近邻节点列表
 */
export function searchLayer(q, k, ef, level, nodes, entryPoint, distanceFunc, excludeIds = new Set(), visitedNodes = new Set()) {
  // 安全检查：确保入口点有效
  if (!entryPoint || entryPoint.id === undefined || entryPoint.id === null) {
    console.warn('搜索层失败: 无效的入口点', entryPoint);
    return [];
  }
  
  // 安全检查：确保查询向量有效
  if (!q || !q.vector) {
    console.warn('搜索层失败: 无效的查询向量', q);
    return [];
  }
  
  // 从入口点开始
  const ep = nodes.get(entryPoint.id);
  if (!ep || ep.deleted) {
    console.warn(`搜索层失败: 找不到入口点节点 ID=${entryPoint.id}`, { entryPoint });
    return [];
  }
  
  // 安全检查：确保入口点有向量数据
  if (!ep.vector) {
    console.warn(`搜索层失败: 入口点节点没有向量数据 ID=${entryPoint.id}`, ep);
    return [];
  }
  
  // 初始化已访问集 - 结合外部传入的visitedNodes集合
  const visited = new Set([...visitedNodes, ep.id]);
  
  // 计算到入口点的距离
  let distance;
  try {
    distance = distanceFunc(q.vector, ep.vector);
  } catch (error) {
    console.error('计算距离失败:', error, { queryVector: q.vector, epVector: ep.vector });
    return [];
  }
  
  // 使用最小堆存储候选集 - 按距离从小到大排序
  const candidatesHeap = createMinHeap((a, b) => a.distance - b.distance);
  candidatesHeap.push({ id: ep.id, distance });
  
  // 使用最小堆存储结果集 - 按距离从小到大排序
  const resultsHeap = createMinHeap((a, b) => a.distance - b.distance);
  resultsHeap.push({ id: ep.id, distance });
  
  // 优化：预估结果集大小，避免频繁调整堆
  let worstDistance = Infinity;
  let resultCount = 1;
  
  // 当候选集不为空时继续搜索
  while (candidatesHeap.size() > 0) {
    // 获取当前最近的候选节点
    const current = candidatesHeap.pop();
    if (!current) continue; // 安全检查
    
    // 剪枝优化：修改为更保守的剪枝条件，增加探索范围，防止过早终止
    // 原来的剪枝条件可能过于激进，导致错过一些潜在的好邻居
    if (resultCount >= ef && current.distance > worstDistance * 1.2) { // 增加20%的容忍度
      break;
    }
    
    // 获取节点并检查其连接
    const currentNode = nodes.get(current.id);
    if (!currentNode || currentNode.deleted) continue;
    
    // 检查当前层连接是否存在且为数组
    if (!currentNode.connections || !Array.isArray(currentNode.connections)) {
      console.warn(`节点 ID=${current.id} 没有有效的连接数组`, currentNode);
      continue;
    }
    
    // 安全获取当前层的连接
    const connections = Array.isArray(currentNode.connections[level]) ? 
      currentNode.connections[level] : [];
    
    // 批量检查连接，减少循环开销
    for (const neighborId of connections) {
      // 跳过已访问或排除的节点
      if (visited.has(neighborId) || excludeIds.has(neighborId)) continue;
      
      // 安全检查：确保邻居ID是有效的
      if (neighborId === undefined || neighborId === null) {
        console.warn('跳过无效的邻居ID', { currentNodeId: current.id, neighborId });
        continue;
      }
      
      const neighbor = nodes.get(neighborId);
      if (!neighbor || neighbor.deleted) continue;
      
      // 安全检查：确保邻居节点有向量数据
      if (!neighbor.vector) {
        console.warn(`邻居节点没有向量数据 ID=${neighborId}`, neighbor);
        continue;
      }
      
      // 标记为已访问
      visited.add(neighborId);
      
      // 安全计算距离
      let distance;
      try {
        distance = distanceFunc(q.vector, neighbor.vector);
      } catch (error) {
        console.error('邻居距离计算失败:', error, { 
          queryVector: q.vector, 
          neighborId,
          neighborVector: neighbor.vector 
        });
        continue;
      }
      
      // 判断是否应加入结果集 - 修改为更宽松的条件
      // 不仅加入ef个最近的，也考虑与当前最远距离相近的节点
      const shouldAddToResults = resultCount < ef || distance < worstDistance * 1.1; // 允许10%的距离容忍度
      
      if (shouldAddToResults) {
        // 添加到候选集
        candidatesHeap.push({ id: neighborId, distance });
        
        // 添加到结果集
        resultsHeap.push({ id: neighborId, distance });
        resultCount++;
        
        // 如果结果集超过ef，移除最远的节点
        if (resultCount > ef) {
          try {
            resultsHeap.popWorst();
            resultCount--;
            // 更新当前最远距离
            const worst = resultsHeap.getWorst();
            worstDistance = worst ? worst.distance : Infinity;
          } catch (error) {
            console.error('管理结果堆时出错:', error);
            // 重置最远距离为无穷大，避免在错误后终止搜索
            worstDistance = Infinity;
          }
        }
      }
    }
  }
  
  // 将堆转换为数组并按距离排序
  const results = [];
  while (resultsHeap.size() > 0) {
    results.push(resultsHeap.pop());
  }
  
  // 按距离从近到远排序
  results.sort((a, b) => a.distance - b.distance);
  
  // 保留前k个元素（或所有元素，如果数量小于k）
  // 增加返回的候选节点数量，提高召回率
  const effectiveK = Math.max(k, Math.min(results.length, k * 2)); // 返回k到2k之间的节点数
  return results.slice(0, effectiveK);
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
 */
export function addConnections(nodeId, connectionIds, level, nodes, M, distanceFunc, preferNewConnections = false) {
  const node = nodes.get(nodeId);
  if (!node) return;
  
  // 如果没有要添加的连接，直接返回
  if (!connectionIds || connectionIds.length === 0) return;
  
  // 确保连接数组存在
  while (node.connections.length <= level) {
    node.connections.push([]);
  }
  
  // 快速获取现有连接并使用Set增强性能
  const existingConnections = new Set(node.connections[level]);
  const newConnectionSet = new Set();
  
  // 高效过滤处理
  for (const connId of connectionIds) {
    // 跳过自连接或已存在的连接
    if (connId === nodeId || existingConnections.has(connId)) continue;
    
    // 验证节点有效性
    const connNode = nodes.get(connId);
    if (!connNode || connNode.deleted) continue;
    
    // 添加到新连接集合
    newConnectionSet.add(connId);
  }
  
  // 如果没有有效的新连接，直接返回
  if (newConnectionSet.size === 0) return;
  
  // 将新连接添加到节点的连接列表
  const newConnections = Array.from(newConnectionSet);
  node.connections[level].push(...newConnections);
  
  // 如果总连接数超过限制M，进行修剪
  if (node.connections[level].length > M) {
    // 计算距离的临时缓存
    const distanceCache = new Map();
    const nodeVector = node.vector;
    
    // 高效距离计算函数
    const getDistance = (connId) => {
      if (distanceCache.has(connId)) {
        return distanceCache.get(connId);
      }
      
      const connNode = nodes.get(connId);
      if (!connNode || connNode.deleted) return Infinity;
      
      const distance = distanceFunc(nodeVector, connNode.vector);
      distanceCache.set(connId, distance);
      return distance;
    };
    
    // 优化连接选择策略
    if (preferNewConnections && newConnections.length <= M) {
      // 若新连接数量不超过M且优先保留新连接，则将剩余槽位分配给最近的旧连接
      const oldConnections = Array.from(existingConnections);
      
      // 为旧连接计算距离并排序
      const oldConnectionDistances = oldConnections.map(connId => ({
        id: connId,
        distance: getDistance(connId)
      }));
      
      oldConnectionDistances.sort((a, b) => a.distance - b.distance);
      
      // 选择最近的(M-新连接数量)个旧连接
      const bestOldConnectionIds = oldConnectionDistances
        .slice(0, M - newConnections.length)
        .map(conn => conn.id);
      
      // 更新连接为所选的新连接和最佳旧连接的组合
      node.connections[level] = [...newConnections, ...bestOldConnectionIds];
    } else {
      // 常规策略：计算所有连接的距离，保留最近的M个
      const allConnections = node.connections[level];
      
      // 利用增量排序减少计算量 - 仅当连接数明显大于M时使用完全排序
      if (allConnections.length > M * 1.5) {
        // 计算所有连接的距离
        const connectionDistances = allConnections.map(connId => ({
          id: connId,
          distance: getDistance(connId)
        }));
        
        // 排序并保留最近的M个连接
        connectionDistances.sort((a, b) => a.distance - b.distance);
        node.connections[level] = connectionDistances.slice(0, M).map(conn => conn.id);
      } else {
        // 对于接近M的情况，使用原地选择算法效率更高
        allConnections.sort((a, b) => getDistance(a) - getDistance(b));
        node.connections[level] = allConnections.slice(0, M);
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
export function insertNode(vector, data = null, nodes, entryPoint, M, ml, efConstruction, distanceFunc, state) {
  const nodeId = ++state.maxId;
  const level = getRandomLevel(ml, M);
  const newNode = createHNSWNode(nodeId, vector, data);
  
  // 初始化各层连接数组 - 一次性分配所有层的空数组
  newNode.connections = Array(level + 1).fill().map(() => []);
  
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
  
  // 查找插入位置 - 使用局部缓存减少计算量
  let currentNode = entryPoint;
  const distanceCache = new Map();
  
  // 计算距离并缓存结果
  const getDistanceWithCache = (v1, v2) => {
    // 安全检查 - 确保参数有效
    if (!v1 || !v2) {
      console.error('距离计算错误: 无效的参数', { v1, v2 });
      return Infinity; // 返回无穷大表示无效距离
    }
    
    // 安全获取ID，处理undefined情况
    const id1 = v1 && v1.id !== undefined ? v1.id : '0';
    const id2 = v2 && v2.id !== undefined ? v2.id : '0';
    
    // 确保id1 <= id2，避免重复键
    const key = id1 <= id2 ? `${id1}_${id2}` : `${id2}_${id1}`;
    
    if (!distanceCache.has(key)) {
 
      try {
        const distance = distanceFunc(v1, v2);
        distanceCache.set(key, distance);
        return distance;
      } catch (error) {
        console.error('距离计算异常:', error, { v1, v2 });
        return Infinity;
      }
    }
    
    return distanceCache.get(key);
  };
  
  // 从最高层开始，找到合适的起点 - 优化遍历策略
  for (let lc = state.maxLevel; lc > level; lc--) {
    let changed = true;
    // 安全获取当前节点
    const entryNodeObj = nodes.get(currentNode.id);
    if (!entryNodeObj || !entryNodeObj.vector) {
      console.warn(`无效的入口节点 ID=${currentNode.id}，尝试使用索引入口点`);
      // 尝试回退到全局入口点
      if (entryPoint && entryPoint.id !== null && entryPoint.id !== currentNode.id) {
        const globalEntryNode = nodes.get(entryPoint.id);
        if (globalEntryNode && globalEntryNode.vector) {
          currentNode = { id: entryPoint.id, level: entryPoint.level };
        } else {
          console.error('全局入口点也无效，无法继续层级搜索');
          break; // 退出当前层级循环
        }
      } else {
        break; // 退出当前层级循环
      }
    }
    
    // 计算初始距离前的安全检查
    let bestDistSoFar;
    try {
      const currNode = nodes.get(currentNode.id);
      if (!currNode || !currNode.vector) {
        console.error(`找不到当前节点或其向量 ID=${currentNode.id}`);
        break;
      }
      bestDistSoFar = getDistanceWithCache(newNode, currNode);
    } catch (error) {
      console.error('计算初始距离时出错:', error, { newNodeId: nodeId, currentNodeId: currentNode.id });
      break;
    }
    
    // 使用小批次爬山法，避免过多无效距离计算
    while (changed) {
      changed = false;
      
      // 获取当前节点的连接
      const currNodeObj = nodes.get(currentNode.id);
      if (!currNodeObj) {
        console.warn(`找不到当前节点 ID=${currentNode.id}`);
        break;
      }
      
      // 安全检查连接数组
      if (!currNodeObj.connections || !Array.isArray(currNodeObj.connections)) {
        console.warn(`节点连接不是有效数组 ID=${currentNode.id}`, currNodeObj);
        break;
      }
      
      const currConnections = Array.isArray(currNodeObj.connections[lc]) ? 
        currNodeObj.connections[lc] : [];
      
      if (currConnections.length === 0) continue;
      
      // 跟踪连接中距离最小的节点
      let bestNeighborId = null;
      let bestNeighborDist = bestDistSoFar;
      
      // 遍历连接，查找更近的节点
      for (const connId of currConnections) {
        // 安全检查连接ID
        if (connId === undefined || connId === null) {
          console.warn('跳过无效的连接ID', { currentNodeId: currentNode.id, connId });
          continue;
        }
        
        const connNode = nodes.get(connId);
        if (!connNode || connNode.deleted) continue;
        
        // 安全检查连接节点向量
        if (!connNode.vector) {
          console.warn(`连接节点没有向量 ID=${connId}`);
          continue;
        }
        
        let connDist;
        try {
          connDist = getDistanceWithCache(newNode, connNode);
        } catch (error) {
          console.error('计算连接距离时出错:', error, { 
            newNodeId: nodeId, 
            connId 
          });
          continue;
        }
        
        if (connDist < bestNeighborDist) {
          bestNeighborId = connId;
          bestNeighborDist = connDist;
          // 不立即中断循环，而是找到当前层最优的节点
        }
      }
      
      // 如果找到了更好的邻居，更新当前节点
      if (bestNeighborId !== null) {
        currentNode = { id: bestNeighborId, level: lc };
        bestDistSoFar = bestNeighborDist;
        changed = true;
      }
    }
  }
  
  // 为每一层添加连接 - 共享层间搜索结果以减少重复计算
  const visitedNodes = new Set(); // 跟踪已访问节点避免重复计算
  
  for (let lc = Math.min(level, state.maxLevel); lc >= 0; lc--) {
    // 基础层使用较大的efConstruction值以提高准确性
    const layerEf = lc === 0 ? efConstruction : Math.min(efConstruction, M * 2);
    
    // 在当前层查找最近邻，利用已有的缓存结果
    const neighbors = searchLayer(
      newNode, 
      lc === 0 ? efConstruction : M, 
      layerEf,
      lc,
      nodes,
      currentNode,
      (a, b) => getDistanceWithCache(a, b), // 使用带缓存的距离函数
      visitedNodes // 避免重复访问节点
    );
    
    if (neighbors.length === 0) continue;
    
    // 仅保留有效的邻居ID
    const validNeighborIds = neighbors
      .filter(n => {
        const node = nodes.get(n.id);
        return node && !node.deleted;
      })
      .map(n => n.id);
    
    // 添加连接 - 直接使用距离排序结果而非重新计算
    if (validNeighborIds.length > 0) {
      addConnections(
        nodeId, 
        validNeighborIds,
        lc,
        nodes,
        M,
        (a, b) => getDistanceWithCache(a, b), // 使用带缓存的距离函数
        false // 不优先保留新连接
      );
      
      // 仅对重要的连接添加反向链接，在基础层使用更多连接以提高召回率
      const maxReverseLinks = lc === 0 ? Math.min(validNeighborIds.length, M) : Math.min(validNeighborIds.length, Math.max(M/2, 4));
      const topNeighbors = validNeighborIds.slice(0, maxReverseLinks);
      
      // 批量处理反向连接以减少函数调用开销
      for (const neighborId of topNeighbors) {
        // 更新邻居节点的前向连接
        addConnections(
          neighborId, 
          [nodeId], 
          lc,
          nodes,
          M,
          (a, b) => getDistanceWithCache(a, b), // 使用带缓存的距离函数
          false // 不优先保留新连接
        );
        
        // 将邻居添加到已访问节点集合
        visitedNodes.add(neighborId);
      }
    }
    
    // 更新当前节点为邻居中最近的节点，用于下一层的起点
    if (neighbors.length > 0) {
      currentNode = { id: neighbors[0].id, level: lc };
    }
  }
  
  return nodeId;
}

/**
 * 搜索K个最近邻
 * @param {Float32Array|Array} queryVector - 查询向量
 * @param {Map} nodes - 节点存储
 * @param {Object} entryPoint - 入口点
 * @param {number} maxLevel - 最大层级
 * @param {number} efSearch - 搜索参数
 * @param {Function} distanceFunc - 距离计算函数
 * @param {number} [k=10] - 返回近邻数量
 * @param {number} [ef=null] - 自定义的ef参数，若为空则使用efSearch
 * @param {Set<number>} [excludeIds=new Set()] - 要排除的节点ID集合
 * @returns {Array<{id: number, distance: number}>} 近邻节点数组
 */
export function searchKNN(queryVector, nodes, entryPoint, maxLevel, efSearch, distanceFunc, k = 10, ef = null, excludeIds = new Set()) {
  // 安全检查：确保入口点有效
  if (!entryPoint || entryPoint.id === undefined || entryPoint.id === null || entryPoint.id === -1) {
    // 如果没有入口点，返回空结果
    return [];
  }
  
  // 确保查询向量是 Array 或 Float32Array 类型
  if (!queryVector || (!(queryVector instanceof Array) && !(queryVector instanceof Float32Array))) {
    console.error('搜索失败: 无效的查询向量', queryVector);
    return [];
  }
  
  // 构造查询对象
  const q = { vector: queryVector };
  
  // 如果未提供ef，则使用efSearch，但确保至少是k的3倍
  const effectiveEf = ef || Math.max(efSearch, k * 3);
  
  // 当前入口点
  let currObj = entryPoint;
  
  // 已访问节点集合，在整个搜索过程中共享
  const visitedNodes = new Set();
  
  // 1. 从顶层开始向下搜索，直到第1层（底层上方）
  // 在上层网络中做路径查找来确定更好的入口点
  for (let level = maxLevel; level > 0; level--) {
    // 在当前层执行贪婪搜索，使用很小的k值以加速探索
    const result = searchLayer(
      q, 1, 1, level, nodes, currObj, distanceFunc, excludeIds, visitedNodes
    );
    
    // 更新入口点，准备进入下一层
    if (result.length > 0) {
      currObj = { id: result[0].id, level: level - 1 };
    }
  }
  
  // 2. 在底层（第0层）执行精细搜索，使用较大的ef获取更准确的结果
  const lowerLayerEf = Math.max(effectiveEf, k * 3); // 确保底层搜索的ef足够大
  const candidates = searchLayer(
    q, k, lowerLayerEf, 0, nodes, currObj, distanceFunc, excludeIds, visitedNodes
  );
  
  // 3. 计算额外的统计信息
  const visitedNodesCount = visitedNodes.size;
  const effectiveSearchDepth = candidates.length;
  
  // 4. 对结果按距离排序 - 确保结果按距离排序是关键
  candidates.sort((a, b) => a.distance - b.distance);
  
  // 5. 增强多样性 - 确保在相似距离范围内覆盖更多节点
  // 使用确定性的采样方法，以避免相同查询的结果变化
  const enhancedResults = [];
  const distanceGroups = {};
  
  // 按距离分组
  for (const candidate of candidates) {
    // 将距离分箱，相似距离的候选放入同一组
    const distanceBin = Math.floor(candidate.distance * 100) / 100;
    if (!distanceGroups[distanceBin]) {
      distanceGroups[distanceBin] = [];
    }
    distanceGroups[distanceBin].push(candidate);
  }
  
  // 从每个距离组中按顺序选择
  const distanceBins = Object.keys(distanceGroups).sort((a, b) => parseFloat(a) - parseFloat(b));
  
  // 先选取每个分箱中的头部元素，确保多样性
  for (const bin of distanceBins) {
    if (distanceGroups[bin].length > 0) {
      enhancedResults.push(distanceGroups[bin][0]);
      distanceGroups[bin].shift();
    }
    
    // 如果已经选了足够的结果就退出
    if (enhancedResults.length >= k) break;
  }
  
  // 如果还需要更多结果，继续从各分箱中选取
  let binIndex = 0;
  while (enhancedResults.length < k && binIndex < distanceBins.length) {
    const bin = distanceBins[binIndex];
    if (distanceGroups[bin].length > 0) {
      enhancedResults.push(distanceGroups[bin][0]);
      distanceGroups[bin].shift();
    } else {
      binIndex++;
    }
  }
  
  // 如果上述策略未能提供足够的结果，使用原始结果填充
  if (enhancedResults.length < k && candidates.length > enhancedResults.length) {
    // 找出已经选择的ID
    const selectedIds = new Set(enhancedResults.map(r => r.id));
    
    // 添加未选择的候选
    for (const candidate of candidates) {
      if (!selectedIds.has(candidate.id)) {
        enhancedResults.push(candidate);
        selectedIds.add(candidate.id);
        
        if (enhancedResults.length >= k) break;
      }
    }
  }
  
  // 确保结果按距离排序
  enhancedResults.sort((a, b) => a.distance - b.distance);
  
  // 添加查询性能信息
  const resultWithInfo = enhancedResults.slice(0, k).map(r => ({
    ...r,
    _searchInfo: {
      visitedNodes: visitedNodesCount,
      searchDepth: effectiveSearchDepth,
      efUsed: effectiveEf
    }
  }));
  
  return resultWithInfo;
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
      // 修正余弦距离计算,确保与computeCosineDistance保持一致
      // 原始computeCosineDistance返回的是相似度,值越大越相似
      // 这里需要将其转换为距离,值越小越相似
      rawDistanceFunc = (a, b) => {
        const similarity = computeCosineDistance(a, b);
        // 由于原始函数返回相似度[-1,1],转换为距离应当是1-similarity,确保距离值越小越相似
        return 1 - similarity;
      };
      break;
    case 'inner_product':
      // 内积越大表示越相似,所以使用负号转换为距离度量(越小越相似)
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
    
    // 新增批量插入功能
    batchInsertNodes: (vectors, dataList = [], batchSize = 10) => batchInsertNodes(
      vectors, dataList, nodes, entryPoint, M, ml, efConstruction, distanceFunc, state, batchSize
    ),
    
    searchKNN: (queryVector, k = 10, searchParams = {}) => {
      // 提取搜索参数,支持更灵活的配置
      const { ef, excludeIds = new Set() } = searchParams || {};
      
      // 调用搜索函数，获取带有统计信息的结果
      const rawResults = searchKNN(
        queryVector, nodes, entryPoint, state.maxLevel, 
        efSearch, distanceFunc, k, ef, excludeIds
      );
      
      // 转换结果格式，移除内部使用的_searchInfo字段
      return rawResults.map(result => {
        // 提取需要暴露给外部的信息
        const { id, distance } = result;
        const node = nodes.get(id);
        
        // 返回用户友好的结果对象
        return {
          id,
          distance,
          // 如果节点存在且有数据,则返回数据
          data: node && node.data ? node.data : null
        };
      });
    },
    
    removeNode: (id) => removeNode(id, nodes, entryPoint, state),
    
    getNode: (id) => {
      const node = nodes.get(id);
      if (!node || node.deleted) return null;
      return { 
        id: node.id, 
        data: node.data,
        // 返回一个拷贝防止外部修改
        vector: node.vector ? new Float32Array(node.vector) : null
      };
    },
    
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
      const nodeId = insertNode(
        batchVectors[j],
        batchData[j] || null,
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