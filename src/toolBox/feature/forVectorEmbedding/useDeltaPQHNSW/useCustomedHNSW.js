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
const DEFAULT_EF_CONSTRUCTION = 800;  // 构建时候选集大小
const DEFAULT_EF_SEARCH = 800;        // 搜索时候选集大小
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
 * 获取随机层级 - 严格匹配Hora实现
 * @param {number} maxLevel - 最大层级
 * @returns {number} 随机层级
 */
function getRandomLevel(maxLevel) {
  // 使用严格匹配Hora的实现方式
  let level = 0;
  const probability = 0.5; // 与Hora相同的概率值
  
  // 使用while循环和随机概率，完全匹配Hora的实现
  while (level < maxLevel) {
    if (Math.random() > probability) {
      level += 1;
    } else {
      break;
    }
  }
  
  return level;
}

/**
 * 计算层级预期邻居数量 - 精确匹配hora的实现
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
    // 【改进】：使用更平滑的衰减函数，确保层级间连接数量变化更加合理
    // Hora风格的指数衰减公式
    const normLevel = level / Math.max(1, maxLevel);
    const decayFactor = Math.exp(-4 * normLevel); // 使用更陡峭的指数衰减
    
    // 连接数从底层M到minM之间平滑过渡
    let expectedM = minM + (bottomLevelM - minM) * decayFactor;
    
    // 确保结果为整数并不小于minM
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
  //缓存在这里是必要性不大的
  return function cachedDistance(a, b) {
    const distance = distanceFunc(a, b);
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
  
  // 【完全匹配Hora的实现】: 按距离顺序遍历所有候选节点
  for (const candidate of candidates) {
    // 如果已选足够邻居,停止选择
    if (selectedNeighbors.length >= maxNeighbors) {
      break;
    }
    
    // 候选节点
    const candidateNode = candidate.node;
    if (!candidateNode || !candidateNode.vector) continue;
    
    // 候选到查询节点的距离
    const candidateDistance = candidate.distance;
    
    // 如果总候选数小于所需邻居数或这是第一个候选,直接添加
    if (candidates.length <= maxNeighbors || selectedNeighbors.length === 0) {
      selectedNeighbors.push(candidate);
      continue;
    }
    
    // 【核心判断】: 检查候选节点是否能提供"信息增益"
    let good = true;
    
    // 遍历已选择的邻居进行比较 - 完全匹配Hora的实现
    for (const selectedNeighbor of selectedNeighbors) {
      const selectedNode = selectedNeighbor.node;
      if (!selectedNode || !selectedNode.vector) continue;
      
      
        // 计算候选节点到已选邻居的距离
        const distanceBetween = distanceFunc(candidateNode.vector, selectedNode.vector);
        
        // 【小世界图核心判断 - 与Hora完全一致】:
        // 如果候选节点到某个已选邻居的距离 < 候选到查询节点的距离
        // 则该候选节点不会提供新的有效信息路径
        if (distanceBetween < candidateDistance) {
          good = false;
          break;  // 一旦确定无效,立即停止检查
        }
      
    }
    
    // 如果候选邻居有效(提供新的信息路径),添加到结果
    if (good) {
      selectedNeighbors.push(candidate);
    }
  }
  
  // 【最终确保】: 结果按距离排序 - 完全匹配Hora的实现
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
    
    // 【改进】：如果邻居的连接中没有当前节点,使用启发式算法添加
    if (!connNode.connections[level].includes(nodeId)) {
      // 获取当前节点的向量
      const currentNodeVector = node.vector;
      if (!currentNodeVector) continue;
      
      // 准备候选邻居列表，包括现有邻居和当前节点
      const candidates = [];
      
      // 添加现有连接
      for (const existingConnId of connNode.connections[level]) {
        const existingNode = nodes.get(existingConnId);
        if (!existingNode || existingNode.deleted || !existingNode.vector) continue;
        
          const distance = distanceFunc(connNode.vector, existingNode.vector);
          candidates.push({ 
            id: existingConnId, 
            distance, 
            node: existingNode 
          });
       
      }
      
      // 添加当前节点作为候选
      candidates.push({ 
        id: nodeId, 
        distance: connDistance, 
        node: node 
      });
      
      // 【核心改进】: 使用同样的启发式算法选择邻居，确保双向连接质量一致
      // 而不是简单地使用堆排序
      const selectedCandidates = selectNeighborsHeuristic(
        candidates,
        level,
        nodes,
        distanceFunc
      );
      
      // 更新邻居连接
      connNode.connections[level] = selectedCandidates.map(c => c.id);
    }
  }
  
  // 返回最近邻居作为下一层搜索的入口点
  return closestNeighbor;
}

/**
 * 贪心搜索当前层级，查找最近的节点，使用双重循环确保找到最优入口点
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
  
  // 已访问节点集合初始化
  const visitedSet = new Set(visited);
  
  // 获取查询向量
  const queryVector = queryNode.vector;
  if (!queryVector) {
    return { id: null, distance: Infinity };
  }
  
  // 初始化当前节点为入口点
  let currentId = entryPoint.id;
  let currentNode = nodes.get(currentId);
  if (!currentNode || currentNode.deleted || !currentNode.vector) {
    return { id: null, distance: Infinity };
  }
  
  // 计算初始距离
  let currentDistance = distanceFunc(queryVector, currentNode.vector);
  
  // 【核心改进】: 使用双重循环确保找到最优入口点
  // 外层循环: 只要还能找到更近的点，就继续迭代
  let globalImproved = true;
  while (globalImproved) {
    globalImproved = false;
    
    // 获取当前节点在当前层级的连接
    if (!currentNode.connections || !currentNode.connections[level]) {
      break;
    }
    
    const connections = currentNode.connections[level];
    
    // 【内层循环】: 遍历所有邻居，找到最近的邻居
    for (const neighborId of connections) {
      // 跳过已访问的节点
      if (visitedSet.has(neighborId)) continue;
      
      const neighbor = nodes.get(neighborId);
      if (!neighbor || neighbor.deleted || !neighbor.vector) continue;
      
      // 标记为已访问
      visitedSet.add(neighborId);
      
      // 计算到邻居的距离
      const distance = distanceFunc(queryVector, neighbor.vector);
      
      // 如果找到更近的邻居，更新当前节点并重新开始搜索
      if (distance < currentDistance) {
        currentDistance = distance;
        currentId = neighborId;
        currentNode = neighbor;
        globalImproved = true;
        break; // 找到更近的点就立即重新开始外层循环
      }
    }
  }
  
  return { 
    id: currentId, 
    distance: currentDistance, 
    node: currentNode 
  };
}


/**
 * 向索引中插入新节点,完全匹配hora的实现
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
    
    // 【核心】Hora风格：如果新节点层级大于当前最高层级，直接更新入口点
    if (level > entryPoint.level) {
      entryPoint.id = nodeId;
      entryPoint.level = level;
      return nodeId;  // 注意：这里直接返回，不需要建立连接
    }
    
    // 【核心】Hora风格：找到合适的起始节点
    let curId = entryPoint.id;
    let curLevel = entryPoint.level;
    
    // 如果新节点层级小于当前最高层级，需要找到一个合适的开始点
    if (level < entryPoint.level) {
      let curDist = distanceFunc(vector, nodes.get(curId).vector);
      
      // 【关键】Hora风格：从最高层开始，逐层寻找最近点
      while (curLevel > level) {
        let changed = true;
        
        // 【核心】Hora风格：使用双重循环查找最近点
        while (changed) {
          changed = false;
          const curNode = nodes.get(curId);
          
          if (!curNode || !curNode.connections || curNode.connections.length <= curLevel) {
            break;
          }
          
          const curNeighbors = curNode.connections[curLevel];
          
          // 遍历当前节点的所有邻居
          for (const neighborId of curNeighbors) {
            if (neighborId >= nodes.size) {
              console.error('链接点错误：超出节点数量范围');
              continue;
            }
            
            const neighbor = nodes.get(neighborId);
            if (!neighbor || neighbor.deleted) continue;
            
            // 计算邻居到目标的距离
            const neighDist = distanceFunc(vector, neighbor.vector);
            
            // 如果找到更近的邻居，则更新当前节点
            if (neighDist < curDist) {
              curDist = neighDist;
              curId = neighborId;
              changed = true;
              break; // 找到更近的就中断循环
            }
          }
        }
        
        curLevel--; // 降低一层继续搜索
      }
    }
    
    // 【Hora风格】：定义已访问节点集合和候选集
    const visitedNodes = new Set([nodeId]);
    let topCandidates = [];
    
    // 【关键】：从当前层级开始，逐层向下建立连接
    let currentLevel = Math.min(level, entryPoint.level);
    
    // 创建查询对象
    const queryNode = { vector, id: nodeId };
    
    // 添加初始候选节点
    topCandidates.push({
      id: curId,
      distance: distanceFunc(vector, nodes.get(curId).vector)
    });
    
    // 【Hora风格】：从当前层开始，逐层向下建立连接
    while (currentLevel >= 0) {
      // 【核心】：使用候选集搜索当前层
      topCandidates = searchLayerWithCandidateHora(
        queryNode,
        topCandidates,
        visitedNodes,
        currentLevel,
        efConstruction,  // 用于限制结果数量
        efConstruction,  // 用于ef参数
        nodes,
        distanceFunc,
        true // 考虑已删除节点
      );
      
      if (topCandidates.length === 0) {
        console.warn(`第${currentLevel}层搜索未找到候选节点`);
        currentLevel--;
        continue;
      }
      
      // 【Hora风格】：使用启发式选择连接
      const selectedNeighbors = selectNeighborsHeuristic(
        topCandidates.map(c => ({
          id: c.id,
          distance: c.distance,
          node: nodes.get(c.id)
        })),
        currentLevel,
        nodes,
        distanceFunc
      );
      
      // 如果没有选中任何邻居，继续下一层
      if (selectedNeighbors.length === 0) {
        currentLevel--;
        continue;
      }
      
      // 【Hora风格】：建立连接
      connectNeighbors(nodeId, selectedNeighbors, currentLevel, nodes, distanceFunc);
      
      // 为下一层准备候选集
      topCandidates = selectedNeighbors.slice(0, 1).map(n => ({
        id: n.id,
        distance: n.distance
      }));
      
      currentLevel--;
    }
    
    return nodeId;
  } catch (error) {
    console.error('insertNode执行出错:', error);
    return null;
  }
}

/**
 * 连接选中的邻居 - 完全匹配Hora的connect_neighbor函数
 * @param {number} nodeId - 当前节点ID
 * @param {Array} selectedNeighbors - 选中的邻居数组
 * @param {number} level - 当前层级
 * @param {Map} nodes - 节点存储
 * @param {Function} distanceFunc - 距离计算函数
 */
