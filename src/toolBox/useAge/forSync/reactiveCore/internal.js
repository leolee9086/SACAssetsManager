/**
 * 内部CRDT转换工具函数
 */

import * as Y from '../../../../../static/yjs.js';
import { toRaw } from '../../../../../static/vue.esm-browser.js';
import { INTERNAL_SYMBOL } from './constants.js';
import { createMapProxy } from './map.js';
import { createArrayProxy } from './array.js';
import { Box } from './boxed.js';

/**
 * 将JavaScript值转换为Yjs支持的格式
 * @param {any} value - JavaScript值
 * @returns {any} Yjs兼容值
 */
export function valueToYjs(value, seenObjects = new WeakMap()) {
  if (value === null || value === undefined) {
    return null;
  }
  
  // 已经是Yjs类型
  if (value instanceof Y.AbstractType) {
    return value;
  }
  
  // 获取内部Yjs引用 - 处理已经是CRDT的对象
  if (value && typeof value === 'object' && INTERNAL_SYMBOL in value) {
    return value[INTERNAL_SYMBOL];
  }
  
  // 使用 toRaw 获取非响应式值
  let rawValue = value;
  if (typeof toRaw === 'function' && typeof value === 'object' && value !== null) {
    try {
      rawValue = toRaw(value);
    } catch (err) {
      console.warn('[valueToYjs] toRaw 失败:', err);
      // 在失败时继续使用原始值
    }
  }
  
  // 检测循环引用
  if (typeof rawValue === 'object' && rawValue !== null) {
    if (seenObjects.has(rawValue)) {
      // 已处理过的对象，防止循环引用导致栈溢出
      console.warn('检测到循环引用，返回null');
      return null;
    }
    // 记录当前处理的对象
    seenObjects.set(rawValue, true);
  }
  
  // 处理数组
  if (Array.isArray(rawValue)) {
    const yarray = new Y.Array();
    
    try {
      // 逐项处理数组元素
      for (let i = 0; i < rawValue.length; i++) {
        const item = rawValue[i];
        if (item === undefined || item === null) {
          // 跳过null或undefined项
          yarray.push([null]);
          continue;
        }
        
        // 为每个数组元素使用新的WeakMap以避免误报循环引用
        // 但需要复制已处理对象记录以防真正的循环引用
        const newSeen = new WeakMap();
        for (const [obj] of seenObjects) {
          if (obj !== null && obj !== undefined) {
            newSeen.set(obj, true);
          }
        }
        
        try {
          const yjsItem = valueToYjs(item, newSeen);
          yarray.push([yjsItem]);
        } catch (err) {
          console.warn(`[valueToYjs] 处理数组索引 ${i} 出错:`, err);
          // 出错时推入null
          yarray.push([null]);
        }
      }
    } catch (err) {
      console.warn('[valueToYjs] 处理数组时出错:', err);
    }
    
    return yarray;
  }
  
  // 处理普通对象（非类实例）
  if (rawValue !== null && typeof rawValue === 'object' && 
      (rawValue.constructor === Object || Object.getPrototypeOf(rawValue) === Object.prototype)) {
    const ymap = new Y.Map();
    
    try {
      const keys = Object.keys(rawValue);
      
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const val = rawValue[key];
        
        if (val !== undefined) {
          // 为每个属性使用新的WeakMap以避免误报循环引用
          // 但需要复制已处理对象记录以防真正的循环引用
          const newSeen = new WeakMap();
          for (const [obj] of seenObjects) {
            if (obj !== null && obj !== undefined) {
              newSeen.set(obj, true);
            }
          }
          
          try {
            const yjsVal = valueToYjs(val, newSeen);
            if (yjsVal !== undefined) {
              ymap.set(key, yjsVal);
            }
          } catch (err) {
            console.warn(`[valueToYjs] 处理属性 ${key} 出错:`, err);
          }
        }
      }
    } catch (err) {
      console.warn('[valueToYjs] 处理对象时出错:', err);
    }
    
    return ymap;
  }
  
  // 字符串、数字、布尔值可以直接使用
  if (typeof rawValue === 'string' || typeof rawValue === 'boolean') {
    return rawValue;
  }
  
  // 特殊数值处理
  if (typeof rawValue === 'number') {
    if (isNaN(rawValue)) return 'NaN';
    if (rawValue === Infinity) return 'Infinity';
    if (rawValue === -Infinity) return '-Infinity';
    return rawValue;
  }
  
  // 日期对象转ISO字符串
  if (rawValue instanceof Date) {
    return rawValue.toISOString();
  }
  
  // BigInt转字符串
  if (typeof rawValue === 'bigint') {
    return rawValue.toString();
  }
  
  // 其他复杂对象不做处理，改为直接返回null
  // 不尝试序列化，因为这可能导致问题
  if (typeof rawValue === 'object' && rawValue !== null) {
    console.warn('无法直接存储复杂对象类型，返回null');
    return null;
  }
  
  // 其他类型转为字符串
  try {
    return String(rawValue);
  } catch (err) {
    console.warn('[valueToYjs] 值转换为字符串时出错:', err);
    return null;
  }
}

