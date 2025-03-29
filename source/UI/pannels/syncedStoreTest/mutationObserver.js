/**
 * DOM变异监听模块
 * 用于追踪DOM内容变化并触发相应事件
 */

/**
 * 创建DOM变异监听器
 * @param {Object} options - 配置项
 * @returns {Object} DOM变异监听器API
 */
export const createMutationObserver = (options = {}) => {
  const {
    dispatch = () => {},              // 事件派发函数
    getContainer = () => null,        // 获取容器元素的函数
    enabled = true,                   // 是否启用监听
    subtree = true,                   // 是否监听子树变化
    debounceTime = 10,                // 变化事件防抖时间(ms)
    ignoreAttributeChanges = true,    // 是否忽略属性变化
    filterMutations = null,           // 自定义过滤函数
    onContentChanged = null           // 内容变化回调
  } = options;
  
  // 状态
  let observer = null;
  let pendingMutations = [];
  let debounceTimer = null;
  let isObserving = false;
  let lastMutationTime = 0;
  
  /**
   * 创建MutationObserver实例
   * @returns {MutationObserver} 变异观察器实例
   */
  const createObserver = () => {
    if (!window.MutationObserver) {
      console.warn('当前环境不支持MutationObserver');
      return null;
    }
    
    return new MutationObserver(handleMutations);
  };
  
  /**
   * 处理DOM变异
   * @param {MutationRecord[]} mutations - 变异记录列表
   */
  const handleMutations = (mutations) => {
    if (!enabled || mutations.length === 0) return;
    
    // 记录最后变化时间
    lastMutationTime = Date.now();
    
    // 过滤无关变异
    const filteredMutations = filterMutations 
      ? mutations.filter(filterMutations) 
      : filterMutation(mutations);
    
    if (filteredMutations.length === 0) return;
    
    // 添加到待处理队列
    pendingMutations.push(...filteredMutations);
    
    // 防抖处理，避免频繁触发
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(processPendingMutations, debounceTime);
  };
  
  /**
   * 默认变异过滤器
   * @param {MutationRecord[]} mutations - 变异记录列表
   * @returns {MutationRecord[]} 过滤后的变异记录
   */
  const filterMutation = (mutations) => {
    return mutations.filter(mutation => {
      // 忽略属性变化（如果配置为忽略）
      if (ignoreAttributeChanges && mutation.type === 'attributes') {
        return false;
      }
      
      // 忽略可能的临时DOM变化（如拖拽辅助元素）
      if (isTemporaryNode(mutation.target)) {
        return false;
      }
      
      // 只关注内容相关变化
      return mutation.type === 'characterData' || 
             mutation.type === 'childList';
    });
  };
  
  /**
   * 判断是否为临时节点
   * @param {Node} node - DOM节点
   * @returns {boolean} 是否为临时节点
   */
  const isTemporaryNode = (node) => {
    if (!node || !node.nodeType) return false;
    
    // 检查常见的临时节点特征
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node;
      // 检查常见的临时元素类或ID
      if (element.classList) {
        return element.classList.contains('temp') || 
               element.classList.contains('drag-image') || 
               element.classList.contains('clipboard-temp');
      }
    }
    
    return false;
  };
  
  /**
   * 处理待处理的变异
   */
  const processPendingMutations = () => {
    if (pendingMutations.length === 0) return;
    
    // 复制并清空待处理队列
    const mutationsToProcess = [...pendingMutations];
    pendingMutations = [];
    
    // 分析变异的类型和影响范围
    const summary = analyzeMutations(mutationsToProcess);
    
    // 创建变异事件
    const event = new CustomEvent('DOMContentChanged', {
      bubbles: true,
      detail: { 
        mutations: mutationsToProcess,
        summary
      }
    });
    
    // 使用异步调度避免在DOM变化处理中再次触发变化
    queueMicrotask(() => {
      // 派发内容变化事件
      dispatch('contentchange', event, { 
        mutations: mutationsToProcess,
        summary
      });
      
      // 如果提供了变化回调，调用它
      if (typeof onContentChanged === 'function') {
        onContentChanged(mutationsToProcess, summary);
      }
    });
  };
  
  /**
   * 分析变异记录，生成变化摘要
   * @param {MutationRecord[]} mutations - 变异记录列表
   * @returns {Object} 变化摘要
   */
  const analyzeMutations = (mutations) => {
    const summary = {
      addedNodes: [],
      removedNodes: [],
      modifiedTextNodes: [],
      hasStructuralChanges: false,
      hasTextChanges: false,
      changeTime: lastMutationTime,
      totalChanges: mutations.length
    };
    
    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        summary.hasStructuralChanges = true;
        
        if (mutation.addedNodes.length > 0) {
          summary.addedNodes.push(...Array.from(mutation.addedNodes));
        }
        
        if (mutation.removedNodes.length > 0) {
          summary.removedNodes.push(...Array.from(mutation.removedNodes));
        }
      } else if (mutation.type === 'characterData') {
        summary.hasTextChanges = true;
        summary.modifiedTextNodes.push(mutation.target);
      }
    });
    
    // 去重
    summary.addedNodes = [...new Set(summary.addedNodes)];
    summary.removedNodes = [...new Set(summary.removedNodes)];
    summary.modifiedTextNodes = [...new Set(summary.modifiedTextNodes)];
    
    return summary;
  };
  
  /**
   * 开始观察DOM变化
   */
  const observe = () => {
    if (!enabled || isObserving) return;
    
    const container = getContainer();
    if (!container) {
      console.warn('无法开始观察：容器元素不存在');
      return;
    }
    
    if (!observer) {
      observer = createObserver();
      if (!observer) return;
    }
    
    // 配置观察选项
    const config = {
      childList: true,       // 监控子节点添加或删除
      characterData: true,   // 监控文本内容变化
      characterDataOldValue: true, // 记录文本变化前的值
      subtree: subtree,      // 监控所有后代节点
      attributes: !ignoreAttributeChanges // 是否监控属性变化
    };
    
    try {
      observer.observe(container, config);
      isObserving = true;
    } catch (e) {
      console.error('开始DOM观察失败:', e);
    }
  };
  
  /**
   * 暂停观察DOM变化
   */
  const disconnect = () => {
    if (!observer || !isObserving) return;
    
    observer.disconnect();
    isObserving = false;
    
    // 处理剩余的待处理变异
    if (pendingMutations.length > 0) {
      clearTimeout(debounceTimer);
      processPendingMutations();
    }
  };
  
  /**
   * 重新开始观察
   */
  const reconnect = () => {
    disconnect();
    observe();
  };
  
  /**
   * 手动触发内容变化事件
   * @param {Object} detail - 事件详情
   */
  const triggerContentChange = (detail = {}) => {
    const event = new CustomEvent('ManualContentChange', {
      bubbles: true,
      detail
    });
    
    dispatch('contentchange', event, { 
      isManual: true,
      ...detail
    });
  };
  
  /**
   * 清理资源
   */
  const cleanup = () => {
    disconnect();
    clearTimeout(debounceTimer);
    pendingMutations = [];
    observer = null;
  };
  
  /**
   * 获取观察状态
   * @returns {Object} 观察状态
   */
  const getStatus = () => {
    return {
      isObserving,
      pendingMutationCount: pendingMutations.length,
      lastMutationTime,
      enabled
    };
  };
  
  return {
    observe,
    disconnect,
    reconnect,
    cleanup,
    triggerContentChange,
    getStatus
  };
}; 