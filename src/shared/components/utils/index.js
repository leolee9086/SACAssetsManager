/**
 * 组件工具函数
 * 
 * 提供UI组件开发过程中常用的工具函数。这些函数专注于UI组件的通用功能，
 * 如样式处理、DOM操作、事件处理等。
 * 
 * @module shared/components/utils
 */

/**
 * 防抖函数 - 限制函数在一定时间内仅执行一次
 * @param {Function} fn - 需要防抖的函数
 * @param {number} delay - 延迟时间(毫秒)
 * @returns {Function} 防抖后的函数
 */
export const 防抖 = (fn, delay) => {
  let timer = null;
  return function(...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
      timer = null;
    }, delay);
  };
};

/**
 * 节流函数 - 限制函数在一定时间内最多执行一次
 * @param {Function} fn - 需要节流的函数
 * @param {number} interval - 间隔时间(毫秒)
 * @returns {Function} 节流后的函数
 */
export const 节流 = (fn, interval) => {
  let lastTime = 0;
  return function(...args) {
    const now = Date.now();
    if (now - lastTime >= interval) {
      fn.apply(this, args);
      lastTime = now;
    }
  };
};

/**
 * 获取元素样式
 * @param {HTMLElement} element - DOM元素
 * @param {string} prop - CSS属性名
 * @returns {string} CSS属性值
 */
export const 获取样式 = (element, prop) => {
  return window.getComputedStyle(element, null).getPropertyValue(prop);
};

/**
 * 添加类名
 * @param {HTMLElement} element - DOM元素
 * @param {string} className - 类名
 */
export const 添加类名 = (element, className) => {
  if (element.classList) {
    element.classList.add(className);
  } else {
    element.className += ` ${className}`;
  }
};

/**
 * 移除类名
 * @param {HTMLElement} element - DOM元素
 * @param {string} className - 类名
 */
export const 移除类名 = (element, className) => {
  if (element.classList) {
    element.classList.remove(className);
  } else {
    element.className = element.className.replace(
      new RegExp(`(^|\\b)${className.split(' ').join('|')}(\\b|$)`, 'gi'), ' '
    );
  }
};

/**
 * 切换类名
 * @param {HTMLElement} element - DOM元素
 * @param {string} className - 类名
 */
export const 切换类名 = (element, className) => {
  if (element.classList) {
    element.classList.toggle(className);
  } else {
    if (element.className.indexOf(className) >= 0) {
      移除类名(element, className);
    } else {
      添加类名(element, className);
    }
  }
};

/**
 * 判断元素是否包含类名
 * @param {HTMLElement} element - DOM元素
 * @param {string} className - 类名
 * @returns {boolean} 是否包含类名
 */
export const 包含类名 = (element, className) => {
  if (element.classList) {
    return element.classList.contains(className);
  } else {
    return new RegExp(`(^|\\s)${className}(\\s|$)`).test(element.className);
  }
};

// 为了兼容性，导出英文版本名称
export const debounce = 防抖;
export const throttle = 节流;
export const getStyle = 获取样式;
export const addClass = 添加类名;
export const removeClass = 移除类名;
export const toggleClass = 切换类名;
export const hasClass = 包含类名; 