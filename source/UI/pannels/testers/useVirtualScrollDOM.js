/**
 * 提供DOM元素回收和重用功能
 * @returns {Object} DOM回收管理对象
 */
export function setupDOMRecycling() {
  // 元素池的配置
  const config = {
    poolSize: 0,
    elementsAvailable: 0,
    elements: []
  };
  
  /**
   * 初始化元素池
   * @param {Number} size - 池大小
   * @param {String} tagName - HTML标签名
   * @param {String} className - CSS类名
   * @returns {Object} 池配置对象
   */
  function initializePool(size = 50, tagName = 'div', className = 'vs-recycled-item') {
    config.poolSize = size;
    config.elements = [];
    
    // 预先创建元素
    for (let i = 0; i < size; i++) {
      const element = document.createElement(tagName);
      if (className) element.className = className;
      element.style.display = 'none'; // 初始隐藏
      config.elements.push(element);
    }
    
    config.elementsAvailable = size;
    return config;
  }
  
  /**
   * 从池中获取元素
   * @returns {HTMLElement} 可重用的DOM元素
   */
  function getRecycledElement() {
    if (config.elements.length === 0) {
      // 池为空时扩展
      const extraSize = Math.max(10, Math.floor(config.poolSize * 0.2));
      initializePool(extraSize, 'div', 'vs-recycled-item');
    }
    
    const element = config.elements.pop();
    config.elementsAvailable--;
    
    // 重置元素状态
    element.style.display = '';
    element.textContent = '';
    
    // 清除所有子元素
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
    
    // 清除所有属性
    Array.from(element.attributes).forEach(attr => {
      if (attr.name !== 'class') {
        element.removeAttribute(attr.name);
      }
    });
    
    return element;
  }
  
  /**
   * 回收元素到池中
   * @param {HTMLElement} element - 要回收的DOM元素
   */
  function recycleElement(element) {
    if (!element) return;
    
    // 基本检查以确保是有效的DOM元素
    if (!(element instanceof HTMLElement)) return;
    
    // 准备回收
    element.style.display = 'none';
    
    // 添加到池中
    config.elements.push(element);
    config.elementsAvailable++;
  }
  
  /**
   * 清理整个元素池
   */
  function clearPool() {
    config.elements = [];
    config.elementsAvailable = 0;
    config.poolSize = 0;
  }
  
  /**
   * 获取池的使用统计信息
   * @returns {Object} 池统计信息
   */
  function getPoolStats() {
    return {
      total: config.poolSize,
      available: config.elementsAvailable,
      inUse: config.poolSize - config.elementsAvailable
    };
  }
  
  /**
   * 调整池大小
   * @param {Number} newSize - 新的池大小
   */
  function resizePool(newSize) {
    if (newSize < config.poolSize) {
      // 减小池
      config.elements = config.elements.slice(0, newSize);
      config.elementsAvailable = Math.min(config.elementsAvailable, newSize);
      config.poolSize = newSize;
    } else if (newSize > config.poolSize) {
      // 扩大池
      const additionalElements = newSize - config.poolSize;
      initializePool(additionalElements, 'div', 'vs-recycled-item');
    }
  }
  
  // 返回DOM回收管理API
  return {
    initialize: initializePool,
    getElement: getRecycledElement,
    recycleElement,
    clearPool,
    getStats: getPoolStats,
    resize: resizePool
  };
}

// 扩展元素池创建工具，方便特定需求使用
export function createElementPool(options = {}) {
  const {
    tagName = 'div',
    className = '',
    initialSize = 20,
    maxSize = 200,
    attributes = {}
  } = options;
  
  const pool = [];
  
  // 创建元素的工厂函数
  function createElementForPool() {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    
    // 设置默认属性
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
    
    return element;
  }
  
  // 初始填充池
  for (let i = 0; i < initialSize; i++) {
    pool.push(createElementForPool());
  }
  
  // 从池获取元素
  function getFromPool() {
    if (pool.length === 0) {
      // 池为空时增加一些元素
      const newElements = Math.min(10, maxSize - initialSize);
      for (let i = 0; i < newElements; i++) {
        pool.push(createElementForPool());
      }
    }
    
    return pool.pop() || createElementForPool();
  }
  
  // 释放元素回池
  function releaseToPool(element) {
    if (!element || !(element instanceof HTMLElement)) return;
    
    // 清理元素
    element.textContent = '';
    while (element.firstChild) element.removeChild(element.firstChild);
    
    // 保留原始属性，重置其他属性
    Array.from(element.attributes).forEach(attr => {
      if (attr.name !== 'class' && !Object.keys(attributes).includes(attr.name)) {
        element.removeAttribute(attr.name);
      }
    });
    
    // 如果池未满，则加入池
    if (pool.length < maxSize) {
      pool.push(element);
    }
  }
  
  return {
    get: getFromPool,
    release: releaseToPool,
    size: () => pool.length,
    clear: () => {
      pool.length = 0;
    }
  };
} 