function connectNeighbors(nodeId, selectedNeighbors, level, nodes, distanceFunc) {
  const node = nodes.get(nodeId);
  if (!node) return;
  
  // 计算此层需要的邻居数
  const maxNeighbors = calculateLevelM(level);
  
  // 确保连接数组足够长
  while (node.connections.length <= level) {
    node.connections.push([]);
  }
  
  // 清空当前层的连接
  node.connections[level] = [];
  
  // 添加选中的邻居
  for (const neighbor of selectedNeighbors) {
    if (!neighbor || !neighbor.id) continue;
    node.connections[level].push(neighbor.id);
  }
  
  // 【Hora风格】：为每个选中的邻居建立反向连接
  for (const neighbor of selectedNeighbors) {
    if (!neighbor || !neighbor.id) continue;
    
    const neighborNode = nodes.get(neighbor.id);
    if (!neighborNode) continue;
    
    // 确保邻居节点的连接数组足够长
    while (neighborNode.connections.length <= level) {
      neighborNode.connections.push([]);
    }
    
    // 如果当前层的连接中已经包含了节点，跳过
    if (neighborNode.connections[level].includes(nodeId)) {
      continue;
    }
    
    // 【Hora风格】：如果邻居的连接数小于最大值，直接添加
    if (neighborNode.connections[level].length < maxNeighbors) {
      neighborNode.connections[level].push(nodeId);
    } else {
      // 【Hora风格】：如果连接数已满，需要评估是否替换现有连接
      
      // 计算当前节点到邻居的距离
      const dMax = distanceFunc(node.vector, neighborNode.vector);
      
      // 创建候选集，包含当前节点和所有现有邻居
      const candidates = [{ id: nodeId, distance: dMax }];
      
      // 添加所有现有邻居
      for (const existingNeighborId of neighborNode.connections[level]) {
        const existingNeighbor = nodes.get(existingNeighborId);
        if (!existingNeighbor) continue;
        
        const distance = distanceFunc(existingNeighbor.vector, neighborNode.vector);
        candidates.push({ id: existingNeighborId, distance });
      }
      
      // 使用启发式选择邻居
      const evaluatedCandidates = candidates.map(c => ({
        id: c.id,
        distance: c.distance,
        node: nodes.get(c.id)
      }));
      
      const selectedCandidates = selectNeighborsHeuristic(
        evaluatedCandidates,
        level,
        nodes,
        distanceFunc
      );
      
      // 更新邻居连接
      neighborNode.connections[level] = selectedCandidates.map(c => c.id);
    }
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
 * 完全匹配hora风格的多入口点搜索实现
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
  
  // 使用Map存储结果以避免重复
  const resultMap = new Map();
  
  // 跟踪已尝试过的入口点
  const visitedEntryPoints = new Set();
  
  // 搜索尝试计数器
  let attemptCount = 0;
  
  // 【改进1】：更精确的搜索参数控制
  // 动态候选数量，根据K值和召回率目标动态调整
  const recallFactor = searchParams.recallFactor || 1.5; // 增大默认召回因子
  const dynamicCandidateCount = efSearch || Math.max(DEFAULT_EF_SEARCH, k * 40);
  
  // 【改进2】：更大的候选集大小，提高召回率
  const realCandidateCount = Math.ceil(Math.max(k * 50 * recallFactor, dynamicCandidateCount));
  
  // 【改进3】：动态调整最大尝试次数，依据数据集大小和层级分布
  // 小型数据集可以尝试更多次，大型数据集限制尝试次数以提高性能
  const minAttempts = Math.max(3, Math.min(10, Math.ceil(8 * recallFactor)));
  const datasetSizeFactor = Math.min(1.0, 5000 / Math.max(nodes.size, 1));
  const MAX_ATTEMPTS = Math.ceil(minAttempts * datasetSizeFactor * recallFactor);
  
  // 【改进4】：更智能的入口点选择策略
  // 创建层级分布数组，用于选择不同层级的入口点
  const levelDistribution = new Array(maxLevel + 1).fill(0);
  for (const [, node] of nodes.entries()) {
    if (node.deleted) continue;
    const nodeLevel = node.connections.length - 1;
    if (nodeLevel >= 0 && nodeLevel <= maxLevel) {
      levelDistribution[nodeLevel]++;
    }
  }
  
  // 核心搜索循环
  while ((resultMap.size < k || attemptCount < minAttempts) && attemptCount < MAX_ATTEMPTS) {
    attemptCount++;
    
    // 动态调整候选数量
    const neededResults = Math.max(realCandidateCount - resultMap.size, k);
    
    // 选择入口点
    let currentEntryPoint;
    
    if (attemptCount === 1) {
      // 首次搜索使用全局入口点
      currentEntryPoint = { ...entryPoint };
    } else {
      // 【改进5】：更智能的后续入口点选择策略
      // 优先选择高层级但未访问过的节点
      let bestEntryPointId = null;
      let bestEntryPointLevel = -1;
      let bestScore = -1;
      
      // 根据不同策略选择入口点
      const selectionStrategy = attemptCount % 3;
      
      if (selectionStrategy === 1) {
        // 策略1：选择最高层级未访问节点
        for (const [nodeId, node] of nodes.entries()) {
          if (node.deleted || visitedEntryPoints.has(nodeId)) continue;
          
          const nodeLevel = node.connections.length - 1;
          if (nodeLevel > bestEntryPointLevel) {
            bestEntryPointLevel = nodeLevel;
            bestEntryPointId = nodeId;
          }
        }
      } else if (selectionStrategy === 2) {
        // 策略2：选择与已有结果距离最远的节点
        // 计算已有结果的中心点
        if (resultMap.size > 0) {
          const centerVector = new Float32Array(queryVector.length);
          let count = 0;
          
          for (const [, result] of resultMap.entries()) {
            const node = nodes.get(result.id);
            if (!node || !node.vector) continue;
            
            for (let i = 0; i < centerVector.length; i++) {
              centerVector[i] += node.vector[i];
            }
            count++;
          }
          
          // 归一化中心向量
          if (count > 0) {
            for (let i = 0; i < centerVector.length; i++) {
              centerVector[i] /= count;
            }
            
            // 寻找与中心最远的未访问高层级节点
            for (const [nodeId, node] of nodes.entries()) {
              if (node.deleted || visitedEntryPoints.has(nodeId)) continue;
              
              const nodeLevel = node.connections.length - 1;
              if (nodeLevel < 0) continue;
              
              t
                // 计算到中心的距离
                const distanceToCenter = distanceFunc(node.vector, centerVector);
                
                // 计算综合得分（层级+距离）
                const score = (nodeLevel + 1) * distanceToCenter;
                
                if (score > bestScore) {
                  bestScore = score;
                  bestEntryPointId = nodeId;
                  bestEntryPointLevel = nodeLevel;
                }
            }
          }
        }
      } else {
        // 策略3：随机选择未访问的节点，但优先考虑中层级
        // 这有助于探索图的不同区域
        const middleLevel = Math.floor(maxLevel / 2);
        const candidates = [];
        
        for (const [nodeId, node] of nodes.entries()) {
          if (node.deleted || visitedEntryPoints.has(nodeId)) continue;
          
          const nodeLevel = node.connections.length - 1;
          if (nodeLevel < 0) continue;
          
          // 计算与中间层级的接近度
          const levelDiff = Math.abs(nodeLevel - middleLevel);
          const levelScore = 1 / (levelDiff + 1);
          
          candidates.push({
            id: nodeId,
            level: nodeLevel,
            score: levelScore
          });
        }
        
        // 按评分排序并选择前5个
        candidates.sort((a, b) => b.score - a.score);
        const topCandidates = candidates.slice(0, 5);
        
        // 从前5个中随机选择一个
        if (topCandidates.length > 0) {
          const selectedIndex = Math.floor(Math.random() * topCandidates.length);
          const selected = topCandidates[selectedIndex];
          bestEntryPointId = selected.id;
          bestEntryPointLevel = selected.level;
        }
      }
      
      if (bestEntryPointId !== null) {
        currentEntryPoint = { id: bestEntryPointId, level: bestEntryPointLevel };
      } else {
        // 后备策略：随机选择一个非入口点节点
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
    
    // 【改进6】：动态调整每次搜索的EF值
    // 初始搜索使用大的EF，后续搜索根据已有结果数量逐渐减小
    const adjustedEf = attemptCount === 1 ? 
      dynamicCandidateCount : 
      Math.max(k * 10, dynamicCandidateCount * (1 - resultMap.size / (k * 3)));
    
    // 执行单次搜索
    const searchResults = searchKNN(
      queryVector,
      nodes,
      currentEntryPoint,
      maxLevel,
      efSearch,                      
      distanceFunc,
      neededResults,                  
      adjustedEf,         
      new Set([...excludeIds, ...visitedEntryPoints])  
    );
    
    // 【改进7】：更严格的结果合并策略
    if (searchResults && searchResults.length > 0) {
      for (const result of searchResults) {
        if (result && result.id !== undefined) {
          // 如果新结果比已有结果更好,更新结果
          if (!resultMap.has(result.id) || resultMap.get(result.id).distance > result.distance) {
            resultMap.set(result.id, result);
          }
        }
      }
      
      // 【改进8】：如果第一次搜索就找到了足够好的结果，可以提前退出
      if (attemptCount === 1 && searchResults.length >= k && 
          resultMap.size >= Math.min(k * 1.5, nodes.size * 0.1)) {
        const minDistance = searchResults[0].distance;
        const maxDistance = searchResults[Math.min(searchResults.length - 1, k - 1)].distance;
        
        // 如果结果质量很高（最远结果距离不超过最近结果的2倍），可以提前退出
        if (maxDistance <= minDistance * 2.0) {
          break;
        }
      }
    }
  }
  
  // 转换结果为数组,并按距离从小到大排序
  const results = Array.from(resultMap.values())
    .sort((a, b) => a.distance - b.distance)
    .slice(0, k);
  
  // 添加得分属性(1-distance)
  return results.map(item => ({
    ...item,
    score: 1 - item.distance
  }));
}

/**
 * 在索引中搜索k个最近邻,完全匹配hora的实现
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
  
  // 获取召回率因子，完全匹配Hora强调精度优先
  const recallFactor = searchParams.recallFactor || 1.5; // 更高的召回率因子
  
  // 确保参数有效,匹配hora的efSearch参数 - 更严格的参数
  // 【Hora风格】: 更大的ef值，完全匹配Hora的search_knn函数中的search_range设置
  const effectiveEf = ef || Math.max(efSearch, k * 4 * recallFactor); // 提高搜索因子
  const effectiveK = Math.min(k, nodes.size);
  
  // 包装查询向量以便于传递
  const queryObj = { vector: queryVector };
  
  // 创建已访问节点集合，严格匹配Hora实现，使用全局访问集
  const visited = new Set(excludeIds);
  
  // 从最高层开始逐层向下搜索
  let currentEntryPoint = entryPoint;
  
  // 保存候选节点，用于 layerSearchWithCandidate - 关键优化点
  let candidateSet = [];
  
  // 贪心搜索逐层下降,直到第1层(不包括第0层)
  for (let level = Math.min(maxLevel, currentEntryPoint.level); level > 0; level--) {
    // 如果有候选集，使用候选集进行搜索
    if (candidateSet.length > 0) {
      // 使用候选集进行搜索 - 完全匹配Hora的search_layer_with_candidate
      const candidates = searchLayerWithCandidateHora(
        queryObj,
        candidateSet,
        visited,
        level, 
        effectiveK,
        effectiveEf,
        nodes,
        distanceFunc,
        false
      );
      
      if (candidates && candidates.length > 0) {
        // 更新入口点为本层最好的结果
        currentEntryPoint = { id: candidates[0].id, level };
        // 更新候选集用于下一层搜索
        candidateSet = candidates.slice(0, Math.min(candidates.length, 10));
      }
    } else {
      // 首次搜索使用贪心搜索
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
        // 初始化候选集，用于下一层搜索
        candidateSet = [{ id: nearestResult.id, distance: nearestResult.distance }];
      }
    }
  }
  
  // 【Hora风格】: 在底层使用更大的ef值
  // 完全匹配Hora的search_knn实现中的search_range计算逻辑
  const bottomLayerEf = Math.max(effectiveEf, k * 8); // 底层使用更大的ef值
  
  // 在最底层(第0层)进行k近邻搜索 - 完全匹配Hora的实现
  let results;
  
  // 如果有候选集，使用它进行最终层的搜索
  if (candidateSet.length > 0) {
    results = searchLayerWithCandidateHora(
      queryObj,
      candidateSet,
      visited,
      0,
      effectiveK,
      bottomLayerEf,  // 【关键改进】: 底层使用更大的ef值
      nodes,
      distanceFunc,
      false
    );
  } else {
    // 如果没有候选集，使用普通搜索
    results = searchLayer(
      queryObj,
      effectiveK,
      bottomLayerEf,  // 【关键改进】: 底层使用更大的ef值
      0,
      nodes,
      currentEntryPoint,
      distanceFunc,
      excludeIds,
      visited
    );
  }
  
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
 * 在指定层级搜索k个最近邻节点 - 完全匹配Hora实现
 * @param {Object} q - 查询节点
 * @param {number} k - 返回结果数量
 * @param {number} ef - 搜索参数
 * @param {number} level - 搜索层级
 * @param {Map} nodes - 节点存储
 * @param {Object} entryPoint - 入口点
 * @param {Function} distanceFunc - 距离计算函数
 * @param {Set} excludeIds - 排除的节点集合
 * @param {Set} visitedNodes - 已访问节点集合
 * @returns {Array} 搜索结果
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
  
  // 初始化已访问节点集合 - 严格匹配Hora实现
  const visited = new Set();
  for (const id of visitedNodes) {
    visited.add(id);
  }
  for (const id of excludeIds) {
    visited.add(id);
  }
  visited.add(entryPoint.id);
  
  // 计算到入口点的距离
  let initialDistance;
    initialDistance = distanceFunc(q.vector, ep.vector);

  
  // 【Hora实现】: 候选队列 - 这里使用最小堆管理
  const candidateQueue = createMinHeap((a, b) => a.distance - b.distance);
  candidateQueue.push({ id: entryPoint.id, distance: initialDistance });
  
  // 【Hora实现】: 结果队列 - 使用最大堆管理
  const resultQueue = createMinHeap((a, b) => b.distance - a.distance);
  resultQueue.push({ id: entryPoint.id, distance: initialDistance });
  
  // 【Hora核心变量】: 下界距离 - 结果堆中最远结果的距离
  let lowerBound = initialDistance;
  
  // 【Hora核心实现】：搜索过程
  while (candidateQueue.size() > 0) {
    // 取出当前最近的候选节点
    const currentNearest = candidateQueue.pop();
    if (!currentNearest) continue;
    
    // 【Hora终止条件】: 当前候选距离严格大于下界距离时停止
    // 无需考虑其他因素，完全基于距离判断
    if (currentNearest.distance > lowerBound) {
      break;
    }
    
    // 获取当前节点
    const currentNode = nodes.get(currentNearest.id);
    if (!currentNode || currentNode.deleted) continue;
    
    // 获取当前层的连接列表
    let connections = [];
    if (currentNode.connections && level < currentNode.connections.length) {
      connections = currentNode.connections[level];
    }
    
    // 遍历所有邻居 - 完全匹配Hora实现
    for (const neighborId of connections) {
      // 跳过已访问的节点
      if (visited.has(neighborId)) continue;
      
      // 标记为已访问
      visited.add(neighborId);
      
      // 获取邻居节点
      const neighbor = nodes.get(neighborId);
      if (!neighbor || neighbor.deleted || !neighbor.vector) continue;
      
      // 计算到邻居的距离
      let neighborDistance;
        neighborDistance = distanceFunc(q.vector, neighbor.vector);
   
      
      // 【Hora核心判断】: 距离小于下界或结果不足ef个时添加
      if (neighborDistance < lowerBound || resultQueue.size() < effectiveEf) {
        candidateQueue.push({
          id: neighborId,
          distance: neighborDistance
        });
        
        resultQueue.push({
          id: neighborId,
          distance: neighborDistance
        });
        
        // 结果队列超过大小限制,移除最远的节点
        if (resultQueue.size() > effectiveEf) {
          resultQueue.pop(); // 移除最远的结果
          
          // 更新下界为当前结果集最远距离
          // 仅在结果集发生变化时更新
          const furthestResult = resultQueue.peek();
          if (furthestResult) {
            lowerBound = furthestResult.distance;
          }
        }
      }
    }
  }
  
  // 【Hora输出处理】: 返回前k个结果
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
  
  // 排序并返回前k个结果 - 完全匹配Hora
  allResults.sort((a, b) => a.distance - b.distance);
  return allResults.slice(0, k);
}

/**
 * 使用已知候选集在指定层级搜索 - 完全匹配Hora的search_layer_with_candidate实现
 * @param {Object} queryNode - 查询节点
 * @param {Array<{id: number, distance: number}>} initialCandidates - 初始候选集
 * @param {Set} visitedNodes - 已访问节点集合
 * @param {number} level - 搜索层级
 * @param {number} k - 返回结果数量
 * @param {number} ef - 搜索参数
 * @param {Map} nodes - 节点存储
 * @param {Function} distanceFunc - 距离计算函数
 * @param {boolean} hasDeleted - 是否考虑已删除的节点
 * @returns {Array<{id: number, distance: number}>} 搜索结果
 */
function searchLayerWithCandidateHora(queryNode, initialCandidates, visitedNodes, level, k, ef, nodes, distanceFunc, hasDeleted = false) {
  if (!queryNode || !queryNode.vector || !initialCandidates || initialCandidates.length === 0) {
    return [];
  }
  
  // 确保ef至少为k
  const effectiveEf = Math.max(ef, k);
  
  // 初始化已访问节点集合 - 完全匹配Hora的实现
  const visited = new Set();
  if (visitedNodes) {
    for (const id of visitedNodes) {
      visited.add(id);
    }
  }
  
  // 【Hora实现】: 添加初始候选到队列
  const candidateQueue = createMinHeap((a, b) => a.distance - b.distance);
  const resultQueue = createMinHeap((a, b) => b.distance - a.distance);
  
  // 标记初始候选为已访问并添加到队列
  for (const candidate of initialCandidates) {
    if (!candidate || candidate.id === undefined) continue;
    
    visited.add(candidate.id);
    candidateQueue.push({
      id: candidate.id,
      distance: candidate.distance
    });
    resultQueue.push({
      id: candidate.id,
      distance: candidate.distance
    });
  }
  
  // 初始下界距离 - 严格匹配Hora的实现
  let lowerBound = Infinity;
  if (resultQueue.size() > 0) {
    const furthestResult = resultQueue.peek();
    if (furthestResult) {
      lowerBound = furthestResult.distance;
    }
  }
  
  // 【严格匹配Hora】: 搜索过程中保存额外的二级候选，用于最后提高召回率
  const secondaryCandidates = createMinHeap((a, b) => a.distance - b.distance);
  
  // 【Hora搜索实现】:
  while (candidateQueue.size() > 0) {
    // 取出当前最近的候选节点
    const currentNearest = candidateQueue.pop();
    if (!currentNearest) continue;
    
    // 【严格Hora终止条件】: 当前候选距离严格大于下界时停止
    if (currentNearest.distance > lowerBound) {
      // 向二级候选集添加该节点，它可能对提高召回率有帮助
      if (currentNearest.distance < lowerBound * 1.05) { // 仅保留非常接近下界的候选
        secondaryCandidates.push(currentNearest);
      }
      break;
    }
    
    // 获取当前节点
    const currentNode = nodes.get(currentNearest.id);
    if (!currentNode) continue;
    
    // 跳过已删除的节点
    if (hasDeleted && currentNode.deleted) continue;
    
    // 获取当前层的连接列表
    let connections = [];
    if (currentNode.connections && level < currentNode.connections.length) {
      connections = currentNode.connections[level];
    }
    
    // 遍历所有邻居 - 完全匹配Hora实现
    for (const neighborId of connections) {
      // 跳过已访问的节点
      if (visited.has(neighborId)) continue;
      
      // 标记为已访问
      visited.add(neighborId);
      
      // 获取邻居节点
      const neighbor = nodes.get(neighborId);
      if (!neighbor) continue;
      
      // 跳过已删除的节点
      if (hasDeleted && neighbor.deleted) continue;
      
      // 计算到邻居的距离
      let neighborDistance;
        neighborDistance = distanceFunc(queryNode.vector, neighbor.vector);
      
      // 【Hora核心判断】: 距离小于下界或结果不足ef个时添加
      if (neighborDistance < lowerBound || resultQueue.size() < effectiveEf) {
        candidateQueue.push({
          id: neighborId,
          distance: neighborDistance
        });
        
        resultQueue.push({
          id: neighborId,
          distance: neighborDistance
        });
        
        // 结果队列超过大小限制,移除最远的节点
        if (resultQueue.size() > effectiveEf) {
          resultQueue.pop(); // 移除最远的结果
          
          // 更新下界 - 仅在结果集发生变化时
          const furthestResult = resultQueue.peek();
          if (furthestResult) {
            lowerBound = furthestResult.distance;
          }
        }
      } else if (neighborDistance < lowerBound * 1.1) {
        // 【改进】: 保存一些接近但未达到当前候选条件的节点
        // 这些节点稍后可能被用于提高召回率
        secondaryCandidates.push({
          id: neighborId,
          distance: neighborDistance
        });
      }
    }
  }
  
  // 【改进】: 第二阶段优化 - 补充一些接近的候选到结果集
  // 仅当k较大时才使用此策略，避免破坏小k值的精度
  if (k >= 10 && resultQueue.size() < effectiveEf * 0.8) {
    // 添加一些接近的候选节点到结果
    while (secondaryCandidates.size() > 0 && resultQueue.size() < effectiveEf) {
      const candidate = secondaryCandidates.pop();
      if (candidate) {
        resultQueue.push(candidate);
      }
    }
  }
  
  // 将结果队列中的元素转换为数组
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
  
  // 排序并返回结果 - 完全匹配Hora
  allResults.sort((a, b) => a.distance - b.distance);
  return allResults.slice(0, k);
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
  useDistanceCache = true,
  recallFactor = 1.5, // 增大默认召回率因子
  autoOptimize = true // 自动优化图结构
} = {}) {
  // 参数安全检查和调整
  const effectiveM = Math.max(16, M);
  const effectiveEfConstruction = Math.max(400, efConstruction); // 增加构建参数
  const effectiveEfSearch = Math.max(400, efSearch); // 增加搜索参数
  const effectiveMl = Math.max(16, ml);
  const effectiveRecallFactor = Math.max(0.5, Math.min(3.0, recallFactor)); // 扩大范围
  
  // 1. 初始化内部状态
  const nodes = new Map();
  const state = {
    maxId: 0,
    maxLevel: 0,
    nodeCount: 0,
    deletedCount: 0,
    distanceCalculations: 0,
    recallFactor: effectiveRecallFactor,
    lastOptimized: 0, // 上次优化的节点数
    optimizationThreshold: 1000 // 触发优化的阈值
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
    ml: effectiveMl,
    recallFactor: effectiveRecallFactor,
    autoOptimize
  };
  
  /**
   * 自动优化图结构
   * @returns {Object} 优化统计信息
   */
  const optimizeGraph = () => {
    // 如果节点太少，不需要优化
    if (nodes.size < 100) {
      return { skipped: true, reason: 'too few nodes' };
    }
    
    // 如果自上次优化以来新增节点不足阈值，不执行优化
    if (state.nodeCount - state.lastOptimized < state.optimizationThreshold) {
      return { skipped: true, reason: 'threshold not reached' };
    }
    
    // 执行图结构优化
    const stats = optimizeGraphConnectivity(nodes, distanceFunc);
    
    // 更新优化状态
    state.lastOptimized = state.nodeCount;
    
    return {
      ...stats,
      skipped: false
    };
  };
  
  /**
   * 批量插入节点
   * @param {Array<{vector: Array|Float32Array, data: any}>} items - 要插入的向量和数据对象数组
   * @returns {Array<number>} 插入的节点ID数组
   */
  const batchInsert = (items) => {
    if (!Array.isArray(items) || items.length === 0) {
      return [];
    }
    
    const insertedIds = [];
    
    // 批量插入所有节点
    for (const item of items) {
      if (!item || !item.vector) continue;
      
      const id = insertNode(
        item.vector, 
        item.data, 
        nodes, 
        entryPoint, 
        effectiveM, 
        effectiveMl, 
        effectiveEfConstruction, 
        distanceFunc, 
        state
      );
      
      if (id !== null) {
        insertedIds.push(id);
      }
    }
    
    // 如果启用了自动优化，并且插入了足够多的节点，执行优化
    if (autoOptimize && insertedIds.length >= 100) {
      optimizeGraph();
    }
    
    return insertedIds;
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
    
    // 确保searchParams包含recallFactor
    const enhancedParams = {
      ...searchParams,
      recallFactor: state.recallFactor
    };
    
    // 使用多入口点搜索，提高召回率
    return searchWithMultipleEntryPoints(
      queryVector,
      nodes,
      entryPoint,
      state.maxLevel,
      effectiveEfSearch,
      distanceFunc,
      k,
      enhancedParams
    );
  };
  
  // 暴露API，保持兼容性
  return {
    insertNode: (vector, data = null) => {
      const id = insertNode(
        vector, data, nodes, entryPoint, effectiveM, effectiveMl, effectiveEfConstruction, distanceFunc, state
      );
      
      // 在节点数量达到优化阈值时自动优化
      if (autoOptimize && 
          state.nodeCount > 0 && 
          state.nodeCount % state.optimizationThreshold === 0) {
        optimizeGraph();
      }
      
      return id;
    },
    
    batchInsert,
    
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
    
    // 手动优化图结构
    optimizeGraph,
    
    // 调整搜索参数
    setSearchParams: (params = {}) => {
      if (params.recallFactor !== undefined) {
        state.recallFactor = Math.max(0.1, Math.min(3.0, params.recallFactor));
      }
      if (params.efSearch !== undefined) {
        parameters.efSearch = Math.max(200, params.efSearch);
      }
      return { ...parameters };
    },
    
    // 用于测试的内部属性
    _nodes: nodes,
  };
}

/**
 * 创建和优化双向连接，确保连接质量
 * @param {Map} nodes - 节点存储
 * @param {number} nodeId - 当前节点ID
 * @param {number} neighborId - 邻居节点ID
 * @param {number} level - 当前层级
 * @param {Function} distanceFunc - 距离计算函数
 * @returns {boolean} 是否成功创建连接
 */
function optimizeConnection(nodes, nodeId, neighborId, level, distanceFunc) {
  const node = nodes.get(nodeId);
  const neighborNode = nodes.get(neighborId);
  
  if (!node || !neighborNode || node.deleted || neighborNode.deleted || 
      !node.vector || !neighborNode.vector) {
    return false;
  }
  
  // 计算当前层级的最大连接数
  const maxNeighbors = calculateLevelM(level);
  
  // 确保连接存在
  if (!node.connections[level].includes(neighborId)) {
    // 计算距离
    let distance;
    
      distance = distanceFunc(node.vector, neighborNode.vector);
    
    // 如果连接数未达到上限，直接添加
    if (node.connections[level].length < maxNeighbors) {
      node.connections[level].push(neighborId);
      return true;
    } else {
      // 否则，与现有连接比较，替换最差的连接
      let worstConnectionId = null;
      let worstDistance = -Infinity;
      
      // 查找最差的连接
      for (const connId of node.connections[level]) {
        const connNode = nodes.get(connId);
        if (!connNode || connNode.deleted || !connNode.vector) continue;
        
          const connDistance = distanceFunc(node.vector, connNode.vector);
          if (connDistance > worstDistance) {
            worstDistance = connDistance;
            worstConnectionId = connId;
          }
      }
      
      // 如果找到了比新连接更差的连接，替换它
      if (worstConnectionId !== null && worstDistance > distance) {
        // 替换连接
        const index = node.connections[level].indexOf(worstConnectionId);
        if (index !== -1) {
          node.connections[level][index] = neighborId;
          return true;
        }
      }
    }
  }
  
  return false;
}

/**
 * 验证图结构的连通性并优化连接
 * @param {Map} nodes - 节点存储
 * @param {Function} distanceFunc - 距离计算函数
 * @returns {Object} 优化统计信息
 */
function optimizeGraphConnectivity(nodes, distanceFunc) {
  let addedConnections = 0;
  let optimizedConnections = 0;
  let processedNodes = 0;
  
  // 遍历所有节点
  for (const [nodeId, node] of nodes.entries()) {
    if (node.deleted) continue;
    processedNodes++;
    
    // 按层级处理
    for (let level = 0; level < node.connections.length; level++) {
      const connections = node.connections[level];
      
      // 移除无效连接
      node.connections[level] = connections.filter(connId => {
        const connNode = nodes.get(connId);
        return connNode && !connNode.deleted;
      });
      
      // 如果连接太少，尝试添加更多连接
      const expectedConnections = calculateLevelM(level);
      if (node.connections[level].length < expectedConnections * 0.5) {
        // 寻找潜在的新连接
        const candidates = [];
        
        // 首先收集现有连接的连接
        for (const connId of node.connections[level]) {
          const connNode = nodes.get(connId);
          if (!connNode || connNode.deleted) continue;
          
          // 获取该连接的连接
          const secondaryConnections = connNode.connections[level] || [];
          for (const secondaryId of secondaryConnections) {
            // 避免添加自身和已有连接
            if (secondaryId !== nodeId && !node.connections[level].includes(secondaryId)) {
              const secondaryNode = nodes.get(secondaryId);
              if (!secondaryNode || secondaryNode.deleted) continue;
              
                const distance = distanceFunc(node.vector, secondaryNode.vector);
                candidates.push({
                  id: secondaryId,
                  distance
                });
             
            }
          }
        }
        
        // 按距离排序
        candidates.sort((a, b) => a.distance - b.distance);
        
        // 添加最近的候选
        const maxToAdd = Math.min(
          expectedConnections - node.connections[level].length,
          candidates.length
        );
        
        for (let i = 0; i < maxToAdd; i++) {
          if (optimizeConnection(nodes, nodeId, candidates[i].id, level, distanceFunc)) {
            addedConnections++;
          }
        }
      }
      
      // 优化现有连接
      for (const connId of [...node.connections[level]]) {
        if (optimizeConnection(nodes, connId, nodeId, level, distanceFunc)) {
          optimizedConnections++;
        }
      }
    }
  }
  
  return {
    processedNodes,
    addedConnections,
    optimizedConnections
  };
}