/**
 * 从Yjs值转换为JavaScript值
 * @param {any} value - Yjs值
 * @returns {any} JavaScript值
 */
export function valueFromYjs(value) {
  if (value === null || value === undefined) {
    return value;
  }
  
  try {
    // 处理Yjs类型
    if (value instanceof Y.Map) {
      // 确保Map的每个值都正确转换
      const result = {};
      // 添加调试信息
      console.log('从Y.Map转换，键数量:', value.size);
      
      try {
        value.forEach((val, key) => {
          if (val !== undefined) {
            console.log(`转换键 "${key}", 类型:`, 
                      val instanceof Y.Map ? 'Y.Map' : 
                      val instanceof Y.Array ? 'Y.Array' : typeof val);
            
            try {
              result[key] = valueFromYjs(val);
            } catch (err) {
              console.warn(`[valueFromYjs] 转换键 "${key}" 失败:`, err);
              // 转换失败时使用null
              result[key] = null;
            }
          }
        });
      } catch (err) {
        console.warn('[valueFromYjs] 遍历Y.Map失败:', err);
      }
      
      return result;
    } else if (value instanceof Y.Array) {
      // 确保Array的每个值都正确转换
      try {
        const array = Array.from(value);
        return array.map(item => {
          try {
            return valueFromYjs(item);
          } catch (err) {
            console.warn('[valueFromYjs] 转换数组项失败:', err);
            return null;
          }
        });
      } catch (err) {
        console.warn('[valueFromYjs] 转换Y.Array失败:', err);
        return [];
      }
    } else if (value instanceof Y.Text) {
      return value.toString();
    } else if (value instanceof Y.XmlText || value instanceof Y.XmlElement || value instanceof Y.XmlFragment) {
      return value.toString();
    }
    
    // 处理特殊字符串值
    if (typeof value === 'string') {
      if (value === 'NaN') return NaN;
      if (value === 'Infinity') return Infinity;
      if (value === '-Infinity') return -Infinity;
      
      // 尝试解析ISO日期字符串
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
        try {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            return date;
          }
        } catch {
          // 解析失败，保持原值
        }
      }
    }
    
    // 直接返回原始值
    return value;
  } catch (err) {
    console.error('[valueFromYjs] 主函数出错:', err);
    // 当整个转换过程失败时，返回null
    return null;
  }
}

/**
 * 解析Yjs的返回值
 * @param {any} value - Yjs返回的值
 * @returns {any} 解析后的值
 */
export function parseYjsReturnValue(value) {
  return valueFromYjs(value);
}

/**
 * 创建适合Yjs存储的CRDT值
 * @param {any} initialValue - 初始值
 * @returns {Object} CRDT对象
 */
export function crdtValue(initialValue) {
  // 根据传入的值类型选择合适的CRDT表示方式
  if (Array.isArray(initialValue)) {
    // 如果是数组，使用Y.Array
    const yarray = new Y.Array();
    initialValue.forEach(item => {
      yarray.push([valueToYjs(item)]);
    });
    return createArrayProxy(yarray);
  } else if (initialValue && typeof initialValue === 'object' && initialValue.constructor === Object) {
    // 如果是对象，使用Y.Map
    const ymap = new Y.Map();
    for (const [key, value] of Object.entries(initialValue)) {
      ymap.set(key, valueToYjs(value));
    }
    return createMapProxy(ymap);
  } else if (typeof initialValue === 'string') {
    // 如果是字符串，使用Y.Text
    const ytext = new Y.Text();
    ytext.insert(0, initialValue);
    return Box(ytext, initialValue);
  } else {
    // 其他值类型使用Box包装
    return Box(null, initialValue);
  }
} 