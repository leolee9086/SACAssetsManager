/**
 * 编辑器通用工具函数模块
 * 提供事件处理和DOM操作的实用工具函数
 */

/**
 * 事件防抖函数
 * @param {Function} fn - 要防抖的函数
 * @param {number} delay - 延迟时间(毫秒)
 * @returns {Function} 防抖后的函数
 */
export const debounce = (fn, delay = 10) => {
  let timer = null;
  return function(...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
};

/**
 * 事件节流函数
 * @param {Function} fn - 要节流的函数
 * @param {number} limit - 节流时间间隔(毫秒)
 * @returns {Function} 节流后的函数
 */
export const throttle = (fn, limit = 16) => {
  let lastTime = 0;
  let throttleTimer = null;
  return function(...args) {
    const now = Date.now();
    if (now - lastTime >= limit) {
      fn.apply(this, args);
      lastTime = now;
    } else {
      clearTimeout(throttleTimer);
      throttleTimer = setTimeout(() => {
        fn.apply(this, args);
        lastTime = Date.now();
      }, limit - (now - lastTime));
    }
  };
};

/**
 * 检测浏览器对被动事件的支持情况
 * @returns {boolean} 是否支持被动事件
 */
export const detectPassiveEventSupport = () => {
  let supportsPassive = false;
  try {
    // 创建具有getter的options对象
    const opts = Object.defineProperty({}, 'passive', {
      get: function() {
        supportsPassive = true;
        return true;
      }
    });
    // 测试事件
    window.addEventListener('testpassive', null, opts);
    window.removeEventListener('testpassive', null, opts);
  } catch (e) {
    // 不支持
  }
  return supportsPassive;
};

/**
 * 安全执行函数并处理异常
 * @param {string} context - 错误上下文描述
 * @param {Function} fn - 要执行的函数
 * @param {*} fallback - 错误时的回退值
 * @returns {*} 函数执行结果或回退值
 */
export const safeExecute = (context, fn, fallback = null) => {
  try {
    return fn();
  } catch (err) {
    console.error(`执行错误 [${context}]:`, err);
    
    // 针对特定错误类型进行恢复尝试
    if (context === 'selection' && window.getSelection) {
      try {
        // 尝试清除当前选区作为恢复措施
        window.getSelection().removeAllRanges();
      } catch (e) {
        // 忽略二次错误
      }
    }
    
    return fallback;
  }
};

/**
 * 创建一个对象的只读代理
 * @param {Object} obj - 需要成为只读的对象
 * @returns {Proxy} 只读代理对象
 */
export const readonly = (obj) => {
  return new Proxy(obj, {
    set() {
      console.warn('尝试修改只读对象被阻止');
      return false;
    },
    deleteProperty() {
      console.warn('尝试删除只读对象属性被阻止');
      return false;
    }
  });
};

/**
 * 判断是否为移动设备
 * @returns {boolean} 是否为移动设备
 */
export const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/**
 * 判断是否支持触摸输入
 * @returns {boolean} 是否支持触摸
 */
export const isTouchSupported = () => {
  return ('ontouchstart' in window) || 
         (navigator.maxTouchPoints > 0) || 
         (navigator.msMaxTouchPoints > 0);
};

/**
 * 判断是否是高分辨率屏幕
 * @returns {boolean} 是否是高分辨率屏幕
 */
export const isHighDensityScreen = () => {
  return window.devicePixelRatio > 1.5;
};

/**
 * 检测浏览器是否支持特定CSS特性
 * @param {string} property - CSS属性名
 * @returns {boolean} 是否支持该属性
 */
export const isCSSPropertySupported = (property) => {
  return property in document.documentElement.style;
};

/**
 * 将DOM元素设为可聚焦
 * @param {HTMLElement} element - DOM元素
 * @param {boolean} focusable - 是否可聚焦
 */
export const setFocusable = (element, focusable = true) => {
  if (!element) return;
  
  if (focusable) {
    if (!element.hasAttribute('tabindex')) {
      element.setAttribute('tabindex', '0');
    }
  } else {
    if (element.hasAttribute('tabindex')) {
      element.removeAttribute('tabindex');
    }
  }
};

/**
 * 获取事件相对于元素的坐标
 * @param {Event} event - 事件对象
 * @param {HTMLElement} element - 参考元素
 * @returns {Object} 包含x和y坐标的对象
 */
export const getRelativePosition = (event, element) => {
  const rect = element.getBoundingClientRect();
  const x = (event.clientX || (event.touches && event.touches[0] ? event.touches[0].clientX : 0)) - rect.left;
  const y = (event.clientY || (event.touches && event.touches[0] ? event.touches[0].clientY : 0)) - rect.top;
  return { x, y };
};

/**
 * 检测元素是否在视口中可见
 * @param {HTMLElement} element - 要检测的元素
 * @param {boolean} partially - 是否允许部分可见
 * @returns {boolean} 元素是否可见
 */
export const isElementVisible = (element, partially = true) => {
  if (!element) return false;
  
  const rect = element.getBoundingClientRect();
  const windowHeight = window.innerHeight || document.documentElement.clientHeight;
  const windowWidth = window.innerWidth || document.documentElement.clientWidth;
  
  const vertInView = partially 
    ? (rect.top <= windowHeight && rect.bottom >= 0)
    : (rect.top >= 0 && rect.bottom <= windowHeight);
    
  const horInView = partially 
    ? (rect.left <= windowWidth && rect.right >= 0)
    : (rect.left >= 0 && rect.right <= windowWidth);
  
  return vertInView && horInView;
};

/**
 * 测量文本在特定样式下的尺寸
 * @param {string} text - 要测量的文本
 * @param {Object} styles - CSS样式对象
 * @returns {Object} 包含宽度和高度的对象
 */
export const measureTextSize = (text, styles = {}) => {
  const span = document.createElement('span');
  span.style.visibility = 'hidden';
  span.style.position = 'absolute';
  span.style.whiteSpace = 'pre';
  
  // 应用样式
  Object.keys(styles).forEach(prop => {
    span.style[prop] = styles[prop];
  });
  
  span.textContent = text;
  document.body.appendChild(span);
  
  const rect = span.getBoundingClientRect();
  const result = { 
    width: rect.width, 
    height: rect.height 
  };
  
  document.body.removeChild(span);
  return result;
}; 