/**
 * 虚拟滚动辅助工具集
 * 提供基础函数支持虚拟滚动核心功能
 */

/**
 * 安全获取项目数组，防止undefined错误
 * @param {Array|Object} itemsSource - 项目源（可能是数组或带value属性的响应式对象）
 * @returns {Array} - 有效的数组
 */
export function getItemsArray(itemsSource) {
  if (!itemsSource) return [];
  return Array.isArray(itemsSource.value) ? itemsSource.value : 
         Array.isArray(itemsSource) ? itemsSource : [];
}

/**
 * 安全执行异步任务，带错误处理
 * @param {Function} task - 要执行的任务函数
 * @param {String} errorMessage - 发生错误时的消息
 * @param {Function} onError - 错误处理回调
 * @returns {Promise} - 任务执行的Promise
 */
export function safeExecute(task, errorMessage = '执行任务时出错', onError = null) {
  try {
    const result = task();
    return Promise.resolve(result);
  } catch (error) {
    console.error(`${errorMessage}:`, error);
    if (typeof onError === 'function') {
      onError(error);
    }
    return Promise.reject(error);
  }
}

/**
 * 创建一个DOM元素回收池
 * @param {Number} initialSize - 初始池大小
 * @param {String} tagName - 元素标签名
 * @returns {Object} - 元素池操作接口
 */
export function createElementPool(initialSize = 20, tagName = 'div') {
  const pool = [];
  
  // 创建元素池
  function createElements(count) {
    for (let i = 0; i < count; i++) {
      const el = document.createElement(tagName);
      el.style.display = 'none';
      el.dataset.recycled = 'true';
      pool.push(el);
    }
  }
  
  // 初始化池
  createElements(initialSize);
  
  return {
    /**
     * 从池中获取元素
     * @returns {HTMLElement} - 可复用的DOM元素
     */
    getElement() {
      if (pool.length === 0) {
        createElements(Math.ceil(initialSize / 2));
      }
      return pool.pop();
    },
    
    /**
     * 回收元素到池中
     * @param {HTMLElement} el - 要回收的元素
     */
    recycleElement(el) {
      if (!el || !el.parentNode) return;
      
      // 重置元素状态
      el.style.display = 'none';
      el.textContent = '';
      
      // 移除除data-recycled外的其他属性
      const attributes = Array.from(el.attributes);
      for (const attr of attributes) {
        if (attr.name !== 'data-recycled' && attr.name !== 'style') {
          el.removeAttribute(attr.name);
        }
      }
      
      pool.push(el);
    },
    
    /**
     * 获取当前池大小
     * @returns {Number} - 池中可用元素数量
     */
    size() {
      return pool.length;
    },
    
    /**
     * 清空元素池
     */
    clear() {
      pool.length = 0;
    }
  };
}

/**
 * 安排空闲时间工作
 * @param {Function} callback - 要在空闲时执行的回调
 * @param {Object} options - 配置选项
 * @returns {Number|null} - 任务ID或null
 */
export function scheduleIdleWork(callback, options = { timeout: 1000 }) {
  if (typeof window === 'undefined') return null;
  
  // 使用requestIdleCallback或setTimeout作为回退
  if (typeof window.requestIdleCallback === 'function') {
    return window.requestIdleCallback(callback, options);
  } else {
    return setTimeout(callback, 16); // 约1帧的时间
  }
}

/**
 * 取消已安排的空闲工作
 * @param {Number} id - 任务ID
 */
export function cancelIdleWork(id) {
  if (typeof window === 'undefined' || id == null) return;
  
  if (typeof window.cancelIdleCallback === 'function') {
    window.cancelIdleCallback(id);
  } else {
    clearTimeout(id);
  }
} 