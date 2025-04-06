/**
 * HNSW索引优化函数模块
 * 提供索引连接优化和评估功能
 */

/**
 * 计算平均连接数
 * @param {Map} nodes - 节点存储
 * @returns {number} 平均连接数
 */
export function calculateAvgConnections(nodes) {
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
 * 优化索引连接结构
 * @param {Map} nodes - 节点存储
 * @param {Object} entryPoint - 入口点
 * @param {Function} distanceFunc - 距离计算函数
 * @param {number} M - 每层最大连接数
 * @param {Object} state - 状态对象
 * @param {Object} options - 优化选项
 * @returns {Object} 优化结果统计
 */
export function optimizeIndexConnectivity(nodes, entryPoint, distanceFunc, M, state, options = {}) {
  const { 
    repairBrokenLinks = true, 
    balanceConnections = true,
    improveLinkQuality = true
  } = options;
  
  let repairedLinks = 0;
  let balancedNodes = 0;
  let improvedConnections = 0;
  
  // 底层最大连接数
  const bottomLayerM = Math.max(M * 2, 200);
  
  // 修复断开的连接
  if (repairBrokenLinks) {
    for (const [nodeId, node] of nodes.entries()) {
      if (node.deleted) continue;
      
      let nodeRepaired = false;
      
      for (let level = 0; level < node.connections.length; level++) {
        const connections = node.connections[level];
        const validConnections = [];
        
        for (const connId of connections) {
          const connNode = nodes.get(connId);
          if (connNode && !connNode.deleted) {
            validConnections.push(connId);
          } else {
            repairedLinks++;
            nodeRepaired = true;
          }
        }
        
        // 更新为有效连接
        if (validConnections.length !== connections.length) {
          node.connections[level] = validConnections;
        }
      }
      
      if (nodeRepaired) {
        balancedNodes++;
      }
    }
  }
  
  // 平衡连接数量
  if (balanceConnections) {
    for (const [nodeId, node] of nodes.entries()) {
      if (node.deleted) continue;
      
      let nodeBalanced = false;
      
      for (let level = 0; level < node.connections.length; level++) {
        const connections = node.connections[level];
        const effectiveM = level === 0 ? bottomLayerM : M;
        
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
              .slice(0, Math.min(potentialConnections.length, effectiveM - connections.length))
              .map(conn => conn.id);
            
            if (newConnectionIds.length > 0) {
              node.connections[level] = [...connections, ...newConnectionIds];
              nodeBalanced = true;
              improvedConnections += newConnectionIds.length;
              
              // 添加反向连接
              for (const connId of newConnectionIds) {
                const connNode = nodes.get(connId);
                if (!connNode) continue;
                
                while (connNode.connections.length <= level) {
                  connNode.connections.push([]);
                }
                
                if (!connNode.connections[level].includes(nodeId)) {
                  connNode.connections[level].push(nodeId);
                }
              }
            }
          }
        }
      }
      
      if (nodeBalanced) {
        balancedNodes++;
      }
    }
  }
  
  // 改善连接质量
  if (improveLinkQuality) {
    // 遍历所有节点，评估其连接质量
    for (const [nodeId, node] of nodes.entries()) {
      if (node.deleted) continue;
      
      for (let level = 0; level < node.connections.length; level++) {
        const connections = node.connections[level];
        const effectiveM = level === 0 ? bottomLayerM : M;
        
        // 如果已经有足够多的连接，跳过
        if (connections.length >= effectiveM) continue;
        
        // 从同层其他节点中找到潜在的好连接
        const candidates = [];
        
        // 从当前层找到其他质量高的连接
        for (const [otherId, otherNode] of nodes.entries()) {
          if (otherId === nodeId || otherNode.deleted || 
              otherNode.connections.length <= level ||
              connections.includes(otherId)) {
            continue;
          }
          
          try {
            const distance = distanceFunc(node.vector, otherNode.vector);
            candidates.push({ id: otherId, distance });
          } catch (error) {
            continue;
          }
        }
        
        // 限制候选连接数量，避免过多计算
        const maxCandidates = Math.min(50, nodes.size);
        
        // 按距离排序，取最近的节点
        if (candidates.length > 0) {
          candidates.sort((a, b) => a.distance - b.distance);
          
          // 选择最好的候选连接
          const bestCandidates = candidates.slice(0, Math.min(maxCandidates, candidates.length));
          
          // 从候选中选择能提供不同搜索路径的连接
          const selectedCandidates = [];
          
          for (const candidate of bestCandidates) {
            if (selectedCandidates.length + connections.length >= effectiveM) break;
            
            const candidateNode = nodes.get(candidate.id);
            if (!candidateNode) continue;
            
            let shouldAdd = true;
            
            // 检查候选与当前已有连接的关系
            for (const connId of connections) {
              const connNode = nodes.get(connId);
              if (!connNode) continue;
              
              try {
                const distanceBetween = distanceFunc(candidateNode.vector, connNode.vector);
                
                // 如果候选节点与现有连接非常相似，跳过它
                if (distanceBetween < candidate.distance) {
                  shouldAdd = false;
                  break;
                }
              } catch (error) {
                continue;
              }
            }
            
            if (shouldAdd) {
              selectedCandidates.push(candidate.id);
            }
          }
          
          // 更新连接
          if (selectedCandidates.length > 0) {
            node.connections[level] = [...connections, ...selectedCandidates];
            improvedConnections += selectedCandidates.length;
            
            // 添加反向连接
            for (const connId of selectedCandidates) {
              const connNode = nodes.get(connId);
              if (!connNode) continue;
              
              while (connNode.connections.length <= level) {
                connNode.connections.push([]);
              }
              
              if (!connNode.connections[level].includes(nodeId)) {
                connNode.connections[level].push(nodeId);
              }
            }
          }
        }
      }
    }
  }
  
  // 更新全局入口点，确保它是高层级的活跃节点
  if (entryPoint.id !== null) {
    const ep = nodes.get(entryPoint.id);
    
    // 如果当前入口点无效，寻找新的入口点
    if (!ep || ep.deleted) {
      let highestLevel = -1;
      let newEntryPoint = null;
      
      for (const [nodeId, node] of nodes.entries()) {
        if (node.deleted) continue;
        
        const nodeLevel = node.connections.length - 1;
        if (nodeLevel > highestLevel) {
          highestLevel = nodeLevel;
          newEntryPoint = nodeId;
        }
      }
      
      if (newEntryPoint !== null) {
        entryPoint.id = newEntryPoint;
        entryPoint.level = highestLevel;
        state.maxLevel = highestLevel;
      } else {
        // 如果没有找到有效节点，重置入口点
        entryPoint.id = null;
        entryPoint.level = -1;
        state.maxLevel = -1;
      }
    }
  }
  
  return {
    repairedLinks,
    balancedNodes,
    improvedConnections
  };
}

/**
 * 验证索引中节点的连接结构
 * @param {Map} nodes - 节点存储
 * @returns {Object} 连接验证统计信息
 */
export function validateIndexConnections(nodes) {
  let bidirectionalCount = 0;
  let totalConnections = 0;
  let missingConnections = 0;
  let emptyConnectionsCount = 0;
  let validNodeCount = 0;
  
  // 遍历所有节点检查连接
  for (const [nodeId, node] of nodes.entries()) {
    if (node.deleted) continue;
    
    validNodeCount++;
    let nodeHasConnections = false;
    
    // 检查各层连接
    for (let level = 0; level < node.connections.length; level++) {
      const connections = node.connections[level];
      if (!connections || connections.length === 0) continue;
      
      nodeHasConnections = true;
      
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
    
    if (!nodeHasConnections) {
      emptyConnectionsCount++;
    }
  }
  
  return {
    validNodeCount,
    totalConnections,
    bidirectionalCount,
    bidirectionalRate: totalConnections > 0 ? bidirectionalCount / totalConnections : 0,
    missingConnections,
    emptyConnectionsCount,
    emptyConnectionsRate: validNodeCount > 0 ? emptyConnectionsCount / validNodeCount : 0
  };
} 