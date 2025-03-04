import { useThrottle } from './useEventModifiers.js';
import { scheduleIdleWork } from './useVirtualScrollHelpers.js';

/**
 * 滚动事件处理模块 - 从主虚拟滚动组件中分离出来
 * 
 * @param {Object} params - 配置参数
 * @param {Object} params.scrollState - 滚动状态对象
 * @param {Object} params.opts - 选项配置
 * @param {Object} params.containerRef - 容器引用
 * @param {Object} params.loadingHandler - 加载处理器
 * @param {Object} params.scrollHandlerState - 滚动处理状态
 * @param {Object} params.performanceMonitor - 性能监控器
 * @param {Function} params.getItems - 获取项目数组的函数
 * @param {Function} params.manageCache - 管理缓存的函数
 * @param {Function} params.adaptPerformanceSettings - 性能设置适配函数
 * @param {Function} params.nextTick - 下一帧执行函数
 * @param {Object} params.errorHandler - 错误处理器
 * @returns {Object} - 滚动事件处理相关函数
 */
export function createScrollEventHandler(params) {
  const {
    scrollState,
    opts,
    containerRef,
    loadingHandler,
    scrollHandlerState,
    performanceMonitor,
    getItems,
    manageCache,
    adaptPerformanceSettings,
    nextTick,
    errorHandler
  } = params;
  
  // 创建虚拟滚动上下文的错误处理器
  const virtualScrollLogger = errorHandler.createContextLogger('滚动事件处理');
  
  /**
   * 滚动性能跟踪函数
   */
  function trackScrollPerformance() {
    try {
      performanceMonitor.trackEvent('scroll');
      const now = performance.now();
      
      // 计算滚动速度
      if (performanceMonitor.getRawData().lastEventTimestamp > 0) {
        const timeDelta = now - performanceMonitor.getRawData().lastEventTimestamp;
        if (timeDelta > 0 && containerRef.value) {
          const posDelta = Math.abs(containerRef.value.scrollTop - scrollState.getLastScrollPosition());
          const velocity = posDelta / timeDelta; // px/ms
          
          // 根据滚动速度动态调整
          const rawData = performanceMonitor.getRawData();
          const avgVelocity = rawData.eventVelocity.length ? 
            rawData.eventVelocity.reduce((sum, item) => sum + item.velocity, 0) / rawData.eventVelocity.length : 0;
          
          // 高速滚动时自动调整以提高性能
          if (avgVelocity > 0.7 && opts.adaptiveUpdate) { // 快速滚动
            if (!rawData.fastScrollMode) {
              rawData.fastScrollMode = true;
              rawData.previousOverscan = opts.overscan;
              rawData.previousBuffer = opts.buffer;
              
              // 高速滚动时减少渲染项目
              opts.overscan = Math.max(1, Math.floor(opts.overscan * 0.5));
              opts.buffer = Math.max(3, Math.floor(opts.buffer * 0.7));
            }
          } else if (rawData.fastScrollMode && avgVelocity < 0.3) {
            // 恢复正常滚动模式
            rawData.fastScrollMode = false;
            if (typeof rawData.previousOverscan === 'number') {
              opts.overscan = rawData.previousOverscan;
            }
            if (typeof rawData.previousBuffer === 'number') {
              opts.buffer = rawData.previousBuffer;
            }
          }
        }
      }
    } catch (error) {
      console.error('跟踪滚动性能时出错:', error);
    }
  }
  
  /**
   * 调度空闲任务函数
   */
  function scheduleIdleTask(callback) {
    return scheduleIdleWork(callback, { timeout: 1000 });
  }
  
  /**
   * 处理滚动事件的核心函数
   * 使用节流控制调用频率
   */
  const handleScrollEvent = useThrottle(function() {
    virtualScrollLogger.safeExecute(() => {
      if (!containerRef.value || !document.body.contains(containerRef.value)) return;
      
      performanceMonitor.trackEvent('scroll');
      const wasAtBottom = scrollState.isScrolledToBottom.value;
      
      scrollState.setLastScrollPosition(containerRef.value.scrollTop);
      
      // 跟踪滚动性能
      trackScrollPerformance();
      
      // 检查是否滚动到底部
      const isBottom = scrollHandlerState.checkScrolledToBottom();
      
      // 检查是否滚动到顶部
      const isTop = loadingHandler.checkScrolledToTop();
      
      // 处理向下加载
      if (isBottom && !loadingHandler.isLoadingMoreItems.value && 
          !loadingHandler.loadMoreCooldown.value && 
          !loadingHandler.contentHeightStabilizing.value) {
        const canLoadMore = getItems().length > 0;
        if (canLoadMore) {
          loadingHandler.loadMoreItems();
        }
      }
      
      // 处理向上加载
      if (isTop && !loadingHandler.isLoadingMoreItems.value && 
          !loadingHandler.loadMoreCooldown.value && 
          !loadingHandler.contentHeightStabilizing.value) {
        loadingHandler.loadMoreItemsAtTop();
      }
      
      // 设置滚动状态
      scrollState.setScrolling(true, 200);
      
      // 清除之前的定时器
      if (scrollState.scrollTimeout) {
        scrollState.clearTimers();
      }
      
      // 定时器延迟，避免频繁触发
      scrollState.scrollTimeout = setTimeout(() => {
        scrollState.setScrolling(false, 200);
        
        // 添加一个防止循环调用的标记
        let isAutoScrolling = false;
        
        // 如果之前位于底部且启用了自动滚动，且内容高度已稳定，则滚动到底部
        if (opts.autoScroll && wasAtBottom && 
            !loadingHandler.isLoadingMoreItems.value && 
            !loadingHandler.contentHeightStabilizing.value && 
            !isAutoScrolling) {
          // 设置标记防止循环
          isAutoScrolling = true;
          
          // 延迟以确保DOM已更新
          setTimeout(() => {
            // 使用一次性标记，避免重复滚动
            if (isAutoScrolling) {
              scrollHandlerState.scrollToBottom(true);
              // 重置标记
              setTimeout(() => {
                isAutoScrolling = false;
              }, 250);
            }
          }, 50);
        }
        
        scheduleIdleTask(() => {
          manageCache();
          if (opts.adaptiveUpdate) {
            adaptPerformanceSettings();
          }
        });
        
        scrollState.scrollTimeout = null;
      }, 200); // 200ms，平衡响应性和性能
    });
  }, { delay: Math.max(32, opts.throttleMs) });
  
  /**
   * 清理函数 - 释放所有资源
   */
  function cleanup() {
    // 清理所有可能的资源和事件监听器
    if (containerRef.value) {
      containerRef.value.removeEventListener('scroll', handleScrollEvent);
    }
    
    // 清除所有定时器
    if (scrollState.scrollTimeout) {
      clearTimeout(scrollState.scrollTimeout);
      scrollState.scrollTimeout = null;
    }
  }

  // 返回处理器接口
  return {
    handleScrollEvent,
    trackScrollPerformance,
    cleanup
  };
} 