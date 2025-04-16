/**
 * CRDTMap实现 - 基于Yjs的可共享映射结构
 */

import * as Y from '../../../../../static/yjs.js';
import { INTERNAL_SYMBOL } from './constants.js';
import { reactive, toRaw } from '../../../../../static/vue.esm-browser.js';
import { valueFromYjs, valueToYjs } from './internal.js';

// 在文件最上方声明createArrayProxy以解决循环依赖问题
let createArrayProxy;

/**
 * 设置createArrayProxy函数，解决循环依赖
 * @param {Function} fn - 数组代理创建函数
 */
export function setArrayProxyCreator(fn) {
  createArrayProxy = fn;
}

/**
 * 通过Proxy连接Y.Map和Vue响应式数据
 * @param {Y.Map} ymap - Y.Map实例
 * @returns {Object} 响应式代理对象
 */
export function createMapProxy(ymap) {
  if (!ymap || !(ymap instanceof Y.Map)) {
    console.error('[createMapProxy] 无效的 Y.Map 对象，创建空对象代替');
    const emptyMap = new Y.Map();
    ymap = emptyMap;
  }
  
  // 创建基础代理对象
  const baseObj = {};
  
  // 标记是否正在更新，避免观察者触发循环更新
  let isUpdating = false;
  
  // 创建响应式对象
  const reactiveObj = reactive(baseObj);
  
  // 存储原始Y.Map
  reactiveObj[INTERNAL_SYMBOL] = ymap;
  
  // 深度初始化值 - 确保所有Yjs值被正确转换
  console.log('初始化Map, 键数量:', ymap.size);
  try {
    ymap.forEach((value, key) => {
      try {
        console.log(`初始键 "${key}", 类型:`, 
                  value instanceof Y.Map ? 'Y.Map' : 
                  value instanceof Y.Array ? 'Y.Array' : typeof value);
                  
        // 不在此处使用valueFromYjs进行初始化
        // 直接使用Vue的reactive处理
        if (value instanceof Y.Map) {
          // 对于嵌套的Y.Map，递归创建嵌套的响应式代理
          reactiveObj[key] = createMapProxy(value);
        } else if (value instanceof Y.Array) {
          // 对于嵌套的Y.Array，使用专门的数组代理
          reactiveObj[key] = createArrayProxy(value);
        } else {
          // 对于原始值，直接赋值
          reactiveObj[key] = value;
        }
      } catch (err) {
        console.error(`初始化键 "${key}" 出错:`, err);
      }
    });
  } catch (err) {
    console.error('[createMapProxy] 初始化Map时出错:', err);
  }
  
  // 监听Y.Map变化
  try {
    ymap.observe(event => {
      if (isUpdating) return;
      
      isUpdating = true;
      try {
        if (!event || !event.changes || !event.changes.keys) {
          console.warn('[createMapProxy] 收到无效的变更事件');
          isUpdating = false;
          return;
        }
        
        event.changes.keys.forEach((change, key) => {
          if (!change) {
            console.warn(`[createMapProxy] 键 "${key}" 的变更无效`);
            return;
          }
          
          if (change.action === 'add' || change.action === 'update') {
            const value = ymap.get(key);
            
            console.log(`观察到键 "${key}" 更新，类型:`, 
                      value instanceof Y.Map ? 'Y.Map' : 
                      value instanceof Y.Array ? 'Y.Array' : typeof value);
            
            // 处理值为undefined的情况
            if (value === undefined) {
              console.warn(`[createMapProxy] 键 "${key}" 的值为undefined，跳过`);
              return;
            }
            
            // 根据值类型选择正确的处理方式
            if (value instanceof Y.Map) {
              // 如果已存在同样的键值对，尝试保留引用
              if (reactiveObj[key] && reactiveObj[key][INTERNAL_SYMBOL] instanceof Y.Map) {
                // 可能应该更新内部值，但保持同一对象引用
                console.log(`保持已有的Map代理: ${key}`);
                
                // 增强：更新嵌套对象的内容而不替换整个引用
                // 这样可以保持对象的响应式
                const existingMap = reactiveObj[key][INTERNAL_SYMBOL];
                
                try {
                  const valueKeys = Array.from(value.keys());
                  const existingKeys = Array.from(existingMap.keys());
                  
                  // 添加或更新键
                  valueKeys.forEach(nestedKey => {
                    try {
                      const nestedValue = value.get(nestedKey);
                      if (nestedValue !== undefined) {
                        existingMap.set(nestedKey, nestedValue);
                      }
                    } catch (err) {
                      console.warn(`[createMapProxy] 更新嵌套键 "${nestedKey}" 出错:`, err);
                    }
                  });
                  
                  // 删除不再存在的键
                  existingKeys.forEach(oldKey => {
                    try {
                      if (!value.has(oldKey)) {
                        existingMap.delete(oldKey);
                      }
                    } catch (err) {
                      console.warn(`[createMapProxy] 删除嵌套键 "${oldKey}" 出错:`, err);
                    }
                  });
                } catch (err) {
                  console.error(`[createMapProxy] 更新嵌套Map "${key}" 出错:`, err);
                }
              } else {
                // 如果不存在，创建新的Map代理
                try {
                  reactiveObj[key] = createMapProxy(value);
                } catch (err) {
                  console.error(`[createMapProxy] 创建新Map代理 "${key}" 出错:`, err);
                  // 出错时创建空对象
                  reactiveObj[key] = {};
                }
              }
            } else if (value instanceof Y.Array) {
              // 同样检查是否可以保留已有的数组引用
              if (reactiveObj[key] && reactiveObj[key][INTERNAL_SYMBOL] instanceof Y.Array) {
                console.log(`保持已有的Array代理: ${key}`);
                
                try {
                  // 增强：更新数组内容而不替换整个引用
                  const existingArray = reactiveObj[key][INTERNAL_SYMBOL];
                  const newArray = value;
                  
                  // 清空现有数组
                  existingArray.delete(0, existingArray.length);
                  
                  // 插入新值
                  newArray.forEach((item, idx) => {
                    existingArray.insert(idx, [item]);
                  });
                } catch (err) {
                  console.error(`[createMapProxy] 更新数组 "${key}" 出错:`, err);
                }
              } else {
                try {
                  reactiveObj[key] = createArrayProxy(value);
                } catch (err) {
                  console.error(`[createMapProxy] 创建新数组代理 "${key}" 出错:`, err);
                  // 出错时创建空数组
                  reactiveObj[key] = [];
                }
              }
            } else {
              // 原始值直接赋值
              reactiveObj[key] = value;
            }
          } else if (change.action === 'delete') {
            delete reactiveObj[key];
          }
        });
      } catch (err) {
        console.error('[createMapProxy] 处理观察者事件时出错:', err);
      } finally {
        isUpdating = false;
      }
    });
  } catch (err) {
    console.error('[createMapProxy] 添加观察者失败:', err);
  }
  
  return new Proxy(reactiveObj, {
    set(target, prop, value) {
      // 跳过符号属性
      if (typeof prop === 'symbol') {
        return Reflect.set(target, prop, value);
      }
      
      // 避免循环更新
      if (isUpdating) {
        return Reflect.set(target, prop, value);
      }
      
      isUpdating = true;
      try {
        // 更新Y.Map
        if (value === undefined) {
          ymap.delete(prop);
          delete target[prop];
        } else {
          try {
            // 检查值是否已经是被正确代理的对象
            if (value && typeof value === 'object' && value[INTERNAL_SYMBOL]) {
              // 如果已经是代理对象，直接使用其内部的Yjs值
              try {
                ymap.set(prop, value[INTERNAL_SYMBOL]);
              } catch (err) {
                console.error(`[createMapProxy] 设置代理对象属性 "${String(prop)}" 出错:`, err);
                // 继续执行设置本地值
              }
              
              // 直接设置到目标，保留代理对象
              Reflect.set(target, prop, value);
            } else if (value && typeof value === 'object') {
              // 普通对象，需要转换为Yjs类型
              if (Array.isArray(value)) {
                // 数组转为Y.Array
                try {
                  const yarray = new Y.Array();
                  // 安全检查
                  if (!yarray) {
                    throw new Error("Failed to create Y.Array");
                  }
                  
                  // 处理每个数组元素
                  value.forEach(item => {
                    if (item === undefined || item === null) {
                      yarray.push([null]);
                    } else if (item && typeof item === 'object' && item[INTERNAL_SYMBOL]) {
                      yarray.push([item[INTERNAL_SYMBOL]]);
                    } else {
                      try {
                        const yjsItem = valueToYjs(item);
                        yarray.push([yjsItem]);
                      } catch (err) {
                        console.warn(`[createMapProxy] 数组项转换失败:`, err);
                        yarray.push([null]);
                      }
                    }
                  });
                  
                  // 安全设置属性
                  try {
                    ymap.set(prop, yarray);
                    
                    // 使用数组代理包装成响应式
                    const arrayProxy = createArrayProxy(yarray);
                    Reflect.set(target, prop, arrayProxy);
                  } catch (err) {
                    console.error(`[createMapProxy] 设置数组到Y.Map失败:`, err);
                    // 出错时仍设置本地数组
                    Reflect.set(target, prop, value.slice());
                  }
                } catch (err) {
                  console.error(`[createMapProxy] 设置数组属性 "${String(prop)}" 出错:`, err);
                  // 出错时设置空数组
                  Reflect.set(target, prop, []);
                }
              } else {
                // 对象转为Y.Map
                try {
                  // 创建深层嵌套对象的处理函数
                  const createYMapFromObject = (obj) => {
                    if (!obj || typeof obj !== 'object') return null;
                    
                    try {
                      const newMap = new Y.Map();
                      if (!newMap) throw new Error("Failed to create Y.Map");
                      
                      // 安全遍历对象属性
                      const entries = Object.entries(obj);
                      for (let i = 0; i < entries.length; i++) {
                        const [key, val] = entries[i];
                        if (val === undefined) continue; // 跳过undefined值
                        
                        if (val === null) {
                          newMap.set(key, null);
                        } else if (typeof val === 'object') {
                          if (val[INTERNAL_SYMBOL]) {
                            // 已经是代理对象
                            newMap.set(key, val[INTERNAL_SYMBOL]);
                          } else if (Array.isArray(val)) {
                            // 是数组
                            const nestedArray = new Y.Array();
                            for (let j = 0; j < val.length; j++) {
                              const arrItem = val[j];
                              if (arrItem === undefined || arrItem === null) {
                                nestedArray.push([null]);
                              } else if (typeof arrItem === 'object') {
                                if (arrItem[INTERNAL_SYMBOL]) {
                                  nestedArray.push([arrItem[INTERNAL_SYMBOL]]);
                                } else {
                                  const arrItemMap = createYMapFromObject(arrItem);
                                  nestedArray.push([arrItemMap]);
                                }
                              } else {
                                // 基本类型
                                nestedArray.push([arrItem]);
                              }
                            }
                            newMap.set(key, nestedArray);
                          } else {
                            // 嵌套对象，递归处理
                            const nestedMap = createYMapFromObject(val);
                            newMap.set(key, nestedMap);
                          }
                        } else {
                          // 基础类型
                          newMap.set(key, val);
                        }
                      }
                      return newMap;
                    } catch (err) {
                      console.error('[createMapProxy] 创建嵌套Y.Map失败:', err);
                      return null;
                    }
                  };
                  
                  // 使用安全的创建函数
                  const nestedMap = createYMapFromObject(value);
                  
                  if (nestedMap) {
                    try {
                      // 设置到Y.Map
                      ymap.set(prop, nestedMap);
                      
                      // 使用映射代理包装成响应式
                      const mapProxy = createMapProxy(nestedMap);
                      Reflect.set(target, prop, mapProxy);
                    } catch (err) {
                      console.error(`[createMapProxy] 设置嵌套对象到Y.Map失败:`, err);
                      // 创建本地副本
                      const localCopy = JSON.parse(JSON.stringify(value));
                      Reflect.set(target, prop, localCopy);
                    }
                  } else {
                    // 如果创建Y.Map失败，直接使用本地对象
                    console.warn(`[createMapProxy] 为 "${String(prop)}" 使用本地对象替代`);
                    Reflect.set(target, prop, { ...value });
                  }
                } catch (err) {
                  console.error(`[createMapProxy] 设置对象属性 "${String(prop)}" 出错:`, err);
                  // 出错时设置空对象
                  Reflect.set(target, prop, {});
                }
              }
            } else {
              // 原始值直接设置
              try {
                const yjsValue = valueToYjs(value);
                ymap.set(prop, yjsValue);
              } catch (err) {
                console.error(`[createMapProxy] 设置原始值到Y.Map失败:`, err);
              }
              Reflect.set(target, prop, value);
            }
          } catch (err) {
            console.error(`[createMapProxy] 设置属性 "${String(prop)}" 出错:`, err);
            // 直接设置本地值，保证操作不会失败
            Reflect.set(target, prop, value);
          }
        }
      } catch (err) {
        console.error(`[createMapProxy] 设置属性 "${String(prop)}" 的外部处理出错:`, err);
        Reflect.set(target, prop, value);
      } finally {
        isUpdating = false;
      }
      
      return true;
    },
    
    deleteProperty(target, prop) {
      // 跳过符号属性
      if (typeof prop === 'symbol') {
        return Reflect.deleteProperty(target, prop);
      }
      
      // 避免循环更新
      if (isUpdating) {
        return Reflect.deleteProperty(target, prop);
      }
      
      isUpdating = true;
      try {
        ymap.delete(prop);
        return Reflect.deleteProperty(target, prop);
      } finally {
        isUpdating = false;
      }
    },
    
    get(target, prop, receiver) {
      if (typeof prop === 'symbol') {
        return Reflect.get(target, prop, receiver);
      }
      
      let value = Reflect.get(target, prop, receiver);
      
      // 如果已经是响应式代理或函数，直接返回
      if (typeof value === 'function' || (value && typeof value === 'object' && value[INTERNAL_SYMBOL])) {
        return value;
      }
      
      // 检查Yjs中是否有此属性，但本地对象中没有正确代理
      if (value === undefined && ymap.has(prop)) {
        const yjsValue = ymap.get(prop);
        
        // 根据Yjs值类型正确处理
        if (yjsValue instanceof Y.Map) {
          value = createMapProxy(yjsValue);
          target[prop] = value; // 更新本地对象
        } else if (yjsValue instanceof Y.Array) {
          value = createArrayProxy(yjsValue);
          target[prop] = value; // 更新本地对象
        } else {
          // 原始值
          value = yjsValue;
          target[prop] = value;
        }
        
        return value;
      }
      
      return value;
    }
  });
}

