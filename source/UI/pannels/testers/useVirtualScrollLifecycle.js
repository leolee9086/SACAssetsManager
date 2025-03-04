import { nextTick } from '../../../../static/vue.esm-browser.js';
import { useThrottle } from './useEventModifiers.js';
import { cancelIdleWork } from './useVirtualScrollHelpers.js';

/**
 * 提供虚拟滚动组件的生命周期管理
 * @param {Object} params - 生命周期管理所需参数
 * @returns {Object} - 生命周期管理方法
 */
export function useVirtualScrollLifecycle({
  containerRef,
  scrollState,
  scrollEventHandler,
  handleScrollEvent,
  setupResizeObserver,
  opts,
  scrollHandlerState,
  preloadStrategy,
  errorHandler,
  infiniteScrollHandler,
  recyclingManager,
  restoreScrollPosition,
  getItems
}) {
  // 保存对resizeObserver的引用
  let resizeObserver = null;
  let isInitialized = false;
  const virtualScrollLogger = errorHandler.createContextLogger('虚拟滚动生命周期');
  
  /**
   * 初始化虚拟滚动组件
   * @param {HTMLElement} container - 容器元素
   * @returns {Boolean} - 初始化是否成功
   */
  function initialize(container) {
    if (!container || isInitialized) return false;
    
    let retryCount = 0;
    const maxRetries = 3;
    
    const tryInitialize = () => {
      return virtualScrollLogger.safeExecute(() => {
        // 设置初始视图大小
        scrollState.updateViewportSize(container.clientHeight);
        
        // 添加滚动事件监听
        container.addEventListener('scroll', handleScrollEvent, { passive: true });
        
        // 设置大小观察器
        resizeObserver = setupResizeObserverInstance(container);
        
        // 初始化预加载策略
        const preloadObserver = preloadStrategy.initialize(container);
        // 保存预加载观察器的引用
        scrollState.setInternalState('preloadObserver', preloadObserver);
        
        // 如果启用了自动滚动，滚动到底部
        if (opts.autoScroll) {
          nextTick(() => scrollHandlerState.scrollToBottom());
        }
        
        // 恢复滚动位置（如果启用）
        if (opts.scrollRestoration) {
          restoreScrollPosition();
        }
        
        // 如果启用了DOM回收，预先分配更多元素
        if (opts.recycleDOM && recyclingManager) {
          recyclingManager.preallocate(Math.min(1000, getItems().length));
        }
        
        // 验证初始化后的状态
        if (!container.clientHeight && retryCount < maxRetries) {
          retryCount++;
          console.warn(`容器高度为0，尝试重新初始化 (${retryCount}/${maxRetries})`);
          return setTimeout(tryInitialize, 200); // 延迟重试
        }
        
        isInitialized = true;
        scrollState.setInternalState('isInitialized', true);
        return true;
      }, '初始化虚拟滚动时出错', (error) => {
        errorHandler.logError(error, '初始化虚拟滚动');
        return false;
      });
    };
    
    return tryInitialize();
  }
  
  /**
   * 设置大小观察器
   * @param {HTMLElement} container - 容器元素
   * @returns {ResizeObserver|null} - 创建的ResizeObserver实例
   */
  function setupResizeObserverInstance(container) {
    if (typeof window === 'undefined' || !container) return null;
    
    try {
      let observer = null;
      
      // 检测ResizeObserver兼容性
      if (typeof ResizeObserver === 'function') {
        observer = new ResizeObserver(
          useThrottle(entries => {
            try {
              if (!container || !document.body.contains(container)) return;
              
              for (const entry of entries) {
                if (entry.target === container) {
                  const { height } = entry.contentRect;
                  scrollState.updateViewportSize(height);
                }
              }
            } catch (error) {
              console.error('处理大小变化时出错:', error);
            }
          }, { delay: 50 })
        );
        
        observer.observe(container);
      } else {
        // 回退方案：使用窗口事件
        const handleResize = useThrottle(() => {
          if (!container || !document.body.contains(container)) return;
          
          const height = container.clientHeight;
          scrollState.updateViewportSize(height);
        }, { delay: 100 });
        
        window.addEventListener('resize', handleResize);
        
        // 存储事件引用以便清理
        container._resizeHandler = handleResize;
      }
      
      return observer;
    } catch (error) {
      console.error('设置大小观察器时出错:', error);
      errorHandler.logError(error, '设置大小观察器');
      return null;
    }
  }
  
  /**
   * 清理虚拟滚动组件资源
   */
  function cleanup() {
    virtualScrollLogger.safeExecute(() => {
      // 清理滚动事件处理器
      scrollEventHandler.cleanup();
      
      // 清理滚动事件监听
      if (containerRef.value) {
        containerRef.value.removeEventListener('scroll', handleScrollEvent);
        
        // 清理可能添加的窗口事件处理
        if (containerRef.value._resizeHandler) {
          window.removeEventListener('resize', containerRef.value._resizeHandler);
          containerRef.value._resizeHandler = null;
        }
      }
      
      // 清理大小观察器
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }
      
      // 清理预加载策略
      preloadStrategy.cleanup();
      scrollState.setInternalState('preloadObserver', null);
      
      // 清理所有定时器
      scrollState.clearTimers();
      
      // 清理所有空闲任务
      cancelIdleWork();
      
      // 清理滚动处理模块资源
      scrollHandlerState.cleanup();
      
      // 清理加载处理模块资源
      infiniteScrollHandler.cleanup();
      
      // 清理DOM回收模块资源
      if (recyclingManager) {
        recyclingManager.clearPool();
      }
      
      isInitialized = false;
      scrollState.setInternalState('isInitialized', false);
    }, '清理虚拟滚动组件时出错', (error) => {
      errorHandler.logError(error, '清理虚拟滚动');
    });
  }
  
  /**
   * 完全重置虚拟滚动状态
   * @param {Function} positionCalculator - 位置计算器
   * @param {Function} performanceMonitor - 性能监控
   */
  function reset(positionCalculator, performanceMonitor) {
    virtualScrollLogger.safeExecute(() => {
      // 清理缓存和状态
      positionCalculator.clearCache();
      errorHandler.resetErrorState();
      
      // 使用状态管理重置
      scrollState.resetState();
      
      // 重置性能监控
      performanceMonitor.getRawData().renderTime = [];
      performanceMonitor.getRawData().scrollEvents = 0;
      performanceMonitor.getRawData().lastRenderTimestamp = 0;
      
      nextTick(() => {
        if (opts.autoScroll && containerRef.value) {
          scrollHandlerState.scrollToBottom();
        }
      });
    }, '重置虚拟滚动状态时出错', (error) => {
      errorHandler.logError(error, '重置虚拟滚动');
    });
  }
  
  return {
    initialize,
    cleanup,
    reset,
    isInitialized: () => isInitialized
  };
} 