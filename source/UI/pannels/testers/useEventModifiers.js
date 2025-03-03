/**
 * 通用事件修饰器工具库
 * 提供防抖(debounce)和节流(throttle)函数的实现
 * 
 * @author AI架构专家
 * @version 1.0.0
 */

/**
 * 创建一个防抖函数
 * 
 * @param {Function} fn - 需要防抖的函数
 * @param {Object} options - 配置选项
 * @param {number} [options.delay=300] - 延迟时间(毫秒)
 * @param {boolean} [options.immediate=false] - 是否在延迟开始前调用函数
 * @param {boolean} [options.trailing=true] - 是否在延迟结束后调用函数
 * @param {Function} [options.onCancel] - 取消时的回调函数
 * @returns {Function} 防抖处理后的函数
 */
export function useDebounce(fn, options = {}) {
  const {
    delay = 300,
    immediate = false,
    trailing = true,
    onCancel = null
  } = options;
  
  let timer = null;
  let lastArgs = null;
  let lastThis = null;
  let wasInvoked = false;
  
  // 返回的防抖函数
  const debouncedFn = function(...args) {
    lastArgs = args;
    lastThis = this;
    wasInvoked = true;
    
    // 如果设置了立即执行且没有定时器在运行，则立即调用
    const callNow = immediate && !timer;
    
    // 清除现有定时器
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    
    if (callNow) {
      wasInvoked = false;
      return fn.apply(this, args);
    }
    
    // 设置新的定时器
    timer = setTimeout(() => {
      if (trailing && lastArgs && wasInvoked) {
        fn.apply(lastThis, lastArgs);
      }
      
      // 重置状态
      timer = null;
      lastArgs = null;
      lastThis = null;
      wasInvoked = false;
    }, delay);
  };
  
  // 添加取消方法
  debouncedFn.cancel = function() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
      
      if (onCancel && typeof onCancel === 'function') {
        onCancel();
      }
    }
    lastArgs = null;
    lastThis = null;
    wasInvoked = false;
  };
  
  // 添加立即执行方法
  debouncedFn.flush = function() {
    if (timer && lastArgs) {
      clearTimeout(timer);
      timer = null;
      fn.apply(lastThis, lastArgs);
      lastArgs = null;
      lastThis = null;
      wasInvoked = false;
    }
  };
  
  return debouncedFn;
}

/**
 * 创建一个节流函数
 * 
 * @param {Function} fn - 需要节流的函数
 * @param {Object} options - 配置选项
 * @param {number} [options.delay=16] - 节流间隔(毫秒)
 * @param {boolean} [options.leading=true] - 是否在间隔开始前调用函数
 * @param {boolean} [options.trailing=true] - 是否在间隔结束后调用函数
 * @param {Function} [options.onCancel] - 取消时的回调函数
 * @returns {Function} 节流处理后的函数
 */
export function useThrottle(fn, options = {}) {
  const {
    delay = 16,
    leading = true,
    trailing = true,
    onCancel = null
  } = options;
  
  let lastCallTime = 0;
  let timeout = null;
  let lastArgs = null;
  let lastThis = null;
  let isThrottled = false;
  
  // 返回的节流函数
  const throttledFn = function(...args) {
    const now = Date.now();
    lastArgs = args;
    lastThis = this;
    
    // 计算距离下次执行的时间
    const remaining = delay - (now - lastCallTime);
    
    // 如果是第一次调用或已经超过延迟时间
    if (!isThrottled && leading && (remaining <= 0 || remaining > delay)) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      
      lastCallTime = now;
      isThrottled = true;
      const result = fn.apply(this, args);
      
      // 重置状态
      setTimeout(() => {
        isThrottled = false;
      }, 0);
      
      return result;
    }
    
    // 确保最后一次调用也能执行(trailing)
    if (!timeout && trailing && remaining > 0) {
      timeout = setTimeout(() => {
        lastCallTime = leading ? Date.now() : 0;
        timeout = null;
        fn.apply(lastThis, lastArgs);
        
        // 重置状态
        lastArgs = null;
        lastThis = null;
      }, remaining);
    }
  };
  
  // 添加取消方法
  throttledFn.cancel = function() {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
      
      if (onCancel && typeof onCancel === 'function') {
        onCancel();
      }
    }
    lastCallTime = 0;
    lastArgs = null;
    lastThis = null;
    isThrottled = false;
  };
  
  // 添加立即执行方法
  throttledFn.flush = function() {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
      fn.apply(lastThis, lastArgs);
      
      // 重置状态
      lastCallTime = leading ? Date.now() : 0;
      lastArgs = null;
      lastThis = null;
    }
  };
  
  return throttledFn;
}

/**
 * 组合使用防抖和节流
 * 
 * @param {Function} fn - 要处理的函数
 * @param {Object} options - 配置选项
 * @param {Object} [options.debounce] - 防抖配置
 * @param {Object} [options.throttle] - 节流配置
 * @returns {Function} 处理后的函数
 */
export function forEventOptimization(fn, options = {}) {
  const { debounce: debounceOptions, throttle: throttleOptions } = options;
  
  if (debounceOptions && throttleOptions) {
    // 先节流再防抖
    return useDebounce(
      useThrottle(fn, throttleOptions),
      debounceOptions
    );
  } else if (debounceOptions) {
    return useDebounce(fn, debounceOptions);
  } else if (throttleOptions) {
    return useThrottle(fn, throttleOptions);
  }
  
  return fn;
}

/**
 * 创建一个只执行一次的函数
 * 
 * @param {Function} fn - 要处理的函数 
 * @returns {Function} 只执行一次的函数
 */
export function toRunOnce(fn) {
  let called = false;
  let result;
  
  return function(...args) {
    if (!called) {
      called = true;
      result = fn.apply(this, args);
    }
    
    return result;
  };
}

/**
 * 创建一个在特定条件下才执行的函数
 * 
 * @param {Function} fn - 要处理的函数
 * @param {Function} predicate - 判断条件函数
 * @returns {Function} 条件执行的函数
 */
export function whenConditionMet(fn, predicate) {
  return function(...args) {
    if (predicate.apply(this, args)) {
      return fn.apply(this, args);
    }
  };
} 