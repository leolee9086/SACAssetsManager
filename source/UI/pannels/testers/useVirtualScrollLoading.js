import { ref } from '../../../../static/vue.esm-browser.js';
import { safeExecute } from './useVirtualScrollHelpers.js';

/**
 * 虚拟滚动加载管理模块
 * 处理虚拟滚动中向上和向下加载项目的逻辑
 * 
 * @param {Object} options - 配置选项
 * @param {Object} scrollState - 滚动状态对象
 * @param {Function} getItems - 获取所有项目的函数
 * @param {Object} containerRef - 容器元素引用
 * @param {Object} errorHandler - 错误处理器
 * @param {Function} nextTick - Vue的nextTick函数
 * @returns {Object} - 加载管理API
 */
export function useVirtualScrollLoading(options, scrollState, getItems, containerRef, errorHandler, nextTick) {
  // 加载状态
  const isLoadingMoreItems = ref(false);
  const loadMoreCooldown = ref(false);
  const contentHeightStabilizing = ref(false);
  
  // 创建日志上下文
  const loadingLogger = errorHandler.createContextLogger('虚拟滚动加载');
  
  /**
   * 检查是否滚动到顶部
   * @returns {Boolean} 是否在顶部
   */
  function checkScrolledToTop() {
    return safeExecute(() => {
      if (!containerRef.value || !document.body.contains(containerRef.value)) return false;
      
      const { scrollTop } = containerRef.value;
      // 使用合理阈值判断是否到达顶部
      const threshold = 20;
      return scrollTop <= threshold;
    }, false, error => {
      loadingLogger.logError(error, '检测顶部滚动位置');
      return false;
    });
  }
  
  /**
   * 向顶部加载更多项目
   * @returns {Boolean} 是否成功触发加载
   */
  function loadMoreItemsAtTop() {
    // 如果已经在加载或在冷却期，不进行重复加载
    if (isLoadingMoreItems.value || loadMoreCooldown.value || contentHeightStabilizing.value) return false;
    
    const items = getItems();
    const firstVisibleIndex = scrollState.visibleItems.value.length > 0 
      ? items.indexOf(scrollState.visibleItems.value[0]) 
      : 0;
    
    // 如果已经显示了所有顶部项目
    if (firstVisibleIndex <= 0) return false;
    
    return loadingLogger.safeExecute(() => {
      isLoadingMoreItems.value = true;
      contentHeightStabilizing.value = true;
      
      // 记录当前滚动位置和内容高度
      const currentScrollTop = containerRef.value.scrollTop;
      const currentHeight = containerRef.value.scrollHeight;
      
      // 计算要加载的项目数量
      const increment = Math.min(options.buffer * 2, firstVisibleIndex);
      
      if (increment <= 0) {
        isLoadingMoreItems.value = false;
        contentHeightStabilizing.value = false;
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
          isLoadingMoreItems.value = false;
          
          // 设置冷却期，防止频繁加载
          loadMoreCooldown.value = true;
          
          // 延迟重置高度稳定标志
          const heightStabilizationTimeout = setTimeout(() => {
            contentHeightStabilizing.value = false;
          }, 300);
          
          // 重置加载冷却期
          const loadMoreTimeout = setTimeout(() => {
            loadMoreCooldown.value = false;
          }, 500);
          
          // 存储超时引用以便清理
          scrollState.registerTimeout('heightStabilization', heightStabilizationTimeout);
          scrollState.registerTimeout('loadMoreCooldown', loadMoreTimeout);
        });
        
        return true;
      }, 100);
      
      return true;
    }, false, error => {
      console.error('向上加载更多项目时出错:', error);
      isLoadingMoreItems.value = false;
      contentHeightStabilizing.value = false;
      return false;
    });
  }
  
  /**
   * 向底部加载更多项目
   * @returns {Boolean} 是否成功触发加载
   */
  function loadMoreItemsAtBottom() {
    // 如果已经在加载或在冷却期，不进行重复加载
    if (isLoadingMoreItems.value || loadMoreCooldown.value || contentHeightStabilizing.value) return false;
    
    const items = getItems();
    const lastVisibleItemIndex = scrollState.visibleItems.value.length > 0 
      ? items.indexOf(scrollState.visibleItems.value[scrollState.visibleItems.value.length - 1]) 
      : 0;
    
    // 如果已经显示了所有底部项目
    if (lastVisibleItemIndex >= items.length - 1 || lastVisibleItemIndex < 0) return false;
    
    return loadingLogger.safeExecute(() => {
      isLoadingMoreItems.value = true;
      
      // 触发加载过程
      setTimeout(() => {
        // 加载完成后重置状态
        nextTick(() => {
          // 重置加载状态
          isLoadingMoreItems.value = false;
          
          // 设置冷却期，防止频繁加载
          loadMoreCooldown.value = true;
          
          // 重置加载冷却期
          const loadMoreTimeout = setTimeout(() => {
            loadMoreCooldown.value = false;
          }, 500);
          
          // 如果启用了自动滚动且当前在底部
          if (options.autoScroll && scrollState.isScrolledToBottom.value) {
            nextTick(() => {
              if (!scrollState.isScrolling.value) {
                scrollState.scrollToBottom(true);
              }
            });
          }
          
          // 存储超时引用以便清理
          scrollState.registerTimeout('loadMoreCooldown', loadMoreTimeout);
        });
        
        return true;
      }, 100);
      
      return true;
    }, false, error => {
      console.error('向下加载更多项目时出错:', error);
      isLoadingMoreItems.value = false;
      return false;
    });
  }
  
  /**
   * 清理所有加载状态和计时器
   */
  function cleanup() {
    isLoadingMoreItems.value = false;
    loadMoreCooldown.value = false;
    contentHeightStabilizing.value = false;
  }
  
  return {
    // 状态
    isLoadingMoreItems,
    loadMoreCooldown,
    contentHeightStabilizing,
    
    // 方法
    checkScrolledToTop,
    loadMoreItemsAtTop,
    loadMoreItemsAtBottom,
    cleanup,
    
    // 快捷访问函数 (与原API保持兼容)
    loadMoreItems: loadMoreItemsAtBottom
  };
} 