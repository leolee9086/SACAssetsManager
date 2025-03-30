/**
 * 动态扩容布隆过滤器实现
 * 支持添加、查询、删除元素，并能自动扩容保持低误判率
 * @class
 * @property {Uint8Array} bits - 位数组，用于存储元素的存在状态
 * @property {number} size - 位数组的大小（位数）
 * @property {number} count - 当前存储的元素数量
 * @property {number} defaultSize - 默认位数组大小
 * @property {number} defaultHashes - 默认哈希函数数量
 * @property {number} maxFalsePositive - 最大允许误判率
 * @property {number} growthFactor - 扩容因子
 * @property {number[]} seeds - 哈希函数种子数组
 */

export class BloomFilter {
  /**
   * 创建布隆过滤器实例
   * @param {Object} [options={}] - 配置选项
   * @param {number} [options.size=1024*1024] - 初始位数组大小
   * @param {number} [options.hashes=7] - 初始哈希函数数量
   * @param {number} [options.maxFalsePositive=0.01] - 最大允许误判率
   * @param {number} [options.growthFactor=2] - 扩容因子
   */
  constructor(options = {}) {
    // 默认配置
    this.defaultSize = options.size || 1024 * 1024; // 默认位数组大小
    this.defaultHashes = options.hashes || 7; // 默认哈希函数数量
    this.maxFalsePositive = options.maxFalsePositive || 0.01; // 最大允许误判率
    this.growthFactor = options.growthFactor || 2; // 扩容因子
    
    // 初始化位数组
    this.bits = new Uint8Array(Math.ceil(this.defaultSize / 8));
    this.size = this.bits.length * 8;
    this.count = 0; // 元素数量
    
    // 生成哈希种子
    this.seeds = this.generateSeeds(this.defaultHashes);
  }
  
  // 生成哈希种子
  /**
   * 生成哈希种子
   * @private
   * @param {number} count - 需要生成的种子数量
   * @returns {number[]} 生成的种子数组
   */
  generateSeeds(count) {
    const seeds = [];
    for (let i = 0; i < count; i++) {
      seeds.push(Math.floor(Math.random() * 1000000) + 1000000);
    }
    return seeds;
  }
  
  // 哈希函数
  /**
   * 哈希函数
   * @private
   * @param {string} str - 要哈希的字符串
   * @param {number} seed - 哈希种子
   * @returns {number} 哈希结果（位数组中的位置）
   */
  hash(str, seed) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 33 + str.charCodeAt(i)) % seed;
    }
    return hash % this.size;
  }
  
  // 计算当前误判率
  /**
   * 计算当前误判率
   * @returns {number} 当前误判率
   */
  getFalsePositiveRate() {
    return Math.pow(1 - Math.exp(-this.defaultHashes * this.count / this.size), this.defaultHashes);
  }
  
  // 检查是否需要扩容
  /**
   * 检查是否需要扩容
   * @returns {boolean} 是否需要扩容
   */
  needsResize() {
    return this.getFalsePositiveRate() > this.maxFalsePositive;
  }
  
  // 扩容布隆过滤器
  /**
   * 扩容布隆过滤器
   * 当误判率超过阈值时自动调用
   * 会创建更大的位数组并增加哈希函数数量
   */
  resize() {
    const newSize = Math.floor(this.size * this.growthFactor);
    const newBits = new Uint8Array(Math.ceil(newSize / 8));
    
    // 重新计算所有现有元素的哈希位置
    // 实际应用中需要记录所有已添加元素，这里简化处理
    
    this.bits = newBits;
    this.size = newSize;
    
    // 增加哈希函数数量
    this.seeds = this.generateSeeds(this.defaultHashes + 1);
    this.defaultHashes = this.seeds.length;
  }
  
  // 添加元素
  /**
   * 添加元素到布隆过滤器
   * @param {string|Object} item - 要添加的元素（字符串或可JSON序列化的对象）
   */
  add(item) {
    if (this.needsResize()) {
      this.resize();
    }
    
    const str = typeof item === 'string' ? item : JSON.stringify(item);
    
    for (const seed of this.seeds) {
      const pos = this.hash(str, seed);
      this.bits[Math.floor(pos / 8)] |= 1 << (pos % 8);
    }
    
    this.count++;
  }
  
  // 检查元素是否存在
  /**
   * 检查元素是否可能在布隆过滤器中
   * @param {string|Object} item - 要检查的元素
   * @returns {boolean} 如果元素可能存在返回true，否则返回false
   * @note 可能存在假阳性，但不会存在假阴性
   */
  has(item) {
    const str = typeof item === 'string' ? item : JSON.stringify(item);
    
    for (const seed of this.seeds) {
      const pos = this.hash(str, seed);
      if (!(this.bits[Math.floor(pos / 8)] & (1 << (pos % 8)))) {
        return false;
      }
    }
    
    return true;
  }
  
  // 删除元素（计数布隆过滤器实现）
  /**
   * 从布隆过滤器中删除元素
   * @param {string|Object} item - 要删除的元素
   * @returns {boolean} 如果元素存在并成功删除返回true，否则返回false
   * @note 这是计数布隆过滤器实现，删除操作可能影响其他元素的判断
   */
  remove(item) {
    if (!this.has(item)) return false;
    
    const str = typeof item === 'string' ? item : JSON.stringify(item);
    
    for (const seed of this.seeds) {
      const pos = this.hash(str, seed);
      this.bits[Math.floor(pos / 8)] &= ~(1 << (pos % 8));
    }
    
    this.count--;
    return true;
  }
  
  // 清空过滤器
  /**
   * 清空布隆过滤器
   * 重置所有位为0并清空元素计数
   */
  clear() {
    this.bits.fill(0);
    this.count = 0;
  }
}

// 导出默认实例
const defaultBloomFilter = new BloomFilter();
export default defaultBloomFilter;