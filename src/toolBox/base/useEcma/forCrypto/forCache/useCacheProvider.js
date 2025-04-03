/**
 * @fileoverview 通用缓存提供者函数模块
 * @module toolBox/base/useEcma/forCrypto/forCache/useCacheProvider
 * @description 提供基于函数式编程风格的高效缓存管理实现
 */

/**
 * 创建JSON缓存适配器
 * @param {...string} path - 缓存文件的路径部分
 * @returns {Object} 缓存适配器对象
 */
export function createJsonCacheAdapter(...path) {
  const fs = require('fs-extra');
  const joinPath = require('path').join;
  const cachePath = joinPath(...path);
  
  return {
    /**
     * 初始化缓存数据
     * @param {string} name - 缓存名称
     * @param {Map} cache - 缓存Map对象
     */
    initData: (name, cache) => {
      const dataPath = joinPath(cachePath, `${name}.json`);
      
      if (!fs.existsSync(dataPath)) {
        try {
          fs.mkdirpSync(cachePath);
          fs.writeFileSync(dataPath, '{}');
        } catch (err) {
          console.error('初始化缓存文件失败:', err);
        }
      }
      
      fs.promises.readFile(dataPath, 'utf8')
        .then(data => {
          try {
            const json = JSON.parse(data);
            Object.entries(json).forEach(([key, value]) => {
              cache.set(key, value);
            });
          } catch (err) {
            console.error('解析缓存数据失败:', err);
          }
        })
        .catch(err => {
          console.error('读取缓存文件失败:', err);
        });
    },
    
    /**
     * 保存缓存数据
     * @param {string} name - 缓存名称
     * @param {Map} cache - 缓存Map对象
     * @param {Function} [callback] - 保存完成后的回调
     */
    saveData: (name, cache, callback) => {
      const dataPath = joinPath(cachePath, `${name}.json`);
      const data = JSON.stringify(Object.fromEntries(cache));
      
      fs.writeFile(dataPath, data)
        .then(() => {
          callback && callback();
        })
        .catch(err => {
          console.error('保存缓存数据失败:', err);
          callback && callback(err);
        });
    }
  };
}

/**
 * 创建内存缓存提供者
 * @param {string} name - 缓存名称
 * @param {Object} [adapter] - 可选的持久化适配器
 * @returns {Object} 缓存提供者对象
 */
export function createCacheProvider(name, adapter) {
  // 内部缓存存储
  const cache = new Map();
  // 状态追踪
  let isUpdating = false;
  const stats = {
    transactionCount: 0
  };
  
  // 初始化缓存
  adapter && adapter.initData(name, cache);
  
  return {
    /**
     * 获取缓存大小
     * @returns {number} 缓存项数量
     */
    getSize: () => cache.size,
    
    /**
     * 设置缓存项
     * @param {string} key - 缓存键
     * @param {*} value - 缓存值
     * @param {number} [timeout] - 可选的过期时间(毫秒)
     */
    set: (key, value, timeout) => {
      const item = {
        value,
        timestamp: Date.now(),
        expiresAt: timeout ? Date.now() + timeout : null
      };
      
      cache.set(key, item);
      stats.transactionCount++;
      
      // 设置自动过期
      if (timeout) {
        setTimeout(() => {
          const currentItem = cache.get(key);
          if (currentItem && currentItem.expiresAt === item.expiresAt) {
            cache.delete(key);
          }
        }, timeout);
      }
    },
    
    /**
     * 获取缓存项
     * @param {string} key - 缓存键
     * @returns {*} 缓存值，不存在或已过期则返回null
     */
    get: (key) => {
      const item = cache.get(key);
      if (!item) return null;
      
      // 检查是否过期
      if (item.expiresAt && item.expiresAt < Date.now()) {
        cache.delete(key);
        return null;
      }
      
      return item.value;
    },
    
    /**
     * 获取原始缓存项
     * @param {string} key - 缓存键
     * @returns {Object} 包含值、时间戳和过期时间的缓存项
     */
    getRaw: (key) => cache.get(key),
    
    /**
     * 同步过滤缓存项
     * @param {Function} filter - 过滤函数
     * @returns {Array} 符合条件的缓存值数组
     */
    filterSync: (filter) => {
      const result = [];
      for (const [, item] of cache.entries()) {
        try {
          if (filter(item.value)) {
            result.push(item.value);
          }
        } catch (err) {
          console.error('过滤缓存项失败:', err);
        }
      }
      return result;
    },
    
    /**
     * 异步过滤缓存项
     * @param {Function} filter - 异步过滤函数
     * @param {AbortSignal} [signal] - 可选的终止信号
     * @returns {Promise<Array>} 符合条件的缓存值数组
     */
    filter: async (filter, signal) => {
      const result = [];
      for (const [, item] of cache.entries()) {
        if (signal && signal.aborted) break;
        
        try {
          if (await filter(item.value)) {
            result.push(item.value);
          }
        } catch (err) {
          console.error('异步过滤缓存项失败:', err);
        }
      }
      return result;
    },
    
    /**
     * 删除缓存项
     * @param {string} key - 缓存键
     */
    delete: (key) => {
      cache.delete(key);
    },
    
    /**
     * 清空缓存
     */
    clear: () => {
      cache.clear();
    },
    
    /**
     * 调整缓存大小
     * @param {number} maxSize - 最大缓存项数量
     */
    sizeTo: (maxSize) => {
      if (cache.size <= maxSize) return;
      
      // 获取所有键
      const keys = Array.from(cache.keys());
      
      // 按时间戳排序
      const sortedKeys = keys.sort((a, b) => {
        const aItem = cache.get(a);
        const bItem = cache.get(b);
        return aItem.timestamp - bItem.timestamp;
      });
      
      // 删除最旧的条目直到大小合适
      while (cache.size > maxSize) {
        cache.delete(sortedKeys.shift());
      }
    },
    
    /**
     * 持久化缓存
     */
    persist: () => {
      if (isUpdating || !adapter) return;
      
      isUpdating = true;
      const callback = (err) => {
        isUpdating = false;
        if (err) console.error('持久化缓存失败:', err);
      };
      
      // 执行持久化
      adapter.saveData(name, cache, callback);
    },
    
    /**
     * 获取缓存统计信息
     * @returns {Object} 统计信息
     */
    getStats: () => ({
      ...stats,
      size: cache.size,
      name
    })
  };
}

/**
 * 创建全局缓存实例或返回现有实例
 * @param {string} name - 缓存名称
 * @param {Object} [adapter] - 可选的持久化适配器
 * @returns {Object} 缓存提供者对象
 */
export function createGlobalCache(name, adapter) {
  const globalCache = globalThis[Symbol.for('cache')] || {};
  globalThis[Symbol.for('cache')] = globalCache;
  
  const cacheSymbol = Symbol.for(name);
  if (!globalCache[cacheSymbol]) {
    globalCache[cacheSymbol] = createCacheProvider(name, adapter);
  }
  
  return globalCache[cacheSymbol];
} 