/**
 * 映射实现 - 提供Map方法的代理
 * @param {Y.Map} map - Yjs Map对象
 * @returns {Object} 映射实现
 */
export function computeMapImplementation(map) {
  // 序列化方法
  const toJSON = function toJSON() {
    const result = {};
    map.forEach((value, key) => {
      result[key] = valueFromYjs(value);
    });
    return result;
  };

  // 获取所有键
  const keys = function keys() {
    return Array.from(map.keys());
  };

  // 获取所有值
  const values = function values() {
    return Array.from(map.keys()).map(key => valueFromYjs(map.get(key)));
  };

  // 获取所有键值对
  const entries = function entries() {
    return Array.from(map.keys()).map(key => [key, valueFromYjs(map.get(key))]);
  };

  // 遍历映射
  const forEach = function forEach(callback) {
    map.forEach((value, key) => {
      callback(valueFromYjs(value), key, this);
    });
  };

  // 清空映射
  const clear = function clear() {
    const keys = Array.from(map.keys());
    keys.forEach(key => map.delete(key));
  };

  // 创建方法集合
  return {
    toJSON,
    keys,
    values,
    entries,
    forEach,
    clear,
    get size() {
      return map.size;
    }
  };
}

/**
 * 创建映射CRDT
 * @param {Object} initialValue - 初始值对象
 * @returns {Object} 代理的响应式映射对象
 */
export function createMap(initialValue = {}) {
  const ymap = new Y.Map();
  
  // 添加初始值
  for (const [key, value] of Object.entries(initialValue)) {
    ymap.set(key, valueToYjs(value));
  }
  
  return createMapProxy(ymap);
}

/**
 * 检查对象是否为CRDTMap
 * @param {any} obj - 要检查的对象
 * @returns {boolean} 是否为CRDTMap
 */
export function isMap(obj) {
  return obj && 
         typeof obj === 'object' && 
         obj[INTERNAL_SYMBOL] instanceof Y.Map;
} 