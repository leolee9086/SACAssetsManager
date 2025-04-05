/**
 * HNSW ID映射管理模块
 * 处理内部节点ID与外部原始ID之间的映射关系
 */

/**
 * 确保节点数据包含正确的ID映射
 * @param {Object} nodeData - 节点数据对象 
 * @param {number} nodeId - 内部节点ID
 * @returns {Object} 处理后的节点数据对象
 */
export function ensureNodeIdMapping(nodeData = {}, nodeId) {
  // 创建数据对象的副本，避免修改原始对象
  const enhancedData = typeof nodeData !== 'object' || nodeData === null ? 
    { value: nodeData } : { ...nodeData };
  
  // 确保originalId存在
  if (enhancedData.originalId === undefined) {
    // 如果有id字段，使用它作为originalId
    enhancedData.originalId = enhancedData.id !== undefined ? enhancedData.id : nodeId;
  }
  
  // 保持id字段与originalId一致，以便兼容旧代码
  if (enhancedData.id === undefined) {
    enhancedData.id = enhancedData.originalId;
  }
  
  return enhancedData;
}

/**
 * 从节点信息中获取原始ID
 * @param {Object} node - 包含数据的节点对象
 * @param {number} fallbackId - 如果无法获取原始ID时的后备ID
 * @returns {number|string} 原始ID
 */
export function getOriginalIdFromNode(node, fallbackId) {
  if (!node || !node.data) return fallbackId;
  
  // 优先使用originalId字段，其次是id字段，最后才使用后备ID
  return node.data.originalId !== undefined ? 
    node.data.originalId : (node.data.id !== undefined ? node.data.id : fallbackId);
}

/**
 * 验证索引中节点的ID映射
 * @param {Map} nodes - 节点存储
 * @param {number} nodeCount - 有效节点数量
 * @returns {Object} ID映射统计信息
 */
export function verifyIdMapping(nodes, nodeCount) {
  const stats = {
    totalNodes: nodes.size,
    activeNodes: nodeCount,
    missingDataCount: 0,
    missingIdMappingCount: 0,
    idMappingStats: {}
  };
  
  for (const [nodeId, node] of nodes.entries()) {
    if (node.deleted) continue; // 跳过已删除节点
    
    if (!node.data) {
      stats.missingDataCount++;
      continue;
    }
    
    const hasOriginalId = node.data.originalId !== undefined;
    const hasDataId = node.data.id !== undefined;
    
    const mappingType = `${hasOriginalId ? 'O' : '-'}${hasDataId ? 'D' : '-'}`;
    stats.idMappingStats[mappingType] = (stats.idMappingStats[mappingType] || 0) + 1;
    
    if (!hasOriginalId && !hasDataId) {
      stats.missingIdMappingCount++;
    }
  }
  
  return stats;
} 