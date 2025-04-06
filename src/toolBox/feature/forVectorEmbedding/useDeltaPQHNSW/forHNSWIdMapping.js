/**
 * HNSW ID映射辅助函数
 * 处理HNSW索引中的ID映射和转换
 */

/**
 * 确保获取节点ID的映射
 * 处理节点ID与外部ID之间的映射关系
 * @param {Object} node - HNSW节点
 * @returns {number} 节点ID
 */
export function ensureNodeIdMapping(node) {
  if (!node) return null;
  
  // 如果节点有data.id，使用它作为外部ID
  if (node.data && node.data.id !== undefined) {
    return node.data.id;
  }
  
  // 否则使用内部ID
  return node.id;
}

/**
 * 从节点获取原始ID
 * @param {Object} node - HNSW节点
 * @returns {number} 原始ID
 */
export function getOriginalIdFromNode(node) {
  if (!node) return null;
  
  // 优先使用data.id
  if (node.data && node.data.id !== undefined) {
    return node.data.id;
  }
  
  // 回退到内部id
  return node.id;
}

/**
 * 创建ID到内部ID的映射表
 * @param {Map} nodes - 节点存储
 * @returns {Map} ID映射表
 */
export function createIdMappingTable(nodes) {
  const idMap = new Map();
  
  for (const [internalId, node] of nodes.entries()) {
    if (node.deleted) continue;
    
    const externalId = ensureNodeIdMapping(node);
    if (externalId !== null && externalId !== undefined) {
      idMap.set(externalId, internalId);
    }
  }
  
  return idMap;
}

/**
 * 从外部ID获取内部ID
 * @param {Map} nodes - 节点存储
 * @param {*} externalId - 外部ID
 * @returns {number|null} 内部ID或null
 */
export function getInternalIdFromExternalId(nodes, externalId) {
  // 首先尝试直接匹配内部ID
  if (nodes.has(externalId)) {
    return externalId;
  }
  
  // 寻找匹配的外部ID
  for (const [internalId, node] of nodes.entries()) {
    if (node.deleted) continue;
    
    if (node.data && node.data.id === externalId) {
      return internalId;
    }
  }
  
  return null;
}

/**
 * 验证节点ID的一致性
 * @param {Map} nodes - 节点存储
 * @returns {Object} 验证结果
 */
export function validateNodeIds(nodes) {
  const externalIds = new Set();
  const duplicates = [];
  const missing = [];
  
  for (const [internalId, node] of nodes.entries()) {
    if (node.deleted) continue;
    
    const externalId = node.data?.id;
    
    // 检查是否有外部ID
    if (externalId === undefined || externalId === null) {
      missing.push(internalId);
    } 
    // 检查外部ID是否重复
    else if (externalIds.has(externalId)) {
      duplicates.push({
        externalId,
        internalId
      });
    } else {
      externalIds.add(externalId);
    }
  }
  
  return {
    valid: duplicates.length === 0 && missing.length === 0,
    duplicates,
    missing,
    totalExternalIds: externalIds.size,
    totalNodes: nodes.size
  };
} 