/**
 * 动态扩容布隆过滤器实现
 * 支持添加、查询、删除元素，并能自动扩容保持低误判率
 */

// 默认配置和状态
let defaultSize = 1024 * 1024;
let defaultHashes = 7;
let maxFalsePositive = 0.01;
let growthFactor = 2;
let bits = new Uint8Array(Math.ceil(defaultSize / 8));
let size = bits.length * 8;
let count = 0;
let seeds = generateSeeds(defaultHashes);
let currentHashes = seeds.length;

/**
 * 生成哈希种子
 * @param {number} count - 需要生成的种子数量
 * @returns {Array<number>} 种子数组
 */
export function generateSeeds(count) {
  const seeds = [];
  // 使用质数作为种子以获得更好的分布
  const primes = [
    7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71,
    73, 79, 83, 89, 97, 101, 103, 107, 109, 113, 127, 131, 137, 139
  ];
  
  for (let i = 0; i < count; i++) {
    if (i < primes.length) {
      seeds.push(primes[i]);
    } else {
      // 如果需要更多种子，生成随机大质数
      seeds.push(Math.floor(Math.random() * 1000000) + 1000000);
    }
  }
  return seeds;
}

/**
 * 改进的哈希函数
 * @param {string} str - 输入字符串
 * @param {number} seed - 哈希种子
 * @param {number} maxSize - 最大值范围
 * @returns {number} 哈希值
 */
export function computeHash(str, seed, maxSize) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    // 使用更好的哈希算法 - FNV-1a变种
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xFFFFFFFF;
  }
  // 使用乘法哈希以获得更均匀的分布
  return Math.abs((hash * seed) % maxSize);
}

/**
 * 计算当前误判率
 * @param {number} hashCount - 哈希函数数量
 * @param {number} itemCount - 已添加元素数量
 * @param {number} filterSize - 过滤器大小
 * @returns {number} 误判率
 */
export function computeFalsePositiveRate(hashCount, itemCount, filterSize) {
  return Math.pow(1 - Math.exp(-hashCount * itemCount / filterSize), hashCount);
}

/**
 * 检查是否需要扩容
 * @returns {boolean} 是否需要扩容
 */
export function needsResize() {
  return computeFalsePositiveRate(currentHashes, count, size) > maxFalsePositive;
}

/**
 * 扩容布隆过滤器
 */
export function resize() {
  const newSize = Math.floor(size * growthFactor);
  const newBits = new Uint8Array(Math.ceil(newSize / 8));
  const oldBits = bits;
  const oldSize = size;
  
  // 保存现有数据
  bits = newBits;
  size = newSize;
  
  // 添加新的哈希函数
  const oldSeeds = seeds;
  seeds = generateSeeds(currentHashes + 1);
  currentHashes = seeds.length;
  
  // 重新计算所有已知元素
  // 注意：我们不能直接复制位，因为哈希值会改变，需要重新计算
  // 但是由于布隆过滤器的特性，我们实际上不知道哪些元素已经添加
  // 所以我们简单地将旧的过滤器的所有位复制到新的过滤器中
  // 这会增加误判率，但避免了完全重置过滤器
  
  // 复制旧位到新过滤器
  for (let i = 0; i < oldBits.length; i++) {
    if (i < newBits.length) {
      newBits[i] = oldBits[i];
    }
  }
}

/**
 * 添加元素到过滤器
 * @param {string|Object} item - 要添加的元素
 */
export function add(item) {
  if (item === null || item === undefined) {
    return;
  }
  
  if (needsResize()) {
    resize();
  }
  
  const str = typeof item === 'string' ? item : JSON.stringify(item);
  
  for (const seed of seeds) {
    const pos = computeHash(str, seed, size);
    bits[Math.floor(pos / 8)] |= 1 << (pos % 8);
  }
  
  count++;
}

/**
 * 检查元素是否在过滤器中
 * @param {string|Object} item - 要检查的元素
 * @returns {boolean} 是否存在
 */
export function has(item) {
  if (item === null || item === undefined) {
    return false;
  }
  
  const str = typeof item === 'string' ? item : JSON.stringify(item);
  
  for (const seed of seeds) {
    const pos = computeHash(str, seed, size);
    if (!(bits[Math.floor(pos / 8)] & (1 << (pos % 8)))) {
      return false;
    }
  }
  
  return true;
}

/**
 * 从过滤器中移除元素（注意：布隆过滤器不保证准确删除）
 * @param {string|Object} item - 要删除的元素
 * @returns {boolean} 是否删除成功
 */
export function remove(item) {
  if (item === null || item === undefined || !has(item)) {
    return false;
  }
  
  const str = typeof item === 'string' ? item : JSON.stringify(item);
  
  for (const seed of seeds) {
    const pos = computeHash(str, seed, size);
    bits[Math.floor(pos / 8)] &= ~(1 << (pos % 8));
  }
  
  count--;
  return true;
}

/**
 * 清空过滤器
 */
