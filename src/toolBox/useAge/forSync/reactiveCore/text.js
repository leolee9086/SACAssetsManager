/**
 * 文本CRDT - 处理Y.Text类型的响应式包装
 */

import * as Y from '../../../../../static/yjs.js';
import { ref, watch } from '../../../../../static/vue.esm-browser.js';
import { INTERNAL_SYMBOL } from './constants.js';

/**
 * 创建Y.Text的响应式代理
 * @param {Y.Text} ytext - Yjs文本对象
 * @param {string} initialValue - 初始文本值,仅当ytext为空时使用
 * @returns {Object} 响应式文本对象
 */
export function createTextProxy(ytext, initialValue = '') {
  // 确保ytext是Y.Text类型
  if (!(ytext instanceof Y.Text)) {
    throw new Error('createTextProxy需要Y.Text类型的参数');
  }
  
  // 如果文本为空且有初始值,初始化文本内容
  if (ytext.toString() === '' && initialValue !== '') {
    ytext.insert(0, initialValue);
  }
  
  // 创建响应式引用
  const textRef = ref(ytext.toString());
  
  // 标记是否正在更新,避免观察者触发循环更新
  let isUpdating = false;
  
  // 监听Y.Text变化
  ytext.observe(event => {
    if (isUpdating) return;
    
    isUpdating = true;
    try {
      textRef.value = ytext.toString();
    } finally {
      isUpdating = false;
    }
  });
  
  // 监听引用变化以更新Y.Text
  watch(textRef, newValue => {
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
  
  // 创建代理对象
  const proxy = new Proxy(textRef, {
    get(target, prop) {
      // 内部Yjs引用
      if (prop === INTERNAL_SYMBOL) {
        return ytext;
      }
      
      // 字符串方法代理
      if (typeof String.prototype[prop] === 'function') {
        return function(...args) {
          return String.prototype[prop].apply(target.value, args);
        };
      }
      
      // 字符串属性代理
      if (prop in String.prototype) {
        return target.value[prop];
      }
      
      // 文本操作方法
      if (prop === 'insert') {
        return function(index, content) {
          if (!ytext) return;
          
          isUpdating = true;
          try {
            ytext.insert(index, content);
            textRef.value = ytext.toString();
          } finally {
            isUpdating = false;
          }
        };
      }
      
      if (prop === 'delete') {
        return function(index, length) {
          if (!ytext) return;
          
          isUpdating = true;
          try {
            ytext.delete(index, length);
            textRef.value = ytext.toString();
          } finally {
            isUpdating = false;
          }
        };
      }
      
      // 直接访问value属性或其它ref属性
      if (prop === 'value' || prop in target) {
        return target[prop];
      }
      
      // 将其它属性直接代理到字符串值
      return target.value[prop];
    },
    
    set(target, prop, value) {
      if (prop === 'value') {
        target.value = value;
        return true;
      }
      
      return false;
    },
    
    has(target, prop) {
      if (prop === INTERNAL_SYMBOL) return true;
      if (prop in String.prototype) return true;
      if (prop in target) return true;
      if (prop === 'insert' || prop === 'delete') return true;
      
      return prop in target.value;
    },
    
    ownKeys(target) {
      // 返回自有属性与字符串原型方法
      return [...Object.keys(target), ...Object.getOwnPropertyNames(String.prototype)];
    },
    
    getOwnPropertyDescriptor(target, prop) {
      if (prop in target) {
        return Object.getOwnPropertyDescriptor(target, prop);
      }
      
      if (prop in String.prototype) {
        return Object.getOwnPropertyDescriptor(String.prototype, prop);
      }
      
      if (prop === 'insert' || prop === 'delete') {
        return {
          configurable: true,
          enumerable: true
        };
      }
      
      return undefined;
    }
  });
  
  return proxy;
}

/**
 * 检查值是否为TextProxy
 * @param {any} value - 要检查的值
 * @returns {boolean} 是否为TextProxy
 */
export function isTextProxy(value) {
  return value && 
         typeof value === 'object' && 
         value[INTERNAL_SYMBOL] instanceof Y.Text;
}

/**
 * 创建文本CRDT
 * @param {string} initialValue - 初始文本值
 * @returns {Object} 文本CRDT对象
 */
export function createText(initialValue = '') {
  const ytext = new Y.Text();
  if (initialValue !== '') {
    ytext.insert(0, initialValue);
  }
  return createTextProxy(ytext, initialValue);
} 