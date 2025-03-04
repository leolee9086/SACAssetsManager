/**
 * DOM元素回收与复用管理模块
 * 该模块提供高效的DOM元素池管理，减少DOM操作开销
 * 
 * @author Virtual Scroll Team
 * @version 1.0.0
 * @license MIT
 */

import { ref, onMounted, onBeforeUnmount } from '../../../../static/vue.esm-browser.js';

/**
 * 用于DOM元素的回收与复用的组合式API
 * @param {Object} options - 配置选项
 * @param {Number} options.initialSize - 初始元素池大小
 * @param {String} options.tagName - 要创建的元素标签
 * @param {String} options.className - 要添加的CSS类名
 * @param {Boolean} options.useDocumentFragment - 是否使用DocumentFragment提高性能
 * @param {Boolean} options.lazyInitialization - 是否延迟初始化元素
 * @param {Number} options.maxPoolSize - 元素池最大容量
 * @param {Number} options.releaseThreshold - 释放阈值百分比 (0-100)
 * @param {Function} options.elementInitializer - 初始化新元素的函数
 * @param {Function} options.elementCleaner - 回收前清理元素的函数
 * @param {Function} options.elementReinitializer - 重新初始化已回收元素的函数
 * @param {Boolean} options.monitorMemoryUsage - 是否监控内存使用情况
 * @param {Number} options.monitoringInterval - 内存监控间隔(ms)
 * @param {Function} options.onMemoryPressure - 内存压力回调函数
 * @returns {Object} DOM回收管理API
 */
