import { ref, computed, watch, nextTick } from '../../../../static/vue.esm-browser.js';

/**
 * 提供无限滚动的优化功能
 * @param {Object} options - 配置选项
 * @param {Number} options.pageSize - 每页加载的项目数量
 * @param {Number} options.loadThreshold - 触发加载的阈值(距离底部或顶部的百分比)
 * @param {Number} options.preloadCount - 预加载的项目数量
 * @param {Boolean} options.bidirectional - 是否支持双向滚动
 * @param {Boolean} options.smoothLoading - 是否启用平滑加载
 * @param {Function} options.onLoadMore - 加载更多项目时的回调
 * @param {Function} options.onLoadPrevious - 加载前面项目时的回调
 * @returns {Object} - 无限滚动优化工具
 */
export function useInfiniteScrollOptimization(options = {}) {
  // 默认选项
  const defaultOptions = {
    pageSize: 50,
    loadThreshold: 0.2, // 20%的容器高度
    preloadCount: 100,
    bidirectional: false,
    smoothLoading: true,
    onLoadMore: null,
    onLoadPrevious: null
  };
  
  const opts = { ...defaultOptions, ...options };
  
  // 状态
  const isLoadingMore = ref(false);
  const isLoadingPrevious = ref(false);
  const loadingError = ref(null);
  const hasMoreItems = ref(true);
  const hasPreviousItems = ref(false);
  const loadingTimeout = ref(null);
  const lastLoadTime = ref(0);
  const consecutiveErrorCount = ref(0);
  
  // 加载锁定，防止并发请求
  const loadLock = ref(false);
  
  // 取消加载的标记
  let abortController = null;
  
  /**
   * 处理加载更多项目
   * @param {Boolean} force - 是否强制加载 
   * @param {Number} count - 加载的项目数量
   * @returns {Promise} - 加载结果Promise
   */
  async function loadMoreItems(force = false, count = null) {
    // 防止重复加载或正在加载时触发
    if ((isLoadingMore.value || !hasMoreItems.value) && !force) return false;
    if (loadLock.value) return false;
    
    // 检查加载频率限制
    const now = Date.now();
    if (!force && now - lastLoadTime.value < 300) return false;
    
    try {
      loadLock.value = true;
      isLoadingMore.value = true;
      loadingError.value = null;
      
      // 创建可取消的加载请求
      if (abortController) {
        abortController.abort();
      }
      abortController = typeof AbortController !== 'undefined' ? new AbortController() : null;
      
      // 设置加载超时
      clearTimeout(loadingTimeout.value);
      loadingTimeout.value = setTimeout(() => {
        if (isLoadingMore.value) {
          console.warn('加载操作超时');
          isLoadingMore.value = false;
          loadLock.value = false;
          loadingError.value = new Error('加载超时');
          consecutiveErrorCount.value++;
        }
      }, 10000);
      
      // 执行加载回调
      if (typeof opts.onLoadMore === 'function') {
        const actualCount = count || opts.pageSize;
        await opts.onLoadMore(actualCount, abortController ? abortController.signal : null);
        lastLoadTime.value = Date.now();
        consecutiveErrorCount.value = 0;
      } else {
        // 如果没有提供回调，标记没有更多数据
        hasMoreItems.value = false;
      }
      
      return true;
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('加载更多项目时出错:', error);
        loadingError.value = error;
        consecutiveErrorCount.value++;
        
        // 连续错误处理
        if (consecutiveErrorCount.value > 3) {
          hasMoreItems.value = false;
        }
      }
      return false;
    } finally {
      isLoadingMore.value = false;
      loadLock.value = false;
      clearTimeout(loadingTimeout.value);
    }
  }
  
  /**
   * 加载前面的项目（用于双向滚动）
   * @param {Boolean} force - 是否强制加载
   * @param {Number} count - 加载的项目数量 
   * @returns {Promise} - 加载结果Promise
   */
  async function loadPreviousItems(force = false, count = null) {
    if ((isLoadingPrevious.value || !hasPreviousItems.value) && !force) return false;
    if (loadLock.value) return false;
    
    const now = Date.now();
    if (!force && now - lastLoadTime.value < 300) return false;
    
    try {
      loadLock.value = true;
      isLoadingPrevious.value = true;
      loadingError.value = null;
      
      if (abortController) {
        abortController.abort();
      }
      abortController = typeof AbortController !== 'undefined' ? new AbortController() : null;
      
      clearTimeout(loadingTimeout.value);
      loadingTimeout.value = setTimeout(() => {
        if (isLoadingPrevious.value) {
          isLoadingPrevious.value = false;
          loadLock.value = false;
          loadingError.value = new Error('加载超时');
        }
      }, 10000);
      
      if (typeof opts.onLoadPrevious === 'function') {
        const actualCount = count || opts.pageSize;
        await opts.onLoadPrevious(actualCount, abortController ? abortController.signal : null);
        lastLoadTime.value = Date.now();
      } else {
        hasPreviousItems.value = false;
      }
      
      return true;
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('加载前面项目时出错:', error);
        loadingError.value = error;
      }
      return false;
    } finally {
      isLoadingPrevious.value = false;
      loadLock.value = false;
      clearTimeout(loadingTimeout.value);
    }
  }
  
  /**
   * 根据滚动位置检查是否需要加载更多
   * @param {Object} scrollInfo - 滚动信息
   * @param {Number} scrollInfo.scrollTop - 当前滚动位置
   * @param {Number} scrollInfo.clientHeight - 容器高度
   * @param {Number} scrollInfo.scrollHeight - 内容总高度
   * @param {Boolean} scrollInfo.isScrollingDown - 是否向下滚动
   * @param {Boolean} scrollInfo.isScrollingUp - 是否向上滚动
   * @returns {Boolean} - 是否触发了加载
   */
  function checkAndLoad(scrollInfo) {
    if (!scrollInfo) return false;
    
    const { scrollTop, clientHeight, scrollHeight, isScrollingDown, isScrollingUp } = scrollInfo;
    
    // 向下加载检查
    if (isScrollingDown && hasMoreItems.value && !isLoadingMore.value) {
      const distanceToBottom = scrollHeight - scrollTop - clientHeight;
      const thresholdDistance = clientHeight * opts.loadThreshold;
      
      if (distanceToBottom <= thresholdDistance) {
        loadMoreItems();
        return true;
      }
    }
    
    // 向上加载检查（如果启用双向滚动）
    if (opts.bidirectional && isScrollingUp && hasPreviousItems.value && !isLoadingPrevious.value) {
      const thresholdDistance = clientHeight * opts.loadThreshold;
      
      if (scrollTop <= thresholdDistance) {
        loadPreviousItems();
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * 预加载项目
   * @param {Boolean} forward - 是否向前预加载
   */
  function preloadItems(forward = true) {
    if (forward && hasMoreItems.value && !isLoadingMore.value) {
      loadMoreItems(true, opts.preloadCount);
    } else if (opts.bidirectional && !forward && hasPreviousItems.value && !isLoadingPrevious.value) {
      loadPreviousItems(true, opts.preloadCount);
    }
  }
  
  /**
   * 重置加载状态
   */
  function resetLoadingState() {
    isLoadingMore.value = false;
    isLoadingPrevious.value = false;
    loadingError.value = null;
    consecutiveErrorCount.value = 0;
    
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
    
    clearTimeout(loadingTimeout.value);
    loadLock.value = false;
  }
  
  /**
   * 设置是否有更多项目
   * @param {Boolean} hasMore - 是否有更多项目
   */
  function setHasMoreItems(hasMore) {
    hasMoreItems.value = hasMore;
  }
  
  /**
   * 设置是否有前面的项目
   * @param {Boolean} hasPrevious - 是否有前面的项目
   */
  function setHasPreviousItems(hasPrevious) {
    hasPreviousItems.value = hasPrevious;
  }
  
  /**
   * 清理资源
   */
  function cleanup() {
    resetLoadingState();
  }
  
  return {
    // 状态
    isLoadingMore: computed(() => isLoadingMore.value),
    isLoadingPrevious: computed(() => isLoadingPrevious.value),
    hasMoreItems: computed(() => hasMoreItems.value),
    hasPreviousItems: computed(() => hasPreviousItems.value),
    loadingError: computed(() => loadingError.value),
    
    // 方法
    loadMoreItems,
    loadPreviousItems,
    checkAndLoad,
    preloadItems,
    resetLoadingState,
    setHasMoreItems,
    setHasPreviousItems,
    cleanup
  };
} 