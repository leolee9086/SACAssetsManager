import { ref, nextTick } from '../../../../static/vue.esm-browser.js';
import { useThrottle, useDebounce } from './useEventModifiers.js';
import { scheduleIdleWork, cancelIdleWork, safeExecute } from './useVirtualScrollHelpers.js';

/**
 * 提供滚动处理逻辑的组合式API
 * @param {Object} options - 配置选项
 * @param {Function} options.getItems - 获取所有项目的函数
 * @param {Object} options.positionCalculator - 位置计算器
 * @param {Object} options.performanceMonitor - 性能监控工具
 * @param {Object} options.containerRef - 容器引用
 * @param {Object} options.configs - 配置参数
 * @param {Object} options.state - 状态对象
 * @returns {Object} - 滚动处理方法和状态
 */
export function useScrollHandling(options) {
  const {
    getItems,
    positionCalculator,
    performanceMonitor,
    containerRef,
    configs,
    state
  } = options;
  
  // 局部状态
  const isScrolling = ref(false);
  const isScrolledToBottom = ref(true);
  let scrollTimeout = null;
  let scrollBottomDebounceTimer = null;
  let scrollStateUpdatePending = false;
  
  // 加载状态相关变量
  let isLoadingMoreItems = false;
  let loadMoreCooldown = false;
  let loadMoreTimeout = null;
  let contentHeightStabilizing = false;
  let lastContainerHeight = 0;
  let heightStabilizationTimeout = null;
  let lastScrollPosition = 0;
  
  // 检测是否滚动到底部
  function checkScrolledToBottom() {
    if (!containerRef.value || !document.body.contains(containerRef.value)) return false;
    
    try {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.value;
      
      // 记录容器高度，用于检测内容变化
      const heightChanged = lastContainerHeight !== scrollHeight;
      lastContainerHeight = scrollHeight;
      
      // 当内容高度正在变化时，避免触发新的加载
      if (contentHeightStabilizing || isLoadingMoreItems) {
        return isScrolledToBottom.value;
      }
      
      // 使用更合理的阈值，防止过度触发
      const threshold = Math.max(20, Math.min(50, clientHeight * 0.1));
      const atBottom = scrollTop + clientHeight >= scrollHeight - threshold;
      
      // 只有当状态真正改变时才更新
      if (isScrolledToBottom.value !== atBottom) {
        isScrolledToBottom.value = atBottom;
      }
      
      return atBottom;
    } catch (error) {
      console.error('检测滚动位置时出错:', error);
      return false;
    }
  }
  
  // 检测是否滚动到顶部
  function checkScrolledToTop() {
    if (!containerRef.value || !document.body.contains(containerRef.value)) return false;
    
    try {
      const { scrollTop } = containerRef.value;
      
      // 使用合理阈值判断是否到达顶部
      const threshold = 20;
      const atTop = scrollTop <= threshold;
      
      return atTop;
    } catch (error) {
      console.error('检测顶部滚动位置时出错:', error);
      return false;
    }
  }
  
  // 加载更多项目 - 向下
  function loadMoreItems() {
    // 如果已经在加载或在冷却期，不进行重复加载
    if (isLoadingMoreItems || loadMoreCooldown || contentHeightStabilizing) return false;
    
    const items = getItems();
    if (state.visibleItems.value.length >= items.length) return false;
    
    try {
      isLoadingMoreItems = true;
      // 设置高度稳定标志，防止循环触发
      contentHeightStabilizing = true;
      
      // 扩展可见项目数量
      const currentCount = state.visibleItemCount.value;
      const increment = Math.min(configs.buffer * 2, items.length - state.visibleItemCount.value);
      
      if (increment <= 0) {
        isLoadingMoreItems = false;
        contentHeightStabilizing = false;
        return false;
      }
      
      // 添加延迟模拟异步加载，避免界面冻结
      setTimeout(() => {
        state.visibleItemCount.value = Math.min(items.length, currentCount + increment);
        
        // 完成加载后设置冷却期，防止频繁加载
        isLoadingMoreItems = false;
        loadMoreCooldown = true;
        
        // 延迟重置高度稳定标志，给DOM足够时间更新
        if (heightStabilizationTimeout) clearTimeout(heightStabilizationTimeout);
        heightStabilizationTimeout = setTimeout(() => {
          contentHeightStabilizing = false;
          heightStabilizationTimeout = null;
          // 重新检查滚动位置，但不立即触发新加载
          checkScrolledToBottom();
        }, 300); // 等待DOM高度稳定
        
        // 重置加载冷却期
        if (loadMoreTimeout) clearTimeout(loadMoreTimeout);
        loadMoreTimeout = setTimeout(() => {
          loadMoreCooldown = false;
          loadMoreTimeout = null;
        }, 500); // 500ms冷却期
        
        return true;
      }, 100);
      
      return true;
    } catch (error) {
      console.error('加载更多项目时出错:', error);
      isLoadingMoreItems = false;
      contentHeightStabilizing = false;
      return false;
    }
  }
  
  // 向上加载更多函数
  function loadMoreItemsAtTop() {
    // 如果已经在加载或在冷却期，不进行重复加载
    if (isLoadingMoreItems || loadMoreCooldown || contentHeightStabilizing) return false;
    
    const items = getItems();
    const firstVisibleIndex = state.visibleItems.value.length > 0 ? 
      items.indexOf(state.visibleItems.value[0]) : 0;
    
    // 如果已经显示了所有顶部项目
    if (firstVisibleIndex <= 0) return false;
    
    try {
      isLoadingMoreItems = true;
      contentHeightStabilizing = true;
      
      // 记录当前滚动位置和内容高度
      const currentScrollTop = containerRef.value.scrollTop;
      const currentHeight = containerRef.value.scrollHeight;
      
      // 计算要加载的项目数量
      const increment = Math.min(configs.buffer * 2, firstVisibleIndex);
      
      if (increment <= 0) {
        isLoadingMoreItems = false;
        contentHeightStabilizing = false;
        return false;
      }
      
      // 模拟异步加载，避免界面冻结
      setTimeout(() => {
        // 为了保持用户当前视图位置，需要在DOM更新后调整滚动位置
        nextTick(() => {
          if (containerRef.value && document.body.contains(containerRef.value)) {
            // 计算新增内容的高度
            const newHeight = containerRef.value.scrollHeight;
            const heightDiff = newHeight - currentHeight;
            
            // 调整滚动位置，保持用户视图
            containerRef.value.scrollTop = currentScrollTop + heightDiff;
          }
          
          // 重置加载状态
          isLoadingMoreItems = false;
          
          // 设置冷却期，防止频繁加载
          loadMoreCooldown = true;
          
          // 延迟重置高度稳定标志
          if (heightStabilizationTimeout) clearTimeout(heightStabilizationTimeout);
          heightStabilizationTimeout = setTimeout(() => {
            contentHeightStabilizing = false;
          }, 300);
          
          // 重置加载冷却期
          if (loadMoreTimeout) clearTimeout(loadMoreTimeout);
          loadMoreTimeout = setTimeout(() => {
            loadMoreCooldown = false;
          }, 500);
        });
        
        return true;
      }, 100);
      
      return true;
    } catch (error) {
      console.error('向上加载更多项目时出错:', error);
      isLoadingMoreItems = false;
      contentHeightStabilizing = false;
      return false;
    }
  }
  
  // 跟踪滚动性能
  function trackScrollPerformance() {
    try {
      performanceMonitor.trackEvent('scroll');
      
      const now = performance.now();
      
      // 计算滚动速度
      if (performanceMonitor.getRawData().lastEventTimestamp > 0) {
        const timeDelta = now - performanceMonitor.getRawData().lastEventTimestamp;
        if (timeDelta > 0 && containerRef.value) {
          const posDelta = Math.abs(containerRef.value.scrollTop - lastScrollPosition);
          const velocity = posDelta / timeDelta; // px/ms
          
          // 根据滚动速度动态调整
          const rawData = performanceMonitor.getRawData();
          const avgVelocity = rawData.eventVelocity.length ? 
            rawData.eventVelocity.reduce((sum, item) => sum + item.velocity, 0) / rawData.eventVelocity.length : 0;
          
          // 高速滚动时自动调整以提高性能
          if (avgVelocity > 0.7 && configs.adaptiveUpdate) { // 快速滚动
            if (!rawData.fastScrollMode) {
              rawData.fastScrollMode = true;
              rawData.previousOverscan = configs.overscan;
              rawData.previousBuffer = configs.buffer;
              
              // 高速滚动时减少渲染项目
              configs.overscan = Math.max(1, Math.floor(configs.overscan * 0.5));
              configs.buffer = Math.max(3, Math.floor(configs.buffer * 0.7));
            }
          } else if (rawData.fastScrollMode && avgVelocity < 0.3) {
            // 恢复正常滚动模式
            rawData.fastScrollMode = false;
            if (typeof rawData.previousOverscan === 'number') {
              configs.overscan = rawData.previousOverscan;
            }
            if (typeof rawData.previousBuffer === 'number') {
              configs.buffer = rawData.previousBuffer;
            }
          }
        }
      }
    } catch (error) {
      console.error('跟踪滚动性能时出错:', error);
    }
  }
  
  // 优化的滚动到底部函数
  const debouncedScrollToBottom = useDebounce(
    function(immediate = false) {
      if (!containerRef.value || !document.body.contains(containerRef.value)) return;
      
      try {
        // 防止在高度不稳定时重复滚动
        if (contentHeightStabilizing && !immediate) return;
        
        // 增加强制模式，绕过滚动状态检查
        if ((configs.autoScroll && !isScrolling.value) || immediate) {
          // 使用双重nextTick确保DOM完全更新
          nextTick(() => {
            nextTick(() => {
              if (containerRef.value && document.body.contains(containerRef.value)) {
                const scrollHeight = containerRef.value.scrollHeight;
                if (scrollHeight > 0) {
                  // 更新高度记录
                  lastContainerHeight = scrollHeight;
                  
                  // 增加10px额外滚动，确保到达底部
                  containerRef.value.scrollTop = scrollHeight + 10;
                  
                  // 标记为已滚动到底部
                  isScrolledToBottom.value = true;
                  
                  // 防止滚动事件被误触发
                  if (scrollBottomDebounceTimer) {
                    clearTimeout(scrollBottomDebounceTimer);
                    scrollBottomDebounceTimer = null;
                  }
                }
              }
            });
          });
        }
      } catch (error) {
        console.error('滚动到底部时出错:', error);
      }
    },
    { delay: 50, immediate: true }
  );
  
  // 滚动到特定项目
  function scrollToItem(index, behavior = 'smooth', align = 'start') {
    if (!containerRef.value || !document.body.contains(containerRef.value)) return;
    
    try {
      const items = getItems();
      if (index < 0 || index >= items.length) return;
      
      // 使用位置计算模块
      let scrollPosition = positionCalculator.getItemPosition(index);
      
      // 处理不同的对齐方式
      if (align === 'center') {
        const itemHeight = positionCalculator.getItemHeightByIndex(index);
        scrollPosition = scrollPosition - (containerRef.value.clientHeight / 2) + (itemHeight / 2);
      } else if (align === 'end') {
        const itemHeight = positionCalculator.getItemHeightByIndex(index);
        scrollPosition = scrollPosition - containerRef.value.clientHeight + itemHeight;
      }
      
      // 安全滚动
      nextTick(() => {
        if (containerRef.value && document.body.contains(containerRef.value)) {
          containerRef.value.scrollTo({
            top: Math.max(0, Math.floor(scrollPosition)),
            behavior: ['auto', 'smooth', 'instant'].includes(behavior) ? behavior : 'smooth'
          });
        }
      });
    } catch (error) {
      console.error('滚动到指定项目时出错:', error);
    }
  }
  
  // 主滚动处理函数
  const handleScroll = useThrottle(function() {
    try {
      if (!containerRef.value || !document.body.contains(containerRef.value)) return;
      
      performanceMonitor.getRawData().scrollEvents++;
      const wasAtBottom = isScrolledToBottom.value;
      
      lastScrollPosition = containerRef.value.scrollTop;
      
      // 跟踪滚动性能
      trackScrollPerformance();
      
      // 检查是否滚动到底部
      const isBottom = checkScrolledToBottom();
      
      // 检查是否滚动到顶部
      const isTop = checkScrolledToTop();
      
      // 处理向下加载
      if (isBottom && !isLoadingMoreItems && !loadMoreCooldown && !contentHeightStabilizing) {
        const canLoadMore = state.visibleItems.value.length < getItems().length;
        if (canLoadMore) {
          loadMoreItems();
        }
      }
      
      // 处理向上加载
      if (isTop && !isLoadingMoreItems && !loadMoreCooldown && !contentHeightStabilizing) {
        loadMoreItemsAtTop();
      }
      
      // 设置滚动状态
      if (!isScrolling.value) {
        isScrolling.value = true;
      }
      
      // 清除之前的定时器
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      
      // 定时器延迟，避免频繁触发
      scrollTimeout = setTimeout(() => {
        isScrolling.value = false;
        
        // 添加一个防止循环调用的标记
        let isAutoScrolling = false;
        
        // 如果之前位于底部且启用了自动滚动，且内容高度已稳定，则滚动到底部
        if (configs.autoScroll && wasAtBottom && !isLoadingMoreItems && !contentHeightStabilizing && !isAutoScrolling) {
          // 设置标记防止循环
          isAutoScrolling = true;
          
          // 延迟以确保DOM已更新
          setTimeout(() => {
            // 使用一次性标记，避免重复滚动
            if (isAutoScrolling) {
              debouncedScrollToBottom(true);
              // 重置标记
              setTimeout(() => {
                isAutoScrolling = false;
              }, 250);
            }
          }, 50);
        }
        
        scheduleIdleWork(() => {
          state.manageCache();
          if (configs.adaptiveUpdate) {
            state.adaptPerformanceSettings();
          }
        });
        
        scrollTimeout = null;
      }, 200); // 改为200ms，平衡响应性和性能
    } catch (error) {
      console.error('处理滚动事件时出错:', error);
      state.errorCount++;
    }
  }, { delay: Math.max(32, configs.throttleMs) });
  
  // 清理函数
  function cleanup() {
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
      scrollTimeout = null;
    }
    
    if (loadMoreTimeout) {
      clearTimeout(loadMoreTimeout);
      loadMoreTimeout = null;
    }
    
    if (heightStabilizationTimeout) {
      clearTimeout(heightStabilizationTimeout);
      heightStabilizationTimeout = null;
    }
    
    if (scrollBottomDebounceTimer) {
      clearTimeout(scrollBottomDebounceTimer);
      scrollBottomDebounceTimer = null;
    }
  }
  
  return {
    // 状态
    isScrolling,
    isScrolledToBottom,
    isLoadingMoreItems: () => isLoadingMoreItems,
    
    // 方法
    handleScroll,
    checkScrolledToBottom,
    checkScrolledToTop,
    loadMoreItems,
    loadMoreItemsAtTop,
    scrollToBottom: debouncedScrollToBottom,
    scrollToItem,
    cleanup
  };
} 