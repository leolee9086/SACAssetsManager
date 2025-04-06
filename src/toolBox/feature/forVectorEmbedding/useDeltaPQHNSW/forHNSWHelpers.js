/**
 * HNSW辅助函数模块
 * 提供HNSW索引的辅助功能
 */

/**
 * 创建HNSW节点
 * @param {number} id - 节点ID
 * @param {Float32Array|Array} vector - 向量数据
 * @param {Object} data - 关联数据
 * @param {number} [maxLevel=0] - 节点最大层级
 * @returns {Object} 节点对象
 */
export function createHNSWNode(id, vector, data = null, maxLevel = 0) {
  // 创建连接数组，每层一个数组
  const connections = [];
  
  // 初始化每层的连接数组
  for (let i = 0; i <= maxLevel; i++) {
    connections.push([]);
  }
  
  // 创建节点对象
  return {
    id,
    vector: vector instanceof Float32Array ? vector : new Float32Array(vector),
    data,
    connections,
    deleted: false
  };
}

/**
 * 获取随机层级
 * @param {number} maxLevel - 最大层级
 * @returns {number} 随机层级，在0到maxLevel之间
 */
export function getRandomLevel(maxLevel) {
  const p = 1 / Math.E;
  return Math.floor(-Math.log(Math.random()) / Math.log(1 / p)) % (maxLevel + 1);
}

/**
 * 创建距离计算缓存装饰器
 * @param {Function} distanceFunc - 原始距离计算函数
 * @param {number} [cacheSize=1000] - 缓存大小
 * @returns {Function} 带缓存的距离计算函数
 */
export function createDistanceCache(distanceFunc, cacheSize = 1000) {
  const cache = new Map();
  const keys = [];
  
  return function cachedDistance(a, b) {
    // 创建缓存键（向量的哈希）
    const keyA = a.length + ':' + a[0] + ':' + a[a.length - 1];
    const keyB = b.length + ':' + b[0] + ':' + b[b.length - 1];
    const cacheKey = keyA < keyB ? keyA + '|' + keyB : keyB + '|' + keyA;
    
    // 检查缓存
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }
    
    // 计算距离
    const distance = distanceFunc(a, b);
    
    // 更新缓存
    cache.set(cacheKey, distance);
    keys.push(cacheKey);
    
    // 如果缓存超出大小限制，删除最早的条目
    if (keys.length > cacheSize) {
      const oldestKey = keys.shift();
      cache.delete(oldestKey);
    }
    
    return distance;
  };
}

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
 * 创建向量的快速哈希值
 * @param {Float32Array|Array} vector - 向量
 * @returns {string} 哈希值
 */
export function computeVectorHash(vector) {
  if (!vector || vector.length === 0) return '';
  
  // 选择采样点 - 向量头部、中部和尾部的值
  const start = vector[0];
  const middle = vector[Math.floor(vector.length / 2)];
  const end = vector[vector.length - 1];
  
  // 计算长度的哈希成分
  const lengthComponent = vector.length.toString(16);
  
  // 将采样点转换为16进制并连接
  return lengthComponent + '-' + 
         start.toFixed(4) + '-' + 
         middle.toFixed(4) + '-' + 
         end.toFixed(4);
}

/**
 * 向量归一化
 * @param {Float32Array|Array} vector - 输入向量
 * @returns {Float32Array} 归一化后的向量
 */
export function normalizeVector(vector) {
  if (!vector || vector.length === 0) return new Float32Array(0);
  
  // 计算向量的欧几里得长度
  let sumSquares = 0;
  for (let i = 0; i < vector.length; i++) {
    sumSquares += vector[i] * vector[i];
  }
  
  const magnitude = Math.sqrt(sumSquares);
  
  // 如果长度为0，返回原向量的副本
  if (magnitude === 0) {
    return new Float32Array(vector);
  }
  
  // 创建归一化向量
  const normalizedVector = new Float32Array(vector.length);
  for (let i = 0; i < vector.length; i++) {
    normalizedVector[i] = vector[i] / magnitude;
  }
  
  return normalizedVector;
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