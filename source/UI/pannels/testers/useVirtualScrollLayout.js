/**
 * 虚拟滚动布局计算模块 - 处理高性能的布局更新计算
 */
export function useVirtualScrollLayout(options) {
  const {
    containerRef,
    positionCalculator,
    visibleItemCount,
    getItems,
    buffer,
    overscan,
    dynamicItemHeight,
    recycleDOM,
    performanceMonitor
  } = options;
  
  // 当前渲染范围
  let currentStartIndex = 0;
  let currentEndIndex = 0;
  
  // 布局计算缓存
  const layoutCache = new Map();
  const batchSize = 50; // 批处理大小
  
  /**
   * 计算新的可见范围
   * @param {Number} scrollTop - 滚动位置
   * @param {Number} viewportHeight - 可视区域高度
   * @returns {Object} 可见范围信息
   */
  function calculateVisibleRange(scrollTop, viewportHeight) {
    if (!containerRef.value) {
      return { startIndex: 0, endIndex: 0, offsetY: 0, items: [] };
    }
    
    const items = getItems();
    if (!items.length) {
      return { startIndex: 0, endIndex: 0, offsetY: 0, items: [] };
    }
    
    try {
      performanceMonitor.startMeasure('layoutCalculation');
      
      // 查找起始索引 - 使用二分搜索优化大数据集性能
      let startIndex = findStartIndex(scrollTop, items);
      startIndex = Math.max(0, startIndex - buffer);
      
      // 确定结束索引
      const visibleCount = Math.min(items.length - startIndex, visibleItemCount.value);
      let endIndex = startIndex + visibleCount + buffer;
      endIndex = Math.min(items.length, endIndex);
      
      // 计算顶部偏移量
      const offsetY = positionCalculator.getItemPosition(startIndex);
      
      // 获取可见项目
      const visibleItems = items.slice(startIndex, endIndex);
      
      // 缓存计算结果
      const cacheKey = `${scrollTop}-${viewportHeight}-${items.length}`;
      layoutCache.set(cacheKey, { startIndex, endIndex, offsetY, items: visibleItems });
      
      // 更新当前渲染范围
      currentStartIndex = startIndex;
      currentEndIndex = endIndex;
      
      performanceMonitor.endMeasure('layoutCalculation');
      
      return { startIndex, endIndex, offsetY, items: visibleItems };
    } catch (error) {
      console.error('计算可见范围时出错:', error);
      return { 
        startIndex: currentStartIndex, 
        endIndex: currentEndIndex, 
        offsetY: 0, 
        items: items.slice(currentStartIndex, currentEndIndex) 
      };
    }
  }
  
  /**
   * 使用二分搜索找到对应滚动位置的起始索引
   * @param {Number} scrollTop - 滚动位置
   * @param {Array} items - 项目数组
   * @returns {Number} 起始索引
   */
  function findStartIndex(scrollTop, items) {
    if (scrollTop <= 0) return 0;
    if (!items.length) return 0;
    
    // 快速路径：检查缓存
    const cachedResult = checkIndexCache(scrollTop);
    if (cachedResult !== -1) return cachedResult;
    
    // 二分搜索
    let low = 0;
    let high = items.length - 1;
    let mid = 0;
    let midPos = 0;
    
    while (low <= high) {
      mid = Math.floor((low + high) / 2);
      midPos = positionCalculator.getItemPosition(mid);
      
      // 找到确切的位置或最接近的位置
      if (midPos === scrollTop) {
        return mid;
      } else if (midPos < scrollTop) {
        // 当前位置在目标之前，检查下一个位置
        if (mid === items.length - 1 || positionCalculator.getItemPosition(mid + 1) > scrollTop) {
          return mid;
        }
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    
    return Math.max(0, low);
  }
  
  // 索引位置缓存 - 用于加速二分搜索
  const indexCache = new Map();
  const INDEX_CACHE_SIZE = 100;
  
  function checkIndexCache(scrollTop) {
    // 为提高命中率，查找接近的值（±10px）
    for (let offset = 0; offset <= 10; offset++) {
      if (indexCache.has(scrollTop - offset)) {
        return indexCache.get(scrollTop - offset);
      }
      if (indexCache.has(scrollTop + offset)) {
        return indexCache.get(scrollTop + offset);
      }
    }
    return -1;
  }
  
  function updateIndexCache(scrollTop, index) {
    if (indexCache.size > INDEX_CACHE_SIZE) {
      // 超出大小限制时，删除最旧的20%的条目
      const keysToDelete = Array.from(indexCache.keys())
        .slice(0, Math.floor(INDEX_CACHE_SIZE * 0.2));
      
      keysToDelete.forEach(key => indexCache.delete(key));
    }
    
    indexCache.set(scrollTop, index);
  }
  
  /**
   * 批量预计算项目高度和位置
   * @param {Number} startIndex - 起始索引
   * @param {Number} endIndex - 结束索引
   */
  function batchPrecomputePositions(startIndex, endIndex) {
    if (dynamicItemHeight) {
      // 对于动态高度，分批预计算以避免长任务
      const count = endIndex - startIndex;
      if (count <= 0) return;
      
      let processed = 0;
      const processBatch = () => {
        const batchEndIndex = Math.min(startIndex + processed + batchSize, endIndex);
        for (let i = startIndex + processed; i < batchEndIndex; i++) {
          positionCalculator.getItemPosition(i);
        }
        
        processed += batchSize;
        if (processed < count) {
          requestIdleCallback(() => processBatch(), { timeout: 1000 });
        }
      };
      
      processBatch();
    } else {
      // 对于固定高度，可一次性计算
      positionCalculator.getItemPosition(endIndex - 1);
    }
  }
  
  /**
   * 清除布局缓存
   */
  function clearCache() {
    layoutCache.clear();
    indexCache.clear();
  }
  
  /**
   * 获取布局统计信息
   */
  function getLayoutMetrics() {
    return {
      layoutCacheSize: layoutCache.size,
      indexCacheSize: indexCache.size,
      currentRange: { start: currentStartIndex, end: currentEndIndex }
    };
  }
  
  // 导出布局计算接口
  return {
    calculateVisibleRange,
    batchPrecomputePositions,
    clearCache,
    getLayoutMetrics
  };
} 