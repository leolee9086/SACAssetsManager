/**
 * CRDTArray实现 - 基于Yjs的可共享数组结构
 */

import * as Y from '../../../../../static/yjs.js';
import { INTERNAL_SYMBOL } from './constants.js';
import { reactive } from '../../../../../static/vue.esm-browser.js';
import { valueFromYjs, valueToYjs } from './internal.js';
import { setArrayProxyCreator } from './map.js';

/**
 * 通过Proxy连接Y.Array和Vue响应式数据
 * @param {Y.Array} yarray - Y.Array实例
 * @returns {Array} 响应式数组
 */
export function createArrayProxy(yarray) {
  // 初始数组
  const baseArr = [];
  
  // 标记是否正在更新，避免观察者触发循环更新
  let isUpdating = false;
  
  // 初始化值
  yarray.forEach((value, index) => {
    baseArr[index] = valueFromYjs(value);
  });
  
  // 创建响应式数组
  const reactiveArr = reactive(baseArr);
  
  // 存储原始Y.Array
  reactiveArr[INTERNAL_SYMBOL] = yarray;
  
  // 监听Y.Array变化
  yarray.observe(event => {
    // 避免循环更新
    if (isUpdating) return;
    
    isUpdating = true;
    try {
      let index = 0;
      
      event.changes.delta.forEach(delta => {
        if (delta.retain !== undefined) {
          index += delta.retain;
        } else if (delta.delete !== undefined) {
          // 删除元素
          reactiveArr.splice(index, delta.delete);
        } else if (delta.insert !== undefined) {
          // 插入元素
          const values = Array.isArray(delta.insert) ? delta.insert : [delta.insert];
          values.forEach(value => {
            // 根据插入值的类型做不同处理
            if (value instanceof Y.Map) {
              // 对于Y.Map，创建Map代理
              reactiveArr.splice(index, 0, createMapProxy(value));
            } else if (value instanceof Y.Array) {
              // 对于Y.Array，创建Array代理
              reactiveArr.splice(index, 0, createArrayProxy(value));
            } else {
              // 其他类型直接插入
              reactiveArr.splice(index, 0, value);
            }
            index++;
          });
        }
      });
    } finally {
      isUpdating = false;
    }
  });
  
  // 所有标准数组方法
  const ARRAY_METHODS = {
    // 会修改原数组的方法
    MUTATING: [
      'push', 'pop', 'shift', 'unshift', 'splice', 'reverse', 'sort', 
      'fill', 'copyWithin'
    ],
    
    // 不修改原数组的方法
    NONMUTATING: [
      'concat', 'slice', 'map', 'filter', 'reduce', 'reduceRight',
      'forEach', 'every', 'some', 'find', 'findIndex', 'findLast', 'findLastIndex',
      'includes', 'indexOf', 'lastIndexOf', 'join',
      'entries', 'keys', 'values', 'flat', 'flatMap', 'at'
    ]
  };
  
  // 创建函数处理器对象 - 将方法名映射到处理函数
  const methodHandlers = {
    // 添加元素到数组末尾
    push: (target, args) => {
      const yjsValues = args.map(arg => valueToYjs(arg));
      yarray.push(yjsValues);
      return target.length;
    },
    
    // 移除并返回数组最后一个元素
    pop: (target) => {
      if (target.length === 0) return undefined;
      const lastValue = target[target.length - 1];
      yarray.delete(target.length - 1, 1);
      return lastValue;
    },
    
    // 移除并返回数组第一个元素
    shift: (target) => {
      if (target.length === 0) return undefined;
      const firstValue = target[0];
      yarray.delete(0, 1);
      return firstValue;
    },
    
    // 在数组开头添加元素
    unshift: (target, args) => {
      const yjsValues = args.map(arg => valueToYjs(arg));
      yarray.insert(0, yjsValues);
      return target.length;
    },
    
    // 删除、替换或添加元素
    splice: (target, args) => {
      const start = args[0] || 0;
      const actualStart = start < 0 ? Math.max(target.length + start, 0) : Math.min(start, target.length);
      const deleteCount = args.length > 1 ? args[1] : target.length - actualStart;
      const items = args.slice(2);
      
      // 保存要删除的元素以返回
      const deletedItems = target.slice(actualStart, actualStart + deleteCount);
      
      // 删除元素
      if (deleteCount > 0) {
        yarray.delete(actualStart, deleteCount);
      }
      
      // 添加新元素
      if (items.length > 0) {
        const yjsItems = items.map(item => valueToYjs(item));
        yarray.insert(actualStart, yjsItems);
      }
      
      return deletedItems;
    },
    
    // 确保slice正确实现
    slice: (target, args) => {
      const start = args[0] || 0;
      const end = args.length > 1 ? args[1] : target.length;
      
      // 使用原生Array.prototype.slice获取结果
      return Array.prototype.slice.call(target, start, end);
    }
  };
  
  // 创建数组代理
  const arrayProxy = new Proxy(reactiveArr, {
    set(target, prop, value) {
      // 处理数字索引
      if (typeof prop === 'string' && !isNaN(prop) && prop !== '') {
        const index = parseInt(prop, 10);
        
        // 避免循环更新
        if (isUpdating) {
          return Reflect.set(target, prop, value);
        }
        
        isUpdating = true;
        try {
          // 更新Y.Array
          const yjsValue = valueToYjs(value);
          
          if (index >= yarray.length) {
            // 为超出当前长度的索引填充null
            const fillCount = index - yarray.length;
            if (fillCount > 0) {
              const nullArray = new Array(fillCount).fill(null);
              yarray.push(nullArray.map(() => null));
            }
            // 然后添加实际值
            yarray.push([yjsValue]);
          } else {
            // 替换现有索引的值
            yarray.delete(index, 1);
            yarray.insert(index, [yjsValue]);
          }
          
          // 同时更新响应式数组
          Reflect.set(target, prop, valueFromYjs(yjsValue));
        } finally {
          isUpdating = false;
        }
        
        return true;
      }
      
      // 处理length等其他属性
      if (prop === 'length' && typeof value === 'number') {
        const currentLength = target.length;
        
        // 避免循环更新
        if (isUpdating) {
          return Reflect.set(target, prop, value);
        }
        
        isUpdating = true;
        try {
          // 缩短数组 
          if (value < currentLength) {
            yarray.delete(value, currentLength - value);
          } else if (value > currentLength) {
            // 扩展数组(填充undefined)
            const fillCount = value - currentLength;
            const fillArray = new Array(fillCount).fill(null);
            yarray.push(fillArray.map(() => null));
          }
          
          // 更新本地length
          return Reflect.set(target, prop, value);
        } finally {
          isUpdating = false;
        }
      }
      
      return Reflect.set(target, prop, value);
    },
    
    // 添加未定义的方法
    defineProperty(target, prop, descriptor) {
      return Reflect.defineProperty(target, prop, descriptor);
    },
    
    // 处理数组特殊方法
    get(target, prop, receiver) {
      // 特殊处理内部标识符
      if (prop === INTERNAL_SYMBOL) {
        return Reflect.get(target, prop, receiver);
      }
      
      // 处理常用数组方法
      if (typeof prop === 'string') {
        // 特殊处理一些常用方法以确保其正确工作
        if (prop === 'slice') {
          return function(...args) {
            return Array.prototype.slice.apply(target, args);
          };
        }
        
        if (prop === 'forEach') {
          return function(callback, thisArg) {
            return Array.prototype.forEach.call(target, callback, thisArg);
          };
        }
        
        if (prop === 'map') {
          return function(callback, thisArg) {
            return Array.prototype.map.call(target, callback, thisArg);
          };
        }
        
        if (prop === 'filter') {
          return function(callback, thisArg) {
            return Array.prototype.filter.call(target, callback, thisArg);
          };
        }
        
        if (prop === 'find') {
          return function(callback, thisArg) {
            return Array.prototype.find.call(target, callback, thisArg);
          };
        }
        
        if (prop === 'findIndex') {
          return function(callback, thisArg) {
            return Array.prototype.findIndex.call(target, callback, thisArg);
          };
        }
        
        // 数字索引属性 - 处理嵌套对象
        if (!isNaN(prop) && prop !== '') {
          const index = parseInt(prop, 10);
          if (index >= 0 && index < target.length) {
            let value = Reflect.get(target, prop, receiver);
            
            // 如果值是undefined，但yarray中存在该索引的值，说明未正确代理
            if (value === undefined && index < yarray.length) {
              const yjsValue = yarray.get(index);
              
              // 根据Yjs值类型创建正确的代理
              if (yjsValue instanceof Y.Map) {
                value = createMapProxy(yjsValue);
                target[index] = value;
              } else if (yjsValue instanceof Y.Array) {
                value = createArrayProxy(yjsValue);
                target[index] = value;
              } else {
                value = yjsValue;
                target[index] = value;
              }
            }
            
            return value;
          }
        }
      }
      
      // 其他属性直接透传
      return Reflect.get(target, prop, receiver);
    },
    
    getPrototypeOf() {
      return Array.prototype;
    },
    
    // 删除数组项
    deleteProperty(target, prop) {
      // 处理数字索引
      if (typeof prop === 'string' && !isNaN(prop) && prop !== '') {
        const index = parseInt(prop, 10);
        
        // 避免循环更新
        if (isUpdating) {
          return Reflect.deleteProperty(target, prop);
        }
        
        isUpdating = true;
        try {
          // 从Y.Array中删除
          yarray.delete(index, 1);
          return Reflect.deleteProperty(target, prop);
        } finally {
          isUpdating = false;
        }
      }
      
      return Reflect.deleteProperty(target, prop);
    },
    
    // 检查属性存在
    has(target, prop) {
      // 特殊检查数组长度
      if (prop === 'length') {
        return true;
      }
      
      // 检查是否存在索引
      if (typeof prop === 'string' && !isNaN(prop)) {
        const index = parseInt(prop, 10);
        return index >= 0 && index < target.length;
      }
      
      return Reflect.has(target, prop) || prop in Array.prototype;
    },
    
    // 获取属性描述符
    getOwnPropertyDescriptor(target, prop) {
      // 处理数组长度特殊属性
      if (prop === 'length') {
        return {
          value: target.length,
          writable: true,
          enumerable: false,
          configurable: false
        };
      }
      
      // 处理索引属性
      if (typeof prop === 'string' && !isNaN(prop)) {
        const index = parseInt(prop, 10);
        if (index >= 0 && index < target.length) {
          return {
            value: target[index],
            writable: true,
            enumerable: true,
            configurable: true
          };
        }
      }
      
      // 处理数组原型方法
      if (typeof prop === 'string' && prop in Array.prototype) {
        const desc = Object.getOwnPropertyDescriptor(Array.prototype, prop);
        if (desc) return desc;
      }
      
      return Reflect.getOwnPropertyDescriptor(target, prop);
    },
    
    // 获取自身属性键列表
    ownKeys(target) {
      const keys = [];
      
      // 添加所有索引
      for (let i = 0; i < target.length; i++) {
        keys.push(String(i));
      }
      
      // 添加length属性
      keys.push('length');
      
      // 添加其他自定义属性
      Object.keys(target).forEach(key => {
        if (key !== 'length' && isNaN(parseInt(key, 10))) {
          keys.push(key);
        }
      });
      
      return keys;
    }
  });
  
  // 确保arrayProxy的原型是Array.prototype
  Object.setPrototypeOf(arrayProxy, Array.prototype);
  
  // 确保数组常用方法可用
  ['forEach', 'map', 'filter', 'slice', 'find', 'findIndex'].forEach(method => {
    if (typeof arrayProxy[method] !== 'function') {
      Object.defineProperty(arrayProxy, method, {
        value: Array.prototype[method],
        writable: true,
        configurable: true,
        enumerable: false
      });
    }
  });
  
  return arrayProxy;
}

/**
 * 检查数组是否具有预期的方法
 * @param {Array} array - 要检查的数组
 * @returns {boolean} 是否有所有必要的方法
 */
export function hasArrayMethods(array) {
  if (!Array.isArray(array)) return false;
  
  const methods = ['slice', 'map', 'filter', 'forEach'];
  return methods.every(method => typeof array[method] === 'function');
}

/**
 * 修复数组，确保它有所有标准的数组方法
 * @param {Array} array - 要修复的数组
 * @returns {Array} 修复后的数组
 */
export function fixArrayMethods(array) {
  if (!Array.isArray(array)) return array;
  if (hasArrayMethods(array)) return array;
  
  console.warn('检测到数组缺少必要方法，创建替代数组');
  
  // 创建一个普通数组并复制所有元素
  const fixedArray = [];
  for (let i = 0; i < array.length; i++) {
    fixedArray[i] = array[i];
  }
  
  return fixedArray;
}

// 设置createArrayProxy到map.js以解决循环依赖
setArrayProxyCreator(createArrayProxy); 