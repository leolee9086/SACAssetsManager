/**
 * 对象增强器 - 为响应式对象添加同步相关的方法和属性
 */

import { watch, reactive } from '../../../../../static/vue.esm-browser.js';

/**
 * 检查对象是否为纯对象（普通JS对象）
 * @param {any} obj - 要检查的对象
 * @returns {boolean} 是否为纯对象
 */
const isPlainObject = (obj) => {
  return obj !== null && typeof obj === 'object' && !Array.isArray(obj) && 
         Object.getPrototypeOf(obj) === Object.prototype;
};

/**
 * 深度响应式复制
 * @param {any} value - 要复制的值
 * @returns {any} 复制后的响应式值
 */
const deepReactiveClone = (value) => {
  if (Array.isArray(value)) {
    // 数组需要先复制再reactive
    return reactive(value.map(item => 
      isPlainObject(item) || Array.isArray(item) ? deepReactiveClone(item) : item
    ));
  } else if (isPlainObject(value)) {
    // 对象需要递归处理每个属性
    const result = {};
    for (const key in value) {
      result[key] = isPlainObject(value[key]) || Array.isArray(value[key]) 
        ? deepReactiveClone(value[key]) 
        : value[key];
    }
    return reactive(result);
  }
  return value;
};

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
  
  // 跟踪哪些属性是数组
  const arrayProps = new Set();
  
  // 跟踪是否正在进行远程更新
  let isRemoteUpdate = false;
  
  // 检测初始对象中的数组属性
  for (const propName in initialState) {
    if (Array.isArray(initialState[propName])) {
      arrayProps.add(propName);
    }
  }
  
  // 防抖包装函数
  const debounce = (fn, delay) => {
    return (...args) => {
      if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
      syncDebounceTimer = setTimeout(() => fn(...args), delay);
    };
  };
  
  /**
   * 安全地清空并重新填充数组
   * @param {Array} targetArray - 目标数组
   * @param {Array} sourceArray - 源数组
   * @returns {boolean} 是否成功
   */
  const safeArrayUpdate = (targetArray, sourceArray) => {
    if (!Array.isArray(targetArray) || !Array.isArray(sourceArray)) {
      return false;
    }
    
    try {
      // 深拷贝源数组，防止引用同一对象导致的循环引用问题
      const clonedSourceArray = sourceArray.map(item => {
        // 对对象和数组进行深拷贝，避免引用问题
        if (item !== null && typeof item === 'object') {
          return JSON.parse(JSON.stringify(item));
        }
        return item;
      });
      
      // 尝试方法1: 使用splice完全替换
      try {
        // 先清空数组，避免直接splice可能导致的响应式问题
        while (targetArray.length > 0) {
          targetArray.pop();
        }
        
        // 逐个添加元素，而不是一次性添加所有元素
        for (let i = 0; i < clonedSourceArray.length; i++) {
          targetArray.push(clonedSourceArray[i]);
        }
        return true;
      } catch (err) {
        console.error(`[SyncedReactive:${key}] 方法1(splice)失败:`, err);
        
        // 尝试方法2: 逐个添加
        try {
          // 确保数组已清空
          targetArray.length = 0;
          
          // 逐个添加元素
          for (let i = 0; i < clonedSourceArray.length; i++) {
            targetArray.push(clonedSourceArray[i]);
          }
          return true;
        } catch (err2) {
          console.error(`[SyncedReactive:${key}] 方法2(push)失败:`, err2);
          
          // 方法3: 使用Vue的set API
          try {
            const Vue = window.Vue || {};
            if (Vue.set) {
              // 逐个设置项目
              for (let i = 0; i < clonedSourceArray.length; i++) {
                if (i < targetArray.length) {
                  Vue.set(targetArray, i, clonedSourceArray[i]);
                } else {
                  targetArray.push(clonedSourceArray[i]);
                }
              }
              // 如果目标数组长度大于源数组，删除多余元素
              if (targetArray.length > clonedSourceArray.length) {
                targetArray.splice(clonedSourceArray.length);
              }
              return true;
            }
          } catch (err3) {
            console.error(`[SyncedReactive:${key}] 方法3(Vue.set)失败:`, err3);
          }
          
          // 最后尝试更直接的方法
          try {
            // 通过重新分配数组来解决问题
            const tempArray = [...clonedSourceArray];
            while (targetArray.length > 0) {
              targetArray.pop();
            }
            for (let i = 0; i < tempArray.length; i++) {
              targetArray[i] = tempArray[i];
            }
            return true;
          } catch (err4) {
            console.error(`[SyncedReactive:${key}] 方法4(索引赋值)失败:`, err4);
            throw err4; // 抛出错误，让外层处理
          }
        }
      }
    } catch (err) {
      console.error(`[SyncedReactive:${key}] 所有数组更新方法都失败`, err);
      return false;
    }
  };
  
  // 手动同步实现
  const syncImpl = () => {
    if (!engine || !status.connected) return false;
    
    const remoteState = engine.getState(type, key);
    if (!remoteState) return false;
    
    // 应用同步锁
    syncLock = true;
    isRemoteUpdate = true;
    
    try {
      // 清除不在远程的属性
      Object.keys(localState).forEach(k => {
        if (k.startsWith('$') || typeof localState[k] === 'function') return; // 跳过内部属性
        if (!(k in remoteState)) {
          delete localState[k];
          arrayProps.delete(k);
        }
      });
      
      // 更新所有属性
      Object.keys(remoteState).forEach(k => {
        if (k.startsWith('$') || typeof remoteState[k] === 'function') return; // 跳过内部属性
        
        // 检测新添加的数组属性
        if (Array.isArray(remoteState[k])) {
          arrayProps.add(k);
        }
        
        const remoteValue = remoteState[k];
        const localValue = localState[k];
        
        // 特殊处理数值类型
        if (typeof remoteValue === 'number') {
          if (localValue !== remoteValue) {
            localState[k] = remoteValue;
          }
        }
        // 处理嵌套对象 - 递归合并而不是替换
        else if (isPlainObject(remoteValue) && isPlainObject(localValue)) {
          // 对嵌套对象进行深度合并
          try {
            mergeNestedObjects(localValue, remoteValue);
          } catch (err) {
            console.error(`[SyncedReactive:${key}] 合并嵌套对象错误 [${k}]:`, err);
            // 如果合并失败，尝试直接替换
            try {
              // 使用深拷贝避免引用问题
              localState[k] = JSON.parse(JSON.stringify(remoteValue));
            } catch (err2) {
              console.error(`[SyncedReactive:${key}] 替换对象也失败 [${k}]:`, err2);
            }
          }
        }
        // 处理数组 - 确保保留响应式
        else if (Array.isArray(remoteValue)) {
          try {
            // 如果本地值不存在或不是数组，创建一个新数组
            if (!localState[k] || !Array.isArray(localState[k])) {
              localState[k] = [];
            }
            
            // 完全替换数组内容，但保留响应式
            const updateSuccess = safeArrayUpdate(localState[k], remoteValue);
            
            // 如果安全更新失败，尝试其他方法
            if (!updateSuccess) {
              console.warn(`[SyncedReactive:${key}] 安全更新数组失败，尝试替代方法 [${k}]`);
              // 创建一个全新的数组
              localState[k] = JSON.parse(JSON.stringify(remoteValue));
            }
            
            // 检查是否需要增强数组方法
            if (!localState[k].$enhanced) {
              enhanceArrayProperty(k);
            }
          } catch (err) {
            console.error(`[SyncedReactive:${key}] 更新数组错误 [${k}]:`, err);
            // 失败时尝试直接替换整个数组
            try {
              localState[k] = JSON.parse(JSON.stringify(remoteValue));
            } catch (err2) {
              console.error(`[SyncedReactive:${key}] 替换数组也失败 [${k}]:`, err2);
            }
          }
        }
        // 其他类型直接替换
        else {
          localState[k] = remoteValue;
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
    } catch (err) {
      console.error(`[SyncedReactive:${key}] 同步过程发生错误:`, err);
      return false;
    } finally {
      syncLock = false;
      isRemoteUpdate = false;
    }
  };
  
  /**
   * 递归合并嵌套对象
   * @param {Object} target - 目标对象
   * @param {Object} source - 源对象
   */
  const mergeNestedObjects = (target, source) => {
    if (!isPlainObject(target) || !isPlainObject(source)) {
      return;
    }
    
    try {
      // 处理删除的属性
      Object.keys(target).forEach(key => {
        if (!(key in source)) {
          delete target[key];
        }
      });
      
      // 合并或添加属性
      Object.keys(source).forEach(key => {
        const sourceValue = source[key];
        
        // 如果目标不存在此属性，直接添加
        if (!(key in target)) {
          try {
            // 确保对象和数组进行深拷贝
            if (sourceValue !== null && typeof sourceValue === 'object') {
              target[key] = JSON.parse(JSON.stringify(sourceValue));
            } else {
              target[key] = sourceValue;
            }
          } catch (err) {
            console.error(`[SyncedReactive:${key}] 无法添加属性 [${key}]:`, err);
          }
          return;
        }
        
        const targetValue = target[key];
        
        // 递归处理嵌套对象
        if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
          try {
            mergeNestedObjects(targetValue, sourceValue);
          } catch (err) {
            console.error(`[SyncedReactive:${key}] 递归合并错误 [${key}]:`, err);
            try {
              target[key] = JSON.parse(JSON.stringify(sourceValue));
            } catch (err2) {
              console.error(`[SyncedReactive:${key}] 替换递归对象失败 [${key}]:`, err2);
            }
          }
        } 
        // 处理数组 - 使用安全的数组更新方法
        else if (Array.isArray(sourceValue) && Array.isArray(targetValue)) {
          try {
            const updateSuccess = safeArrayUpdate(targetValue, sourceValue);
            
            // 如果安全更新失败，尝试替换整个数组
            if (!updateSuccess) {
              try {
                target[key] = JSON.parse(JSON.stringify(sourceValue));
              } catch (err2) {
                console.error(`[SyncedReactive:${key}] 替换嵌套数组失败 [${key}]:`, err2);
              }
            }
          } catch (err) {
            console.error(`[SyncedReactive:${key}] 更新嵌套数组错误 [${key}]:`, err);
            try {
              target[key] = JSON.parse(JSON.stringify(sourceValue));
            } catch (err2) {
              console.error(`[SyncedReactive:${key}] 替换嵌套数组失败 [${key}]:`, err2);
            }
          }
        }
        // 其他类型直接替换
        else if (targetValue !== sourceValue) {
          try {
            target[key] = sourceValue;
          } catch (err) {
            console.error(`[SyncedReactive:${key}] 无法更新属性 [${key}]:`, err);
          }
        }
      });
    } catch (err) {
      console.error(`[SyncedReactive:${key}] 合并对象过程发生错误:`, err);
      throw err; // 向上抛出错误以便外层处理
    }
  };
  
  // 防抖版本的同步函数
  const debouncedSync = debounce(syncImpl, SYNC_DEBOUNCE);
  
  /**
   * 增强数组方法 - 为特定数组属性添加监听和同步
   * @param {string} propName - 数组属性名称
   */
  const enhanceArrayProperty = (propName) => {
    if (!localState[propName] || !Array.isArray(localState[propName])) {
      console.warn(`[SyncedReactive:${key}] 无法增强非数组属性: ${propName}`);
      return false;
    }
    
    // 已经是增强过的数组，避免重复增强
    if (localState[propName].$enhanced) {
      return true;
    }
    
    // 跟踪此属性为数组
    arrayProps.add(propName);
    
    // 简化数组增强方法，不使用代理，避免响应式丢失
    try {
      const targetArray = localState[propName];
      
      // 标记为已增强，避免重复处理
      Object.defineProperty(targetArray, '$enhanced', {
        value: true,
        enumerable: false,
        configurable: false,
        writable: false
      });
      
      // 包装原生数组方法，在操作后触发同步
      ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'].forEach(methodName => {
        const originalMethod = Array.prototype[methodName];
        
        // 创建方法包装器
        const methodWrapper = function(...args) {
          // 如果正在同步中，直接执行原始方法
          if (isRemoteUpdate || syncLock) {
            return originalMethod.apply(this, args);
          }
          
          // 执行原始操作
          const result = originalMethod.apply(this, args);
          
          if (options.debug) {
            console.log(`[SyncedReactive:${key}] 数组操作: ${propName}.${methodName}()`, args);
          }
          
          // 标记需要同步
          if (syncDebounceTimer) {
            clearTimeout(syncDebounceTimer);
          }
          
          // 主动同步当前数组
          setTimeout(() => {
            if (!syncLock && engine && status.connected) {
              syncLock = true;
              try {
                // 获取完整远程状态
                const completeState = engine.getState(type, key) || {};
                
                // 只更新数组部分
                const updatedState = {
                  ...completeState,
                  [propName]: [...targetArray] // 使用扩展运算符创建数组副本
                };
                
                // 发送更新
                engine.setState(type, key, updatedState);
                status.lastSync = Date.now();
                
                if (options.debug) {
                  console.log(`[SyncedReactive:${key}] 同步数组: ${propName}`, targetArray);
                }
              } catch (err) {
                console.error(`[SyncedReactive:${key}] 同步数组操作失败: ${propName}.${methodName}()`, err);
              } finally {
                syncLock = false;
              }
            }
          }, 0);
          
          return result;
        };
        
        // 保存原始方法的引用
        const originalProp = Object.getOwnPropertyDescriptor(Array.prototype, methodName);
        
        // 定义新方法
        Object.defineProperty(targetArray, methodName, {
          value: methodWrapper,
          writable: false,
          configurable: true,
          enumerable: false
        });
      });
      
      return true;
    } catch (err) {
      console.error(`[SyncedReactive:${key}] 增强数组失败:`, propName, err);
      return false;
    }
  };
  
  // 为所有初始数组属性增强
  arrayProps.forEach(propName => {
    enhanceArrayProperty(propName);
  });
  
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
          
          // 清空数组属性记录
          arrayProps.clear();
          
          // 复制初始数据 - 使用深度响应式克隆
          Object.keys(initialStateCopy).forEach(k => {
            if (isPlainObject(initialStateCopy[k]) || Array.isArray(initialStateCopy[k])) {
              localState[k] = deepReactiveClone(initialStateCopy[k]);
            } else {
              localState[k] = initialStateCopy[k];
            }
            
            // 检测并记录数组属性
            if (Array.isArray(localState[k])) {
              arrayProps.add(k);
              enhanceArrayProperty(k);
            }
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
    
    // 增强数组方法
    $enhanceArrayMethods: {
      enumerable: false,
      value: (propName) => {
        return enhanceArrayProperty(propName);
      }
    },
    
    // 增强所有数组属性
    $enhanceAllArrays: {
      enumerable: false,
      value: () => {
        let enhanced = 0;
        Object.keys(localState).forEach(k => {
          if (Array.isArray(localState[k])) {
            if (enhanceArrayProperty(k)) {
              enhanced++;
            }
          }
        });
        return enhanced;
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
          key: key,
          arrayProps: Array.from(arrayProps)
        };
      }
    }
  });
  
  return localState;
} 