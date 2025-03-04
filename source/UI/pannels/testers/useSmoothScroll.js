/**
 * 提供平滑滚动功能的组合式API
 * @module useSmoothScroll
 */

/**
 * 默认缓动函数 - 三次缓入缓出
 * @param {Number} progress - 介于0和1之间的进度值
 * @returns {Number} - 缓动后的值
 */
export function easeInOutCubic(progress) {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

/**
 * 可配置的缓动函数集合
 */
export const easingFunctions = {
  // 线性
  linear: (progress) => progress,
  // 二次方
  easeInQuad: (progress) => progress * progress,
  easeOutQuad: (progress) => 1 - (1 - progress) * (1 - progress),
  easeInOutQuad: (progress) => 
    progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2,
  // 三次方
  easeInCubic: (progress) => progress * progress * progress,
  easeOutCubic: (progress) => 1 - Math.pow(1 - progress, 3),
  easeInOutCubic,
  // 四次方
  easeInQuart: (progress) => progress * progress * progress * progress,
  easeOutQuart: (progress) => 1 - Math.pow(1 - progress, 4),
  easeInOutQuart: (progress) =>
    progress < 0.5
      ? 8 * progress * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 4) / 2,
  // 弹性
  easeOutElastic: (progress) => {
    const c4 = (2 * Math.PI) / 3;
    return progress === 0
      ? 0
      : progress === 1
      ? 1
      : Math.pow(2, -10 * progress) * Math.sin((progress * 10 - 0.75) * c4) + 1;
  }
};

/**
 * 创建一个平滑滚动控制器
 * @param {Object} options - 平滑滚动选项
 * @param {Boolean} options.enabled - 是否启用平滑滚动
 * @param {Number} options.defaultDuration - 默认动画持续时间(ms)
 * @param {String} options.defaultEasing - 默认缓动函数名称
 * @param {Function} options.onScrollStart - 滚动开始回调
 * @param {Function} options.onScrollEnd - 滚动结束回调
 * @param {Boolean} options.safeMode - 安全模式，出错时回退到直接滚动
 * @returns {Object} - 平滑滚动控制器
 */
