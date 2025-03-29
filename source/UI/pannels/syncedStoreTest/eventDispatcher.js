/**
 * 事件调度器模块
 * 负责路由和分发事件到对应的处理函数
 */

/**
 * 创建事件调度器
 * @param {Object} options - 配置项
 * @returns {Object} 事件调度器API
 */
export const createEventDispatcher = (options = {}) => {
  const {
    eventNormalizer = null,           // 事件标准化器
    cursorManager = null,             // 光标管理器
    getState = () => ({}),            // 获取状态函数
    updateState = () => {},           // 更新状态函数
    shouldPreventDefault = true,      // 是否应阻止默认行为
    errorHandler = console.error,     // 错误处理函数
    customEventMap = {}               // 自定义事件映射
  } = options;
  
  // 事件处理器映射
  const eventHandlers = new Map();
  
  // 自定义事件处理器映射
  const customHandlers = new Map();
  
  // 事件计数统计
  let eventCount = 0;
  let lastEventTime = 0;
  
  // 错误统计
  const errorMetrics = {};
  const ERROR_THRESHOLD = 5; // 短时间内允许的最大错误数
  const ERROR_TIMEOUT = 10000; // 错误计数重置时间(ms)
  
  /**
   * 注册事件处理函数
   * @param {string} type - 事件类型
   * @param {Function} handler - 处理函数
   * @returns {Function} 移除监听器的函数
   */
  const addEventListener = (type, handler) => {
    if (!eventHandlers.has(type)) {
      eventHandlers.set(type, []);
    }
    
    eventHandlers.get(type).push(handler);
    
    // 返回删除函数，方便后续移除
    return () => removeEventListener(type, handler);
  };
  
  /**
   * 移除事件处理函数
   * @param {string} type - 事件类型
   * @param {Function} handler - 处理函数
   */
  const removeEventListener = (type, handler) => {
    if (!eventHandlers.has(type)) return;
    
    const handlers = eventHandlers.get(type);
    const index = handlers.indexOf(handler);
    
    if (index !== -1) {
      handlers.splice(index, 1);
    }
  };
  
  /**
   * 注册自定义事件处理函数
   * @param {string} type - 自定义事件类型
   * @param {Function} handler - 处理函数
   * @returns {Function} 移除监听器的函数
   */
  const onCustomEvent = (type, handler) => {
    if (!customHandlers.has(type)) {
      customHandlers.set(type, []);
    }
    
    customHandlers.get(type).push(handler);
    
    // 返回删除函数
    return () => {
      const handlers = customHandlers.get(type) || [];
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    };
  };
  
  /**
   * 增强的错误处理函数
   * @param {string} type - 事件类型
   * @param {Error} error - 错误对象
   * @param {Object} context - 上下文信息
   */
  const handleEventError = (type, error, context = {}) => {
    // 调用提供的错误处理函数
    errorHandler(`事件处理器错误 [${type}]:`, error);
    
    // 记录错误统计
    if (!errorMetrics[type]) {
      errorMetrics[type] = {
        count: 0,
        firstError: Date.now(),
        lastError: Date.now(),
        disabled: false
      };
    }
    
    const metric = errorMetrics[type];
    const now = Date.now();
    
    // 如果超过超时时间，重置计数
    if (now - metric.firstError > ERROR_TIMEOUT) {
      metric.count = 0;
      metric.firstError = now;
      metric.disabled = false;
    }
    
    metric.count++;
    metric.lastError = now;
    
    // 如果短时间内错误过多，考虑临时禁用
    if (metric.count > ERROR_THRESHOLD && !metric.disabled) {
      console.warn(`事件处理错误次数过多 [${type}]，临时禁用处理 (10秒)`);
      metric.disabled = true;
      
      // 10秒后自动重新启用
      setTimeout(() => {
        if (errorMetrics[type]) {
          errorMetrics[type].disabled = false;
          errorMetrics[type].count = 0;
          console.log(`重新启用事件处理 [${type}]`);
        }
      }, 10000);
    }
    
    // 针对特定错误类型的恢复
    if (type.includes('selection')) {
      try {
        // 尝试清除当前选区作为恢复措施
        if (window.getSelection) {
          window.getSelection().removeAllRanges();
        }
      } catch (e) {
        // 忽略二次错误
      }
    }
  };
  
  /**
   * 派发事件到处理函数
   * @param {string} type - 事件类型
   * @param {Event} event - 原始事件对象
   * @param {Object} data - 附加数据
   * @returns {boolean} 是否有处理器处理了事件
   */
  const dispatch = (type, event, data = {}) => {
    // 检查是否临时禁用了该类型的事件处理
    if (errorMetrics[type]?.disabled) {
      return false;
    }
    
    // 更新事件状态
    eventCount++;
    lastEventTime = Date.now();
    
    updateState({
      eventCount,
      lastEventTime
    });
    
    // 增加对事件委托的支持
    if (data.sourceModule) {
      // 记录来源模块信息，便于调试
      data.sourceModuleTime = Date.now();
    }
    
    // 尝试阻止默认行为（如果配置了且事件支持）
    if (shouldPreventDefault && event && typeof event.preventDefault === 'function' && 
        !data.passive && !data.allowDefault) {
      // 某些事件类型总是阻止默认行为
      const alwaysPreventTypes = ['dragover', 'drop', 'contextmenu'];
      
      if (alwaysPreventTypes.includes(type)) {
        event.preventDefault();
      }
    }
    
    // 控制事件冒泡
    if (data.stopBubbling && event && typeof event.stopPropagation === 'function') {
      event.stopPropagation();
    }
    
    // 使用标准化器创建标准化的事件对象（如果有）
    let normalizedEvent = event;
    if (eventNormalizer && typeof eventNormalizer.normalizeEvent === 'function') {
      try {
        normalizedEvent = eventNormalizer.normalizeEvent(event, data);
      } catch (err) {
        handleEventError('normalizer', err, { event, data });
        // 回退到原始事件
        normalizedEvent = event;
      }
    }
    
    // 如果配置了光标管理器，同步事件信息
    if (cursorManager && typeof cursorManager.handleEvent === 'function') {
      try {
        cursorManager.handleEvent(type, normalizedEvent);
      } catch (err) {
        handleEventError('cursorManager', err, { type, event: normalizedEvent });
      }
    }
    
    // 获取对应类型的处理函数
    const handlers = eventHandlers.get(type) || [];
    
    let isHandled = handlers.length > 0;
    
    // 执行所有处理函数
    handlers.forEach(handler => {
      try {
        handler(normalizedEvent);
      } catch (err) {
        handleEventError(type, err, { event: normalizedEvent, data });
      }
    });
    
    // 派发自定义事件
    const customHandled = dispatchCustomEvent(type, normalizedEvent);
    
    return isHandled || customHandled;
  };
  
  /**
   * 派发自定义事件
   * @param {string} type - 原始事件类型
   * @param {Object} normalizedEvent - 标准化的事件对象
   * @returns {boolean} 是否有处理器处理了事件
   */
  const dispatchCustomEvent = (type, normalizedEvent) => {
    // 将原始DOM事件映射到自定义事件
    let customType = null;
    
    // 使用传入的自定义事件映射
    if (customEventMap) {
      // 直接映射
      if (customEventMap[type]) {
        customType = customEventMap[type];
      } else {
        // 条件映射
        switch (type) {
          case 'keydown':
            // 检查是否是命令键组合
            if (normalizedEvent.ctrlKey || normalizedEvent.metaKey) {
              customType = customEventMap.KEY_COMMAND;
            }
            break;
          // 其他条件映射可以根据需要添加
        }
      }
    }
    
    if (customType) {
      // 检查是否临时禁用了该类型的事件处理
      if (errorMetrics[customType]?.disabled) {
        return false;
      }
      
      const handlers = customHandlers.get(customType) || [];
      
      let isHandled = handlers.length > 0;
      
      handlers.forEach(handler => {
        try {
          handler(normalizedEvent);
        } catch (err) {
          handleEventError(customType, err, { 
            event: normalizedEvent, 
            customType,
            originalType: type 
          });
        }
      });
      
      return isHandled;
    }
    
    return false;
  };
  
  /**
   * 批量派发事件
   * @param {Array} events - 要派发的事件数组
   */
  const dispatchBatch = (events) => {
    events.forEach(({ type, event, data }) => {
      dispatch(type, event, data);
    });
  };
  
  /**
   * 创建和派发合成事件
   * @param {string} type - 事件类型
   * @param {Object} data - 事件数据
   */
  const emitEvent = (type, data = {}) => {
    // 创建合成事件
    let syntheticEvent;
    
    if (eventNormalizer && typeof eventNormalizer.createSyntheticEvent === 'function') {
      syntheticEvent = eventNormalizer.createSyntheticEvent(type, data);
    } else {
      // 创建基本的合成事件
      syntheticEvent = {
        type,
        synthetic: true,
        preventDefault: () => {},
        stopPropagation: () => {},
        data
      };
    }
    
    // 派发事件
    return dispatch(type, syntheticEvent, data);
  };
  
  /**
   * 创建并返回绑定了特定上下文的事件派发器
   * @param {string} context - 上下文名称
   * @returns {Function} 上下文绑定的派发器
   */
  const createContextDispatcher = (context) => {
    return (type, event, data = {}) => {
      return dispatch(type, event, {
        ...data,
        context
      });
    };
  };
  
  /**
   * 获取事件统计信息
   * @returns {Object} 事件统计信息
   */
  const getStats = () => {
    return {
      eventCount,
      lastEventTime,
      registeredTypes: Array.from(eventHandlers.keys()),
      registeredCustomTypes: Array.from(customHandlers.keys()),
      handlersCount: Array.from(eventHandlers.entries()).reduce((acc, [type, handlers]) => {
        acc[type] = handlers.length;
        return acc;
      }, {})
    };
  };
  
  /**
   * 获取错误统计信息
   */
  const getErrorMetrics = () => {
    return { ...errorMetrics };
  };
  
  /**
   * 重置特定类型的错误统计
   * @param {string} type - 事件类型，不提供则重置所有
   */
  const resetErrorMetrics = (type = null) => {
    if (type) {
      if (errorMetrics[type]) {
        errorMetrics[type] = {
          count: 0,
          firstError: Date.now(),
          lastError: 0,
          disabled: false
        };
      }
    } else {
      // 重置所有错误统计
      Object.keys(errorMetrics).forEach(key => {
        errorMetrics[key] = {
          count: 0,
          firstError: Date.now(),
          lastError: 0,
          disabled: false
        };
      });
    }
  };
  
  /**
   * 清理所有事件处理器
   */
  const cleanup = () => {
    eventHandlers.clear();
    customHandlers.clear();
    eventCount = 0;
    lastEventTime = 0;
  };
  
  // 返回扩展后的公共API
  return {
    addEventListener,
    removeEventListener,
    onCustomEvent,
    dispatch,
    dispatchBatch,
    emitEvent,
    createContextDispatcher,
    getStats,
    getErrorMetrics,
    resetErrorMetrics,
    cleanup
  };
}; 