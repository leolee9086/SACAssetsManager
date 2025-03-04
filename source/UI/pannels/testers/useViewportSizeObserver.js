import { nextTick } from '../../../../static/vue.esm-browser.js';
import { useDebounce } from './useEventModifiers.js';

/**
 * 虚拟滚动视口大小监控组合式API
 * @param {Object} options - 配置选项
 * @param {import('vue').Ref<number>} options.viewportHeight - 视口高度响应式引用
 * @param {import('vue').Ref<number>} options.visibleItemCount - 可见项目计数响应式引用
 * @param {import('vue').Ref<boolean>} options.isScrolledToBottom - 是否滚动到底部标志
 * @param {Function} options.scrollToBottom - 滚动到底部函数
 * @param {Number} options.itemHeight - 项目高度
 * @param {Number} options.maxVisibleItems - 最大可见项目数
 * @param {Number} options.buffer - 缓冲区大小
 * @param {Boolean} options.autoScroll - 是否自动滚动到底部
 * @param {Number} options.debounceTime - 防抖时间（毫秒）
 * @returns {Object} - 视口大小观察器API
 */
export function useViewportSizeObserver({
  viewportHeight,
  visibleItemCount,
  isScrolledToBottom,
  scrollToBottom,
  itemHeight = 30,
  maxVisibleItems = 200,
  buffer = 20,
  autoScroll = true,
  debounceTime = 50
} = {}) {
  let resizeObserver = null;
  
  /**
   * 更新视口大小
   * @param {Number} height - 新的视口高度
   * @returns {Boolean} - 是否成功更新
   */
  function updateViewportSize(height) {
    if (height <= 0) return false;
    
    // 使用估算的项目高度计算可见项目数量
    const newVisibleCount = Math.max(
      maxVisibleItems, 
      Math.ceil(height / itemHeight) * 2 + buffer * 2
    );
    
    // 只在数值变化时更新，减少不必要的响应式触发
    let updated = false;
    
    if (viewportHeight.value !== height) {
      viewportHeight.value = height;
      updated = true;
    }
    
    if (visibleItemCount.value !== newVisibleCount) {
      visibleItemCount.value = newVisibleCount;
      updated = true;
    }
    
    // 如果处于底部，保持滚动到底部
    if (isScrolledToBottom.value && autoScroll) {
      nextTick(() => scrollToBottom());
    }
    
    return updated;
  }
  
  /**
   * 设置容器大小变化监听
   * @param {HTMLElement} container - 容器元素
   * @returns {Function} - 清理函数
   */
  function setupResizeObserver(container) {
    if (!container) return () => {};
    
    try {
      // 清理现有的观察器
      cleanup();
      
      // 创建ResizeObserver实例
      resizeObserver = new ResizeObserver(entries => {
        if (!entries.length) return;
        
        const rect = entries[0].contentRect;
        if (rect && rect.height > 0) {
          // 使用防抖动处理尺寸变化，避免频繁更新
          useDebounce(() => updateViewportSize(rect.height), debounceTime)();
        }
      });
      
      // 开始观察容器
      resizeObserver.observe(container);
      
      // 初始更新容器大小
      if (container.offsetHeight > 0) {
        updateViewportSize(container.offsetHeight);
      }
      
      // 返回清理函数
      return cleanup;
    } catch (error) {
      console.error('设置ResizeObserver时出错:', error);
      // 兜底方案：使用定时器检测大小变化
      let lastHeight = container.offsetHeight;
      updateViewportSize(lastHeight);
      
      const intervalId = setInterval(() => {
        if (!container || !document.body.contains(container)) {
          clearInterval(intervalId);
          return;
        }
        
        const newHeight = container.offsetHeight;
        if (newHeight !== lastHeight) {
          lastHeight = newHeight;
          updateViewportSize(newHeight);
        }
      }, 1000);
      
      return () => clearInterval(intervalId);
    }
  }
  
  /**
   * 清理资源
   */
  function cleanup() {
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
  }
  
  /**
   * 手动触发更新视口大小
   * @param {HTMLElement} container - 容器元素
   * @returns {Boolean} - 是否成功更新
   */
  function forceUpdate(container) {
    if (!container) return false;
    return updateViewportSize(container.offsetHeight);
  }
  
  /**
   * 检查ResizeObserver支持状态
   * @returns {Object} - 支持状态信息
   */
  function getSupport() {
    return {
      resizeObserverSupported: typeof ResizeObserver !== 'undefined',
      fallbackActive: resizeObserver === null && viewportHeight.value > 0,
      active: resizeObserver !== null
    };
  }
  
  return {
    setupResizeObserver,
    updateViewportSize,
    cleanup,
    forceUpdate,
    getSupport
  };
} 