/**
 * HNSW索引优化模块
 * 提供索引性能优化和维护的功能
 */

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
 * 计算平均每个节点的连接数
 * @param {Map} nodes - 节点存储
 * @returns {number} 平均连接数
 */
export function calculateAvgConnections(nodes) {
  let totalConnections = 0;
  let validNodes = 0;
  
  for (const [_, node] of nodes.entries()) {
    if (node.deleted || !node.connections) continue;
    
    validNodes++;
    let nodeConnections = 0;
    
    // 统计所有层级的连接数
    for (const levelConns of node.connections) {
      if (Array.isArray(levelConns)) {
        nodeConnections += levelConns.length;
      }
    }
    
    totalConnections += nodeConnections;
  }
  
  return validNodes > 0 ? totalConnections / validNodes : 0;
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