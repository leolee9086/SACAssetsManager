/**
 * HNSW插入模块
 * 提供插入和构建节点连接的功能
 */

import { searchLayer } from "./forHNSWSearch.js";
import { addConnections } from "./forHNSWNode.js";
import { createLocalDistanceCache } from "./forHNSWDistance.js";

/**
 * 插入单个节点到HNSW索引
 * @param {Object} node - 要插入的节点
 * @param {Map} nodes - 节点存储
 * @param {Object} entryPoint - 当前入口点
 * @param {number} maxLevel - 最大层级
 * @param {number} maxLayers - 总层数
 * @param {number} m - 每个节点最大连接数
 * @param {number} maxM - 每个节点在第0层的最大连接数
 * @param {number} efConstruction - 构建参数
 * @param {Function} distanceFunc - 距离计算函数
 * @param {number} distanceCacheSize - 距离缓存大小
 * @returns {Object} 更新后的入口点
 */
export function insertNode(node, nodes, entryPoint, maxLevel, maxLayers, m, maxM, efConstruction, distanceFunc, distanceCacheSize) {
  // 安全检查：确保节点有效
  if (!node || !node.vector || node.id === undefined) {
    console.warn('插入失败：无效的节点', node);
    return entryPoint;
  }
  
  // 建立局部距离缓存 - 用于加速插入过程中的距离计算
  const { getDistance } = createLocalDistanceCache(distanceFunc, distanceCacheSize);
  
  // 保存节点到全局存储
  nodes.set(node.id, node);
  
  // 如果这是第一个节点，直接将其设置为入口点
  if (nodes.size === 1 || !entryPoint || !entryPoint.id) {
    return {
      id: node.id,
      level: node.level
    };
  }
  
  // 定义要连接的邻居ID集合
  const connectionsToAdd = {};
  
  // 在每层建立连接
  let currentNode = entryPoint;
  const nodeQuery = node; // 使用整个节点进行查询，与searchLayer接口一致
  
  // 建立局部排除集 - 避免自连接
  const excludeIds = new Set([node.id]);
  
  // 自顶向下搜索 - 通过层次确定基层入口点
  for (let level = maxLevel; level > node.level; level--) {
    // 对层级搜索使用专门针对高层的ef值
    const highLevelEf = Math.max(Math.floor(efConstruction * 1.5), 10);
    
    // 采用加倍的邻居数搜索以获得更好的连接基础
    const neighbors = searchLayer(
      nodeQuery,
      1,
      highLevelEf,
      level,
      nodes,
      currentNode,
      getDistance,
      excludeIds
    );
    
    if (neighbors.length > 0) {
      currentNode = { id: neighbors[0].id };
    }
  }
  
  // 从节点的最高层到第0层，建立连接
  for (let level = node.level; level >= 0; level--) {
    // 为每层定义适合的efConstruction值，底层使用更大的值
    let layerEfConstruction;
    if (level === 0) {
      // 底层使用显著更大的ef值以提高基础连接质量
      layerEfConstruction = Math.max(efConstruction * 2, 40);
    } else {
      // 高层使用略大于默认值的ef，避免连接稀疏
      layerEfConstruction = Math.max(efConstruction * 1.2, m * 2);
    }
    
    // 找到当前层的最近邻
    // 使用当前节点作为查询点，搜索最近的节点
    const neighbors = searchLayer(
      nodeQuery,
      m * 2, // 搜索更多候选邻居以提高质量
      layerEfConstruction,
      level,
      nodes,
      currentNode,
      getDistance,
      excludeIds
    );
    
    // 如果找到邻居，更新局部最佳点
    if (neighbors.length > 0) {
      currentNode = { id: neighbors[0].id };
    }
    
    // 保存要添加的连接
    connectionsToAdd[level] = neighbors.map(n => n.id);
    
    // 连接设置：底层使用更大的连接数
    const layerM = level === 0 ? maxM : m;
    
    // 建立双向连接 - 节点到邻居，邻居到节点
    // 向节点添加到邻居的连接
    addConnections(node, neighbors.map(n => n.id), level, layerM, nodes, getDistance);
    
    // 向邻居添加到节点的连接
    neighbors.forEach(neighbor => {
      const neighborNode = nodes.get(neighbor.id);
      if (neighborNode && !neighborNode.deleted) {
        // 创建从邻居到新节点的连接
        addConnections(
          neighborNode,
          [node.id],
          level,
          layerM,
          nodes,
          getDistance
        );
      }
    });
  }
  
  // 如果新节点的层级高于当前入口点，更新入口点
  if (node.level > entryPoint.level) {
    return {
      id: node.id,
      level: node.level
    };
  }
  
  return entryPoint;
}

