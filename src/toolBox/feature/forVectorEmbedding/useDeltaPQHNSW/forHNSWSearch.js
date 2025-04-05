/**
 * HNSW搜索函数模块
 * 提供HNSW索引的搜索相关功能
 */

/**
 * 在指定层查找K个最近邻节点
 * 完全重写，直接模仿经典实现中的"hnswAnn单次搜索"中底层搜索部分
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
  
  // 设置当前最远距离为初始距离 - 随后会不断更新
  let currentFurthestDistance = initialDistance;
  
  // 如果resultQueue不为空，获取peek值
  if (resultQueue.size() > 0) {
    const worstCandidate = resultQueue.peek();
    if (worstCandidate) {
      currentFurthestDistance = worstCandidate.distance;
    }
  }
  
  // 当候选队列非空时继续搜索
  while (candidateQueue.size() > 0) {
    // 取出当前最近的候选节点
    const currentNearest = candidateQueue.pop();
    if (!currentNearest) continue;
    
    // 关键优化：如果当前候选的距离比结果集中最远的还要远，且结果集已经满了，则停止搜索
    // 经典实现中的判断条件是 currentNearest.distance > currentFurthestDistance
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
      
      // 经典实现的关键判断:
      // 注意：与经典实现保持一致，不再使用 currentNearest.distance 作为比较基准
      // 而是使用 currentFurthestDistance
      if (resultQueue.size() < effectiveEf || neighborDistance < currentFurthestDistance) {
        // 将邻居添加到候选队列和结果队列
        candidateQueue.push({ id: neighborId, distance: neighborDistance, node: neighbor });
        resultQueue.push({ id: neighborId, distance: neighborDistance, node: neighbor });
        
        // 如果结果队列大小超过ef，移除最远的节点
        if (resultQueue.size() > effectiveEf) {
          resultQueue.pop(); // 移除最远的节点
          
          // 关键：直接查看最远节点的距离，不需要pop后再peek
          // 这是与经典实现的关键区别
          const worstCandidate = resultQueue.peek();
          if (worstCandidate) {
            currentFurthestDistance = worstCandidate.distance;
          }
        }
      }
    }
  }
  
  // 收集结果
  const results = [];
  // 按距离从小到大排序获取结果 - 完全模仿经典实现
  // 直接获取所有结果，排序后取前k个
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
 * 贪婪搜索当前层级查找最近点 - 直接复制经典实现的"贪心搜索当前层级"函数逻辑
 * @param {Object} queryNode - 查询节点
 * @param {Object} entryPoint - 入口点
 * @param {number} level - 当前层级
 * @param {Map} nodes - 节点存储
 * @param {Function} distanceFunc - 距离计算函数
 * @param {Set<number>} [visited=new Set()] - 已访问节点集合
 * @returns {Object} 最近点信息
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
  
  // 贪婪搜索循环
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
 * 在索引中搜索k个最近邻 - 优化实现，提高效率
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
  
  // 避免在循环中创建过多临时变量
  let epNode = null;
  let epDistance = Infinity;
  
  // 使用一次距离计算作为初始入口点距离
  try {
    epNode = nodes.get(entryPoint.id);
    if (epNode && !epNode.deleted) {
      epDistance = distanceFunc(queryVector, epNode.vector);
    }
  } catch (error) {
    console.error('初始距离计算失败', error);
  }
  
  // 逐层向下搜索
  for (let level = Math.min(maxLevel, currentEp.level); level > 0; level--) {
    // 在当前层级寻找最近邻节点作为下一层级的入口点
    try {
      const layerResults = searchLayer(
        queryObj,
        1,               // 只寻找1个最近邻作为入口点
        1,               // 最小的ef值以加速搜索
        level,
        nodes,
        currentEp,
        distanceFunc,
        excludeIds,
        visited
      );
      
      // 如果找到更好的入口点，更新当前入口点
      if (layerResults.length > 0) {
        currentEp = { id: layerResults[0].id, level };
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
    0,              // 最底层
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

// 导入所需依赖
import { createMinHeap } from "../../../feature/useDataStruct/useHeaps/useMinHeap.js";
import { getOriginalIdFromNode } from "./forHNSWIdMapping.js"; 