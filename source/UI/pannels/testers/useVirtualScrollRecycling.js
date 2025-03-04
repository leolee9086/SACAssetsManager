/**
 * 虚拟滚动DOM回收管理模块
 * 提供元素池和DOM回收功能，优化大量DOM元素的创建和销毁过程
 * @module useVirtualScrollRecycling
 */
import { ref, computed } from '../../../../static/vue.esm-browser.js';

/**
 * 提供DOM元素回收和复用的功能
 * @param {Object} options - 配置选项
 * @param {Number} options.poolSize - 元素池初始大小
 * @param {String} options.tagName - 创建的DOM元素标签名
 * @param {String} options.className - 创建的DOM元素类名（可选）
 * @param {Boolean} options.enableMetrics - 是否启用性能指标收集
 * @returns {Object} DOM回收管理对象
 */
export function useVirtualScrollRecycling(options = {}) {
  const {
    poolSize = 100,
    tagName = 'div',
    className = '',
    enableMetrics = false
  } = options;
  
  // 用于存储可复用的DOM元素
  const elementPool = [];
  // 统计指标
  const metrics = {
    created: 0,
    reused: 0,
    recycled: 0
  };
  
  // 元素池当前大小的响应式引用
  const currentPoolSize = ref(0);
  
  /**
   * 从元素池中获取一个元素，如果池为空则创建新元素
   * @returns {HTMLElement} DOM元素
   */
  function getElement() {
    let element;
    
    if (elementPool.length > 0) {
      element = elementPool.pop();
      currentPoolSize.value = elementPool.length;
      
      if (enableMetrics) {
        metrics.reused++;
      }
    } else {
      element = document.createElement(tagName);
      if (className) {
        element.className = className;
      }
      
      if (enableMetrics) {
        metrics.created++;
      }
    }
    
    // 确保元素干净，无子元素和内联样式
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
    element.removeAttribute('style');
    
    return element;
  }
  
  /**
   * 回收DOM元素到元素池中
   * @param {HTMLElement} element - 要回收的DOM元素
   * @returns {Boolean} 是否成功回收
   */
  function recycleElement(element) {
    if (!element || elementPool.includes(element)) {
      return false;
    }
    
    // 清理元素的事件监听器和数据
    const clone = element.cloneNode(false);
    elementPool.push(clone);
    currentPoolSize.value = elementPool.length;
    
    if (enableMetrics) {
      metrics.recycled++;
    }
    
    return true;
  }
  
  /**
   * 预创建指定数量的元素到池中
   * @param {Number} count - 要预创建的元素数量
   */
  function preallocate(count) {
    const targetCount = Math.min(count, 1000); // 安全上限
    
    for (let i = 0; i < targetCount; i++) {
      const element = document.createElement(tagName);
      if (className) {
        element.className = className;
      }
      elementPool.push(element);
      
      if (enableMetrics) {
        metrics.created++;
      }
    }
    
    currentPoolSize.value = elementPool.length;
  }
  
  /**
   * 清理元素池，释放所有缓存的DOM元素
   */
  function clearPool() {
    elementPool.length = 0;
    currentPoolSize.value = 0;
  }
  
  // 初始化元素池
  if (poolSize > 0) {
    preallocate(poolSize);
  }
  
  return {
    // 基本操作
    getElement,
    recycleElement,
    preallocate,
    clearPool,
    
    // 状态数据
    size: computed(() => currentPoolSize.value),
    
    // 性能指标
    getMetrics: () => ({ ...metrics }),
    resetMetrics: () => {
      metrics.created = 0;
      metrics.reused = 0;
      metrics.recycled = 0;
    }
  };
} 