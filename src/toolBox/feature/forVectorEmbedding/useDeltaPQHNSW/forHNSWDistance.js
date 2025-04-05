/**
 * HNSW距离计算模块
 * 提供向量距离计算和缓存功能
 */

/**
 * 创建高性能距离缓存 - 使用数字键和哈希表
 * @param {Function} distanceFunc - 原始距离计算函数
 * @param {number} [cacheSize=50000] - 缓存大小，默认大幅提高
 * @returns {Object} 包含getDistance和clear方法的对象
 */
export function createDistanceCache(distanceFunc, cacheSize = 50000) {
  // 核心缓存 - 使用Map而非对象以获得更好的性能
  const cache = new Map();
  // 缓存统计
  let hits = 0;
  let misses = 0;
  let lruCounter = 0; // 简单计数器实现LRU策略
  let accessCount = 0; // 总访问次数，用于优化缓存管理
  
  // 哈希键生成函数 - 使用位操作优化，避免字符串操作
  const hashKey = (a, b) => {
    // 确保a <= b，统一哈希方向
    const id1 = typeof a === 'number' ? a : a.id;
    const id2 = typeof b === 'number' ? b : b.id;
    
    if (id1 === undefined || id2 === undefined) {
      return -1; // 无效键
    }
    
    // 使用Cantor配对函数生成唯一的整数键
    // (a+b)*(a+b+1)/2 + b 为每对a,b生成唯一的整数
    const minId = Math.min(id1, id2);
    const maxId = Math.max(id1, id2);
    
    // 对于较大ID，使用模运算避免溢出，同时保持冲突率低
    return ((minId + maxId) * (minId + maxId + 1) / 2 + maxId) % (1e9 + 7);
  };
  
  // 二级缓存 - 用于排除大多数缓存未命中情况的快速检查
  const existsCache = new Set();
  
  // 缓存优先级管理 - 简化版LRU计数
  const priorities = new Map();
  
  /**
   * 优化的距离计算函数
   * @param {Object|number} node1 - 第一个节点或ID
   * @param {Object|number} node2 - 第二个节点或ID
   * @returns {number} 距离值
   */
  const getDistance = (node1, node2) => {
    // 快速路径：相同节点
    if (node1 === node2 || 
        (node1 && node2 && node1.id === node2.id)) {
      return 0;
    }
    
    // 生成哈希键
    const key = hashKey(node1, node2);
    if (key === -1) {
      // 处理无效键的情况
      try {
        return distanceFunc(node1, node2);
      } catch (error) {
        console.error('距离计算错误:', error);
        return Number.MAX_SAFE_INTEGER;
      }
    }
    
    // 访问计数器
    accessCount++;
    
    // 快速路径：使用二级缓存检查键是否存在
    if (!existsCache.has(key)) {
      misses++;
      
      // 缓存未命中，计算距离
      let distance;
      try {
        // 直接获取向量数据，优化性能
        const vec1 = node1.vector || node1;
        const vec2 = node2.vector || node2;
        
        // 计算距离
        distance = distanceFunc(vec1, vec2);
      } catch (error) {
        console.error('距离计算错误:', error);
        return Number.MAX_SAFE_INTEGER;
      }
      
      // 缓存管理 - 周期性清理
      if (cache.size >= cacheSize) {
        // 每1000次访问执行一次批量清理，避免频繁单次清理
        if (accessCount % 1000 === 0) {
          pruneCache();
        } else {
          // 否则仅删除一个最低优先级项
          removeLowestPriority();
        }
      }
      
      // 添加到缓存
      cache.set(key, distance);
      existsCache.add(key);
      priorities.set(key, lruCounter++);
      
      return distance;
    }
    
    // 缓存命中
    hits++;
    
    // 更新访问优先级 - 每100次访问更新一次以降低开销
    if (accessCount % 100 === 0) {
      priorities.set(key, lruCounter++);
    }
    
    return cache.get(key);
  };
  
  /**
   * 删除优先级最低的缓存项
   */
  const removeLowestPriority = () => {
    let lowestPriority = Infinity;
    let lowestKey = null;
    
    // 查找优先级最低的键
    // 为了效率，仅采样最多100个项
    let count = 0;
    for (const [key, priority] of priorities.entries()) {
      if (priority < lowestPriority) {
        lowestPriority = priority;
        lowestKey = key;
      }
      
      // 限制采样数量
      if (++count >= 100) break;
    }
    
    // 删除找到的最低优先级项
    if (lowestKey !== null) {
      cache.delete(lowestKey);
      existsCache.delete(lowestKey);
      priorities.delete(lowestKey);
    }
  };
  
  /**
   * 整理缓存 - 删除低优先级项
   */
  const pruneCache = () => {
    // 将所有优先级转换为数组并排序
    const entries = Array.from(priorities.entries());
    entries.sort((a, b) => a[1] - b[1]); // 按优先级排序
    
    // 计算要删除的数量 - 删除25%的低优先级项
    const removeCount = Math.floor(cache.size * 0.25);
    
    // 删除低优先级项
    for (let i = 0; i < removeCount && i < entries.length; i++) {
      const key = entries[i][0];
      cache.delete(key);
      existsCache.delete(key);
      priorities.delete(key);
    }
  };
  
  /**
   * 清空缓存
   */
  const clear = () => {
    cache.clear();
    existsCache.clear();
    priorities.clear();
    hits = 0;
    misses = 0;
    lruCounter = 0;
    accessCount = 0;
  };
  
  /**
   * 获取缓存统计信息
   */
  const getStats = () => {
    return {
      size: cache.size,
      hits,
      misses,
      hitRate: hits + misses > 0 ? hits / (hits + misses) : 0,
      maxSize: cacheSize
    };
  };
  
  return { getDistance, clear, getStats };
}

