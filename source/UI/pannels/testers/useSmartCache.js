import { ref, computed, watchEffect } from '../../../../static/vue.esm-browser.js';

/**
 * 智能缓存管理系统
 * @param {Object} options - 配置选项
 * @param {String} options.strategy - 缓存策略 ('lru', 'simple', 'hybrid', 'segment')
 * @param {Number} options.maxSize - 最大缓存条目数
 * @param {Number} options.segmentSize - 分段缓存大小（当使用segment策略时）
 * @param {Number} options.ttl - 缓存条目存活时间(ms)，0表示永不过期
 * @param {Function} options.onEvict - 条目被移除时的回调函数
 * @param {Boolean} options.adaptiveSize - 是否自动调整缓存大小
 * @param {Function} options.keyGenerator - 自定义键生成器函数
 * @param {Object} options.metrics - 是否启用指标收集
 * @param {Boolean} options.concurrencyControl - 是否启用并发控制
 * @returns {Object} - 缓存管理对象
 */
export function useSmartCache(options = {}) {
  // 默认选项
  const defaultOptions = {
    strategy: 'lru',
    maxSize: 1000,
    segmentSize: 100,
    ttl: 0,
    onEvict: null,
    adaptiveSize: false,
    keyGenerator: null,
    metrics: { enabled: true },
    concurrencyControl: true
  };
  
  const opts = { ...defaultOptions, ...options };
  
  // 参数验证
  if (opts.maxSize <= 0) {
    console.warn('maxSize必须大于0，已设置为默认值1000');
    opts.maxSize = 1000;
  }
  
  if (opts.ttl < 0) {
    console.warn('ttl不能为负数，已设置为0（永不过期）');
    opts.ttl = 0;
  }
  
  // 统一存储结构
  const storage = new Map();
  
  // LRU双向链表实现
  const lruList = {
    head: { key: null, next: null, prev: null },
    tail: { key: null, next: null, prev: null },
    nodeMap: new Map(), // 存储节点引用，避免O(n)查找

    init() {
      this.head.next = this.tail;
      this.tail.prev = this.head;
    },

    add(key) {
      if (this.nodeMap.has(key)) {
        // 如果已存在，先移除旧位置
        this.remove(key);
      }
      
      // 创建新节点
      const node = { key, next: null, prev: null };
      
      // 插入到尾部(最近使用)
      const lastNode = this.tail.prev;
      lastNode.next = node;
      node.prev = lastNode;
      node.next = this.tail;
      this.tail.prev = node;
      
      // 记录节点引用
      this.nodeMap.set(key, node);
    },

    remove(key) {
      const node = this.nodeMap.get(key);
      if (!node) return;
      
      // 从链表中移除
      node.prev.next = node.next;
      node.next.prev = node.prev;
      
      // 从映射中移除
      this.nodeMap.delete(key);
      
      return key;
    },

    getLeastRecent(count = 1) {
      const result = [];
      let current = this.head.next;
      
      while (current !== this.tail && result.length < count) {
        if (current.key !== null) {
          result.push(current.key);
        }
        current = current.next;
      }
      
      return result;
    },

    size() {
      return this.nodeMap.size;
    }
  };
  
  // 初始化LRU链表
  lruList.init();
  
  // 缓存统计信息
  const metrics = {
    hits: ref(0),
    misses: ref(0),
    evictions: ref(0),
    size: computed(() => storage.size),
    hitRate: computed(() => {
      const total = metrics.hits.value + metrics.misses.value;
      return total > 0 ? metrics.hits.value / total : 0;
    }),
    segmentCount: computed(() => storage.size),
    averageKeySize: ref(0),
    averageValueSize: ref(0),
    adaptiveSizeHistory: ref([])
  };
  
  // 并发操作控制
  const operationLock = ref(false);
  const pendingOperations = [];
  
  /**
   * 执行互斥操作，防止并发冲突，添加超时处理
   * @param {Function} operation - 要执行的操作函数
   * @param {Number} timeout - 超时时间（毫秒）
   * @returns {Promise<any>} - 操作结果
   */
  async function executeWithLock(operation, timeout = 5000) {
    // 如果未启用并发控制，直接执行
    if (!opts.concurrencyControl) {
      return operation();
    }
    
    // 如果已加锁，将操作放入等待队列
    if (operationLock.value) {
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          // 从等待队列中移除
          const index = pendingOperations.findIndex(op => op.id === timeoutId);
          if (index !== -1) {
            pendingOperations.splice(index, 1);
          }
          reject(new Error('操作超时'));
        }, timeout);
        
        pendingOperations.push({
          id: timeoutId,
          execute: () => {
            clearTimeout(timeoutId);
            try {
              resolve(operation());
            } catch (e) {
              reject(e);
            }
          }
        });
      });
    }
    
    // 获取锁并执行操作
    operationLock.value = true;
    try {
      return operation();
    } finally {
      // 释放锁并处理等待队列
      operationLock.value = false;
      
      // 处理下一个操作（如果有）
      if (pendingOperations.length > 0) {
        const nextOperation = pendingOperations.shift();
        // 使用setTimeout确保事件循环能够继续
        setTimeout(() => {
          nextOperation.execute();
        }, 0);
      }
    }
  }
  
  // 合并存储时间戳和值(减少Map实例数量)
  // 将项目格式改为 {value, timestamp} 减少内存使用
  
  /**
   * 改进的内存估算函数
   * @param {*} obj - 要估算大小的对象 
   * @returns {Number} - 估算的字节大小
   */
  function estimateSize(obj) {
    if (obj === null || obj === undefined) return 0;
    
    const type = typeof obj;
    
    // 基本类型
    if (type === 'number') return 8;
    if (type === 'boolean') return 4;
    if (type === 'string') return obj.length * 2 + 8; // 包括头部信息
    
    try {
      // 对DOM节点处理
      if (typeof window !== 'undefined' && obj instanceof Node) {
        return 1000; // 为DOM节点提供一个标准估计值
      }
      
      // 使用Blob估算对象大小（只支持可序列化的对象）
      if (type === 'object' && typeof Blob !== 'undefined') {
        try {
          // 处理循环引用
          const cache = new WeakSet();
          const safeStringify = (o) => {
            const seen = new Set();
            return JSON.stringify(o, (key, value) => {
              if (typeof value === 'object' && value !== null) {
                if (seen.has(value)) return '[Circular]';
                seen.add(value);
                
                // 避免处理不可序列化对象
                if (value instanceof Node) return '[DOM]';
                if (value instanceof Error) return `[Error: ${value.message}]`;
                if (typeof value.toJSON === 'function') {
                  try {
                    return value.toJSON();
                  } catch (e) {
                    return '[Object]';
                  }
                }
              }
              return value;
            });
          };
          
          try {
            const str = safeStringify(obj);
            const blob = new Blob([str]);
            return blob.size;
          } catch (e) {
            // 回退到基本估计
            return basicEstimate(obj);
          }
        } catch (e) {
          // 回退到基本估计
          return basicEstimate(obj);
        }
      }
      
      return basicEstimate(obj);
    } catch (e) {
      console.warn('估算对象大小失败:', e);
      return 100; // 返回默认值
    }
  }
  
  /**
   * 基本的对象大小估算
   * @param {*} obj - 要估算的对象
   * @returns {Number} - 估算的字节大小
   */
  function basicEstimate(obj) {
    if (Array.isArray(obj)) {
      return 40 + obj.reduce((size, item) => size + estimateSize(item), 0);
    }
    
    if (typeof obj === 'object' && obj !== null) {
      let size = 40; // 对象头部信息
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          size += key.length * 2 + 8; // 键名大小 + 引用大小
          try {
            size += estimateSize(obj[key]); // 值大小
          } catch (e) {
            size += 100; // 默认估计
          }
        }
      }
      return size;
    }
    
    return 8; // 默认大小
  }
  
  /**
   * 改进的键生成器 - 安全处理循环引用和复杂对象
   * @param {*} key - 原始键
   * @param {String} prefix - 可选前缀
   * @returns {String} - 格式化的缓存键
   */
  function generateKey(key, prefix = '') {
    if (typeof opts.keyGenerator === 'function') {
      const generatedKey = opts.keyGenerator(key, prefix);
      if (typeof generatedKey !== 'string' && typeof generatedKey !== 'number') {
        console.warn('键生成器返回的不是字符串或数字类型，将进行强制转换');
        return String(generatedKey);
      }
      return generatedKey;
    }
    
    // 处理对象类型键
    if (typeof key === 'object' && key !== null) {
      try {
        // 使用安全序列化以处理循环引用
        const seen = new WeakSet();
        const safeStringify = (obj) => JSON.stringify(obj, (k, v) => {
          if (typeof v === 'object' && v !== null) {
            if (seen.has(v)) return '[Circular]';
            seen.add(v);
          }
          return v;
        });
        
        return `${prefix ? prefix + '_' : ''}${safeStringify(key)}`;
      } catch (e) {
        // 备用：更可靠的多层对象处理
        return `${prefix ? prefix + '_' : ''}${objectToUniqueString(key)}`;
      }
    }
    
    if (prefix) {
      return `${prefix}_${key}`;
    }
    
    return String(key);
  }
  
  /**
   * 将对象转换为唯一字符串（递归处理多层对象）
   * @param {Object} obj - 要转换的对象
   * @param {Number} depth - 当前递归深度
   * @param {WeakMap} seen - 已处理对象映射
   * @returns {String} - 唯一字符串表示
   */
  function objectToUniqueString(obj, depth = 0, seen = new WeakMap()) {
    if (depth > 5) return '{MaxDepth}'; // 限制递归深度
    
    if (!obj || typeof obj !== 'object') return String(obj);
    
    // 处理循环引用
    if (seen.has(obj)) return '{Circular}';
    seen.set(obj, true);
    
    // 特殊对象类型处理
    if (obj instanceof Date) return `Date:${obj.getTime()}`;
    if (obj instanceof RegExp) return `RegExp:${obj.toString()}`;
    if (Array.isArray(obj)) {
      return `Array[${obj.length}]:${obj.map(v => objectToUniqueString(v, depth + 1, seen)).join('|')}`;
    }
    
    // 普通对象处理
    const props = Object.keys(obj).sort();
    const uniqueStrs = props.map(p => {
      const val = obj[p];
      const valStr = typeof val === 'object' && val !== null
        ? objectToUniqueString(val, depth + 1, seen)
        : String(val);
      return `${p}:${valStr}`;
    });
    
    return `{${uniqueStrs.join(',')}}`;
  }
  
  /**
   * 更新最近使用记录（LRU策略）
   * @param {String} key - 缓存键
   */
  function updateRecentlyUsed(key) {
    lruList.add(key);
  }
  
  /**
   * 自适应调整缓存大小
   */
  function adjustCacheSize() {
    if (!opts.adaptiveSize) return;
    
    // 记录当前状态
    const currentState = {
      size: storage.size,
      hitRate: metrics.hitRate.value,
      timestamp: Date.now()
    };
    
    // 保存历史，最多保存10个点
    const history = [...metrics.adaptiveSizeHistory.value, currentState].slice(-10);
    metrics.adaptiveSizeHistory.value = history;
    
    // 需要至少3个数据点才能分析趋势
    if (history.length < 3) return;
    
    // 分析命中率趋势
    const hitRateTrend = history[history.length - 1].hitRate - history[0].hitRate;
    
    // 基于命中率趋势调整缓存大小
    if (hitRateTrend < -0.1) {
      // 命中率下降，增加缓存大小
      const newSize = Math.min(opts.maxSize * 2, opts.maxSize * 1.25);
      updateOptions({ maxSize: Math.floor(newSize) });
    } else if (hitRateTrend > 0.1 && storage.size < opts.maxSize * 0.5) {
      // 命中率上升且使用率低，减小缓存大小
      const newSize = Math.max(100, opts.maxSize * 0.8);
      updateOptions({ maxSize: Math.floor(newSize) });
    }
  }
  
  /**
   * 管理缓存大小，确保不超过最大限制
   */
  function manageSize() {
    if (storage.size <= opts.maxSize) return;
    
    let keysToDelete = [];
    
    // 根据策略确定要删除的键
    if (opts.strategy === 'lru') {
      // LRU策略：删除最久未使用的条目
      const deleteCount = Math.ceil((storage.size - opts.maxSize) * 1.1); // 多删除一些，避免频繁管理
      keysToDelete = lruList.getLeastRecent(deleteCount);
    } else if (opts.strategy === 'segment') {
      // 保留分段缓存，但删除过远的细节缓存
      const regularKeys = [];
      const segmentKeys = [];
      
      for (const key of storage.keys()) {
        if (key.startsWith('segment_')) {
          segmentKeys.push(key);
        } else {
          regularKeys.push({
            key,
            timestamp: storage.get(key).timestamp || 0
          });
        }
      }
      
      // 对于非分段键，使用LRU策略
      if (regularKeys.length > opts.maxSize * 0.8) {
        regularKeys.sort((a, b) => a.timestamp - b.timestamp);
        const deleteCount = Math.ceil(regularKeys.length * 0.4);
        keysToDelete = regularKeys.slice(0, deleteCount).map(item => item.key);
      }
      
      // 如果分段键太多，也删除一些
      if (segmentKeys.length > 50) {
        // 保留均匀分布的分段缓存点
        const keepEvery = Math.ceil(segmentKeys.length / 30);
        segmentKeys.forEach((key, i) => {
          if (i % keepEvery !== 0) {
            keysToDelete.push(key);
          }
        });
      }
    } else {
      // 简单策略：随机删除条目直到满足大小限制
      const deleteCount = Math.ceil((storage.size - opts.maxSize) * 1.1);
      const allKeys = [...storage.keys()];
      keysToDelete = allKeys.slice(0, deleteCount);
    }
    
    // 执行删除并触发回调
    for (const key of keysToDelete) {
      const entry = storage.get(key);
      storage.delete(key);
      
      // 从LRU链表中移除
      if (opts.strategy === 'lru' || opts.strategy === 'hybrid') {
        lruList.remove(key);
      }
      
      if (opts.metrics.enabled) {
        metrics.evictions.value++;
      }
      
      if (typeof opts.onEvict === 'function') {
        opts.onEvict(key, entry.value, 'evicted');
      }
    }
  }
  
  /**
   * 优化的过期项清理函数，使用批处理方式
   */
  function cleanExpiredItems() {
    return executeWithLock(() => {
      const now = Date.now();
      const expiredKeys = [];
      const batchSize = 100; // 每批处理的最大数量
      let processedCount = 0;
      
      // 转换为数组以避免在遍历中修改
      const entries = [...storage.entries()];
      
      // 批量处理，每批最多检查batchSize个项
      for (let i = 0; i < entries.length; i++) {
        const [key, entry] = entries[i];
        processedCount++;
        
        // 使用自定义TTL或默认TTL
        const entryTtl = entry.metadata?.customTtl || opts.ttl;
        
        if (entryTtl > 0 && entry.timestamp && (now - entry.timestamp > entryTtl)) {
          expiredKeys.push(key);
        }
        
        // 如果已处理足够多的项，或者这是最后一批，则进行实际删除
        if (processedCount >= batchSize || i === entries.length - 1) {
          // 执行批量删除
          for (const key of expiredKeys) {
            const entry = storage.get(key);
            storage.delete(key);
            
            // 从LRU链表中移除
            if (opts.strategy === 'lru' || opts.strategy === 'hybrid') {
              lruList.remove(key);
            }
            
            if (opts.metrics.enabled) {
              metrics.evictions.value++;
            }
            
            if (typeof opts.onEvict === 'function') {
              opts.onEvict(key, entry.value, 'expired');
            }
          }
          
          // 重置处理计数器和过期键数组
          processedCount = 0;
          expiredKeys.length = 0;
        }
      }
    });
  }
  
  /**
   * 设置缓存项
   * @param {*} key - 缓存键
   * @param {*} value - 要缓存的值
   * @param {String} prefix - 可选前缀
   * @returns {Boolean} - 操作是否成功
   */
  function set(key, value, prefix = '') {
    return executeWithLock(() => {
      try {
        const cacheKey = generateKey(key, prefix);
        
        // 估算值大小用于指标
        if (opts.metrics.enabled) {
          const keySize = estimateSize(cacheKey);
          const valueSize = estimateSize(value);
          
          // 更新平均大小统计
          metrics.averageKeySize.value = (metrics.averageKeySize.value * storage.size + keySize) / (storage.size + 1);
          metrics.averageValueSize.value = (metrics.averageValueSize.value * storage.size + valueSize) / (storage.size + 1);
        }
        
        // 统一存储格式
        const entry = {
          key: key, // 保存原始键
          value: value,
          timestamp: Date.now(),
          isSegment: prefix === 'segment',
          metadata: {}
        };
        
        // 存储到统一存储
        storage.set(cacheKey, entry);
        
        // 更新LRU
        if (opts.strategy === 'lru' || opts.strategy === 'hybrid') {
          updateRecentlyUsed(cacheKey);
        }
        
        // 管理缓存大小
        if (storage.size > opts.maxSize) {
          manageSize();
        }
        
        // 自适应缓存大小调整
        if (opts.adaptiveSize) {
          adjustCacheSize();
        }
        
        return true;
      } catch (error) {
        console.error('缓存设置失败:', error);
        return false;
      }
    });
  }
  
  /**
   * 获取缓存项
   * @param {*} key - 缓存键
   * @param {String} prefix - 可选前缀
   * @returns {*} - 缓存的值或undefined（如果不存在）
   */
  function get(key, prefix = '') {
    return executeWithLock(() => {
      try {
        const cacheKey = generateKey(key, prefix);
        
        if (storage.has(cacheKey)) {
          const entry = storage.get(cacheKey);
          
          // 检查是否过期
          if (opts.ttl > 0) {
            const now = Date.now();
            // 使用自定义TTL或默认TTL
            const entryTtl = entry.metadata?.customTtl || opts.ttl;
            
            if (now - entry.timestamp > entryTtl) {
              // 已过期，删除并返回undefined
              remove(key, prefix);
              
              if (opts.metrics.enabled) {
                metrics.misses.value++;
              }
              
              return undefined;
            }
            
            // 更新访问时间戳
            entry.timestamp = now;
          }
          
          // 更新使用记录
          if (opts.strategy === 'lru' || opts.strategy === 'hybrid') {
            updateRecentlyUsed(cacheKey);
          }
          
          if (opts.metrics.enabled) {
            metrics.hits.value++;
          }
          
          return entry.value;
        }
        
        if (opts.metrics.enabled) {
          metrics.misses.value++;
        }
        
        return undefined;
      } catch (error) {
        console.error('缓存获取失败:', error);
        return undefined;
      }
    });
  }
  
  /**
   * 设置分段缓存
   * @param {Number} segmentIndex - 分段索引
   * @param {*} value - 分段值
   * @param {*} indexInfo - 索引信息
   */
  function setSegment(segmentIndex, value, indexInfo) {
    try {
      if (opts.strategy !== 'segment' && opts.strategy !== 'hybrid') return;
      
      const segmentKey = generateKey(segmentIndex, 'segment');
      
      // 统一存储格式
      const entry = {
        key: segmentIndex,
        value: value,
        timestamp: Date.now(),
        isSegment: true,
        segmentIndex: segmentIndex,
        metadata: { indexInfo: indexInfo || { index: segmentIndex * opts.segmentSize } }
      };
      
      storage.set(segmentKey, entry);
      
      // 管理缓存大小
      if (storage.size > opts.maxSize) {
        manageSize();
      }
    } catch (error) {
      console.error('设置分段缓存失败:', error);
    }
  }
  
  /**
   * 获取分段缓存
   * @param {Number} segmentIndex - 分段索引
   * @returns {*} - 分段数据或undefined
   */
  function getSegment(segmentIndex) {
    try {
      if (opts.strategy !== 'segment' && opts.strategy !== 'hybrid') return undefined;
      
      const segmentKey = generateKey(segmentIndex, 'segment');
      
      // 更新时间戳和使用记录
      if (storage.has(segmentKey)) {
        const cacheEntry = storage.get(segmentKey);
        if (cacheEntry) {
          cacheEntry.timestamp = Date.now();
        }
        
        if (opts.metrics.enabled) {
          metrics.hits.value++;
        }
        
        return cacheEntry;
      }
      
      if (opts.metrics.enabled) {
        metrics.misses.value++;
      }
      
      return undefined;
    } catch (error) {
      console.error('获取分段缓存失败:', error);
      return undefined;
    }
  }
  
  /**
   * 获取最近的分段
   * @param {Number} targetIndex - 目标索引
   * @returns {Object} - 包含最近分段数据和索引信息
   */
  function getNearestSegment(targetIndex) {
    try {
      if (opts.strategy !== 'segment' && opts.strategy !== 'hybrid') return null;
      
      const targetSegment = Math.floor(targetIndex / opts.segmentSize);
      
      // 先尝试精确匹配
      const exactMatch = getSegment(targetSegment);
      if (exactMatch) return exactMatch;
      
      // 找到小于目标的最大分段
      let maxSegment = -1;
      let maxSegmentData = null;
      
      for (let i = targetSegment - 1; i >= 0; i--) {
        const segmentData = getSegment(i);
        if (segmentData) {
          maxSegment = i;
          maxSegmentData = segmentData;
          break;
        }
      }
      
      return maxSegmentData;
    } catch (error) {
      console.error('获取最近分段失败:', error);
      return null;
    }
  }
  
  /**
   * 判断是否存在缓存项
   * @param {*} key - 缓存键
   * @param {String} prefix - 可选前缀
   * @returns {Boolean} - 是否存在
   */
  function has(key, prefix = '') {
    try {
      const cacheKey = generateKey(key, prefix);
      return storage.has(cacheKey);
    } catch (error) {
      console.error('检查缓存存在性失败:', error);
      return false;
    }
  }
  
  /**
   * 删除缓存项
   * @param {*} key - 缓存键
   * @param {String} prefix - 可选前缀
   * @returns {Boolean} - 操作是否成功
   */
  function remove(key, prefix = '') {
    try {
      const cacheKey = generateKey(key, prefix);
      
      // 从LRU列表中移除
      lruList.remove(cacheKey);
      
      // 如果是段缓存，同时从段缓存中移除
      if (cacheKey.startsWith('segment_')) {
        storage.delete(cacheKey);
      }
      
      return storage.delete(cacheKey);
    } catch (error) {
      console.error('删除缓存项失败:', error);
      return false;
    }
  }
  
  /**
   * 批量设置缓存项
   * @param {Object} entries - 键值对象
   * @param {String} prefix - 可选前缀
   */
  function setMany(entries, prefix = '') {
    try {
      for (const [key, value] of Object.entries(entries)) {
        set(key, value, prefix);
      }
    } catch (error) {
      console.error('批量设置缓存失败:', error);
    }
  }
  
  /**
   * 批量获取缓存项
   * @param {Array} keys - 键数组
   * @param {String} prefix - 可选前缀
   * @returns {Object} - 键值对象
   */
  function getMany(keys, prefix = '') {
    const result = {};
    
    try {
      for (const key of keys) {
        result[key] = get(key, prefix);
      }
    } catch (error) {
      console.error('批量获取缓存失败:', error);
    }
    
    return result;
  }
  
  /**
   * 清空缓存
   */
  function clear() {
    try {
      storage.clear();
      
      // 重置LRU链表
      lruList.nodeMap.clear();
      lruList.init();
      
      // 重置指标
      if (opts.metrics.enabled) {
        metrics.hits.value = 0;
        metrics.misses.value = 0;
        metrics.evictions.value = 0;
      }
    } catch (error) {
      console.error('清空缓存失败:', error);
    }
  }
  
  /**
   * 调整缓存选项
   * @param {Object} newOptions - 新选项
   */
  function updateOptions(newOptions) {
    try {
      Object.assign(opts, newOptions);
      
      // 如果最大大小减小了，需要管理缓存大小
      if (newOptions.maxSize && newOptions.maxSize < opts.maxSize) {
        manageSize();
      }
    } catch (error) {
      console.error('更新缓存选项失败:', error);
    }
  }
  
  // 定期清理过期项
  if (opts.ttl > 0) {
    let cleanupInterval;
    
    // 在Vue组件中使用时自动设置和清理间隔
    watchEffect((onCleanup) => {
      // 设置间隔
      cleanupInterval = setInterval(() => {
        cleanExpiredItems();
      }, Math.min(60000, opts.ttl / 2)); // 最快每分钟，或TTL的一半
      
      // 清理函数
      onCleanup(() => {
        if (cleanupInterval) {
          clearInterval(cleanupInterval);
        }
      });
    });
  }
  
  /**
   * 异步获取缓存项，支持Promise和懒加载
   * @param {*} key - 缓存键
   * @param {Function} asyncLoader - 当缓存未命中时异步加载数据的函数
   * @param {Object} options - 异步选项
   * @returns {Promise<*>} - 包含缓存值的Promise
   */
  async function getAsync(key, asyncLoader, options = {}) {
    const { prefix = '', ttl = opts.ttl, priority = 0 } = options;
    
    // 尝试从缓存获取
    const cachedValue = get(key, prefix);
    if (cachedValue !== undefined) {
      return cachedValue;
    }
    
    // 缓存未命中，使用加载器函数
    if (typeof asyncLoader !== 'function') {
      return undefined;
    }
    
    try {
      // 执行异步加载
      const value = await asyncLoader();
      
      // 设置自定义TTL（如果提供）
      if (ttl !== opts.ttl) {
        setWithOptions(key, value, { prefix, ttl, priority });
      } else {
        set(key, value, prefix);
      }
      
      return value;
    } catch (error) {
      console.error('异步数据加载失败:', error);
      throw error; // 允许调用者处理错误
    }
  }
  
  /**
   * 使用自定义选项设置缓存
   * @param {*} key - 缓存键
   * @param {*} value - 缓存值
   * @param {Object} options - 自定义选项
   */
  function setWithOptions(key, value, options = {}) {
    const { prefix = '', ttl = opts.ttl, priority = 0 } = options;
    
    return executeWithLock(() => {
      try {
        const cacheKey = generateKey(key, prefix);
        
        // 统一存储格式，包含自定义选项
        const entry = {
          key: key,
          value: value,
          timestamp: Date.now(),
          isSegment: prefix === 'segment',
          metadata: {
            customTtl: ttl !== opts.ttl ? ttl : undefined,
            priority
          }
        };
        
        storage.set(cacheKey, entry);
        
        // 更新LRU
        if (opts.strategy === 'lru' || opts.strategy === 'hybrid') {
          updateRecentlyUsed(cacheKey);
        }
        
        // 管理缓存大小
        if (storage.size > opts.maxSize) {
          manageSize();
        }
        
        return true;
      } catch (error) {
        console.error('缓存设置失败:', error);
        return false;
      }
    });
  }
  
  // 返回缓存对象接口
  return {
    // 基本操作
    set,
    get,
    has,
    remove,
    clear,
    
    // 异步操作
    getAsync,
    setWithOptions,
    
    // 批量操作
    setMany,
    getMany,
    
    // 分段缓存操作
    setSegment,
    getSegment,
    getNearestSegment,
    
    // 配置
    updateOptions,
    
    // 状态和指标
    metrics,
    
    // 新增方法
    getMemoryUsage() {
      return {
        keySize: metrics.averageKeySize.value * storage.size,
        valueSize: metrics.averageValueSize.value * storage.size,
        total: (metrics.averageKeySize.value + metrics.averageValueSize.value) * storage.size
      };
    },
    
    getAdaptiveSizeHistory() {
      return metrics.adaptiveSizeHistory.value;
    },
    
    // 高级方法
    /**
     * 根据条件批量删除缓存项
     * @param {Function} predicate - 判断条件函数
     */
    removeWhere(predicate) {
      if (typeof predicate !== 'function') return;
      
      try {
        const keysToRemove = [];
        
        for (const [key, value] of storage.entries()) {
          if (predicate(key, value)) {
            keysToRemove.push(key);
          }
        }
        
        for (const key of keysToRemove) {
          remove(key);
        }
        
        return keysToRemove.length;
      } catch (error) {
        console.error('条件删除缓存失败:', error);
        return 0;
      }
    },
    
    /**
     * 缓存键的迭代器
     * @returns {Iterator} - 键迭代器
     */
    keys() {
      return [...storage.keys()];
    },
    
    /**
     * 获取当前缓存大小
     * @returns {Number} - 缓存条目数
     */
    size() {
      return storage.size;
    }
  };
} 