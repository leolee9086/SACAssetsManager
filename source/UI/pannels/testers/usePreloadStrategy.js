import { useThrottle } from './useEventModifiers.js';

/**
 * 提供预加载策略实现的组合式API
 * @param {Object} options - 配置选项
 * @param {String} options.strategy - 预加载策略类型 ('none', 'static', 'dynamic')
 * @param {Boolean} options.useIntersectionObserver - 是否使用交叉观察器
 * @param {Function} options.getItems - 获取所有项目的函数
 * @param {Function} options.getItemHeightByIndex - 获取指定索引项目高度的函数
 * @param {Function} options.onItemPreload - 项目预加载时的回调函数
 * @param {Number} options.preloadDistance - 预加载距离
 * @param {Number} options.throttleDelay - 节流延迟时间
 * @returns {Object} - 预加载策略控制对象
 */
export function usePreloadStrategy(options) {
  // 默认选项
  const defaultOptions = {
    strategy: 'dynamic',
    useIntersectionObserver: true,
    getItems: () => [],
    getItemHeightByIndex: () => 30,
    onItemPreload: () => {},
    preloadDistance: 1000,
    throttleDelay: 300
  };
  
  const opts = { ...defaultOptions, ...options };
  let preloadObserver = null;
  let isActive = false;
  
  /**
   * 预加载单个项目
   * @param {*} item - 要预加载的项目
   * @param {Number} index - 项目索引
   */
  function preloadItem(item, index) {
    try {
      if (typeof opts.onItemPreload === 'function') {
        opts.onItemPreload(item, index);
      }
    } catch (error) {
      console.error('预加载项目时出错:', error);
    }
  }
  
  /**
   * 初始化预加载策略
   * @param {HTMLElement} container - 滚动容器元素
   * @returns {Object|null} - 预加载控制器或null
   */
  function initialize(container) {
    if (!container || opts.strategy === 'none' || typeof window === 'undefined') {
      return null;
    }
    
    cleanup(); // 确保清理之前的资源
    isActive = true;
    
    // 使用IntersectionObserver优化预加载
    if (opts.strategy === 'dynamic' && opts.useIntersectionObserver && 'IntersectionObserver' in window) {
      preloadObserver = new IntersectionObserver((entries) => {
        if (!isActive) return;
        
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          
          const index = parseInt(entry.target.dataset.index, 10);
          if (!isNaN(index)) {
            const items = opts.getItems();
            // 预加载当前可见项之后的一批项目
            const preloadCount = Math.min(10, items.length - index - 1);
            for (let i = 1; i <= preloadCount; i++) {
              if (index + i < items.length) {
                preloadItem(items[index + i], index + i);
              }
            }
          }
        });
      }, {
        rootMargin: `0px 0px ${opts.preloadDistance}px 0px`,
        threshold: 0.1
      });
      
      return {
        observe: (element, index) => {
          if (element && preloadObserver) {
            element.dataset.index = index;
            preloadObserver.observe(element);
          }
        },
        unobserve: (element) => {
          if (element && preloadObserver) {
            preloadObserver.unobserve(element);
          }
        }
      };
    } else if (opts.strategy === 'static') {
      // 静态预加载策略 - 在滚动时预加载
      const handlePreload = useThrottle(() => {
        if (!container || !document.body.contains(container) || !isActive) return;
        
        const items = opts.getItems();
        const { scrollTop, clientHeight } = container;
        const preloadBottom = scrollTop + clientHeight + opts.preloadDistance;
        
        let preloadIndex = 0;
        let currentPosition = 0;
        
        // 找到需要预加载的索引
        while (preloadIndex < items.length && currentPosition < preloadBottom) {
          currentPosition += opts.getItemHeightByIndex(preloadIndex);
          preloadIndex++;
        }
        
        // 预加载下一批项目
        const batchSize = 5;
        for (let i = preloadIndex; i < Math.min(items.length, preloadIndex + batchSize); i++) {
          preloadItem(items[i], i);
        }
      }, { delay: opts.throttleDelay });
      
      container.addEventListener('scroll', handlePreload, { passive: true });
      
      return {
        handlePreload,
        // 提供无操作兼容接口
        observe: () => {},
        unobserve: () => {}
      };
    }
    
    return null;
  }
  
  /**
   * 清理预加载资源
   */
  function cleanup() {
    isActive = false;
    
    if (preloadObserver) {
      preloadObserver.disconnect();
      preloadObserver = null;
    }
  }
  
  /**
   * 更新预加载配置
   * @param {Object} newOptions - 新配置选项
   */
  function updateOptions(newOptions) {
    Object.assign(opts, newOptions);
  }
  
  return {
    initialize,
    cleanup,
    updateOptions,
    isEnabled: () => opts.strategy !== 'none' && isActive
  };
} 