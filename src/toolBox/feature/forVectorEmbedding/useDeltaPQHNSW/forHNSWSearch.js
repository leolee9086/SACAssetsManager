/**
 * HNSW搜索函数模块
 * 提供HNSW索引的搜索相关功能
 */

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
  // 安全检查
  if (!entryPoint || !q || !q.vector) {
    console.warn('搜索层失败: 无效的入口点或查询向量');
    return [];
  }
  
  // 确保ef至少为k
  const effectiveEf = Math.max(ef, k);
  
  // 从入口点开始
  const ep = nodes.get(entryPoint.id);
  if (!ep || ep.deleted || !ep.vector) {
    console.warn(`搜索层失败: 找不到入口点节点或节点无效`);
    return [];
  }
  
  // 初始化已访问集
  const visited = new Set([...visitedNodes]);
  visited.add(entryPoint.id);
  
  // 计算到入口点的距离
  let distance;
  try {
    distance = distanceFunc(q.vector, ep.vector);
  } catch (error) {
    console.error('计算距离失败:', error);
    return [];
  }
  
  // 优先队列(最小堆) - 按距离从小到大排序，用于确定下一个访问的节点
  const candidatesHeap = createMinHeap((a, b) => a.distance - b.distance);
  candidatesHeap.push({ id: ep.id, distance });
  
  // 结果队列(最大堆) - 按距离从大到小排序，保留最近的ef个节点
  const resultsHeap = createMinHeap((a, b) => b.distance - a.distance);
  resultsHeap.push({ id: ep.id, distance });
  
  // 当前结果集中最远距离的基准
  let currentDistance = distance;
  
  // 当候选集不为空时继续搜索
  while (candidatesHeap.size() > 0) {
    // 获取当前最近的候选节点
    const current = candidatesHeap.pop();
    if (!current) continue;
    
    // 如果候选节点比结果集中最远的节点还远，且结果集已满，则停止搜索
    if (resultsHeap.size() >= effectiveEf && current.distance > currentDistance) {
      break;
    }
    
    // 获取节点并检查其连接
    const currentNode = nodes.get(current.id);
    if (!currentNode || currentNode.deleted) continue;
    
    // 获取当前层的连接
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
        continue;
      }
      
      // 如果结果集未满或距离小于当前最远距离，则加入结果集和候选集
      if (resultsHeap.size() < effectiveEf || neighborDistance < currentDistance) {
        candidatesHeap.push({ id: neighborId, distance: neighborDistance });
        resultsHeap.push({ id: neighborId, distance: neighborDistance });
        
        // 如果结果集超过ef，移除最远的
        if (resultsHeap.size() > effectiveEf) {
          resultsHeap.pop();
          
          // 更新当前距离基准
          const worst = resultsHeap.peek();
          if (worst) {
            currentDistance = worst.distance;
          }
        }
      }
    }
  }
  
  // 将结果转换为数组
  const results = [];
  while (resultsHeap.size() > 0) {
    results.unshift(resultsHeap.pop());
  }
  
  // 返回前k个结果
  return results.slice(0, k);
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
    console.error('searchKNN错误：无效参数');
    return [];
  }
  
  // 如果索引为空，返回空结果
  if (nodes.size === 0 || entryPoint.id === null) {
    return [];
  }
  
  // 确保参数有效
  const effectiveEf = ef || Math.max(efSearch, k * 2);
  
  try {
    // 创建查询对象
    const query = { vector: queryVector };
    
    // 从入口点开始
    let currObj = { ...entryPoint };
    const visitedNodes = new Set();
    
    // 自顶向下遍历层级图
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
        excludeIds,
        visitedNodes
      );
      
      if (result.length > 0) {
        currObj = { id: result[0].id };
      }
    }
    
    // 在底层（0层）执行更广泛的搜索
    const results = searchLayer(
      query,
      k,
      effectiveEf,
      0,
      nodes,
      currObj,
      distanceFunc,
      excludeIds,
      visitedNodes
    );
    
    // 处理结果 - 使用节点元数据中的原始ID
    return results.map(item => {
      const node = nodes.get(item.id);
      const originalId = node?.data?.originalId !== undefined ? 
        node.data.originalId : (node?.data?.id !== undefined ? node.data.id : item.id);
      
      return {
        id: originalId,
        internalId: item.id,
        distance: item.distance,
        data: node?.data || null
      };
    });
  } catch (error) {
    console.error('searchKNN执行错误:', error);
    return [];
  }
}

// 导入所需依赖
import { createMinHeap } from "../../../feature/useDataStruct/useHeaps/useMinHeap.js";
import { getOriginalIdFromNode } from "./forHNSWIdMapping.js"; 