/**
 * 对象增强器 - 为响应式对象添加同步相关的方法和属性
 */

import { watch } from '../../../../../static/vue.esm-browser.js';

/**
 * 增强响应式对象
 * @param {Object} localState - 本地响应式对象
 * @param {Object} config - 配置
 * @param {Object} config.status - 状态对象
 * @param {Object} config.engine - 同步引擎
 * @param {string} config.key - 数据键
 * @param {Object} config.initialState - 初始状态
 * @param {string} config.type - 数据类型（states 或 refs）
 * @param {Object} config.options - 选项
 * @param {Object} [config.cache] - 缓存信息
 * @param {string} [config.cache.key] - 缓存键
 * @param {Map} [config.cache.store] - 缓存存储
 * @returns {Object} 增强后的响应式对象
 */
export function enhanceReactiveObject(localState, config) {
  const { status, engine, key, initialState, type, options, cache } = config;
  
  // 初始状态的深拷贝 - 用于重置
  const initialStateCopy = JSON.parse(JSON.stringify(initialState));
  
  // 同步锁与防抖计时器
  let syncLock = false;
  let syncDebounceTimer = null;
  const SYNC_DEBOUNCE = 50; // 50ms防抖
  
  // 防抖包装函数
  const debounce = (fn, delay) => {
    return (...args) => {
      if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
      syncDebounceTimer = setTimeout(() => fn(...args), delay);
    };
  };
  
  // 手动同步实现
  const syncImpl = () => {
    if (!engine || !status.connected) return false;
    
    const remoteState = engine.getState(type, key);
    if (!remoteState) return false;
    
    // 应用同步锁
    syncLock = true;
    
    try {
      // 清除不在远程的属性
      Object.keys(localState).forEach(k => {
        if (k.startsWith('$') || typeof localState[k] === 'function') return; // 跳过内部属性
        if (!(k in remoteState)) {
          delete localState[k];
        }
      });
      
      // 更新所有属性
      Object.keys(remoteState).forEach(k => {
        if (k.startsWith('$') || typeof remoteState[k] === 'function') return; // 跳过内部属性
        
        // 特殊处理数值类型
        if (typeof remoteState[k] === 'number') {
          if (localState[k] !== remoteState[k]) {
            localState[k] = remoteState[k];
          }
        } else {
          // 对于对象类型，使用深度比较
          const currentJson = JSON.stringify(localState[k]);
          const remoteJson = JSON.stringify(remoteState[k]);
          
          if (currentJson !== remoteJson) {
            localState[k] = remoteState[k];
          }
        }
      });
      
      status.lastSync = Date.now();
      
      if (options.onSync) {
        options.onSync(localState);
      }
      
      if (options.debug) {
        console.log(`[SyncedReactive:${key}] 手动同步完成:`, localState);
      }
      
      return true;
    } finally {
      syncLock = false;
    }
  };
  
  // 防抖版本的同步函数
  const debouncedSync = debounce(syncImpl, SYNC_DEBOUNCE);
  
  // 增强对象 - 添加不可枚举的方法和属性
  Object.defineProperties(localState, {
    // 状态对象
    $status: {
      enumerable: false,
      get: () => status
    },
    
    // 手动同步方法
    $sync: {
      enumerable: false,
      value: () => {
        // 立即执行一次同步，不使用防抖
        return syncImpl();
      }
    },
    
    // 自动同步方法 - 带防抖
    $syncAuto: {
      enumerable: false,
      value: () => {
        // 使用防抖版本
        debouncedSync();
        return true;
      }
    },
    
    // 重置为初始状态
    $reset: {
      enumerable: false,
      value: () => {
        if (!engine) return false;
        
        // 同步锁，防止循环更新
        syncLock = true;
        
        try {
          // 清空对象（保留内部方法）
          Object.keys(localState).forEach(k => {
            if (k.startsWith('$') || typeof localState[k] === 'function') return;
            delete localState[k];
          });
          
          // 复制初始数据
          Object.keys(initialStateCopy).forEach(k => {
            localState[k] = initialStateCopy[k];
          });
          
          // 更新远程状态
          if (status.connected) {
            engine.setState(type, key, JSON.parse(JSON.stringify(initialStateCopy)));
          }
          
          status.lastSync = Date.now();
          
          if (options.debug) {
            console.log(`[SyncedReactive:${key}] 重置为初始状态`);
          }
          
          return true;
        } finally {
          syncLock = false;
        }
      }
    },
    
    // 连接方法
    $connect: {
      enumerable: false,
      value: () => engine ? engine.connect() : false
    },
    
    // 断开连接
    $disconnect: {
      enumerable: false,
      value: () => engine ? engine.disconnect() : false
    },
    
    // 获取连接的对等节点
    $peers: {
      enumerable: false,
      get: () => engine ? engine.getPeers() : new Set()
    },
    
    // 添加自定义监听
    $watch: {
      enumerable: false,
      value: (selector, callback, watchOptions = {}) => {
        return watch(() => selector(localState), callback, watchOptions);
      }
    },
    
    // 销毁方法
    $destroy: {
      enumerable: false,
      value: () => {
        if (engine) {
          // 清理防抖计时器
          if (syncDebounceTimer) {
            clearTimeout(syncDebounceTimer);
            syncDebounceTimer = null;
          }
          
          // 如果存在缓存信息，清除缓存
          if (cache && cache.store && cache.key) {
            cache.store.delete(cache.key);
          }
          
          return engine.cleanupReactive(key);
        }
        return false;
      }
    },
    
    // 强制更新到远程
    $forceSync: {
      enumerable: false,
      value: () => {
        if (!engine || !status.connected) return false;
        
        try {
          // 将完整的本地状态深拷贝后发送到远程
          const stateToSync = JSON.parse(JSON.stringify(localState));
          engine.setState(type, key, stateToSync);
          
          status.lastSync = Date.now();
          return true;
        } catch (err) {
          console.error(`[SyncedReactive:${key}] 强制同步失败:`, err);
          return false;
        }
      }
    },
    
    // 调试信息
    $debug: {
      enumerable: false,
      value: (enableLogging = true) => {
        options.debug = enableLogging;
        return { 
          local: localState,
          remote: engine ? engine.getState(type, key) : null,
          status: status,
          engine: engine,
          key: key
        };
      }
    }
  });
  
  return localState;
} 