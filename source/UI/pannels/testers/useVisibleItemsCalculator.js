import { computed } from '../../../../static/vue.esm-browser.js';
import { getItemsArray } from './useVirtualScrollHelpers.js';

/**
 * 可见项目计算逻辑的组合式API
 * @param {Object} options - 配置选项
 * @param {Function} options.getItems - 获取所有项目的函数
 * @param {Object} options.scrollState - 滚动状态对象
 * @param {Object} options.positionCalculator - 位置计算器
 * @param {Object} options.itemsCache - 缓存管理器
 * @param {Object} options.performanceMonitor - 性能监控器
 * @param {Object} options.errorHandler - 错误处理器
 * @param {Object} options.scrollHandlerState - 滚动处理状态
 * @param {Object} options.configs - 配置项
 * @returns {Object} - 可见项目计算相关的状态和方法
 */
export function useVisibleItemsCalculator(options) {
  const { 
    getItems, 
    scrollState, 
    positionCalculator, 
    itemsCache, 
    performanceMonitor, 
    errorHandler,
    scrollHandlerState,
    configs: opts
  } = options;
  
  const { 
    containerRef, 
    virtualScrollEnabled, 
    viewportHeight, 
    isScrolling
  } = scrollState;
  
  // 计算可见项目
  const visibleItems = computed(() => {
    try {
      const startTime = performance.now();
      const items = getItems();
      
      // 针对空数据或未初始化情况的快速路径
      if (!virtualScrollEnabled.value || !items.length || !containerRef.value) {
        return items.slice(0, Math.min(opts.maxVisibleItems, items.length));
      }
      
      // 获取DOM元素后检查有效性，防止DOM已移除导致的错误
      if (!document.body.contains(containerRef.value)) {
        return items.slice(0, Math.min(opts.maxVisibleItems, items.length));
      }
      
      // 使用内存缓存减少重复计算
      const cacheKey = `${containerRef.value.scrollTop}:${viewportHeight.value}`;
      const cachedResult = itemsCache.get(cacheKey);
      
      if (cachedResult && !opts.debugMode) {
        return cachedResult;
      }
      
      const container = containerRef.value;
      const { scrollTop, clientHeight } = container;
      const { buffer, overscan } = opts;
      
      let startIndex = 0;
      let endIndex = items.length;
      
      // 处理动态高度模式
      if (opts.dynamicItemHeight && typeof opts.getItemHeight === 'function') {
        // 使用位置计算模块查找开始索引
        startIndex = positionCalculator.findItemIndexByPosition(scrollTop - buffer * opts.itemHeight);
        startIndex = Math.max(0, startIndex);
        
        // 高效计算结束索引
        let currentTop = positionCalculator.getItemPosition(startIndex);
        let currentHeight = 0;
        endIndex = startIndex;
        
        while (endIndex < items.length && currentTop + currentHeight < scrollTop + clientHeight + buffer * opts.itemHeight) {
          currentHeight += positionCalculator.getItemHeightByIndex(endIndex);
          endIndex++;
        }
        
        // 增加向上和向下的过扫描以减少闪烁
        startIndex = Math.max(0, startIndex - overscan);
        endIndex = Math.min(items.length, endIndex + overscan);
      } else {
        // 固定高度计算 - 更高效
        startIndex = Math.max(0, Math.floor(scrollTop / opts.itemHeight) - buffer);
        endIndex = Math.min(
          items.length,
          Math.ceil((scrollTop + clientHeight) / opts.itemHeight) + buffer + overscan
        );
      }
      
      // 管理位置缓存
      manageCache(startIndex, endIndex, buffer);
      
      // 自动滚动逻辑 - 如果启用了自动滚动且已滚动到底部
      if (opts.autoScroll && scrollHandlerState.isScrolledToBottom.value && !isScrolling.value) {
        const count = Math.min(scrollState.visibleItemCount.value, items.length);
        const result = items.slice(Math.max(0, items.length - count));
        
        // 性能监控
        trackPerformance(startTime);
        
        // 缓存计算结果
        itemsCache.set(cacheKey, result, 100); // 100ms TTL，避免缓存过期滚动问题
        
        return result;
      }
      
      const result = items.slice(startIndex, endIndex);
      
      // 性能监控
      trackPerformance(startTime);
      
      // 缓存计算结果
      itemsCache.set(cacheKey, result, 100); // 100ms TTL，避免缓存过期滚动问题
      
      return result;
    } catch (error) {
      console.error('计算可见项目时出错:', error);
      errorHandler.logError(error, '计算可见项目');
      
      const items = getItems();
      // 返回部分项目以确保界面不空白
      return items.slice(0, opts.maxVisibleItems);
    }
  });
  
  // 性能监控辅助函数
  function trackPerformance(startTime) {
    performanceMonitor.trackOperation(startTime);
  }
  
  // 增强内存管理，减少内存泄漏可能
  function manageCache(startIndex, endIndex, buffer) {
    try {
      // 自动清理过期缓存
      if (itemsCache.size > 5000) {
        itemsCache.prune(); // 清理过期条目
      }
      
      // 主动清理超出范围的位置缓存
      const items = getItems();
      if (items.length > 1000) { // 仅对大数据集应用
        const minIndex = Math.max(0, startIndex - buffer * 2);
        const maxIndex = Math.min(items.length, endIndex + buffer * 2);
        
        // 定期清理远离当前视图的缓存
        positionCalculator.trimCache(minIndex, maxIndex, buffer * 3);
      }
    } catch (error) {
      console.error('缓存管理过程中出错:', error);
    }
  }
  
  return {
    visibleItems,
    manageCache
  };
} 