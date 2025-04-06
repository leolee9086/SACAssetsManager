/**
 * HNSW搜索函数模块
 * 基于hnswlayers实现的高性能搜索算法
 */

import { createMinHeap } from "../../../feature/useDataStruct/useHeaps/useMinHeap.js";

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
export function greedySearchLayer(queryNode, entryPoint, level, nodes, distanceFunc, visited = new Set()) {
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
export function searchLayer(q, k, ef, level, nodes, entryPoint, distanceFunc, excludeIds = new Set(), visitedNodes = new Set()) {
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
  
  // 当前最远结果距离
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
export function searchKNN(queryVector, nodes, entryPoint, maxLevel, efSearch, distanceFunc, k = 10, ef = null, excludeIds = new Set(), searchParams = {}) {
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
export function searchWithMultipleEntryPoints(queryVector, nodes, entryPoint, maxLevel, efSearch, distanceFunc, k, searchParams = {}) {
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