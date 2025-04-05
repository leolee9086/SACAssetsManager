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

// 导入最小堆实现
import { createMinHeap } from "../../../feature/useDataStruct/useHeaps/useMinHeap.js";

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

// 常量定义
const DEFAULT_M = 64;              // 每个节点最大连接数
const DEFAULT_EF_CONSTRUCTION = 200; // 构建时的候选集大小
const DEFAULT_EF_SEARCH = 200;      // 搜索时的候选集大小，从50增加到200提高召回率
const DEFAULT_ML = 16;            // 最大层数
const DEFAULT_DISTANCE_CACHE_SIZE = 100000; // 距离计算缓存大小


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
  
  // 确保ef至少为k，关键参数来保证召回率
  const effectiveEf = Math.max(ef, k * 2);
  
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
  const visited = new Set([...visitedNodes]);
  visited.add(entryPoint.id);
  
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
  
  // 记录最远距离
  let furthestDistance = distance;
  
  // 当候选集不为空时继续搜索
  while (candidatesHeap.size() > 0) {
    // 获取当前最近的候选节点
    const current = candidatesHeap.pop();
    if (!current) continue; // 安全检查
    
    // 如果当前节点比结果集中最远的节点还远，且结果集已满，则停止搜索
    if (resultsHeap.size() >= effectiveEf && current.distance > furthestDistance) {
      break;
    }
    
    // 获取节点并检查其连接
    const currentNode = nodes.get(current.id);
    if (!currentNode || currentNode.deleted) continue;
    
    // 获取当前层的连接
    if (!currentNode.connections || !Array.isArray(currentNode.connections)) {
      continue;
    }
    
    const connections = Array.isArray(currentNode.connections[level]) ? 
      currentNode.connections[level] : [];
    
    // 检查所有邻居
    for (const neighborId of connections) {
      // 跳过已访问或排除的节点
      if (visited.has(neighborId) || excludeIds.has(neighborId)) continue;
      
      const neighbor = nodes.get(neighborId);
      if (!neighbor || neighbor.deleted || !neighbor.vector) continue;
      
      // 标记为已访问
      visited.add(neighborId);
      
      // 计算距离
      let neighborDistance;
      try {
        neighborDistance = distanceFunc(q.vector, neighbor.vector);
      } catch (error) {
        console.error('邻居距离计算失败:', error);
        continue;
      }
      
      // 如果距离小于当前最远距离或结果集未满，则加入结果集
      const shouldAddToResults = resultsHeap.size() < effectiveEf || neighborDistance < furthestDistance;
      
      if (shouldAddToResults) {
        // 优先加入候选集，确保搜索能够扩散
        candidatesHeap.push({ id: neighborId, distance: neighborDistance });
        resultsHeap.push({ id: neighborId, distance: neighborDistance });
        
        // 如果结果集超过ef，移除最远的
        if (resultsHeap.size() > effectiveEf) {
          resultsHeap.popWorst();
        }
        
        // 更新最远距离
        if (resultsHeap.size() >= effectiveEf) {
          const worst = resultsHeap.getWorst();
          furthestDistance = worst ? worst.distance : Infinity;
        }
      }
    }
  }
  
  // 将结果转换为数组并按距离排序
  const results = [];
  while (resultsHeap.size() > 0) {
    results.push(resultsHeap.pop());
  }
  
  // 按距离从近到远排序
  results.sort((a, b) => a.distance - b.distance);
  
  // 返回前k个结果
  return results.slice(0, k);
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
  
  // 获取现有连接
  const existingConnections = new Set(node.connections[level]);
  const newConnectionIds = [];
  
  // 过滤有效的新连接
  for (const connId of connectionIds) {
    // 跳过自连接或已存在的连接
    if (connId === nodeId || existingConnections.has(connId)) continue;
    
    // 验证节点有效性
    const connNode = nodes.get(connId);
    if (!connNode || connNode.deleted) continue;
    
    // 添加到新连接列表
    newConnectionIds.push(connId);
  }
  
  // 如果没有有效的新连接，直接返回
  if (newConnectionIds.length === 0) return;
  
  // 将新连接添加到现有连接列表
  node.connections[level] = [...node.connections[level], ...newConnectionIds];
  
  // 如果总连接数超过限制M，进行修剪
  if (node.connections[level].length > M) {
    // 临时存储连接的距离
    const connectionDistances = [];
    
    // 计算所有连接的距离
    for (const connId of node.connections[level]) {
      const connNode = nodes.get(connId);
      if (!connNode || connNode.deleted) continue;
      
      try {
        const distance = distanceFunc(node.vector, connNode.vector);
        connectionDistances.push({
          id: connId,
          distance: distance,
          // 标记是否为新连接
          isNew: newConnectionIds.includes(connId)
        });
      } catch (error) {
        console.error(`计算连接距离出错：节点${nodeId}到${connId}`, error);
      }
    }
    
    // 按距离排序
    connectionDistances.sort((a, b) => {
      // 如果优先新连接，新连接排在前面
      if (preferNewConnections && a.isNew !== b.isNew) {
        return a.isNew ? -1 : 1;
      }
      // 否则按距离排序
      return a.distance - b.distance;
    });
    
    // 保留M个最近连接
    node.connections[level] = connectionDistances
      .slice(0, M)
      .map(conn => conn.id);
  }
  
  // 对于底层连接，增加双向连接以提高召回率
  if (level === 0) {
    // 提高底层连接的双向性，确保每个节点都能被正确检索到
    for (const connId of node.connections[level]) {
      const connNode = nodes.get(connId);
      if (!connNode || connNode.deleted) continue;
      
      // 确保连接节点的连接数组存在
      while (connNode.connections.length <= level) {
        connNode.connections.push([]);
      }
      
      // 检查是否已存在反向连接
      if (!connNode.connections[level].includes(nodeId)) {
        // 添加反向连接
        connNode.connections[level].push(nodeId);
        
        // 如果连接数超过限制，修剪
        if (connNode.connections[level].length > M) {
          // 临时存储连接的距离
          const backConnectionDistances = [];
          
          // 计算所有连接的距离
          for (const backConnId of connNode.connections[level]) {
            const backConnNode = nodes.get(backConnId);
            if (!backConnNode || backConnNode.deleted) continue;
            
            try {
              const backDistance = distanceFunc(connNode.vector, backConnNode.vector);
              backConnectionDistances.push({
                id: backConnId,
                distance: backDistance,
                // 当前节点特殊处理
                isSpecial: backConnId === nodeId
              });
            } catch (error) {
              console.error(`计算反向连接距离出错：节点${connId}到${backConnId}`, error);
            }
          }
          
          // 按距离排序，但给新节点加入的连接一定优先级
          backConnectionDistances.sort((a, b) => {
            // 当前节点优先级更高，确保双向连接
            if (a.isSpecial !== b.isSpecial) {
              return a.isSpecial ? -1 : 1;
            }
            return a.distance - b.distance;
          });
          
          // 保留M个最近连接
          connNode.connections[level] = backConnectionDistances
            .slice(0, M)
            .map(conn => conn.id);
        }
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
  // 确保状态对象包含所有必要字段
  if (!state.maxId && state.maxId !== 0) {
    state.maxId = 0;
  }
  
  const nodeId = state.maxId + 1;
  state.maxId = nodeId; // 更新maxId
  
  // 确保data中包含原始id，使用辅助函数处理ID映射
  const nodeData = ensureNodeIdMapping(data, nodeId);
  
  // 为新节点分配随机层数
  const level = getRandomLevel(ml, M);
  
  // 创建节点并添加到图中
  const newNode = createHNSWNode(nodeId, vector, nodeData);
  
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
  
  // 如果新节点层级高于当前最高层级，更新入口点和状态
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
  
  // 搜索路径上的所有点，用于保存每层访问的节点
  const visitedPerLevel = new Array(level + 1).fill().map(() => new Set());
  
  // 从最高层开始，找到合适的起点
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
    
    while (changed) {
      changed = false;
      
      // 检查当前节点的连接
      if (!entryNodeObj.connections || !Array.isArray(entryNodeObj.connections[lc])) {
        break; // 当前层级没有连接，无法继续
      }
      
      // 获取当前层的邻居
      const neighbors = entryNodeObj.connections[lc]
        .filter(nId => {
          const nNode = nodes.get(nId);
          return nNode && !nNode.deleted;
        })
        .map(nId => {
          const nNode = nodes.get(nId);
          // 计算距离
          const dist = getDistanceWithCache(vector, nNode.vector);
          return { id: nId, distance: dist };
        })
        .sort((a, b) => a.distance - b.distance);
      
      // 如果没有邻居，无法继续
      if (neighbors.length === 0) break;
      
      // 如果找到更近的邻居，更新当前节点
      if (neighbors[0].distance < getDistanceWithCache(vector, entryNodeObj.vector)) {
        currentNode = { id: neighbors[0].id, level: lc };
        entryNodeObj = nodes.get(currentNode.id);
        changed = true;
        
        // 记录访问的节点
        visitedPerLevel[lc].add(neighbors[0].id);
      }
    }
  }
  
  // 在新节点的每一层添加连接 - 从当前层直到0层
  for (let lc = level; lc >= 0; lc--) {
    // 使用贪婪搜索找到当前层的最近点
    // 将当前节点加入候选集
    let candidates = [{ 
      id: currentNode.id, 
      distance: getDistanceWithCache(vector, nodes.get(currentNode.id).vector) 
    }];
    
    // 记录访问的节点
    visitedPerLevel[lc].add(currentNode.id);
    
    // 记录每一层的已访问节点，用于计算搜索路径
    const visited = new Set([currentNode.id]);
    
    // 执行更广泛的efConstruction搜索，确保找到高质量的连接
    const ep = { vector: vector };
    const W = searchLayer(
      ep, // 以新节点为查询点
      efConstruction, // 构建时使用更大的候选集
      efConstruction,
      lc, // 当前层
      nodes,
      currentNode, // 从之前找到的点开始
      distanceFunc,
      new Set(), // 不排除任何节点
      visited // 记录访问过的节点
    );
    
    // 为当前层选择最近的M个节点作为连接
    if (W.length > 0) {
      // 取最近的M个节点
      const connectionsForLayer = W.slice(0, M).map(n => n.id);
      
      // 添加连接 - 注意要为底层建立更强的双向连接
      addConnections(
        nodeId, 
        connectionsForLayer, 
        lc, 
        nodes, 
        M, 
        distanceFunc,
        true // 优先保留新连接
      );
      
      // 记录当前层访问的节点，用于下一层搜索
      for (const item of W) {
        visitedPerLevel[lc].add(item.id);
      }
      
      // 特别为底层(lc=0)增强双向连接，强制每个连接点都与新节点建立双向连接
      if (lc === 0) {
        // 遍历所有最近的节点，确保它们都与新节点相连
        for (const connId of connectionsForLayer) {
          const connNode = nodes.get(connId);
          if (!connNode || connNode.deleted) continue;
          
          // 确保连接节点的连接数组存在
          while (connNode.connections.length <= lc) {
            connNode.connections.push([]);
          }
          
          // 检查是否已存在反向连接
          if (!connNode.connections[lc].includes(nodeId)) {
            // 添加反向连接 (无条件添加)
            connNode.connections[lc].push(nodeId);
            
            // 如果连接数超过限制，需要修剪，但确保保留到新节点的连接
            if (connNode.connections[lc].length > M) {
              // 计算与其他节点的距离，排序时优先保留新节点连接
              const distances = [];
              for (const otherConnId of connNode.connections[lc]) {
                const otherNode = nodes.get(otherConnId);
                if (!otherNode || otherNode.deleted) continue;
                
                try {
                  const dist = distanceFunc(connNode.vector, otherNode.vector);
                  distances.push({
                    id: otherConnId,
                    distance: dist,
                    isNewNode: otherConnId === nodeId // 标记是否为新添加的节点
                  });
                } catch (error) {
                  console.error(`计算连接距离失败: ${connId} -> ${otherConnId}`, error);
                }
              }
              
              // 排序时，新节点具有更高优先级
              distances.sort((a, b) => {
                // 如果其中一个是新节点，新节点优先
                if (a.isNewNode !== b.isNewNode) {
                  return a.isNewNode ? -1 : 1;
                }
                // 否则按距离排序
                return a.distance - b.distance;
              });
              
              // 保留前M个节点的连接
              connNode.connections[lc] = distances.slice(0, M).map(d => d.id);
            }
          }
        }
        
        // 额外的操作：为确保高召回率，检查其他近邻节点
        // 获取所有层累计访问的独特节点
        const allVisitedNodes = new Set();
        for (const levelSet of visitedPerLevel) {
          for (const nodeId of levelSet) {
            allVisitedNodes.add(nodeId);
          }
        }
        
        // 针对访问过的节点，计算与新节点的距离
        const candidatesWithDist = [];
        for (const visitedId of allVisitedNodes) {
          if (visitedId === nodeId) continue; // 跳过自身
          
          const visitedNode = nodes.get(visitedId);
          if (!visitedNode || visitedNode.deleted) continue;
          
          // 计算与新节点的距离
          try {
            const dist = distanceFunc(vector, visitedNode.vector);
            candidatesWithDist.push({ id: visitedId, distance: dist });
          } catch (error) {
            console.error(`计算距离失败: ${nodeId} -> ${visitedId}`, error);
          }
        }
        
        // 按距离排序
        candidatesWithDist.sort((a, b) => a.distance - b.distance);
        
        // 选择最近的额外节点添加连接
        const extraConnections = candidatesWithDist
          .slice(0, Math.min(M, candidatesWithDist.length))
          .map(c => c.id);
        
        if (extraConnections.length > 0) {
          // 添加额外连接
          addConnections(
            nodeId, 
            extraConnections, 
            0, // 只在底层添加额外连接
            nodes, 
            M, 
            distanceFunc,
            false // 不特别优先这些额外连接
          );
        }
      }
    }
    
    // 更新当前节点，准备下一层搜索
    if (W.length > 0) {
      currentNode = { id: W[0].id, level: lc };
    }
  }
  
  return nodeId;
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
 * @param {Object} [searchParams={}] - 搜索参数，包括debug标志
 * @returns {Array<{id: number, distance: number, data: any}>} 最近邻节点列表
 */
export function searchKNN(queryVector, nodes, entryPoint, maxLevel, efSearch, distanceFunc, k = 10, ef = null, excludeIds = new Set(), searchParams = {}) {
  // 防御性检查
  if (!queryVector || !nodes || !entryPoint || !distanceFunc) {
    console.error('searchKNN错误：无效参数', {
      hasQueryVector: !!queryVector,
      hasNodes: !!nodes, 
      hasEntryPoint: !!entryPoint,
      hasDistanceFunc: !!distanceFunc
    });
    return [];
  }
  
  // 如果索引为空，返回空结果
  if (nodes.size === 0 || entryPoint.id === null) {
    return [];
  }
  
  // 确保参数有效，使用更大的ef值提高召回率
  const effectiveEf = ef || Math.max(efSearch, k * 4); // 从k*2增加到k*4
  
  try {
    // 创建查询对象
    const query = { vector: queryVector };
    
    // 从入口点开始
    let currObj = entryPoint;
    
    // 1. 自顶向下遍历层级图
    for (let level = maxLevel; level > 0; level--) {
      // 在当前层查找最近的节点
      const result = searchLayer(
        query,
        1,  // 只需要找最近的一个节点
        1,  // 候选集大小为1
        level,
        nodes,
        currObj,
        distanceFunc,
        excludeIds
      );
      
      if (result.length > 0) {
        currObj = { id: result[0].id };
      }
    }
    
    // 2. 在底层（0层）执行更广泛的搜索 - 使用更大的ef值
    const visitedSet = new Set();  // 跟踪已访问节点
    const results = searchLayer(
      query,
      k,
      effectiveEf, // 使用更大的ef值
      0,  // 层级0
      nodes,
      currObj,
      distanceFunc,
      excludeIds,
      visitedSet
    );
    
    // 增加调试信息
    const debugEnabled = searchParams?.debug === true;
    if (debugEnabled) {
      console.log(`-------- HNSW搜索调试信息 --------`);
      console.log(`查询向量: ${Array.isArray(queryVector) ? '[Array]' : '[对象]'}, 长度: ${queryVector.length || 'unknown'}`);
      console.log(`ef值: ${effectiveEf}, k值: ${k}`);
      console.log(`入口点ID: ${entryPoint.id}, 最大层级: ${maxLevel}`);
      console.log(`搜索匹配数: ${results.length}`);
      console.log(`访问节点数: ${visitedSet.size}`);
      
      // 打印前5个结果的ID映射信息
      if (results.length > 0) {
        console.log(`前${Math.min(5, results.length)}个结果的ID映射:`);
        for (let i = 0; i < Math.min(5, results.length); i++) {
          const item = results[i];
          const node = nodes.get(item.id);
          console.log(`  [${i}] 内部ID: ${item.id}, 距离: ${item.distance.toFixed(4)}, ` + 
            `原始ID: ${node?.data?.originalId}, data.id: ${node?.data?.id}`);
        }
      }
      console.log(`------------------------------------`);
    }
    
    // 3. 处理结果 - 使用节点元数据中的原始ID
    
    // 将结果映射到原始ID
    return results.map(item => {
      const node = nodes.get(item.id);
      // 使用原始数据中的ID而不是内部节点ID
      // 优先使用originalId字段，其次是id字段，最后才使用内部ID
      const originalId = node?.data?.originalId !== undefined ? 
        node.data.originalId : (node?.data?.id !== undefined ? node.data.id : item.id);
      
      return {
        id: originalId, // 使用原始ID
        internalId: item.id, // 保留内部ID用于调试
        distance: item.distance,
        data: node?.data || null
      };
    });
  } catch (error) {
    console.error('searchKNN执行错误:', error);
    return [];
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
 * 优化HNSW索引的连接结构以提高召回率
 * @param {Map} nodes - 节点存储
 * @param {Object} entryPoint - 入口点
 * @param {Function} distanceFunc - 距离计算函数
 * @param {number} M - 每层最大连接数
 * @param {Object} state - 状态对象
 * @param {Object} options - 优化选项
 * @returns {Object} 优化结果统计
 */
export function optimizeIndexConnectivity(nodes, entryPoint, distanceFunc, M, state, options = {}) {
  // 默认选项
  const defaults = {
    sampleRate: 0.2,           // 需要优化的节点比例
    layersToOptimize: [0],     // 需要优化的层级，默认只优化底层
    minConnectionsPerNode: 8,  // 每个节点的最小连接数
    targetBidirectionalRate: 0.8 // 目标双向连接率
  };
  
  // 合并选项
  const opts = { ...defaults, ...options };
  
  console.log('开始优化HNSW索引连接结构...');
  console.log(`- 采样率: ${opts.sampleRate * 100}%`);
  console.log(`- 优化层级: ${opts.layersToOptimize.join(', ')}`);
  console.log(`- 最小连接数: ${opts.minConnectionsPerNode}`);
  console.log(`- 目标双向连接率: ${opts.targetBidirectionalRate * 100}%`);
  
  // 收集有效节点
  const validNodes = [];
  for (const [nodeId, node] of nodes.entries()) {
    if (!node.deleted && node.vector) {
      validNodes.push(nodeId);
    }
  }
  
  // 如果没有有效节点，直接返回
  if (validNodes.length === 0) {
    console.log('没有有效节点需要优化');
    return { success: false, reason: '没有有效节点' };
  }
  
  // 计算需要处理的节点数量
  const numNodesToProcess = Math.max(
    20, 
    Math.floor(validNodes.length * opts.sampleRate)
  );
  
  // 随机选择需要处理的节点
  const shuffledNodes = validNodes.sort(() => Math.random() - 0.5);
  const nodesToProcess = shuffledNodes.slice(0, numNodesToProcess);
  
  console.log(`将处理 ${nodesToProcess.length}/${validNodes.length} 个节点`);
  
  // 统计信息
  const stats = {
    processedNodes: 0,
    addedConnections: 0,
    bidirectionalConnections: {
      before: 0,
      after: 0
    },
    avgConnectionsPerNode: {
      before: 0,
      after: 0
    }
  };
  
  // 收集优化前的统计信息
  let totalConnectionsBefore = 0;
  let bidirectionalConnectionsBefore = 0;
  
  // 遍历所有需要处理的层级
  for (const layer of opts.layersToOptimize) {
    console.log(`优化层级 ${layer}...`);
    
    // 统计每个节点的连接数和双向连接
    for (const nodeId of validNodes) {
      const node = nodes.get(nodeId);
      if (!node || !node.connections || node.connections.length <= layer) continue;
      
      const connections = node.connections[layer] || [];
      totalConnectionsBefore += connections.length;
      
      // 检查双向连接
      for (const connId of connections) {
        const connNode = nodes.get(connId);
        if (!connNode || !connNode.connections || connNode.connections.length <= layer) continue;
        
        if (connNode.connections[layer].includes(nodeId)) {
          bidirectionalConnectionsBefore++;
        }
      }
    }
    
    // 处理选定的节点
    for (const nodeId of nodesToProcess) {
      const node = nodes.get(nodeId);
      if (!node || !node.vector) continue;
      
      // 确保节点有连接数组
      while (node.connections.length <= layer) {
        node.connections.push([]);
      }
      
      // 获取当前连接
      const currentConnections = new Set(node.connections[layer] || []);
      
      // 如果连接数已经达到或超过M，跳过
      if (currentConnections.size >= M) continue;
      
      // 检查当前连接，统计双向连接数
      let bidirectionalCount = 0;
      for (const connId of currentConnections) {
        const connNode = nodes.get(connId);
        if (!connNode || connNode.deleted) continue;
        
        // 检查是否有双向连接
        const hasReverseConn = connNode.connections[layer] && 
          connNode.connections[layer].includes(nodeId);
          
        if (hasReverseConn) {
          bidirectionalCount++;
        }
      }
      
      // 如果双向连接率已经达到目标，跳过
      const currentBidirectionalRate = currentConnections.size > 0 ? 
        bidirectionalCount / currentConnections.size : 0;
        
      if (currentConnections.size >= opts.minConnectionsPerNode && 
          currentBidirectionalRate >= opts.targetBidirectionalRate) {
        continue;
      }
      
      // 查找最近的节点
      const nearestNeighbors = [];
      for (const otherId of validNodes) {
        // 跳过自己和已经连接的节点
        if (otherId === nodeId || currentConnections.has(otherId)) continue;
        
        const otherNode = nodes.get(otherId);
        if (!otherNode || !otherNode.vector) continue;
        
        try {
          // 计算距离
          const distance = distanceFunc(node.vector, otherNode.vector);
          nearestNeighbors.push({ id: otherId, distance });
        } catch (error) {
          console.error(`计算节点${nodeId}和${otherId}之间的距离失败:`, error);
        }
      }
      
      // 按距离排序
      nearestNeighbors.sort((a, b) => a.distance - b.distance);
      
      // 选择最近的节点建立连接
      const neededConnections = Math.min(
        M - currentConnections.size,
        nearestNeighbors.length
      );
      
      if (neededConnections > 0) {
        // 选择最近的neededConnections个节点
        const newConnections = nearestNeighbors
          .slice(0, neededConnections)
          .map(n => n.id);
          
        // 添加新连接
        for (const connId of newConnections) {
          if (!currentConnections.has(connId)) {
            node.connections[layer].push(connId);
            currentConnections.add(connId);
            stats.addedConnections++;
            
            // 添加反向连接
            const connNode = nodes.get(connId);
            if (!connNode) continue;
            
            // 确保连接节点有连接数组
            while (connNode.connections.length <= layer) {
              connNode.connections.push([]);
            }
            
            // 如果没有反向连接，添加
            if (!connNode.connections[layer].includes(nodeId)) {
              connNode.connections[layer].push(nodeId);
              stats.addedConnections++;
            }
          }
        }
      }
      
      stats.processedNodes++;
    }
  }
  
  // 收集优化后的统计信息
  let totalConnectionsAfter = 0;
  let bidirectionalConnectionsAfter = 0;
  
  // 统计优化后的连接情况
  for (const layer of opts.layersToOptimize) {
    for (const nodeId of validNodes) {
      const node = nodes.get(nodeId);
      if (!node || !node.connections || node.connections.length <= layer) continue;
      
      const connections = node.connections[layer] || [];
      totalConnectionsAfter += connections.length;
      
      // 检查双向连接
      for (const connId of connections) {
        const connNode = nodes.get(connId);
        if (!connNode || !connNode.connections || connNode.connections.length <= layer) continue;
        
        if (connNode.connections[layer].includes(nodeId)) {
          bidirectionalConnectionsAfter++;
        }
      }
    }
  }
  
  // 计算平均连接数和双向连接率
  stats.avgConnectionsPerNode.before = totalConnectionsBefore / validNodes.length;
  stats.avgConnectionsPerNode.after = totalConnectionsAfter / validNodes.length;
  
  stats.bidirectionalConnections.before = totalConnectionsBefore > 0 ? 
    bidirectionalConnectionsBefore / totalConnectionsBefore : 0;
    
  stats.bidirectionalConnections.after = totalConnectionsAfter > 0 ? 
    bidirectionalConnectionsAfter / totalConnectionsAfter : 0;
  
  console.log('优化完成，统计信息:');
  console.log(`- 处理节点数: ${stats.processedNodes}`);
  console.log(`- 添加连接数: ${stats.addedConnections}`);
  console.log(`- 平均连接数: ${stats.avgConnectionsPerNode.before.toFixed(2)} -> ${stats.avgConnectionsPerNode.after.toFixed(2)}`);
  console.log(`- 双向连接率: ${(stats.bidirectionalConnections.before * 100).toFixed(2)}% -> ${(stats.bidirectionalConnections.after * 100).toFixed(2)}%`);
  
  return {
    success: true,
    stats
  };
}

/**
 * 创建HNSW索引
 * @param {Object} options - 配置选项
 * @returns {Object} HNSW索引实例
 */
export function createHNSWIndex({
  distanceFunction = 'euclidean',
  M = DEFAULT_M,
  efConstruction = DEFAULT_EF_CONSTRUCTION,
  efSearch = DEFAULT_EF_SEARCH,
  ml = DEFAULT_ML,
  useDistanceCache = true
} = {}) {
  // 参数安全检查和调整
  const effectiveM = Math.max(16, M); // 确保M至少为16
  const effectiveEfConstruction = Math.max(100, efConstruction); // 确保efConstruction至少为100
  const effectiveEfSearch = Math.max(100, efSearch); // 确保efSearch至少为100
  const effectiveMl = Math.max(10, ml); // 确保ml至少为10
  
  // 1. 初始化内部状态
  const nodes = new Map();
  const state = {
    maxId: 0,            // 当前最大节点ID
    maxLevel: 0,         // 当前最大层数
    nodeCount: 0,        // 有效节点数量
    deletedCount: 0,     // 已删除节点数量
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
  
  // 参数对象 - 使用调整过的参数
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
    const { ef = null, excludeIds = new Set(), debug = false } = searchParams || {};
    
    // 使用比k大的ef值提高召回率
    const effectiveEf = ef || Math.max(effectiveEfSearch, k * 4);
    
    // 调用搜索逻辑
    const results = searchKNN(
      queryVector, 
      nodes, 
      entryPoint, 
      state.maxLevel, 
      effectiveEfSearch,
      distanceFunc, 
      k, 
      effectiveEf, 
      excludeIds,
      { debug } // 传递debug标志
    );
    
    // 确保结果使用了正确的ID
    return results.map(item => {
      // 已经在searchKNN中正确映射ID，直接返回
      return {
        id: item.id,           // 原始ID
        internalId: item.internalId,  // 内部ID
        distance: item.distance,
        data: item.data
      };
    });
  };
  
  return {
    insertNode: (vector, data = null) => insertNode(
      vector, data, nodes, entryPoint, effectiveM, effectiveMl, effectiveEfConstruction, distanceFunc, state
    ),
    
    // 新增批量插入功能
    batchInsertNodes: (vectors, dataList = [], batchSize = 10) => batchInsertNodes(
      vectors, dataList, nodes, entryPoint, effectiveM, effectiveMl, effectiveEfConstruction, distanceFunc, state, batchSize
    ),
    
    searchKNN: searchKNNMethod,
    
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
    
    // 新增：优化索引连接结构
    optimizeConnectivity: (options = {}) => optimizeIndexConnectivity(
      nodes, entryPoint, distanceFunc, effectiveM, state, options
    ),
    
    // 新增：ID映射验证功能，用于调试
    verifyIdMapping: () => {
      console.log("---- HNSW索引ID映射验证 ----");
      let missingOriginalId = 0;
      let missingDataId = 0;
      let idMappingStats = {};
      
      for (const [nodeId, node] of nodes.entries()) {
        if (node.deleted) continue; // 跳过已删除节点
        
        if (!node.data) {
          console.log(`节点 ${nodeId} 缺少data字段`);
          missingDataId++;
          continue;
        }
        
        const hasOriginalId = node.data.originalId !== undefined;
        const hasDataId = node.data.id !== undefined;
        
        const mappingType = `${hasOriginalId ? 'O' : '-'}${hasDataId ? 'D' : '-'}`;
        idMappingStats[mappingType] = (idMappingStats[mappingType] || 0) + 1;
        
        if (!hasOriginalId && !hasDataId) {
          console.log(`节点 ${nodeId} 缺少originalId和id字段`);
          missingOriginalId++;
        }
      }
      
      console.log(`总节点数: ${nodes.size}, 有效节点数: ${state.nodeCount}`);
      console.log(`ID映射统计:`, idMappingStats);
      console.log(`缺少data字段的节点: ${missingDataId}`);
      console.log(`缺少ID映射的节点: ${missingOriginalId}`);
      console.log("----------------------------");
      
      return {
        totalNodes: nodes.size,
        activeNodes: state.nodeCount,
        missingDataCount: missingDataId,
        missingIdMappingCount: missingOriginalId,
        idMappingStats
      };
    },
    
    // 暴露一些内部引用以便DeltaPQ算法集成
    _nodes: nodes,
    _distanceFunc: distanceFunc,
    _getEntryPoint: () => entryPoint,
    _getRawDistanceFunc: () => distanceFunc,
    
    // 添加重建索引方法，修复ID映射问题
    rebuildIndex: () => {
      console.log("开始重建HNSW索引以修复ID映射...");
      
      // 收集所有有效的向量和数据
      const allVectors = [];
      const allData = [];
      let validCount = 0;
      
      // 遍历所有节点，获取有效数据
      for (const [nodeId, node] of nodes.entries()) {
        if (node.deleted || !node.vector) continue;
        
        // 修复数据对象
        let fixedData = node.data || {};
        
        // 确保originalId存在
        if (fixedData.originalId === undefined) {
          fixedData.originalId = fixedData.id !== undefined ? fixedData.id : nodeId;
        }
        
        // 保证id字段存在
        if (fixedData.id === undefined) {
          fixedData.id = fixedData.originalId;
        }
        
        // 添加额外跟踪信息
        fixedData._rebuiltFrom = nodeId;
        
        allVectors.push(node.vector);
        allData.push(fixedData);
        validCount++;
      }
      
      console.log(`收集了${validCount}个有效节点的数据`);
      
      // 清空当前索引
      nodes.clear();
      
      // 重置状态
      state.maxId = 0;
      state.maxLevel = 0;
      state.nodeCount = 0;
      state.deletedCount = 0;
      
      // 重置入口点
      entryPoint.id = null;
      entryPoint.level = -1;
      
      // 批量插入所有向量
      if (allVectors.length > 0) {
        const insertedIds = batchInsertNodes(
          allVectors,
          allData,
          nodes,
          entryPoint,
          effectiveM,
          effectiveMl,
          effectiveEfConstruction,
          distanceFunc,
          state,
          100 // 使用较大的批量大小加速重建
        );
        
        console.log(`HNSW索引重建完成，插入了${insertedIds.length}个节点`);
        return {
          success: true,
          rebuiltCount: insertedIds.length,
          originalCount: validCount
        };
      } else {
        console.log("没有有效数据可重建");
        return {
          success: false,
          rebuiltCount: 0,
          originalCount: validCount
        };
      }
    }
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
 * 贪婪搜索当前层级查找最近点
 * @param {Object} queryNode - 查询节点 {vector: Float32Array}
 * @param {Object} entryPoint - 入口点 {id: number}
 * @param {number} level - 当前层级
 * @param {Map} nodes - 节点存储
 * @param {Function} distanceFunc - 距离计算函数
 * @param {Set<number>} [visited=new Set()] - 已访问节点集合
 * @returns {Object} 最近点 {id: number, distance: number}
 */
export function greedySearchLayer(queryNode, entryPoint, level, nodes, distanceFunc, visited = new Set()) {
  if (!entryPoint || entryPoint.id === null) {
    return { id: null, distance: Infinity };
  }
  
  // 获取入口点节点
  let currentNode = nodes.get(entryPoint.id);
  if (!currentNode || currentNode.deleted) {
    return { id: null, distance: Infinity };
  }
  
  // 计算到入口点的距离
  const queryVector = queryNode.vector;
  if (!queryVector || !currentNode.vector) {
    return { id: null, distance: Infinity };
  }
  
  // 修复：确保参数顺序正确，先查询向量后节点向量
  let currentDistance = distanceFunc(queryVector, currentNode.vector);
  let currentBest = { id: currentNode.id, distance: currentDistance };
  
  // 标记当前节点为已访问
  visited.add(currentNode.id);
  
  let changed = true;
  
  // 贪婪搜索
  while (changed) {
    changed = false;
    
    // 检查当前节点的连接
    if (!currentNode.connections || !currentNode.connections[level]) {
      break;
    }
    
    const connections = currentNode.connections[level];
    
    // 遍历连接查找更近的节点
    for (const neighborId of connections) {
      // 跳过已访问的节点
      if (visited.has(neighborId)) continue;
      
      const neighbor = nodes.get(neighborId);
      if (!neighbor || neighbor.deleted || !neighbor.vector) continue;
      
      // 标记为已访问
      visited.add(neighborId);
      
      // 修复：确保参数顺序正确，先查询向量后节点向量
      const distance = distanceFunc(queryVector, neighbor.vector);
      
      // 如果找到更近的点，更新当前最佳点
      if (distance < currentBest.distance) {
        currentBest = { id: neighborId, distance: distance };
        currentNode = neighbor;
        currentDistance = distance;
        changed = true;
        break;
      }
    }
  }
  
  return currentBest;
}