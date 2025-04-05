/**
 * HNSW辅助函数模块
 * 提供与HNSW索引相关的辅助功能
 */

// 常量
export const DEFAULT_DISTANCE_CACHE_SIZE = 100000; // 距离计算缓存大小

/**
 * 创建距离计算缓存器
 * 使用LRU策略缓存距离计算结果提高性能
 * @param {Function} distanceFunc - 距离计算函数
 * @param {number} cacheSize - 缓存大小
 * @returns {Function} 带缓存的距离函数
 */
export function createDistanceCache(distanceFunc, cacheSize = DEFAULT_DISTANCE_CACHE_SIZE) {
  const cache = new Map();
  const keyQueue = [];
  
  return function(a, b) {
    // 优先直接处理向量，避免过度解析id
    const id1 = a.id !== undefined ? a.id : a;
    const id2 = b.id !== undefined ? b.id : b;
    
    // 如果两者都是向量（没有id），直接计算以避免缓存开销
    if (typeof id1 !== 'number' && typeof id2 !== 'number') {
      return distanceFunc(a, b);
    }
    
    const key = `${id1}_${id2}`;
    const reverseKey = `${id2}_${id1}`;
    
    if (cache.has(key)) return cache.get(key);
    if (cache.has(reverseKey)) return cache.get(reverseKey);
    
    const distance = distanceFunc(a, b);
    
    // 缓存管理 (LRU)
    if (keyQueue.length >= cacheSize) {
      const oldestKey = keyQueue.shift();
      cache.delete(oldestKey);
    }
    
    // 使用 id1 < id2 ? key : reverseKey 保持一致性存储，防止两种排序的键都存在
    const storeKey = id1 < id2 ? key : reverseKey;
    keyQueue.push(storeKey);
    cache.set(storeKey, distance);
    
    return distance;
  };
}

/**
 * 计算查询向量与数据库向量之间的距离
 * @param {string} distanceName - 距离函数名称
 * @param {Function} euclideanFunc - 欧几里得距离函数
 * @param {Function} cosineFunc - 余弦距离函数
 * @param {Function} innerProductFunc - 内积函数
 * @returns {Function} 距离计算函数
 */
export function getDistanceFunction(distanceName, euclideanFunc, cosineFunc, innerProductFunc) {
  if (distanceName === 'euclidean') {
    return euclideanFunc;
  } else if (distanceName === 'cosine') {
    // 直接使用余弦距离函数，它已经返回距离而非相似度
    return cosineFunc;
  } else if (distanceName === 'inner_product') {
    // 内积也是相似度，越大越相似，需要取负变为距离度量
    return (a, b) => -innerProductFunc(a, b);
  } else {
    console.warn(`未知的距离函数: ${distanceName}, 使用默认的欧几里得距离`);
    return euclideanFunc;
  }
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