/**
 * 创建局部距离缓存，适用于单次操作如节点插入
 * @param {Function} distanceFunc - 原始距离计算函数
 * @param {number} [cacheSize=5000] - 缓存大小
 * @returns {Object} 包含getDistance和clear方法的对象
 */
export function createLocalDistanceCache(distanceFunc, cacheSize = 5000) {
  // 使用高效Map实现
  const cache = new Map();
  // 为向量快速查找使用对象ID映射
  const vectors = new Map();
  // 使用简单递增计数器进行LRU替换
  let counter = 0;
  const priorities = new Map();
  
  /**
   * 为两个节点生成缓存键 - 使用整数配对函数计算唯一键
   */
  const getCacheKey = (node1, node2) => {
    const id1 = typeof node1 === 'number' ? node1 : node1.id;
    const id2 = typeof node2 === 'number' ? node2 : node2.id;
    
    if (id1 === undefined || id2 === undefined) {
      return -1; // 无效键标记
    }
    
    // 使用Cantor配对函数生成唯一的整数键
    const minId = Math.min(id1, id2);
    const maxId = Math.max(id1, id2);
    return ((minId + maxId) * (minId + maxId + 1) / 2 + maxId) % (1e9 + 7);
  };
  
  /**
   * 高效获取节点的向量数据
   */
  const getVector = (node) => {
    if (typeof node === 'number') {
      return null; // 无法获取向量
    }
    
    const nodeId = node.id;
    if (vectors.has(nodeId)) {
      return vectors.get(nodeId);
    }
    
    if (node.vector) {
      vectors.set(nodeId, node.vector);
      return node.vector;
    }
    
    return null;
  };
  
  /**
   * 带缓存的高效距离计算函数
   */
  const getDistance = (node1, node2) => {
    // 处理边缘情况 - 空参数或相同节点
    if (!node1 || !node2) {
      return Number.MAX_SAFE_INTEGER;
    }
    
    if (node1 === node2 || 
        (node1 && node2 && node1.id === node2.id)) {
      return 0;
    }
    
    // 获取缓存键
    const cacheKey = getCacheKey(node1, node2);
    if (cacheKey === -1) {
      // 无效键，直接计算
      try {
        return distanceFunc(node1, node2);
      } catch (error) {
        console.error('距离计算错误:', error);
        return Number.MAX_SAFE_INTEGER;
      }
    }
    
    // 检查缓存
    if (cache.has(cacheKey)) {
      // 更新优先级
      priorities.set(cacheKey, counter++);
      return cache.get(cacheKey);
    }
    
    // 提取向量数据
    const vec1 = getVector(node1);
    const vec2 = getVector(node2);
    
    // 计算距离
    let distance;
    try {
      // 使用向量直接计算，避免对象传递开销
      distance = (vec1 && vec2) ? 
        distanceFunc(vec1, vec2) : 
        distanceFunc(node1, node2);
    } catch (error) {
      console.error('局部距离计算错误:', error);
      return Number.MAX_SAFE_INTEGER;
    }
    
    // 缓存管理
    if (cache.size >= cacheSize) {
      // 查找并删除优先级最低的项
      let lowestPriority = Infinity;
      let lowestKey = null;
      
      for (const [key, priority] of priorities.entries()) {
        if (priority < lowestPriority) {
          lowestPriority = priority;
          lowestKey = key;
        }
      }
      
      if (lowestKey !== null) {
        cache.delete(lowestKey);
        priorities.delete(lowestKey);
      }
    }
    
    // 添加到缓存
    cache.set(cacheKey, distance);
    priorities.set(cacheKey, counter++);
    
    return distance;
  };
  
  /**
   * 清空缓存和向量存储
   */
  const clear = () => {
    cache.clear();
    vectors.clear();
    priorities.clear();
    counter = 0;
  };
  
  return { getDistance, clear };
}

