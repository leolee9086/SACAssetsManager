import { useSmartCache } from './useSmartCache.js';

/**
 * 虚拟滚动位置计算的组合式API
 * @param {Object} options - 配置选项
 * @param {Number} options.itemHeight - 每个项目的估计高度(px)
 * @param {Boolean} options.dynamicItemHeight - 是否使用动态项目高度
 * @param {Function} options.getItemHeight - 获取特定项目高度的函数
 * @param {String} options.cacheStrategy - 缓存策略 ('lru', 'simple', 'hybrid')
 * @param {Function} options.getItems - 获取项目数组的函数
 * @returns {Object} - 位置计算相关的方法
 */
export function useVirtualPosition(options) {
  const opts = {
    itemHeight: 30,
    dynamicItemHeight: false,
    getItemHeight: null,
    cacheStrategy: 'lru',
    getItems: () => []
  };
  
  Object.assign(opts, options);
  
  // 使用智能缓存管理工具
  const itemsCache = useSmartCache({
    strategy: opts.cacheStrategy || 'lru',
    maxSize: 5000,
    segmentSize: 100,
    ttl: 300000, // 5分钟过期
    adaptiveSize: true,
    onEvict: (key, value) => {
      // 条目被移除时的回调，可用于调试
      if (opts.debug) {
        console.debug(`缓存条目被移除: ${key}`);
      }
    }
  });
  
  /**
   * 获取特定索引项目的高度
   * @param {Number} index - 项目索引
   * @returns {Number} - 项目高度
   */
  function getItemHeightByIndex(index) {
    try {
      if (opts.dynamicItemHeight && typeof opts.getItemHeight === 'function') {
        // 先检查缓存
        if (itemsCache.has(index)) {
          return itemsCache.get(index);
        }
        
        const items = opts.getItems();
        if (index >= 0 && index < items.length) {
          // 计算高度并缓存
          const height = Math.max(1, opts.getItemHeight(items[index], index) || opts.itemHeight);
          itemsCache.set(index, height);
          
          return height;
        }
      }
      
      return opts.itemHeight;
    } catch (error) {
      console.error('获取项目高度时出错:', error);
      return opts.itemHeight; // 出错时使用默认高度
    }
  }
  
  /**
   * 获取项目位置（到顶部的距离）
   * @param {Number} index - 项目索引
   * @returns {Number} - 项目顶部位置
   */
  function getItemPosition(index) {
    if (index <= 0) return 0;
    
    try {
      let position = 0;
      const items = opts.getItems();
      
      // 新增：位置缓存 - 减少重复计算
      const positionCacheKey = `pos_${index}`;
      if (itemsCache.has(positionCacheKey)) {
        return itemsCache.get(positionCacheKey);
      }
      
      if (opts.dynamicItemHeight && typeof opts.getItemHeight === 'function') {
        // 优化：双向查找最近的缓存点
        // 使用新的双向查找最近缓存点
        let startPos = 0;
        let startIdx = 0;
        
        // 查找前后最近的分段缓存点
        const nearestSegment = itemsCache.getNearestSegment(index);
        
        if (nearestSegment) {
          startPos = nearestSegment.data;
          startIdx = nearestSegment.indexInfo.index;
        }
        
        // 根据查找方向计算位置
        if (startIdx <= index) {
          // 向下查找
          for (let i = startIdx; i < index; i++) {
            startPos += getItemHeightByIndex(i);
          }
        } else {
          // 向上查找
          for (let i = startIdx - 1; i >= index; i--) {
            startPos -= getItemHeightByIndex(i);
          }
        }
        
        // 缓存当前索引的位置
        itemsCache.set(positionCacheKey, startPos);
        
        return startPos;
      } else {
        position = index * opts.itemHeight;
      }
      
      return position;
    } catch (error) {
      console.error('计算项目位置时出错:', error);
      return index * opts.itemHeight; // 出错时回退到简单计算
    }
  }
  
  /**
   * 查找特定滚动位置对应的项目索引
   * @param {Number} scrollTop - 滚动位置
   * @returns {Number} - 项目索引
   */
  function findItemIndexByPosition(scrollTop) {
    const items = opts.getItems();
    
    if (items.length === 0) return 0;
    
    try {
      if (opts.dynamicItemHeight && typeof opts.getItemHeight === 'function') {
        // 改进二分搜索算法
        let left = 0;
        let right = items.length - 1;
        
        while (left <= right) {
          const mid = Math.floor((left + right) / 2);
          const itemTop = getItemPosition(mid);
          const itemBottom = itemTop + getItemHeightByIndex(mid);
          
          if (itemBottom < scrollTop) {
            left = mid + 1;
          } else if (itemTop > scrollTop) {
            right = mid - 1;
          } else {
            // 找到包含scrollTop的项目
            return mid;
          }
        }
        
        // 如果没有精确匹配，返回最接近的项目
        return Math.max(0, left - 1);
      } else {
        // 固定高度简单计算
        return Math.max(0, Math.floor(scrollTop / opts.itemHeight));
      }
    } catch (error) {
      console.error('根据位置查找项目索引时出错:', error);
      return Math.floor(scrollTop / opts.itemHeight);
    }
  }
  
  /**
   * 计算给定范围内所有项目的总高度
   * @param {Number} startIndex - 起始索引
   * @param {Number} endIndex - 结束索引
   * @returns {Number} - 总高度
   */
  function calculateRangeHeight(startIndex, endIndex) {
    try {
      let totalHeight = 0;
      
      if (opts.dynamicItemHeight && typeof opts.getItemHeight === 'function') {
        for (let i = startIndex; i < endIndex; i++) {
          totalHeight += getItemHeightByIndex(i);
        }
      } else {
        totalHeight = (endIndex - startIndex) * opts.itemHeight;
      }
      
      return totalHeight;
    } catch (error) {
      console.error('计算范围高度时出错:', error);
      return (endIndex - startIndex) * opts.itemHeight;
    }
  }
  
  /**
   * 获取所有项目的总高度
   * @returns {Number} - 总高度
   */
  function getTotalHeight() {
    const items = opts.getItems();
    return calculateRangeHeight(0, items.length);
  }
  
  /**
   * 清除位置缓存
   */
  function clearCache() {
    itemsCache.clear();
  }
  
  /**
   * 管理和优化缓存
   * @param {Number} startIndex - 可见范围开始索引
   * @param {Number} endIndex - 可见范围结束索引
   * @param {Number} bufferSize - 缓冲区大小
   */
  function manageCache(startIndex, endIndex, bufferSize = 20) {
    try {
      const items = opts.getItems();
      if (!items.length) return;
      
      // 扩展保留范围
      const preserveStart = Math.max(0, startIndex - bufferSize * 3);
      const preserveEnd = Math.min(items.length, endIndex + bufferSize * 3);
      
      // 清理不在当前可见或即将可见范围内的高度缓存
      itemsCache.removeWhere((key, value) => {
        // 不清理分段缓存
        if (key.startsWith('segment_')) return false;
        
        // 不清理位置缓存
        if (key.startsWith('pos_')) return false;
        
        // 尝试解析索引
        const index = parseInt(key, 10);
        if (isNaN(index)) return false;
        
        // 如果索引在保留范围之外，则清理
        return index < preserveStart || index > preserveEnd;
      });
      
      // 为提高性能，创建新的分段缓存点
      if (opts.dynamicItemHeight) {
        const segmentSize = 100;
        if (startIndex % segmentSize === 0) {
          const position = getItemPosition(startIndex);
          itemsCache.setSegment(startIndex, position);
        }
      }
    } catch (error) {
      console.error('管理位置缓存时出错:', error);
    }
  }
  
  /**
   * 更新特定项目的高度
   * @param {Number} index - 项目索引
   * @param {Number} height - 新高度
   */
  function updateItemHeight(index, height) {
    try {
      if (index < 0) return;
      
      // 更新高度缓存
      const newHeight = Math.max(1, height || opts.itemHeight);
      itemsCache.set(index, newHeight);
      
      // 使相关的位置缓存失效
      const items = opts.getItems();
      for (let i = index + 1; i < items.length; i++) {
        const posKey = `pos_${i}`;
        if (itemsCache.has(posKey)) {
          itemsCache.delete(posKey);
        }
      }
    } catch (error) {
      console.error('更新项目高度时出错:', error);
    }
  }
  
  return {
    getItemHeightByIndex,
    getItemPosition,
    findItemIndexByPosition,
    calculateRangeHeight,
    getTotalHeight,
    clearCache,
    manageCache,
    updateItemHeight,
    
    // 提供缓存指标
    metrics: {
      getCacheSize: () => itemsCache.metrics.size.value,
      getHitRate: () => itemsCache.metrics.hitRate.value,
      getSegmentCount: () => itemsCache.metrics.segmentCount.value
    }
  };
} 