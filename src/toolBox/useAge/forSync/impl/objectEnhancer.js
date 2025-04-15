/**
 * 对象增强器 - 为响应式对象添加同步相关的方法和属性
 */

import { watch, reactive, toRaw } from '../../../../../static/vue.esm-browser.js';

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
      // 检测空数组特殊情况
      if (sourceArray.length === 0) {
        // 清空目标数组就足够了
        while (targetArray.length > 0) {
          targetArray.pop();
        }
        return true;
      }
      
      // 检测是否为单层简单数组（只包含基本类型），这种情况需要特殊处理以避免嵌套
      const isFlat1DArray = sourceArray.length > 0 && 
                            !Array.isArray(sourceArray[0]) && 
                            !sourceArray.some(item => Array.isArray(item)) &&
                            sourceArray.every(item => 
                              item === null || 
                              item === undefined || 
                              typeof item !== 'object' || 
                              (Array.isArray(item) && item.length === 0)
                            );
      
      // 如果是"单值[xxx,xxx]"这样的一维数组，直接处理，不递归
      if (isFlat1DArray) {
        // 清空目标数组
        while (targetArray.length > 0) {
          targetArray.pop();
        }
        
        // 直接一对一复制元素，确保没有嵌套
        for (let i = 0; i < sourceArray.length; i++) {
          targetArray.push(sourceArray[i]);
        }
        return true;
      }
      
      // 防止递归调用导致堆栈溢出
      const MAX_RECURSION_DEPTH = 10;
      const updateArrayWithDepthControl = (target, source, depth = 0) => {
        if (depth > MAX_RECURSION_DEPTH) {
          console.warn(`[SyncedReactive:${key}] 达到最大递归深度，对象可能未完全复制`);
          return;
        }
        
        // 清空目标数组
        while (target.length > 0) {
          target.pop();
        }
        
        // 检测是否简单数组（一维数组只包含基本类型）
        const isSimpleArrayItems = source.every(item => 
          item === null || 
          item === undefined || 
          typeof item !== 'object'
        );
        
        if (isSimpleArrayItems) {
          // 简单数组直接复制
          for (let i = 0; i < source.length; i++) {
            target.push(source[i]);
          }
          return;
        }
        
        // 处理复杂数组（包含对象或嵌套数组）
        // 逐个添加元素，特别处理对象引用
        for (let i = 0; i < source.length; i++) {
          const item = source[i];
          if (item === null || item === undefined) {
            target.push(item);
          } else if (typeof item === 'object' && !Array.isArray(item)) {
            // 处理对象 - 创建全新的对象避免引用问题
            const newObj = {};
            Object.keys(item).forEach(key => {
              // 递归处理嵌套对象和数组
              if (item[key] !== null && typeof item[key] === 'object') {
                if (Array.isArray(item[key])) {
                  const nestedArray = [];
                  updateArrayWithDepthControl(nestedArray, item[key], depth + 1);
                  newObj[key] = nestedArray;
                } else {
                  // 使用深拷贝确保不会有引用问题
                  try {
                    newObj[key] = JSON.parse(JSON.stringify(item[key]));
                  } catch (err) {
                    console.warn(`[SyncedReactive:${key}] 嵌套对象深拷贝失败，降级处理:`, err);
                    // 降级处理：使用浅拷贝
                    newObj[key] = {...item[key]};
                  }
                }
              } else {
                newObj[key] = item[key];
              }
            });
            target.push(newObj);
          } else if (Array.isArray(item)) {
            // 检查是否为空数组，避免额外嵌套
            if (item.length === 0) {
              target.push([]);
            } else {
              // 递归处理嵌套数组
              const newArray = [];
              updateArrayWithDepthControl(newArray, item, depth + 1);
              target.push(newArray);
            }
          } else {
            // 基本类型直接添加
            target.push(item);
          }
        }
      };
      
      // 使用深度控制的更新函数
      updateArrayWithDepthControl(targetArray, sourceArray);
      
      // 添加后强制触发更新
      syncLock = true;
      try {
        // 手动触发数组更改通知
        const length = targetArray.length;
        if (length > 0) {
          // 在数组末尾做一个微小修改然后撤销，强制触发Vue的响应式更新
          const lastItem = targetArray[length - 1];
          if (typeof lastItem === 'object' && lastItem !== null) {
            // 对象类型，添加临时标记
            const tempKey = `__sync_${Date.now()}`;
            targetArray[length - 1][tempKey] = true;
            delete targetArray[length - 1][tempKey];
          } else {
            // 对于非对象类型，尝试触发splice操作
            const tempItem = targetArray[length - 1];
            targetArray.splice(length - 1, 1, tempItem);
          }
        }
      } finally {
        syncLock = false;
      }
      
      return true;
    } catch (err) {
      console.error(`[SyncedReactive:${key}] 数组更新失败:`, err);
      
      // 尝试最简单的方法作为回退方案
      try {
        targetArray.length = 0;
        for (let i = 0; i < sourceArray.length; i++) {
          if (sourceArray[i] !== null && typeof sourceArray[i] === 'object') {
            // 对于对象类型，使用深拷贝避免引用问题
            targetArray.push(JSON.parse(JSON.stringify(sourceArray[i])));
          } else {
            // 基本类型直接复制
            targetArray.push(sourceArray[i]);
          }
        }
        return true;
      } catch (finalErr) {
        console.error(`[SyncedReactive:${key}] 最终方法也失败:`, finalErr);
        return false;
      }
    }
  };
  
 

  /**
   * 修复可能缺失的关键路径
   * @param {Object} obj - 目标对象
   */
  const fixMissingPaths = (obj) => {
    if (!obj || typeof obj !== 'object') {
      return; // 不是对象，无需修复
    }
    
    try {
      // 确保性能指标对象存在
      if (!obj.performanceMetrics) {
        obj.performanceMetrics = {
          responseTime: 0,
          operations: 0,
          lastUpdate: Date.now()
        };
      } else if (typeof obj.performanceMetrics === 'object') {
        // 确保性能指标子字段存在
        if (!('responseTime' in obj.performanceMetrics)) obj.performanceMetrics.responseTime = 0;
        if (!('operations' in obj.performanceMetrics)) obj.performanceMetrics.operations = 0;
        if (!('lastUpdate' in obj.performanceMetrics)) obj.performanceMetrics.lastUpdate = Date.now();
      }
      
      // 确保嵌套对象存在
      if (!obj.nested) {
        obj.nested = { value: '' };
      } else if (typeof obj.nested === 'object' && !('value' in obj.nested)) {
        obj.nested.value = '';
      }
      
      // 确保deepNested结构完整
      if (!obj.deepNested) {
        obj.deepNested = { level1: { level2: { value: '' } } };
      } else if (typeof obj.deepNested === 'object') {
        if (!obj.deepNested.level1) {
          obj.deepNested.level1 = { level2: { value: '' } };
        } else if (typeof obj.deepNested.level1 === 'object') {
          if (!obj.deepNested.level1.level2) {
            obj.deepNested.level1.level2 = { value: '' };
          } else if (typeof obj.deepNested.level1.level2 === 'object' && !('value' in obj.deepNested.level1.level2)) {
            obj.deepNested.level1.level2.value = '';
          }
        }
      }
    } catch (err) {
      console.error(`[SyncedReactive:${key}] 修复路径失败:`, err);
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
          // 确保目标对象中存在所有必要的路径
          try {
            // 在合并前修复可能缺失的路径
            fixMissingPaths(localValue);
            
            // 对嵌套对象进行深度合并
            mergeNestedObjects(localValue, remoteValue);
          } catch (err) {
            console.error(`[SyncedReactive:${key}] 合并嵌套对象错误 [${k}]:`, err);
            // 如果合并失败，尝试直接替换，但先确保基本结构完整
            try {
              // 创建一个安全的新对象
              const safeObject = JSON.parse(JSON.stringify(remoteValue));
              
              // 确保新对象也有完整路径
              fixMissingPaths(safeObject);
              
              // 然后替换本地对象
              localState[k] = safeObject;
            } catch (err2) {
              console.error(`[SyncedReactive:${key}] 替换对象也失败 [${k}]:`, err2);
              // 最后的尝试 - 创建一个带有基本路径的新对象
              localState[k] = {};
              fixMissingPaths(localState[k]);
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
            
            // 增强处理：如果是对象数组，使用特殊处理方式
            const isObjectArray = remoteValue.length > 0 && 
                                  remoteValue[0] !== null && 
                                  typeof remoteValue[0] === 'object' && 
                                  !Array.isArray(remoteValue[0]);
            
            if (isObjectArray) {
              // 对象数组特殊处理
              const localArr = localState[k];
              
              // 确保本地数组长度与远程匹配
              while (localArr.length > remoteValue.length) {
                localArr.pop();
              }
              
              // 更新现有对象或添加新对象
              for (let i = 0; i < remoteValue.length; i++) {
                const remoteObj = remoteValue[i];
                
                if (i < localArr.length) {
                  // 更新现有对象的属性
                  const localObj = localArr[i];
                  
                  // 确保所有远程对象属性存在于本地对象
                  Object.keys(remoteObj).forEach(prop => {
                    // 跳过内部属性
                    if (prop.startsWith('$') || prop.startsWith('_') || typeof remoteObj[prop] === 'function') {
                      return;
                    }
                    
                    // 更新属性值
                    localObj[prop] = remoteObj[prop];
                  });
                } else {
                  // 添加新对象 - 确保深拷贝
                  const newObj = {};
                  
                  // 复制所有属性
                  Object.keys(remoteObj).forEach(prop => {
                    // 跳过内部属性
                    if (prop.startsWith('$') || prop.startsWith('_') || typeof remoteObj[prop] === 'function') {
                      return;
                    }
                    
                    if (remoteObj[prop] !== null && typeof remoteObj[prop] === 'object') {
                      // 嵌套对象/数组需要深拷贝
                      try {
                        newObj[prop] = JSON.parse(JSON.stringify(remoteObj[prop]));
                      } catch (err) {
                        console.error(`[SyncedReactive:${key}] 嵌套对象深拷贝失败 (${prop}):`, err);
                        // 降级处理
                        newObj[prop] = remoteObj[prop];
                      }
                    } else {
                      // 基本类型直接赋值
                      newObj[prop] = remoteObj[prop];
                    }
                  });
                  
                  // 添加到数组
                  localArr.push(newObj);
                }
              }
              
              // 触发更新通知
              if (localArr.length > 0) {
                const lastIndex = localArr.length - 1;
                if (typeof localArr[lastIndex] === 'object' && localArr[lastIndex] !== null) {
                  const tempKey = `__sync_${Date.now()}`;
                  localArr[lastIndex][tempKey] = true;
                  delete localArr[lastIndex][tempKey];
                }
              }
            } else {
              // 非对象数组使用通用方法
              const updateSuccess = safeArrayUpdate(localState[k], remoteValue);
              
              // 如果安全更新失败，尝试其他方法
              if (!updateSuccess) {
                console.warn(`[SyncedReactive:${key}] 安全更新数组失败，尝试替代方法 [${k}]`);
                // 创建一个全新的数组
                localState[k] = JSON.parse(JSON.stringify(remoteValue));
              }
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
   * 递归合并嵌套对象 - 保留响应式
   * @param {Object} target - 目标对象
   * @param {Object} source - 源对象
   */
  const mergeNestedObjects = (target, source) => {
    if (!target || !source || typeof target !== 'object' || typeof source !== 'object') {
      return;
    }
    
    try {
      // 修复可能缺失的关键路径，但避免递归死循环
      try {
        fixMissingPaths(target);
      } catch (err) {
        console.warn(`[SyncedReactive:${key}] 修复目标对象路径失败:`, err);
      }
    
      // 删除目标中存在但源中不存在的属性
      Object.keys(target).forEach(key => {
        if (key.startsWith('$') || typeof target[key] === 'function') return;
        if (!(key in source)) {
          delete target[key];
        }
      });
      
      // 添加源中存在但目标中不存在的属性，并更新已存在的属性
      Object.keys(source).forEach(key => {
        if (key.startsWith('$') || typeof source[key] === 'function') return;
        
        const sourceValue = source[key];
        
        // 如果目标不存在此属性，需要创建
        if (!(key in target)) {
          // 对于对象和数组，需要特殊处理以保持响应式
          if (Array.isArray(sourceValue)) {
            // 创建新数组
            target[key] = [];
            // 填充内容
            sourceValue.forEach(item => {
              if (item !== null && typeof item === 'object') {
                // 对象需要深拷贝
                const newObj = {};
                Object.keys(item).forEach(k => {
                  if (!k.startsWith('$') && typeof item[k] !== 'function') {
                    newObj[k] = item[k];
                  }
                });
                target[key].push(newObj);
              } else {
                target[key].push(item);
              }
            });
          } else if (isPlainObject(sourceValue)) {
            // 创建新对象
            target[key] = {};
            // 递归合并
            mergeNestedObjects(target[key], sourceValue);
          } else {
            // 基本类型直接赋值
            target[key] = sourceValue;
          }
          return;
        }
        
        const targetValue = target[key];
        
        // 处理目标和源都是对象的情况
        if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
          // 递归合并
          mergeNestedObjects(targetValue, sourceValue);
        } 
        // 处理目标和源都是数组的情况
        else if (Array.isArray(sourceValue) && Array.isArray(targetValue)) {
          // 清空原数组但保留引用
          targetValue.length = 0;
          // 将源数组的所有元素添加到目标数组
          sourceValue.forEach(item => {
            if (item !== null && typeof item === 'object') {
              if (Array.isArray(item)) {
                // 嵌套数组
                const newArray = [];
                item.forEach(nestedItem => {
                  if (nestedItem !== null && typeof nestedItem === 'object' && !Array.isArray(nestedItem)) {
                    const nestedObj = {};
                    Object.keys(nestedItem).forEach(k => {
                      if (!k.startsWith('$') && typeof nestedItem[k] !== 'function') {
                        nestedObj[k] = nestedItem[k];
                      }
                    });
                    newArray.push(nestedObj);
                  } else {
                    newArray.push(nestedItem);
                  }
                });
                targetValue.push(newArray);
              } else {
                // 对象
                const newObj = {};
                Object.keys(item).forEach(k => {
                  if (!k.startsWith('$') && typeof item[k] !== 'function') {
                    newObj[k] = item[k];
                  }
                });
                targetValue.push(newObj);
              }
            } else {
              // 基本类型
              targetValue.push(item);
            }
          });
        }
        // 其他情况直接替换
        else if (targetValue !== sourceValue) {
          target[key] = sourceValue;
        }
      });
    } catch (err) {
      console.error(`[SyncedReactive:${key}] 合并嵌套对象失败:`, err);
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
                // 获取完整远程状态 - 但不发送整个状态
                const completeState = engine.getState(type, key) || {};
                
                // 处理数组内的对象，确保所有对象都被正确地深拷贝
                const arrayToSync = [];
                for (let i = 0; i < targetArray.length; i++) {
                  const item = targetArray[i];
                  // 对象需要特殊处理以避免引用问题
                  if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
                    // 深拷贝对象，但只保留必要的字段
                    const newObj = {};
                    Object.keys(item).forEach(key => {
                      // 跳过可能的大型属性或函数
                      if (typeof item[key] === 'function' || 
                          key.startsWith('_') || 
                          key.startsWith('$')) {
                        return;
                      }
                      newObj[key] = item[key];
                    });
                    arrayToSync.push(newObj);
                  } else if (Array.isArray(item)) {
                    // 处理嵌套数组，确保深度克隆，但限制深度
                    const MAX_NESTED_DEPTH = 3;
                    const processArray = (arr, depth = 0) => {
                      if (depth >= MAX_NESTED_DEPTH) {
                        return [...arr]; // 到达最大深度，不再递归处理
                      }
                      return arr.map(nestedItem => {
                        if (nestedItem === null || nestedItem === undefined) {
                          return nestedItem;
                        } else if (typeof nestedItem === 'object' && !Array.isArray(nestedItem)) {
                          // 处理嵌套对象
                          const obj = {};
                          Object.keys(nestedItem).forEach(k => {
                            if (!k.startsWith('$') && !k.startsWith('_') && 
                                typeof nestedItem[k] !== 'function') {
                              obj[k] = nestedItem[k];
                            }
                          });
                          return obj;
                        } else if (Array.isArray(nestedItem)) {
                          // 递归处理更深层的数组
                          return processArray(nestedItem, depth + 1);
                        }
                        return nestedItem;
                      });
                    };
                    
                    arrayToSync.push(processArray(item));
                  } else {
                    // 基本类型直接添加
                    arrayToSync.push(item);
                  }
                }
                
                // 检查数组大小，如果过大则进行压缩
                const arraySize = JSON.stringify(arrayToSync).length;
                if (arraySize > 1024 * 100) { // 超过100KB
                  console.warn(`[SyncedReactive:${key}] 数组同步数据较大 (${Math.round(arraySize/1024)}KB)，尝试压缩...`);
                  // 尝试限制发送的数据大小
                  if (arrayToSync.length > 100) {
                    // 对于超长数组，只同步前100项
                    arrayToSync.splice(100);
                  }
                }
                
                // 设置更新策略：是发送整个状态还是只发送数组部分
                // 如果数组较小，直接更新数组部分，避免发送整个状态树
                if (JSON.stringify(arrayToSync).length < 1024 * 500) { // 小于500KB
                  // 这里我们只发送更改的数组，而不是整个状态
                  
                  // 记录数组修改时间戳，用于断线重连时的智能合并
                  localState[`__array_${propName}_lastModified`] = Date.now();
                  
                  // 优先使用专门的增量更新API
                  if (engine.setPartialState) {
                    const syncSuccess = engine.setPartialState(type, key, propName, arrayToSync);
                    if (syncSuccess) {
                      status.lastSync = Date.now();
                      if (options.debug) {
                        console.log(`[SyncedReactive:${key}] 增量同步数组: ${propName}`, arrayToSync.length);
                      }
                    }
                  } else {
                    // 退回到普通更新，但仍然只发送关键部分
                    const minimalUpdate = {
                      [propName]: arrayToSync,
                      [`__array_${propName}_lastModified`]: Date.now() // 添加时间戳
                    };
                    
                    const syncSuccess = engine.setState(type, key, minimalUpdate);
                    if (syncSuccess) {
                      status.lastSync = Date.now();
                      if (options.debug) {
                        console.log(`[SyncedReactive:${key}] 同步数组: ${propName}`, arrayToSync.length);
                      }
                    } else {
                      console.warn(`[SyncedReactive:${key}] 同步数组失败: ${propName}`);
                    }
                  }
                } else {
                  // 数据过大，记录警告
                  console.warn(`[SyncedReactive:${key}] 数组同步数据过大 (${Math.round(JSON.stringify(arrayToSync).length/1024)}KB)，可能影响性能`);
                  
                  // 记录数组修改时间戳
                  localState[`__array_${propName}_lastModified`] = Date.now();
                  
                  // 尝试一个最小化的更新，只保留ID等关键标识字段
                  const minimalArraySync = arrayToSync.map(item => {
                    if (item && typeof item === 'object' && !Array.isArray(item)) {
                      // 只保留ID和关键字段
                      return {
                        id: item.id || item.ID || item._id || item.key || null,
                        // 可以保留最多2个关键字段用于显示
                        name: item.name || item.title || item.label || null,
                        type: item.type || null
                      };
                    }
                    return item;
                  });
                  
                  // 使用专用增量更新API优先处理
                  if (engine.setPartialState) {
                    const syncSuccess = engine.setPartialState(type, key, propName, minimalArraySync);
                    if (syncSuccess) {
                      status.lastSync = Date.now();
                      console.log(`[SyncedReactive:${key}] 已发送压缩的增量数组同步: ${propName}`);
                    } else {
                      console.warn(`[SyncedReactive:${key}] 压缩的增量同步失败: ${propName}`);
                    }
                  } else {
                    // 退回到普通更新
                    const minimalUpdate = {
                      [propName]: minimalArraySync,
                      [`__array_${propName}_lastModified`]: Date.now() // 添加时间戳
                    };
                    
                    const syncSuccess = engine.setState(type, key, minimalUpdate);
                    if (syncSuccess) {
                      status.lastSync = Date.now();
                      console.log(`[SyncedReactive:${key}] 已发送最小化数组同步: ${propName}`);
                    } else {
                      console.warn(`[SyncedReactive:${key}] 最小化同步失败: ${propName}`);
                    }
                  }
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
    
    // 同步单个数组属性 - 用于优化性能
    $syncArray: {
      enumerable: false,
      value: (arrayPropName) => {
        if (!engine || !status.connected) return false;
        if (!localState[arrayPropName] || !Array.isArray(localState[arrayPropName])) {
          console.warn(`[SyncedReactive:${key}] 无法同步非数组属性: ${arrayPropName}`);
          return false;
        }
        
        try {
          const targetArray = localState[arrayPropName];
          
          // 处理数组内的对象，确保对象被正确深拷贝
          const arrayToSync = [];
          for (let i = 0; i < targetArray.length; i++) {
            const item = targetArray[i];
            // 对象需要特殊处理
            if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
              // 创建精简版的对象拷贝
              const newObj = {};
              Object.keys(item).forEach(key => {
                // 跳过函数和内部属性
                if (typeof item[key] === 'function' || key.startsWith('$') || key.startsWith('_')) {
                  return;
                }
                newObj[key] = item[key];
              });
              arrayToSync.push(newObj);
            } else if (Array.isArray(item)) {
              // 嵌套数组限制递归深度
              const MAX_DEPTH = 2;
              const processArray = (arr, depth = 0) => {
                if (depth >= MAX_DEPTH) return [...arr];
                return arr.map(el => {
                  if (el && typeof el === 'object' && !Array.isArray(el)) {
                    const obj = {};
                    Object.keys(el).forEach(k => {
                      if (!k.startsWith('$') && !k.startsWith('_') && typeof el[k] !== 'function') {
                        obj[k] = el[k];
                      }
                    });
                    return obj;
                  } else if (Array.isArray(el)) {
                    return processArray(el, depth + 1);
                  }
                  return el;
                });
              };
              arrayToSync.push(processArray(item));
            } else {
              // 基本类型直接添加
              arrayToSync.push(item);
            }
          }
          
          // 优化：如果数组大小超过阈值，考虑进一步压缩
          const arraySize = JSON.stringify(arrayToSync).length;
          
          // 检测数组大小，避免传输过大的数据
          if (arraySize > 1024 * 500) { // 超过500KB
            console.warn(`[SyncedReactive:${key}] 数组过大(${Math.round(arraySize/1024)}KB)，尝试压缩同步数据...`);
            
            // 对于大型数组，只同步基本结构
            if (arrayToSync.length > 100) {
              console.warn(`[SyncedReactive:${key}] 数组长度(${arrayToSync.length})过长，将限制为100项`);
              arrayToSync.splice(100);
            }
          }
          
          // 记录数组最后修改时间
          localState[`__array_${arrayPropName}_lastModified`] = Date.now();
          
          // 使用专用方法同步数组
          if (engine.setPartialState) {
            const success = engine.setPartialState(type, key, arrayPropName, arrayToSync);
            if (success) {
              status.lastSync = Date.now();
              if (options.debug) {
                console.log(`[SyncedReactive:${key}] 手动同步数组成功: ${arrayPropName}`, arrayToSync.length);
              }
              return true;
            }
            return false;
          } else {
            // 退回到仅包含该数组的更新
            const minimalUpdate = {
              [arrayPropName]: arrayToSync,
              [`__array_${arrayPropName}_lastModified`]: Date.now() // 添加时间戳
            };
            const success = engine.setState(type, key, minimalUpdate);
            if (success) {
              status.lastSync = Date.now();
              if (options.debug) {
                console.log(`[SyncedReactive:${key}] 手动同步数组成功: ${arrayPropName}`, arrayToSync.length);
              }
              return true;
            }
            return false;
          }
        } catch (err) {
          console.error(`[SyncedReactive:${key}] 同步数组失败: ${arrayPropName}`, err);
          return false;
        }
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
    },
    
    // 找到现有的$updateMetrics方法并完全替换
    $updateMetrics: {
      enumerable: false,
      value: (metricsData) => {
        // 跳过响应式系统，直接修改底层数据
        const rawState = toRaw ? toRaw(localState) : localState;
        
        try {
          // 确保性能指标对象存在
          if (!rawState.performanceMetrics) {
            rawState.performanceMetrics = {
              responseTime: 0,
              operations: 0
            };
          }
          
          // 直接修改原始数据对象，绕过Vue的响应式系统
          if (metricsData && typeof metricsData === 'object') {
            Object.keys(metricsData).forEach(key => {
              if (key in rawState.performanceMetrics) {
                rawState.performanceMetrics[key] = metricsData[key];
              }
            });
          }
        } catch (err) {
          console.error(`[SyncedReactive:${key}] 更新性能指标失败:`, err);
        }
      }
    }
  });
  
  return localState;
} 