/**
 * 标准向量距离函数
 */

/**
 * 计算欧几里得距离 - 高效实现，接受多种向量格式
 * @param {Float32Array|Array|Object} vec1 - 第一个向量
 * @param {Float32Array|Array|Object} vec2 - 第二个向量
 * @returns {number} 欧几里得距离
 */
export function computeEuclideanDistance(vec1, vec2) {
  // 向量参数适配 - 支持直接传递向量或节点对象
  if (vec1 && vec1.vector) vec1 = vec1.vector;
  if (vec2 && vec2.vector) vec2 = vec2.vector;
  
  if (!vec1 || !vec2 || vec1.length !== vec2.length) {
    throw new Error('无效的向量数据');
  }
  
  let sum = 0;
  const len = vec1.length;
  
  // 高性能循环展开 - 每次处理8个元素
  const blockSize = 8;
  const blockEnd = len - (len % blockSize);
  
  for (let i = 0; i < blockEnd; i += blockSize) {
    const d1 = vec1[i] - vec2[i];
    const d2 = vec1[i + 1] - vec2[i + 1];
    const d3 = vec1[i + 2] - vec2[i + 2];
    const d4 = vec1[i + 3] - vec2[i + 3];
    const d5 = vec1[i + 4] - vec2[i + 4];
    const d6 = vec1[i + 5] - vec2[i + 5];
    const d7 = vec1[i + 6] - vec2[i + 6];
    const d8 = vec1[i + 7] - vec2[i + 7];
    
    sum += d1 * d1 + d2 * d2 + d3 * d3 + d4 * d4 + 
           d5 * d5 + d6 * d6 + d7 * d7 + d8 * d8;
  }
  
  // 处理剩余元素
  for (let i = blockEnd; i < len; i++) {
    const d = vec1[i] - vec2[i];
    sum += d * d;
  }
  
  return Math.sqrt(sum);
}

/**
 * 计算余弦距离 - 优化实现
 * @param {Float32Array|Array|Object} vec1 - 第一个向量
 * @param {Float32Array|Array|Object} vec2 - 第二个向量
 * @returns {number} 余弦距离
 */
