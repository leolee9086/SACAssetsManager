/**
 * HNSW搜索模块
 * 提供向量搜索和最近邻查找功能
 */

// 导入最小堆实现
import { createMinHeap } from "../../../feature/useDataStruct/useHeaps/useMinHeap.js";

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
    distance = distanceFunc(q, ep);
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
    
    // 剪枝优化：大幅增加剪枝容忍度，防止过早终止搜索
    // 底层使用更高的容忍度以确保高召回率
    const pruneFactor = level === 0 ? 2.0 : 1.7; 
    // 仅当结果集已满且当前距离显著大于最坏距离时才剪枝
    if (resultCount >= ef && current.distance > worstDistance * pruneFactor) {
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
        distance = distanceFunc(q, neighbor);
      } catch (error) {
        console.error('邻居距离计算失败:', error, { 
          queryVector: q.vector, 
          neighborId,
          neighborVector: neighbor.vector 
        });
        continue;
      }
      
      // 大幅放宽判断标准，允许更多节点进入候选集
      // 对底层的节点给予更高的容忍度
      const distanceFactor = level === 0 ? 2.0 : 1.7;
      const shouldAddToResults = resultCount < ef || distance < worstDistance * distanceFactor;
      
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
  
  // 将已访问节点添加到visitedNodes集合，用于跨层共享
  visited.forEach(id => visitedNodes.add(id));
  
  // 构造最终结果（按距离升序排列）
  const result = [];
  while (resultsHeap.size() > 0) {
    const item = resultsHeap.pop();
    if (item) {
      const candidateNode = nodes.get(item.id);
      
      // 如果节点已删除，或者是填充向量，跳过它
      if (candidateNode.deleted || (candidateNode.data && candidateNode.data.isFiller === true)) {
        continue;
      }
      
      result.push({
        id: item.id,
        distance: item.distance
      });
    }
  }
  
  // 添加对排除的节点的精准处理
  return result.filter(r => !excludeIds.has(r.id));
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
  // 大幅增加ef的最小值，确保有足够的搜索空间
  ef = ef || Math.max(efSearch, k * 5);
  
  if (!entryPoint.id || nodes.size === 0) return [];
  
  // 创建查询节点
  const queryNode = { vector: queryVector };
  
  // 从顶层开始搜索
  let currentNode = entryPoint;
  
  // 自顶向下搜索 - 增加每层的搜索宽度
  for (let lc = maxLevel; lc > 0; lc--) {
    // 为每层使用更大的ef值，特别是对接近底层的层级
    // 修改公式，确保高层也有足够的搜索广度
    const layerEf = Math.max(20, Math.min(100, efSearch * 2 / (lc + 1)));
    
    const neighbors = searchLayer(queryNode, 5, layerEf, lc, nodes, currentNode, distanceFunc, excludeIds);
    if (neighbors.length > 0) {
      currentNode = { id: neighbors[0].id, level: lc };
    }
  }
  
  // 底层进行更精确的搜索，使用大幅增加的ef值
  const results = searchLayer(queryNode, k, ef, 0, nodes, currentNode, distanceFunc, excludeIds);
  
  // 返回完整节点信息 - 避免复制整个向量数据
  return results.map(r => {
    const node = nodes.get(r.id);
    if (!node || node.deleted) {
      return {
        id: r.id,
        distance: r.distance,
        node: null
      };
    }
    // 过滤掉填充向量
    if (node.data && node.data.isFiller === true) {
      return null;
    }
    // 返回必要信息但不深拷贝向量数据
    return {
      id: r.id,
      distance: r.distance,
      node: {
        id: node.id,
        data: node.data
      }
    };
  }).filter(r => r !== null && r.node !== null);
} 