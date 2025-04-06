/**
 * HNSW批量操作函数模块
 * 提供批量插入和优化功能
 */

/**
 * 批量插入节点
 * @param {Array<{vector: Float32Array, data: any}>} items - 要插入的项目数组
 * @param {Function} insertNodeFn - 插入节点函数
 * @param {Object} options - 批量插入选项
 * @returns {Array<number>} 插入节点的ID数组
 */
export function batchInsertNodes(items, insertNodeFn, options = {}) {
  const {
    shuffleItems = true,
    progressCallback = null,
    batchSize = 1000
  } = options;
  
  if (!items || !Array.isArray(items) || items.length === 0) {
    return [];
  }
  
  // 创建要处理的项目副本
  let workItems = [...items];
  
  // 如果需要随机排序，打乱数组
  if (shuffleItems) {
    for (let i = workItems.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [workItems[i], workItems[j]] = [workItems[j], workItems[i]];
    }
  }
  
  const insertedIds = [];
  const total = workItems.length;
  let processed = 0;
  
  // 批量处理项目
  for (let i = 0; i < total; i += batchSize) {
    const batch = workItems.slice(i, i + batchSize);
    
    for (const item of batch) {
      if (!item.vector) continue;
      
      const id = insertNodeFn(item.vector, item.data);
      if (id !== null) {
        insertedIds.push(id);
      }
      
      processed++;
    }
    
    // 如果有进度回调，调用它
    if (progressCallback && typeof progressCallback === 'function') {
      progressCallback({
        processed,
        total,
        percent: Math.floor((processed / total) * 100),
        insertedCount: insertedIds.length
      });
    }
  }
  
  return insertedIds;
}

/**
 * 批量优化索引连接
 * @param {Map} nodes - 节点存储
 * @param {Object} entryPoint - 入口点
 * @param {Function} distanceFunc - 距离计算函数
 * @param {number} M - 每层最大连接数
 * @param {Object} options - 优化选项
 * @returns {Object} 优化结果
 */
export function batchOptimizeIndex(nodes, entryPoint, distanceFunc, M, options = {}) {
  const {
    progressCallback = null,
    repairBrokenLinks = true,
    balanceConnections = true,
    improveLinkQuality = true,
    batchSize = 1000
  } = options;
  
  const nodeIds = Array.from(nodes.keys());
  const total = nodeIds.length;
  
  let processed = 0;
  let optimizedNodes = 0;
  let repairedLinks = 0;
  let improvedConnections = 0;
  
  // 按批次处理节点
  for (let i = 0; i < total; i += batchSize) {
    const batchIds = nodeIds.slice(i, i + batchSize);
    
    for (const nodeId of batchIds) {
      const node = nodes.get(nodeId);
      if (!node || node.deleted) {
        processed++;
        continue;
      }
      
      let nodeOptimized = false;
      
      // 1. 修复断开的连接
      if (repairBrokenLinks) {
        for (let level = 0; level < node.connections.length; level++) {
          const connections = node.connections[level];
          
          const validConnections = connections.filter(connId => {
            const connNode = nodes.get(connId);
            return connNode && !connNode.deleted;
          });
          
          if (validConnections.length !== connections.length) {
            node.connections[level] = validConnections;
            repairedLinks += (connections.length - validConnections.length);
            nodeOptimized = true;
          }
        }
      }
      
      // 2. 改善连接质量
      if (improveLinkQuality) {
        for (let level = 0; level < node.connections.length; level++) {
          // 如果连接数量已经足够多，跳过此层
          const maxConn = level === 0 ? M * 2 : M;
          if (node.connections[level].length >= maxConn) continue;
          
          // 从当前层的所有连接中获取二级连接
          const secondLevelCandidates = new Map();
          
          for (const connId of node.connections[level]) {
            const connNode = nodes.get(connId);
            if (!connNode || connNode.deleted) continue;
            
            // 获取连接的连接
            if (connNode.connections.length > level) {
              for (const secondConnId of connNode.connections[level]) {
                // 避免重复和自连接
                if (secondConnId === nodeId || node.connections[level].includes(secondConnId)) continue;
                
                const secondNode = nodes.get(secondConnId);
                if (!secondNode || secondNode.deleted) continue;
                
                try {
                  const distance = distanceFunc(node.vector, secondNode.vector);
                  
                  // 更新或添加二级候选
                  if (!secondLevelCandidates.has(secondConnId) || 
                      secondLevelCandidates.get(secondConnId) > distance) {
                    secondLevelCandidates.set(secondConnId, distance);
                  }
                } catch (error) {
                  continue;
                }
              }
            }
          }
          
          // 将二级连接转换为数组并排序
          const candidates = Array.from(secondLevelCandidates.entries())
            .sort((a, b) => a[1] - b[1])
            .map(entry => entry[0]);
          
          // 添加最近的二级连接
          const toAdd = candidates.slice(0, maxConn - node.connections[level].length);
          
          if (toAdd.length > 0) {
            node.connections[level] = [...node.connections[level], ...toAdd];
            improvedConnections += toAdd.length;
            nodeOptimized = true;
          }
        }
      }
      
      if (nodeOptimized) {
        optimizedNodes++;
      }
      
      processed++;
    }
    
    // 报告进度
    if (progressCallback && typeof progressCallback === 'function') {
      progressCallback({
        processed,
        total,
        percent: Math.floor((processed / total) * 100),
        optimizedNodes,
        repairedLinks,
        improvedConnections
      });
    }
  }
  
  return {
    totalProcessed: processed,
    optimizedNodes,
    repairedLinks,
    improvedConnections
  };
}