export function computeCosineDistance(vec1, vec2) {
  // 向量参数适配
  if (vec1 && vec1.vector) vec1 = vec1.vector;
  if (vec2 && vec2.vector) vec2 = vec2.vector;
  
  if (!vec1 || !vec2 || vec1.length !== vec2.length) {
    throw new Error('无效的向量数据');
  }
  
  // 高效单次循环计算
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  const len = vec1.length;
  
  // 使用块处理提高性能
  const blockSize = 8;
  const blockEnd = len - (len % blockSize);
  
  for (let i = 0; i < blockEnd; i += blockSize) {
    // 展开8个元素以增加指令级并行性
    dotProduct += vec1[i] * vec2[i] + 
                 vec1[i+1] * vec2[i+1] + 
                 vec1[i+2] * vec2[i+2] + 
                 vec1[i+3] * vec2[i+3] +
                 vec1[i+4] * vec2[i+4] + 
                 vec1[i+5] * vec2[i+5] + 
                 vec1[i+6] * vec2[i+6] + 
                 vec1[i+7] * vec2[i+7];
                 
    norm1 += vec1[i] * vec1[i] + 
            vec1[i+1] * vec1[i+1] + 
            vec1[i+2] * vec1[i+2] + 
            vec1[i+3] * vec1[i+3] +
            vec1[i+4] * vec1[i+4] + 
            vec1[i+5] * vec1[i+5] + 
            vec1[i+6] * vec1[i+6] + 
            vec1[i+7] * vec1[i+7];
            
    norm2 += vec2[i] * vec2[i] + 
            vec2[i+1] * vec2[i+1] + 
            vec2[i+2] * vec2[i+2] + 
            vec2[i+3] * vec2[i+3] +
            vec2[i+4] * vec2[i+4] + 
            vec2[i+5] * vec2[i+5] + 
            vec2[i+6] * vec2[i+6] + 
            vec2[i+7] * vec2[i+7];
  }
  
  // 处理剩余元素
  for (let i = blockEnd; i < len; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }
  
  // 避免除零错误
  if (norm1 === 0 || norm2 === 0) {
    return 1.0; // 最大距离
  }
  
  const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  
  // 确保结果在[0,1]范围内
  return Math.max(0, Math.min(1, 1 - similarity));
}

/**
 * 计算内积距离 - 优化实现
 * @param {Float32Array|Array|Object} vec1 - 第一个向量
 * @param {Float32Array|Array|Object} vec2 - 第二个向量
 * @returns {number} 内积距离
 */
export function computeInnerProductDistance(vec1, vec2) {
  // 向量参数适配
  if (vec1 && vec1.vector) vec1 = vec1.vector;
  if (vec2 && vec2.vector) vec2 = vec2.vector;
  
  if (!vec1 || !vec2 || vec1.length !== vec2.length) {
    throw new Error('无效的向量数据');
  }
  
  let dotProduct = 0;
  const len = vec1.length;
  
  // 使用块处理提高性能
  const blockSize = 8;
  const blockEnd = len - (len % blockSize);
  
  for (let i = 0; i < blockEnd; i += blockSize) {
    dotProduct += vec1[i] * vec2[i] + 
                 vec1[i+1] * vec2[i+1] + 
                 vec1[i+2] * vec2[i+2] + 
                 vec1[i+3] * vec2[i+3] +
                 vec1[i+4] * vec2[i+4] + 
                 vec1[i+5] * vec2[i+5] + 
                 vec1[i+6] * vec2[i+6] + 
                 vec1[i+7] * vec2[i+7];
  }
  
  // 处理剩余元素
  for (let i = blockEnd; i < len; i++) {
    dotProduct += vec1[i] * vec2[i];
  }
  
  // 对于内积距离，我们返回1-相似度
  return 1 - dotProduct;
} 