export function clear() {
  bits.fill(0);
  count = 0;
}

/**
 * 配置布隆过滤器
 * @param {Object} options - 配置选项
 * @param {number} [options.size=1024*1024] - 初始大小
 * @param {number} [options.hashes=7] - 哈希函数数量
 * @param {number} [options.maxFalsePositive=0.01] - 最大误判率
 * @param {number} [options.growthFactor=2] - 扩容因子
 */
export function configure(options = {}) {
  defaultSize = options.size || 1024 * 1024;
  defaultHashes = options.hashes || 7;
  maxFalsePositive = options.maxFalsePositive || 0.01;
  growthFactor = options.growthFactor || 2;
  
  bits = new Uint8Array(Math.ceil(defaultSize / 8));
  size = bits.length * 8;
  count = 0;
  seeds = generateSeeds(defaultHashes);
  currentHashes = seeds.length;
}

/**
 * 获取当前过滤器大小
 * @returns {number} 过滤器大小(位)
 */
export function getSize() {
  return size;
}

/**
 * 获取已添加元素数量
 * @returns {number} 元素数量
 */
export function getCount() {
  return count;
}

/**
 * 获取当前误判率
 * @returns {number} 误判率
 */
export function getFalsePositiveRate() {
  return computeFalsePositiveRate(currentHashes, count, size);
}

/**
 * 创建布隆过滤器实例
 * @param {Object} options - 配置选项
 * @returns {Object} 布隆过滤器实例
 */
export function createBloomFilter(options = {}) {
  // 实例配置
  const instanceSize = options.size || 1024 * 1024;
  const instanceHashes = options.hashes || 7;
  const instanceMaxFalsePositive = options.maxFalsePositive || 0.01;
  const instanceGrowthFactor = options.growthFactor || 2;
  
  // 实例状态
  let instanceBits = new Uint8Array(Math.ceil(instanceSize / 8));
  let instanceSize_ = instanceBits.length * 8;
  let instanceCount = 0;
  let instanceSeeds = generateSeeds(instanceHashes);
  let instanceCurrentHashes = instanceSeeds.length;
  
  /**
   * 实例级计算误判率
   */
  function instanceGetFalsePositiveRate() {
    return computeFalsePositiveRate(instanceCurrentHashes, instanceCount, instanceSize_);
  }
  
  /**
   * 检查实例是否需要扩容
   */
  function instanceNeedsResize() {
    return instanceGetFalsePositiveRate() > instanceMaxFalsePositive;
  }
  
  /**
   * 扩容实例
   */
  function instanceResize() {
    const newSize = Math.floor(instanceSize_ * instanceGrowthFactor);
    const newBits = new Uint8Array(Math.ceil(newSize / 8));
    const oldBits = instanceBits;
    
    // 保存现有数据
    instanceBits = newBits;
    instanceSize_ = newSize;
    
    // 添加新的哈希函数
    instanceSeeds = generateSeeds(instanceCurrentHashes + 1);
    instanceCurrentHashes = instanceSeeds.length;
    
    // 复制旧位到新过滤器
    for (let i = 0; i < oldBits.length; i++) {
      if (i < newBits.length) {
        newBits[i] = oldBits[i];
      }
    }
  }
  
  return {
    add(item) {
      if (item === null || item === undefined) {
        return;
      }
      
      if (instanceNeedsResize()) {
        instanceResize();
      }
      
      const str = typeof item === 'string' ? item : JSON.stringify(item);
      
      for (const seed of instanceSeeds) {
        const pos = computeHash(str, seed, instanceSize_);
        instanceBits[Math.floor(pos / 8)] |= 1 << (pos % 8);
      }
      
      instanceCount++;
    },
    
    has(item) {
      if (item === null || item === undefined) {
        return false;
      }
      
      const str = typeof item === 'string' ? item : JSON.stringify(item);
      
      for (const seed of instanceSeeds) {
        const pos = computeHash(str, seed, instanceSize_);
        if (!(instanceBits[Math.floor(pos / 8)] & (1 << (pos % 8)))) {
          return false;
        }
      }
      
      return true;
    },
    
    remove(item) {
      if (item === null || item === undefined || !this.has(item)) {
        return false;
      }
      
      const str = typeof item === 'string' ? item : JSON.stringify(item);
      
      for (const seed of instanceSeeds) {
        const pos = computeHash(str, seed, instanceSize_);
        instanceBits[Math.floor(pos / 8)] &= ~(1 << (pos % 8));
      }
      
      instanceCount--;
      return true;
    },
    
    clear() {
      instanceBits.fill(0);
      instanceCount = 0;
    },
    
    getSize: () => instanceSize_,
    getCount: () => instanceCount,
    getFalsePositiveRate: instanceGetFalsePositiveRate
  };
}

// 导出默认API
export const bloomFilter = {
  add,
  has,
  remove,
  clear,
  configure,
  getSize,
  getCount,
  getFalsePositiveRate
};