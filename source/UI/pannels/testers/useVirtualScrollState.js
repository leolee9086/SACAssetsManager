import { ref, computed } from '../../../../static/vue.esm-browser.js';

/**
 * 管理虚拟滚动的状态
 * @param {Object} options - 配置选项 
 * @returns {Object} - 滚动状态和方法
 */
export function useVirtualScrollState(options = {}) {
  // 核心状态
  const containerRef = ref(null);
  const visibleItemCount = ref(options.maxVisibleItems || 200);
  const viewportHeight = ref(0);
  const virtualScrollEnabled = ref(true);
  const isScrolling = ref(false);
  const isScrolledToBottom = ref(true);
  
  // 加载状态
  const isLoadingMoreItems = ref(false);
  const loadMoreCooldown = ref(false);
  const contentHeightStabilizing = ref(false);
  
  // 内部状态记录
  const scrollTimers = {
    scrollTimeout: null,
    loadMoreTimeout: null,
    heightStabilizationTimeout: null
  };
  
  // 非响应式状态
  const internalState = {
    isInitialized: false,
    lastScrollPosition: 0,
    lastContainerHeight: 0,
    resizeObserver: null
  };
  
  // 清理所有定时器
  function clearTimers() {
    Object.keys(scrollTimers).forEach(key => {
      if (scrollTimers[key]) {
        clearTimeout(scrollTimers[key]);
        scrollTimers[key] = null;
      }
    });
  }
  
  // 重置状态
  function resetState() {
    isScrolling.value = false;
    isScrolledToBottom.value = true;
    isLoadingMoreItems.value = false;
    loadMoreCooldown.value = false;
    contentHeightStabilizing.value = false;
    internalState.lastScrollPosition = 0;
    virtualScrollEnabled.value = true;
    clearTimers();
  }
  
  // 开始加载操作
  function startLoading() {
    isLoadingMoreItems.value = true;
    return () => {
      isLoadingMoreItems.value = false;
    };
  }
  
  // 处理加载冷却期
  function setCooldown(duration = 500) {
    loadMoreCooldown.value = true;
    
    if (scrollTimers.loadMoreTimeout) {
      clearTimeout(scrollTimers.loadMoreTimeout);
    }
    
    scrollTimers.loadMoreTimeout = setTimeout(() => {
      loadMoreCooldown.value = false;
      scrollTimers.loadMoreTimeout = null;
    }, duration);
  }
  
  // 处理高度稳定期
  function setHeightStabilizing(duration = 300) {
    contentHeightStabilizing.value = true;
    
    if (scrollTimers.heightStabilizationTimeout) {
      clearTimeout(scrollTimers.heightStabilizationTimeout);
    }
    
    scrollTimers.heightStabilizationTimeout = setTimeout(() => {
      contentHeightStabilizing.value = false;
      scrollTimers.heightStabilizationTimeout = null;
    }, duration);
  }
  
  // 更新视图尺寸
  function updateViewportSize(height) {
    if (height <= 0) return false;
    
    const changed = viewportHeight.value !== height;
    viewportHeight.value = height;
    
    // 计算可见项目估计数量
    const estimatedItemCount = Math.max(
      options.maxVisibleItems, 
      Math.ceil(height / (options.itemHeight || 30)) * 2 + (options.buffer || 20) * 2
    );
    
    if (visibleItemCount.value !== estimatedItemCount) {
      visibleItemCount.value = estimatedItemCount;
    }
    
    return changed;
  }
  
  // 处理滚动状态
  function setScrolling(isScrollingNow = true, scrollEndDelay = 200) {
    if (isScrollingNow && !isScrolling.value) {
      isScrolling.value = true;
    }
    
    if (scrollTimers.scrollTimeout) {
      clearTimeout(scrollTimers.scrollTimeout);
    }
    
    if (isScrollingNow) {
      scrollTimers.scrollTimeout = setTimeout(() => {
        isScrolling.value = false;
        scrollTimers.scrollTimeout = null;
      }, scrollEndDelay);
    }
  }
  
  return {
    // 响应式状态
    containerRef,
    visibleItemCount,
    viewportHeight,
    virtualScrollEnabled,
    isScrolling,
    isScrolledToBottom,
    isLoadingMoreItems,
    loadMoreCooldown,
    contentHeightStabilizing,
    
    // 内部状态访问
    getInternalState: () => internalState,
    setInternalState: (key, value) => {
      if (key in internalState) {
        internalState[key] = value;
      }
    },
    
    // 状态管理方法
    clearTimers,
    resetState,
    startLoading,
    setCooldown,
    setHeightStabilizing,
    updateViewportSize,
    setScrolling,
    
    // 辅助方法
    hasActiveTimers: () => Object.values(scrollTimers).some(timer => timer !== null),
    
    // 滚动位置记录
    setLastScrollPosition: (position) => {
      internalState.lastScrollPosition = position;
    },
    getLastScrollPosition: () => internalState.lastScrollPosition
  };
} 