export function useSmoothScroll(options = {}) {
  // 默认选项
  const defaultOptions = {
    enabled: true,
    defaultDuration: 300,
    defaultEasing: 'easeInOutCubic',
    onScrollStart: null,
    onScrollEnd: null,
    safeMode: true
  };
  
  // 合并选项
  const opts = { ...defaultOptions, ...options };
  
  // 当前运行的动画
  let currentAnimation = null;
  
  /**
   * 取消当前运行的动画
   */
  function cancelCurrentAnimation() {
    if (currentAnimation) {
      cancelAnimationFrame(currentAnimation.id);
      currentAnimation = null;
    }
  }
  
  /**
   * 平滑滚动到指定位置
   * @param {HTMLElement} element - 要滚动的元素
   * @param {Number} position - 目标位置
   * @param {Object} config - 滚动配置
   * @param {Number} config.duration - 动画持续时间(ms)
   * @param {String|Function} config.easing - 缓动函数或其名称
   * @param {Function} config.onComplete - 完成回调
   * @param {Boolean} config.cancelOnScroll - 用户滚动时是否取消动画
   * @returns {Promise} - 完成时解析的Promise
   */
  function smoothScrollTo(element, position, config = {}) {
    if (!opts.enabled || !element) {
      // 如果禁用了平滑滚动，直接滚动到位置
      if (element) {
        element.scrollTop = position;
      }
      return Promise.resolve(false);
    }
    
    // 合并配置
    const scrollConfig = {
      duration: config.duration || opts.defaultDuration,
      easing: config.easing || opts.defaultEasing,
      onComplete: config.onComplete || null,
      cancelOnScroll: config.cancelOnScroll !== undefined ? config.cancelOnScroll : true
    };
    
    return new Promise((resolve) => {
      try {
        // 取消当前动画
        cancelCurrentAnimation();
        
        const startPosition = element.scrollTop;
        const change = position - startPosition;
        
        // 如果没有变化，直接完成
        if (Math.abs(change) < 1) {
          if (scrollConfig.onComplete) {
            scrollConfig.onComplete(true);
          }
          resolve(true);
          return;
        }
        
        // 获取缓动函数
        let easingFn = typeof scrollConfig.easing === 'function' 
          ? scrollConfig.easing 
          : easingFunctions[scrollConfig.easing] || easingFunctions.easeInOutCubic;
        
        let startTime = null;
        let lastTimestamp = 0;
        
        // 添加滚动事件监听器，在用户滚动时取消动画
        const scrollHandler = () => {
          if (scrollConfig.cancelOnScroll && currentAnimation) {
            cancelCurrentAnimation();
            element.removeEventListener('scroll', scrollHandler);
            
            if (scrollConfig.onComplete) {
              scrollConfig.onComplete(false);
            }
            resolve(false);
          }
        };
        
        if (scrollConfig.cancelOnScroll) {
          element.addEventListener('scroll', scrollHandler, { passive: true });
        }
        
        // 调用滚动开始回调
        if (opts.onScrollStart) {
          opts.onScrollStart({
            element,
            startPosition,
            targetPosition: position,
            change
          });
        }
        
        // 创建动画函数
        const animateScroll = (currentTime) => {
          // 性能优化：跳过频率过高的帧
          if (currentTime - lastTimestamp < 10) {
            currentAnimation.id = requestAnimationFrame(animateScroll);
            return;
          }
          
          lastTimestamp = currentTime;
          
          if (startTime === null) {
            startTime = currentTime;
          }
          
          const timeElapsed = currentTime - startTime;
          const progress = Math.min(timeElapsed / scrollConfig.duration, 1);
          const easedProgress = easingFn(progress);
          
          // 设置新位置
          element.scrollTop = startPosition + change * easedProgress;
          
          // 检查是否完成
          if (timeElapsed < scrollConfig.duration) {
            currentAnimation.id = requestAnimationFrame(animateScroll);
          } else {
            // 确保到达最终位置
            element.scrollTop = position;
            
            // 清理
            if (scrollConfig.cancelOnScroll) {
              element.removeEventListener('scroll', scrollHandler);
            }
            
            currentAnimation = null;
            
            // 调用完成回调
            if (scrollConfig.onComplete) {
              scrollConfig.onComplete(true);
            }
            
            // 调用滚动结束回调
            if (opts.onScrollEnd) {
              opts.onScrollEnd({
                element,
                startPosition,
                finalPosition: element.scrollTop,
                completed: true
              });
            }
            
            resolve(true);
          }
        };
        
        // 开始动画
        currentAnimation = { id: null };
        currentAnimation.id = requestAnimationFrame(animateScroll);
      } catch (error) {
        console.error('平滑滚动失败:', error);
        
        // 安全模式：出错时回退到直接滚动
        if (opts.safeMode && element) {
          element.scrollTop = position;
        }
        
        // 清理
        if (currentAnimation) {
          cancelCurrentAnimation();
        }
        
        if (scrollConfig.cancelOnScroll && element) {
          element.removeEventListener('scroll', scrollHandler);
        }
        
        if (scrollConfig.onComplete) {
          scrollConfig.onComplete(false);
        }
        
        if (opts.onScrollEnd) {
          opts.onScrollEnd({
            element,
            error,
            completed: false
          });
        }
        
        resolve(false);
      }
    });
  }
  
  /**
   * 平滑滚动到元素
   * @param {HTMLElement} container - 容器元素
   * @param {HTMLElement} targetElement - 目标元素
   * @param {String} alignment - 对齐方式：'start'|'center'|'end'|'nearest'
   * @param {Object} config - 滚动配置
   * @returns {Promise} - 完成时解析的Promise
   */
  function smoothScrollToElement(container, targetElement, alignment = 'start', config = {}) {
    if (!container || !targetElement) {
      return Promise.resolve(false);
    }
    
    try {
      const containerRect = container.getBoundingClientRect();
      const targetRect = targetElement.getBoundingClientRect();
      
      let scrollPosition;
      const containerScrollTop = container.scrollTop;
      
      // 计算目标位置
      switch (alignment) {
        case 'center':
          scrollPosition = containerScrollTop + 
            (targetRect.top - containerRect.top) - 
            (containerRect.height - targetRect.height) / 2;
          break;
        case 'end':
          scrollPosition = containerScrollTop + 
            (targetRect.bottom - containerRect.bottom);
          break;
        case 'nearest': {
          const isInView = (
            targetRect.bottom > containerRect.top &&
            targetRect.top < containerRect.bottom
          );
          
          if (isInView) {
            // 已经在视图中，不需要滚动
            return Promise.resolve(true);
          }
          
          const topDistance = targetRect.top - containerRect.top;
          const bottomDistance = containerRect.bottom - targetRect.bottom;
          
          scrollPosition = containerScrollTop + 
            (topDistance < bottomDistance ? topDistance : -bottomDistance);
          break;
        }
        case 'start':
        default:
          scrollPosition = containerScrollTop + 
            (targetRect.top - containerRect.top);
      }
      
      return smoothScrollTo(container, scrollPosition, config);
    } catch (error) {
      console.error('滚动到元素失败:', error);
      return Promise.resolve(false);
    }
  }
  
  return {
    smoothScrollTo,
    smoothScrollToElement,
    cancelAnimation: cancelCurrentAnimation,
    setEnabled: (enabled) => {
      opts.enabled = !!enabled;
    },
    isEnabled: () => opts.enabled,
    setDefaultDuration: (duration) => {
      if (typeof duration === 'number' && duration > 0) {
        opts.defaultDuration = duration;
      }
    },
    setDefaultEasing: (easing) => {
      if (typeof easing === 'string' && easingFunctions[easing]) {
        opts.defaultEasing = easing;
      } else if (typeof easing === 'function') {
        opts.defaultEasing = easing;
      }
    },
    /**
     * 滚动到容器底部
     * @param {HTMLElement} container - 容器元素
     * @param {Object} config - 滚动配置
     * @returns {Promise} - 完成时解析的Promise
     */
    smoothScrollToBottom: (container, config = {}) => {
      if (!container) return Promise.resolve(false);
      
      const position = container.scrollHeight - container.clientHeight;
      return smoothScrollTo(container, position, config);
    },
    /**
     * 滚动到容器顶部
     * @param {HTMLElement} container - 容器元素
     * @param {Object} config - 滚动配置
     * @returns {Promise} - 完成时解析的Promise
     */
    smoothScrollToTop: (container, config = {}) => {
      if (!container) return Promise.resolve(false);
      
      return smoothScrollTo(container, 0, config);
    },
    /**
     * 相对当前位置滚动
     * @param {HTMLElement} container - 容器元素
     * @param {Number} deltaY - 垂直方向的滚动量
     * @param {Object} config - 滚动配置
     * @returns {Promise} - 完成时解析的Promise
     */
    smoothScrollBy: (container, deltaY, config = {}) => {
      if (!container) return Promise.resolve(false);
      
      const newPosition = container.scrollTop + deltaY;
      return smoothScrollTo(container, newPosition, config);
    }
  };
} 