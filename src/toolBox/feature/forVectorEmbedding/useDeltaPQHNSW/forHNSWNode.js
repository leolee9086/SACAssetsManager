/**
 * HNSW节点管理模块
 * 提供节点操作和连接管理功能
 */

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