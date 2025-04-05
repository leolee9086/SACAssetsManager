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
  
  // 设置当前最远距离为初始距离
  let currentFurthestDistance = initialDistance;
  
  // 当候选队列非空时继续搜索
  while (candidateQueue.size() > 0) {
    // 取出当前最近的候选节点
    const currentNearest = candidateQueue.pop();
    if (!currentNearest) continue;
    
    // 如果当前候选的距离比结果集中最远的还要远，且结果集已经满了，则停止搜索
    // 这是经典实现中的关键判断条件
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
      // 如果结果集未满或邻居距离小于当前最远距离，则加入结果集
      if (resultQueue.size() < effectiveEf || neighborDistance < currentFurthestDistance) {
        // 将邻居添加到候选队列
        candidateQueue.push({ id: neighborId, distance: neighborDistance, node: neighbor });
        
        // 将邻居添加到结果队列
        resultQueue.push({ id: neighborId, distance: neighborDistance, node: neighbor });
        
        // 如果结果队列大小超过ef，移除最远的节点
        if (resultQueue.size() > effectiveEf) {
          const furthest = resultQueue.pop();
          if (furthest) {
            // 更新当前最远距离
            const worstCandidate = resultQueue.peek();
            if (worstCandidate) {
              currentFurthestDistance = worstCandidate.distance;
            }
          }
        }
      }
    }
  }
  
  // 收集结果
  const results = [];
  while (resultQueue.size() > 0 && results.length < k) {
    const item = resultQueue.pop();
    if (item) {
      results.push({
        id: item.id,
        distance: item.distance
      });
    }
  }
  
  // 结果按距离从小到大排序返回
  return results.sort((a, b) => a.distance - b.distance);
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
 * 在索引中搜索k个最近邻 - 完全重写，直接模仿经典实现的"hnswAnn搜索数据集"函数逻辑
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
  const effectiveEf = ef || Math.max(efSearch, k * 3);
  
  try {
    // 创建查询对象
    const query = { vector: queryVector };
    
    // 从入口点开始
    let currentEntryPoint = entryPoint;
    
    // 用于跟踪已访问节点
    const visited = new Set(excludeIds);
    
    // 自顶向下遍历所有层级
    // 在每一层使用贪婪搜索找到最近的点
    for (let level = maxLevel; level > 0; level--) {
      // 在当前层使用贪心搜索找到最近的点
      const closestNode = greedySearchLayer(
        query,
        currentEntryPoint,
        level,
        nodes,
        distanceFunc,
        visited
      );
      
      // 更新入口点为当前层找到的最近点
      if (closestNode && closestNode.id !== null) {
        currentEntryPoint = { id: closestNode.id };
        // 将已找到的点添加到已访问集合
        visited.add(closestNode.id);
      }
    }
    
    // 在底层(0层)进行完整的邻近搜索
    const candidates = searchLayer(
      query,
      k * 2, // 搜索更多候选点以提高召回率
      effectiveEf,
      0,
      nodes,
      currentEntryPoint,
      distanceFunc,
      excludeIds,
      visited
    );
    
    // 转换结果格式
    const results = candidates.map(item => {
      const node = nodes.get(item.id);
      
      return {
        id: node?.data?.id || item.id, // 使用数据中的ID或节点ID
        internalId: item.id, // 保留内部ID以便后续操作
        distance: item.distance,
        data: node?.data || null
      };
    });
    
    // 返回前k个结果
    return results.slice(0, k);
  } catch (error) {
    console.error('searchKNN执行错误:', error);
    return [];
  }
}

// 导入所需依赖
import { createMinHeap } from "../../../feature/useDataStruct/useHeaps/useMinHeap.js";
import { getOriginalIdFromNode } from "./forHNSWIdMapping.js"; 