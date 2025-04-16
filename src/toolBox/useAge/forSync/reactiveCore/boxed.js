/**
 * 原始值CRDT包装 - 用于处理非对象的原始类型值
 */

import * as Y from '../../../../../static/yjs.js';
import { ref, watch } from '../../../../../static/vue.esm-browser.js';
import { INTERNAL_SYMBOL } from './constants.js';

// 包装标识符，用于识别包装后的对象
const BOX_SYMBOL = Symbol('__boxed_value');

/**
 * 包装原始值，创建可响应的包装对象
 * @param {Y.Text|null} ytext - Yjs文本对象，用于同步时使用
 * @param {any} initialValue - 初始值
 * @returns {Object} 包装的响应式对象
 */
export function Box(ytext, initialValue) {
  // 创建响应式引用
  const valueRef = ref(initialValue);
  
  // 标记是否正在更新，避免观察者触发循环更新
  let isUpdating = false;
  
  // 如果有Yjs引用，设置双向绑定
  if (ytext instanceof Y.Text) {
    // 获取初始文本值
    const textValue = ytext.toString();
    
    // 如果文本非空，尝试更新初始值
    if (textValue !== '') {
      try {
        if (typeof initialValue === 'number') {
          valueRef.value = Number(textValue);
        } else if (typeof initialValue === 'boolean') {
          valueRef.value = textValue === 'true';
        } else {
          valueRef.value = textValue;
        }
      } catch (err) {
        console.warn('解析初始文本值失败:', err);
      }
    }
    
    // 监听Yjs文本变化
    ytext.observe(event => {
      if (isUpdating) return;
      
      isUpdating = true;
      try {
        const newText = ytext.toString();
        
        // 根据初始值类型转换
        if (typeof initialValue === 'number') {
          const num = Number(newText);
          if (!isNaN(num)) {
            valueRef.value = num;
          }
        } else if (typeof initialValue === 'boolean') {
          valueRef.value = newText === 'true';
        } else {
          valueRef.value = newText;
        }
      } finally {
        isUpdating = false;
      }
    });
    
    // 监听本地值变化以更新Yjs
    watch(valueRef, newValue => {
      if (isUpdating) return;
      
      isUpdating = true;
      try {
        const stringValue = String(newValue);
        
        // 更新Yjs文本
        ytext.delete(0, ytext.length);
        ytext.insert(0, stringValue);
      } finally {
        isUpdating = false;
      }
    });
  }
  
  // 创建包装对象
  const boxed = {
    [BOX_SYMBOL]: true,
    [INTERNAL_SYMBOL]: ytext,
    get value() {
      return valueRef.value;
    },
    set value(newValue) {
      valueRef.value = newValue;
    },
    toString() {
      return String(valueRef.value);
    },
    valueOf() {
      return valueRef.value;
    },
    [Symbol.toPrimitive](hint) {
      const val = valueRef.value;
      if (hint === 'number') {
        return Number(val);
      }
      if (hint === 'string') {
        return String(val);
      }
      return val;
    }
  };
  
  return boxed;
}

/**
 * 检查对象是否为Box包装对象
 * @param {any} obj - 要检查的对象
 * @returns {boolean} 是否为Box包装对象
 */
export function isBox(obj) {
  return obj && typeof obj === 'object' && obj[BOX_SYMBOL] === true;
}

/**
 * 从Box包装对象中提取原始值
 * @param {any} boxed - Box包装对象或任意值
 * @returns {any} 原始值
 */
export function unbox(boxed) {
  if (isBox(boxed)) {
    return boxed.value;
  }
  return boxed;
} 