/**
 * 批量搜索多个查询向量
 * @param {Array<Float32Array>} queryVectors - 查询向量数组
 * @param {number} k - 每个查询返回的最近邻数量
 * @param {Map} nodes - 节点存储
 * @param {Object} entryPoint - 入口点
 * @param {number} maxLevel - 最大层级
 * @param {number} efSearch - 搜索参数
 * @param {Function} distanceFunc - 距离计算函数
 * @param {Object} [options] - 搜索选项
 * @returns {Array<Array>} 每个查询的最近邻结果数组
 */
export function batchSearchKNN(queryVectors, k, nodes, entryPoint, maxLevel, efSearch, distanceFunc, options = {}) {
  if (!queryVectors || !Array.isArray(queryVectors) || queryVectors.length === 0) {
    return [];
  }
  
  const { 
    batchSize = 10,
    progressCallback = null,
    excludeIds = new Set()
  } = options;
  
  const results = [];
  const distanceCache = new Map();
  
  // 创建缓存距离函数
  const cachedDistanceFunc = (v1, v2) => {
    // 简单的缓存键生成策略
    const id1 = v1.id !== undefined ? v1.id : v1;
    const id2 = v2.id !== undefined ? v2.id : v2;
    
    // 检查是否可以缓存，仅对带ID的向量缓存
    if (typeof id1 !== 'number' || typeof id2 !== 'number') {
      return distanceFunc(v1.vector || v1, v2.vector || v2);
    }
    
    const [smallerId, largerId] = id1 <= id2 ? [id1, id2] : [id2, id1];
    const key = `${smallerId}_${largerId}`;
    
    if (distanceCache.has(key)) {
      return distanceCache.get(key);
    }
    
    const distance = distanceFunc(v1.vector || v1, v2.vector || v2);
    distanceCache.set(key, distance);
    
    return distance;
  };
  
  // 分批处理查询
  for (let i = 0; i < queryVectors.length; i += batchSize) {
    // 定期清空距离缓存避免内存占用过大
    if (distanceCache.size > 10000) {
      distanceCache.clear();
    }
    
    const batchQueries = queryVectors.slice(i, i + batchSize);
    const batchResults = [];
    
    // 处理每个查询
    for (let j = 0; j < batchQueries.length; j++) {
      const queryResult = searchKNN(
        batchQueries[j],
        nodes,
        entryPoint,
        maxLevel,
        efSearch,
        cachedDistanceFunc,
        k,
        null,
        excludeIds
      );
      
      batchResults.push(queryResult);
    }
    
    // 合并结果
    results.push(...batchResults);
    
    // 回调进度信息
    if (progressCallback && typeof progressCallback === 'function') {
      const progress = Math.min(i + batchSize, queryVectors.length);
      const percent = Math.round((progress / queryVectors.length) * 100);
      progressCallback(progress, queryVectors.length, percent);
    }
  }
  
  return results;
}

// 导入所需的函数
//import { insertNode } from "./useCustomedHNSW.js";
import { searchKNN } from "./forHNSWSearch.js"; 