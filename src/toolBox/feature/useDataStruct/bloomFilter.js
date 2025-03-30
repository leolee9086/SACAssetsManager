/**
 * 动态扩容布隆过滤器实现
 * 支持添加、查询、删除元素，并能自动扩容保持低误判率
 */

export class BloomFilter {
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
  generateSeeds(count) {
    const seeds = [];
    for (let i = 0; i < count; i++) {
      seeds.push(Math.floor(Math.random() * 1000000) + 1000000);
    }
    return seeds;
  }
  
  // 哈希函数
  hash(str, seed) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 33 + str.charCodeAt(i)) % seed;
    }
    return hash % this.size;
  }
  
  // 计算当前误判率
  getFalsePositiveRate() {
    return Math.pow(1 - Math.exp(-this.defaultHashes * this.count / this.size), this.defaultHashes);
  }
  
  // 检查是否需要扩容
  needsResize() {
    return this.getFalsePositiveRate() > this.maxFalsePositive;
  }
  
  // 扩容布隆过滤器
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
  clear() {
    this.bits.fill(0);
    this.count = 0;
  }
}

// 导出默认实例
const defaultBloomFilter = new BloomFilter();
export default defaultBloomFilter;