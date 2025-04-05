/**
 * Cuckoo Filter实现
 * 支持添加、查询、删除元素，比布隆过滤器更高效
 */

// 存储桶和配置
let capacity = 1000;
let bucketSize = 4;
let maxKicks = 500;
let fingerprintLength = 1;
let buckets = [];
let count = 0; // 添加计数器

/**
 * 初始化存储桶
 */
function initBuckets() {
  buckets = new Array(capacity);
  for (let i = 0; i < capacity; i++) {
    buckets[i] = new Array(bucketSize).fill(null);
  }
  count = 0; // 重置计数器
}

// 初始化默认存储桶
initBuckets();

/**
 * 生成元素的指纹
 * @param {string|Object} item - 要处理的元素
 * @returns {string} 指纹字符串
 */
export function getFingerprint(item) {
  if (item === null || item === undefined) {
    throw new Error('项目不能为空');
  }
  
  const str = typeof item === 'string' ? item : JSON.stringify(item);
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33 + str.charCodeAt(i)) & 0xFFFFFFFF;
  }
  return hash.toString(16).slice(0, fingerprintLength).padStart(fingerprintLength, '0');
}

/**
 * 获取元素的候选桶位置
 * @param {string} fingerprint - 元素指纹
 * @returns {number[]} [index1, index2] 两个候选桶索引
 */
export function getCandidateBuckets(fingerprint) {
  const hash = parseInt(fingerprint, 16);
  const index1 = hash % capacity;
  const index2 = (index1 ^ (hash * 0x5bd1e995)) % capacity;
  return [index1, index2];
}

/**
 * 向指定桶插入指纹
 * @param {number} index - 桶索引
 * @param {string} fingerprint - 指纹
 * @returns {boolean} 是否插入成功
 */
export function insertToBucket(index, fingerprint) {
  const bucket = buckets[index];
  for (let i = 0; i < bucketSize; i++) {
    if (bucket[i] === null) {
      bucket[i] = fingerprint;
      return true;
    }
  }
  return false;
}

/**
 * 从指定桶中删除指纹
 * @param {number} index - 桶索引
 * @param {string} fingerprint - 指纹
 * @returns {boolean} 是否删除成功
 */
export function removeFromBucket(index, fingerprint) {
  const bucket = buckets[index];
  for (let i = 0; i < bucketSize; i++) {
    if (bucket[i] === fingerprint) {
      bucket[i] = null;
      return true;
    }
  }
  return false;
}

/**
 * 添加元素到过滤器
 * @param {string|Object} item - 要添加的元素
 * @returns {boolean} 是否添加成功
 */
export function add(item) {
  if (item === null || item === undefined) {
    return false;
  }

  const fingerprint = getFingerprint(item);
  const [i1, i2] = getCandidateBuckets(fingerprint);

  // 检查是否有空槽
  if (insertToBucket(i1, fingerprint)) {
    count++; // 增加计数
    return true;
  }
  if (insertToBucket(i2, fingerprint)) {
    count++; // 增加计数
    return true;
  }

  // 需要踢出操作
  let index = Math.random() < 0.5 ? i1 : i2;
  let currentFingerprint = fingerprint;
  
  for (let n = 0; n < maxKicks; n++) {
    const slot = Math.floor(Math.random() * bucketSize);
    const displacedFp = buckets[index][slot];
    buckets[index][slot] = currentFingerprint;
    
    const [alt1, alt2] = getCandidateBuckets(displacedFp);
    index = (index === alt1) ? alt2 : alt1;
    
    if (insertToBucket(index, displacedFp)) {
      count++; // 增加计数
      return true;
    }
    currentFingerprint = displacedFp;
  }
  return false; // 达到最大踢出次数
}

/**
 * 在指定桶中查找指纹
 * @param {number} index - 桶索引
 * @param {string} fingerprint - 指纹
 * @returns {boolean} 是否存在
 */
export function findInBucket(index, fingerprint) {
  const bucket = buckets[index];
  for (let i = 0; i < bucketSize; i++) {
    if (bucket[i] === fingerprint) {
      return true;
    }
  }
  return false;
}

/**
 * 检查元素是否可能在过滤器中
 * @param {string|Object} item - 要检查的元素
 * @returns {boolean} 是否存在
 */