/**
 * 批量插入节点到HNSW索引，使用高效的批处理策略
 * @param {Array<Object>} batchNodes - 要批量插入的节点
 * @param {Map} nodes - 节点存储
 * @param {Object} entryPoint - 入口点
 * @param {number} maxLevel - 最大层级
 * @param {number} maxLayers - 总层数
 * @param {number} m - 最大连接数
 * @param {number} maxM - 最大连接数（底层）
 * @param {number} efConstruction - 构建参数
 * @param {Function} distanceFunc - 距离计算函数
 * @param {number} distanceCacheSize - 距离缓存大小
 * @param {Function} [progressCallback] - 进度回调函数
 * @returns {Object} 更新后的入口点
 */
export function batchInsertNodes(batchNodes, nodes, entryPoint, maxLevel, maxLayers, m, maxM, efConstruction, distanceFunc, distanceCacheSize, progressCallback = null) {
  // 安全检查：确保有效的批量节点
  if (!Array.isArray(batchNodes) || batchNodes.length === 0) {
    console.warn('批量插入失败：无效的节点数组', batchNodes);
    return entryPoint;
  }
  
  // 建立全局距离缓存 - 用于整个批处理过程
  const { getDistance } = createLocalDistanceCache(distanceFunc, distanceCacheSize * 2);
  
  // 按层级排序，先插入高层级节点
  const sortedNodes = [...batchNodes].sort((a, b) => b.level - a.level);
  
  // 逐个插入节点
  let currentEntryPoint = entryPoint;
  let lastProgress = 0;
  const batchSize = sortedNodes.length;
  
  // 批量插入采用渐进式策略：先插入高层节点构建骨架，再处理低层节点
  for (let i = 0; i < batchSize; i++) {
    const node = sortedNodes[i];
    
    // 安全检查：确保节点有效
    if (!node || !node.vector || node.id === undefined) {
      console.warn(`跳过无效的批处理节点 索引=${i}`, node);
      continue;
    }
    
    // 根据节点层级采用不同插入参数 - 高层节点更谨慎处理
    let nodeEfConstruction = efConstruction;
    if (node.level > Math.floor(maxLevel / 2)) {
      // 高层节点：使用更大的ef值以构建更好的骨架
      nodeEfConstruction = Math.max(efConstruction * 1.5, 40);
    } else if (node.level === 0) {
      // 底层节点：增强base layer连接质量
      nodeEfConstruction = Math.max(efConstruction * 2, 50);
    }
    
    // 执行插入
    currentEntryPoint = insertNode(
      node,
      nodes,
      currentEntryPoint,
      maxLevel,
      maxLayers,
      m,
      maxM,
      nodeEfConstruction,
      getDistance, // 使用缓存的距离函数
      distanceCacheSize
    );
    
    // 进度回调
    if (progressCallback && i > 0) {
      const progress = Math.floor((i / batchSize) * 100);
      if (progress > lastProgress + 4) {
        progressCallback(progress);
        lastProgress = progress;
      }
    }
  }
  
  // 完成回调
  if (progressCallback) progressCallback(100);
  
  return currentEntryPoint;
} 