export function useDOMRecycling(options = {}) {
  // 默认配置
  const defaultOptions = {
    initialSize: 100,
    tagName: 'div',
    className: 'recycled-element',
    useDocumentFragment: true,
    lazyInitialization: true,
    maxPoolSize: 1000,
    releaseThreshold: 70, // 当使用率低于70%时释放多余元素
    elementInitializer: null,
    elementCleaner: null,
    elementReinitializer: null,
    monitorMemoryUsage: false,
    monitoringInterval: 10000,
    onMemoryPressure: null
  };

  const opts = { ...defaultOptions, ...options };
  
  // 内部状态
  const freePool = []; // 可用元素池
  const activeElements = new Map(); // 当前活跃元素映射 id -> element
  const metrics = {
    created: 0,     // 已创建元素总数
    recycled: 0,    // 已回收元素总数
    released: 0,    // 已释放元素总数
    peak: 0,        // 历史最大活跃元素数
    misses: 0,      // 池空命中次数
    hits: 0         // 池利用命中次数
  };
  
  let monitoringTimer = null;
  let isInitialized = false;
  const documentFragment = opts.useDocumentFragment ? document.createDocumentFragment() : null;
  
  // 公开的响应式状态
  const poolSize = ref(0);
  const activeCount = ref(0);
  const usage = ref(0);
  const memoryEstimate = ref(0);
  
  /**
   * 初始化元素池
   * @private
   */
  function initialize() {
    if (isInitialized) return;
    
    if (!opts.lazyInitialization) {
      // 预先创建元素
      for (let i = 0; i < opts.initialSize; i++) {
        createNewElement();
      }
    }
    
    // 设置内存监控
    if (opts.monitorMemoryUsage) {
      startMemoryMonitoring();
    }
    
    isInitialized = true;
  }
  
  /**
   * 创建新元素并添加到池中
   * @private
   * @returns {HTMLElement} 新创建的元素
   */
  function createNewElement() {
    try {
      const element = document.createElement(opts.tagName);
      
      // 添加类名标识
      if (opts.className) {
        element.className = opts.className;
      }
      
      // 添加数据属性以标识池元素
      element.dataset.recyclingPool = 'true';
      
      // 应用自定义初始化
      if (typeof opts.elementInitializer === 'function') {
        opts.elementInitializer(element);
      }
      
      if (opts.useDocumentFragment && documentFragment) {
        documentFragment.appendChild(element);
      }
      
      // 更新指标
      metrics.created++;
      
      // 添加到可用池
      freePool.push(element);
      poolSize.value = freePool.length;
      
      return element;
    } catch (error) {
      console.error('创建回收元素时出错:', error);
      // 创建失败时返回基本元素，确保功能继续
      return document.createElement(opts.tagName);
    }
  }
  
  /**
   * 从池中获取元素，如果池为空则创建新元素
   * @param {String} id - 元素标识符
   * @param {Object} props - 要设置的属性
   * @returns {HTMLElement} 池中获取的或新创建的元素
   */
  function getElement(id, props = {}) {
    if (!isInitialized) {
      initialize();
    }
    
    // 检查是否已经分配了该ID
    if (activeElements.has(id)) {
      return activeElements.get(id);
    }
    
    let element;
    
    // 尝试从池中获取
    if (freePool.length > 0) {
      element = freePool.pop();
      metrics.hits++;
    } else {
      // 池为空，创建新元素
      element = createNewElement();
      freePool.pop(); // 移除刚刚添加的元素
      metrics.misses++;
    }
    
    // 重置元素以便重用
    if (typeof opts.elementReinitializer === 'function') {
      opts.elementReinitializer(element, props);
    } else {
      // 清除所有子元素和事件监听器
      while (element.firstChild) {
        element.removeChild(element.firstChild);
      }
      
      // 恢复原始属性状态
      element.className = opts.className;
      
      // 应用新属性
      Object.entries(props).forEach(([key, value]) => {
        if (key === 'style' && typeof value === 'object') {
          Object.assign(element.style, value);
        } else if (key === 'class' || key === 'className') {
          element.className = `${opts.className} ${value}`.trim();
        } else if (key === 'dataset' && typeof value === 'object') {
          Object.entries(value).forEach(([dataKey, dataValue]) => {
            element.dataset[dataKey] = dataValue;
          });
        } else if (key !== 'children') {
          element[key] = value;
        }
      });
      
      // 添加子元素
      if (props.children) {
        const childrenArray = Array.isArray(props.children) ? props.children : [props.children];
        childrenArray.forEach(child => {
          if (child instanceof Node) {
            element.appendChild(child);
          } else if (typeof child === 'string' || typeof child === 'number') {
            element.appendChild(document.createTextNode(String(child)));
          }
        });
      }
    }
    
    // 标记为活跃并更新统计信息
    activeElements.set(id, element);
    activeCount.value = activeElements.size;
    metrics.peak = Math.max(metrics.peak, activeCount.value);
    
    // 更新使用率
    updateUsageMetrics();
    
    return element;
  }
  
  /**
   * 回收不再使用的元素到池中
   * @param {String} id - 元素标识符
   * @returns {Boolean} 回收是否成功
   */
  function recycleElement(id) {
    if (!activeElements.has(id)) {
      return false;
    }
    
    const element = activeElements.get(id);
    
    // 执行清理操作
    if (typeof opts.elementCleaner === 'function') {
      opts.elementCleaner(element);
    } else {
      // 默认清理
      while (element.firstChild) {
        element.removeChild(element.firstChild);
      }
      
      // 重置内联样式
      element.removeAttribute('style');
      
      // 重置回默认类名
      element.className = opts.className;
      
      // 清理数据属性
      for (const key in element.dataset) {
        if (key !== 'recyclingPool') {
          delete element.dataset[key];
        }
      }
    }
    
    // 仅当池未满时添加元素
    if (freePool.length < opts.maxPoolSize) {
      freePool.push(element);
      poolSize.value = freePool.length;
    } else {
      // 池已满，释放元素
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
      metrics.released++;
    }
    
    // 从活跃集合中移除
    activeElements.delete(id);
    activeCount.value = activeElements.size;
    metrics.recycled++;
    
    // 更新使用率
    updateUsageMetrics();
    
    // 尝试优化池大小
    if (shouldOptimizePoolSize()) {
      optimizePoolSize();
    }
    
    return true;
  }
  
  /**
   * 批量回收多个元素
   * @param {Array<String>} ids - 要回收的元素ID数组
   * @returns {Number} 成功回收的元素数量
   */
  function recycleElements(ids) {
    if (!Array.isArray(ids)) {
      return 0;
    }
    
    let recycledCount = 0;
    
    for (const id of ids) {
      if (recycleElement(id)) {
        recycledCount++;
      }
    }
    
    return recycledCount;
  }
  
  /**
   * 回收所有当前活跃的元素
   * @returns {Number} 回收的元素数量
   */
  function recycleAll() {
    const activeIds = Array.from(activeElements.keys());
    return recycleElements(activeIds);
  }
  
  /**
   * 判断是否应该优化池大小
   * @private
   * @returns {Boolean}
   */
  function shouldOptimizePoolSize() {
    // 池大小超过初始大小的2倍且使用率低于阈值
    return freePool.length > (opts.initialSize * 2) && 
           usage.value < opts.releaseThreshold;
  }
  
  /**
   * 优化元素池大小，释放多余元素
   * @private
   */
  function optimizePoolSize() {
    // 计算目标池大小 - 当前活跃元素的2倍和初始大小中的较大值
    const targetSize = Math.max(opts.initialSize, activeCount.value * 2);
    
    // 如果当前池小于目标大小，不做调整
    if (freePool.length <= targetSize) {
      return;
    }
    
    // 释放多余元素
    const elementsToRelease = freePool.length - targetSize;
    
    for (let i = 0; i < elementsToRelease; i++) {
      const element = freePool.pop();
      // 从DOM中彻底移除
      if (element && element.parentNode) {
        element.parentNode.removeChild(element);
      }
      metrics.released++;
    }
    
    poolSize.value = freePool.length;
    updateUsageMetrics();
  }
  
  /**
   * 更新使用率指标
   * @private
   */
  function updateUsageMetrics() {
    const total = activeCount.value + freePool.length;
    usage.value = total > 0 ? Math.round((activeCount.value / total) * 100) : 0;
  }
  
  /**
   * 开始内存使用监控
   * @private
   */
  function startMemoryMonitoring() {
    if (!opts.monitorMemoryUsage || monitoringTimer) {
      return;
    }
    
    // 检查性能API可用性
    const hasMemoryAPI = window.performance && window.performance.memory;
    
    monitoringTimer = setInterval(() => {
      // 基于池大小和活跃元素的粗略估计
      const elementEstimate = (activeCount.value + freePool.length) * 2.5; // KB估算
      
      // 如果有性能API，尝试获取更精确的度量
      if (hasMemoryAPI) {
        try {
          const memory = window.performance.memory;
          // 使用实际堆大小信息
          memoryEstimate.value = Math.round(memory.usedJSHeapSize / 1024);
          
          // 如果堆接近限制，触发内存压力事件
          if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.8 && typeof opts.onMemoryPressure === 'function') {
            opts.onMemoryPressure({
              usedHeap: memory.usedJSHeapSize,
              totalHeap: memory.jsHeapSizeLimit,
              percentage: Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100),
              poolSize: freePool.length,
              activeElements: activeCount.value
            });
            
            // 主动优化池大小
            optimizePoolSize();
          }
        } catch (e) {
          // 性能API访问失败，回退到估算
          memoryEstimate.value = elementEstimate;
        }
      } else {
        memoryEstimate.value = elementEstimate;
      }
      
    }, opts.monitoringInterval);
  }
  
  /**
   * 停止内存监控
   * @private
   */
  function stopMemoryMonitoring() {
    if (monitoringTimer) {
      clearInterval(monitoringTimer);
      monitoringTimer = null;
    }
  }
  
  /**
   * 释放所有资源
   */
  function dispose() {
    // 停止监控
    stopMemoryMonitoring();
    
    // 回收所有活跃元素
    recycleAll();
    
    // 清空池
    while (freePool.length > 0) {
      const element = freePool.pop();
      if (element && element.parentNode) {
        element.parentNode.removeChild(element);
      }
    }
    
    poolSize.value = 0;
    activeCount.value = 0;
    usage.value = 0;
    metrics.released += metrics.created;
    
    isInitialized = false;
  }
  
  // 生命周期钩子
  onMounted(() => {
    if (opts.lazyInitialization === false) {
      initialize();
    }
  });
  
  onBeforeUnmount(() => {
    dispose();
  });
  
  // 返回公共API
  return {
    // 主要方法
    getElement,
    recycleElement,
    recycleElements,
    recycleAll,
    initialize,
    dispose,
    
    // 响应式状态
    poolSize,
    activeCount,
    usage,
    memoryEstimate,
    
    // 性能指标
    metrics: {
      getCreatedCount: () => metrics.created,
      getRecycledCount: () => metrics.recycled,
      getReleasedCount: () => metrics.released,
      getPeakCount: () => metrics.peak,
      getMissRate: () => metrics.hits + metrics.misses > 0 ? 
                        Math.round((metrics.misses / (metrics.hits + metrics.misses)) * 100) : 0,
      getHitRate: () => metrics.hits + metrics.misses > 0 ? 
                        Math.round((metrics.hits / (metrics.hits + metrics.misses)) * 100) : 0,
      getAll: () => ({...metrics}),
      reset: () => {
        Object.keys(metrics).forEach(key => {
          metrics[key] = 0;
        });
      }
    },
    
    // 配置访问
    getOptions: () => ({...opts}),
    
    // 工具方法
    optimizePoolSize,
    startMemoryMonitoring,
    stopMemoryMonitoring
  };
} 