export function has(item) {
  if (item === null || item === undefined) {
    return false;
  }
  
  const fingerprint = getFingerprint(item);
  const [i1, i2] = getCandidateBuckets(fingerprint);
  return findInBucket(i1, fingerprint) || findInBucket(i2, fingerprint);
}

/**
 * 从过滤器中删除元素
 * @param {string|Object} item - 要删除的元素
 * @returns {boolean} 是否删除成功
 */
export function remove(item) {
  if (item === null || item === undefined) {
    return false;
  }
  
  const fingerprint = getFingerprint(item);
  const [i1, i2] = getCandidateBuckets(fingerprint);
  
  if (removeFromBucket(i1, fingerprint) || removeFromBucket(i2, fingerprint)) {
    count--; // 减少计数
    return true;
  }
  return false;
}

/**
 * 清空过滤器
 */
export function clear() {
  for (let i = 0; i < capacity; i++) {
    buckets[i].fill(null);
  }
  count = 0; // 重置计数
}

/**
 * 配置Cuckoo过滤器
 * @param {Object} options - 配置选项
 * @param {number} [options.capacity=1000] - 总桶数量
 * @param {number} [options.bucketSize=4] - 每个桶的槽位数
 * @param {number} [options.maxKicks=500] - 最大踢出次数
 * @param {number} [options.fingerprintLength=1] - 指纹长度(字节)
 */
export function configure(options = {}) {
  capacity = options.capacity || 1000;
  bucketSize = options.bucketSize || 4;
  maxKicks = options.maxKicks || 500;
  fingerprintLength = options.fingerprintLength || 1;
  initBuckets();
}

/**
 * 生成指定配置下的元素指纹
 * @param {string|Object} item - 要处理的元素
 * @param {number} fpLength - 指纹长度
 * @returns {string} 指纹字符串
 */
function computeFingerprint(item, fpLength) {
  if (item === null || item === undefined) {
    throw new Error('项目不能为空');
  }
  
  const str = typeof item === 'string' ? item : JSON.stringify(item);
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33 + str.charCodeAt(i)) & 0xFFFFFFFF;
  }
  return hash.toString(16).slice(0, fpLength).padStart(fpLength, '0');
}

/**
 * 获取指定配置下元素的候选桶位置
 * @param {string} fingerprint - 元素指纹
 * @param {number} cap - 总桶数量
 * @returns {number[]} [index1, index2] 两个候选桶索引
 */
function computeCandidateBuckets(fingerprint, cap) {
  const hash = parseInt(fingerprint, 16);
  const index1 = hash % cap;
  const index2 = (index1 ^ (hash * 0x5bd1e995)) % cap;
  return [index1, index2];
}

/**
 * 创建并返回一个新的Cuckoo过滤器实例
 * @param {Object} [options={}] - 配置选项
 * @returns {Object} Cuckoo过滤器API
 */
export function createCuckooFilter(options = {}) {
  // 创建一个隔离的实例
  const instanceCapacity = options.capacity || 1000;
  const instanceBucketSize = options.bucketSize || 4;
  const instanceMaxKicks = options.maxKicks || 500;
  const instanceFingerprintLength = options.fingerprintLength || 1;
  const instanceBuckets = new Array(instanceCapacity);
  let instanceCount = 0; // 实例计数器
  
  for (let i = 0; i < instanceCapacity; i++) {
    instanceBuckets[i] = new Array(instanceBucketSize).fill(null);
  }
  
  /**
   * 向指定桶插入指纹
   * @param {number} index - 桶索引
   * @param {string} fingerprint - 指纹
   * @returns {boolean} 是否插入成功
   */
  function insertInstanceToBucket(index, fingerprint) {
    const bucket = instanceBuckets[index];
    for (let i = 0; i < instanceBucketSize; i++) {
      if (bucket[i] === null) {
        bucket[i] = fingerprint;
        return true;
      }
    }
    return false;
  }

  /**
   * 在指定桶中查找指纹
   * @param {number} index - 桶索引
   * @param {string} fingerprint - 指纹
   * @returns {boolean} 是否存在
   */
  function findInstanceInBucket(index, fingerprint) {
    const bucket = instanceBuckets[index];
    for (let i = 0; i < instanceBucketSize; i++) {
      if (bucket[i] === fingerprint) {
        return true;
      }
    }
    return false;
  }

  /**
   * 从指定桶中删除指纹
   * @param {number} index - 桶索引
   * @param {string} fingerprint - 指纹
   * @returns {boolean} 是否删除成功
   */
  function removeInstanceFromBucket(index, fingerprint) {
    const bucket = instanceBuckets[index];
    for (let i = 0; i < instanceBucketSize; i++) {
      if (bucket[i] === fingerprint) {
        bucket[i] = null;
        return true;
      }
    }
    return false;
  }
  
  // 返回实例的API
  return {
    add: (item) => {
      if (item === null || item === undefined) {
        return false;
      }
      
      const fingerprint = computeFingerprint(item, instanceFingerprintLength);
      const [i1, i2] = computeCandidateBuckets(fingerprint, instanceCapacity);

      // 检查是否有空槽
      if (insertInstanceToBucket(i1, fingerprint)) {
        instanceCount++; // 增加计数
        return true;
      }
      if (insertInstanceToBucket(i2, fingerprint)) {
        instanceCount++; // 增加计数
        return true;
      }

      // 需要踢出操作
      let index = Math.random() < 0.5 ? i1 : i2;
      let currentFingerprint = fingerprint;
      
      for (let n = 0; n < instanceMaxKicks; n++) {
        const slot = Math.floor(Math.random() * instanceBucketSize);
        const displacedFp = instanceBuckets[index][slot];
        instanceBuckets[index][slot] = currentFingerprint;
        
        const [alt1, alt2] = computeCandidateBuckets(displacedFp, instanceCapacity);
        index = (index === alt1) ? alt2 : alt1;
        
        if (insertInstanceToBucket(index, displacedFp)) {
          instanceCount++; // 增加计数
          return true;
        }
        currentFingerprint = displacedFp;
      }
      return false; // 达到最大踢出次数
    },
    has: (item) => {
      if (item === null || item === undefined) {
        return false;
      }
      
      const fingerprint = computeFingerprint(item, instanceFingerprintLength);
      const [i1, i2] = computeCandidateBuckets(fingerprint, instanceCapacity);
      return findInstanceInBucket(i1, fingerprint) || 
             findInstanceInBucket(i2, fingerprint);
    },
    remove: (item) => {
      if (item === null || item === undefined) {
        return false;
      }
      
      const fingerprint = computeFingerprint(item, instanceFingerprintLength);
      const [i1, i2] = computeCandidateBuckets(fingerprint, instanceCapacity);
      
      if (removeInstanceFromBucket(i1, fingerprint) || 
          removeInstanceFromBucket(i2, fingerprint)) {
        instanceCount--; // 减少计数
        return true;
      }
      return false;
    },
    clear: () => {
      for (let i = 0; i < instanceCapacity; i++) {
        instanceBuckets[i].fill(null);
      }
      instanceCount = 0; // 重置计数
    },
    getSize: () => instanceCapacity,
    getCount: () => instanceCount,
    getFalsePositiveRate: () => {
      // 布谷鸟过滤器的误判率估计约为 2ε/s，其中ε是填充率，s是指纹大小
      const loadFactor = instanceCount / (instanceCapacity * instanceBucketSize);
      return Math.min(0.999, 2 * loadFactor / Math.pow(16, instanceFingerprintLength));
    }
  };
}

/**
 * 获取当前过滤器大小
 * @returns {number} 过滤器大小(桶数量)
 */
export function getSize() {
  return capacity;
}

/**
 * 获取已添加元素数量
 * @returns {number} 元素数量
 */
export function getCount() {
  return count;
}

/**
 * 获取当前误判率估计值
 * @returns {number} 误判率
 */
export function getFalsePositiveRate() {
  // 布谷鸟过滤器的误判率估计约为 2ε/s，其中ε是填充率，s是指纹大小
  const loadFactor = count / (capacity * bucketSize);
  return Math.min(0.999, 2 * loadFactor / Math.pow(16, fingerprintLength));
}

// 导出默认API
export const cuckooFilter = {
  add,
  has,
  remove,
  clear,
  configure,
  getSize,
  getCount,
  getFalsePositiveRate
};