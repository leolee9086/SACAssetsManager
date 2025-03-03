/**
 * EventBus - 高性能事件总线实现
 * 
 * 设计目标：
 * 1. 提供高效、可靠的组件间通信机制，实现松耦合架构
 * 2. 支持多种事件订阅模式和灵活的事件管理
 * 3. 优化性能，减少内存占用和计算开销
 * 4. 提供友好的调试和错误处理机制
 * 
 * 核心特性：
 * - 基础事件订阅/发布(on/emit)
 * - 事件优先级支持，确保关键监听器优先执行
 * - 一次性事件监听(once)
 * - 命名空间支持，方便模块化管理事件
 * - 事件流控制，支持停止传播和阻止默认行为
 * - 上下文绑定，简化组件内事件处理
 * - 通配符事件监听，监控全局事件流
 * - 完整的调试工具，帮助排查事件相关问题
 * 
 * 主要使用场景：
 * - 音频播放器中的节拍检测与UI交互
 * - 组件间状态同步和数据传递
 * - 用户界面事件与业务逻辑解耦
 * - 异步操作完成后的通知机制
 * - 插件系统中的信号传递
 * 
 * 性能优化：
 * - 使用WeakMap存储元数据，避免内存泄漏
 * - 缓存排序后的回调数组，减少重复计算
 * - 延迟执行事件回调，保持UI响应性
 * - 优先级过滤和排序优化
 *
 * @returns {Object} 事件总线对象
 */
export function createEventBus() {
  // 存储所有事件监听器
  const listeners = new Map();
  
  // 存储优先级信息
  const priorities = new WeakMap();
  
  // 存储监听器元数据
  const metadata = new WeakMap();
  
  // 缓存排序后的回调数组
  const sortedCallbacksCache = new WeakMap();
  
  // 用于跟踪缓存是否失效的计数器
  const invalidationCounters = new Map();
  
  // 创建一次并重用的空数组
  const EMPTY_ARRAY = Object.freeze([]);
  
  // 预定义常用常量
  const WILDCARD = '*';
  
  // 调试相关状态
  let debugEnabled = false;
  const eventStats = new Map();
  const eventHistory = [];
  const MAX_HISTORY = 100;
  
  // 预先声明公共对象，避免重复创建新对象
  const eventBus = {
    on,
    off,
    once,
    priority,
    emit,
    removeAllListeners,
    listenerCount,
    eventNames,
    removeListeners,
    emitControlled,
    onWithContext,
    offContext,
    debug,
    getDebugInfo,
    emitNamespaced,
    createNamespace
  };
  
  /**
   * 添加事件监听器
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   * @returns {Function} 用于移除监听器的函数
   */
  function on(event, callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('事件监听器必须是函数');
    }
    
    let eventListeners = listeners.get(event);
    if (!eventListeners) {
      eventListeners = new Set();
      listeners.set(event, eventListeners);
    }
    
    eventListeners.add(callback);
    
    // 保存监听器元数据
    metadata.set(callback, {
      event,
      isWildcard: event === WILDCARD
    });
    
    // 使该事件的缓存失效
    invalidateEventCache(event);
    
    // 返回移除此监听器的函数（使用bind而不是闭包）
    return off.bind(eventBus, event, callback);
  }
  
  /**
   * 移除事件监听器
   * @param {string} event - 事件名称
   * @param {Function} callback - 要移除的回调函数
   * @returns {boolean} 是否成功移除
   */
  function off(event, callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('回调必须是函数');
    }
    
    const eventListeners = listeners.get(event);
    if (!eventListeners) return false;
    
    const removed = eventListeners.delete(callback);
    
    // 如果没有更多监听器，移除整个事件
    if (eventListeners.size === 0) {
      listeners.delete(event);
    }
    
    // 清理元数据
    if (removed) {
      priorities.delete(callback);
      metadata.delete(callback);
      
      // 使该事件的缓存失效
      invalidateEventCache(event);
    }
    
    return removed;
  }
  
  /**
   * 添加一次性事件监听器
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   * @returns {Function} 用于移除监听器的函数
   */
  function once(event, callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('事件监听器必须是函数');
    }
    
    // 创建一个包装函数，在调用后自动移除 - 使用函数声明避免创建闭包
    function wrapper(data) {
      // 先移除监听器，再调用回调，防止回调中再次注册导致死循环
      off(event, wrapper);
      
      // 针对通配符事件的处理
      return metadata.get(wrapper).isWildcard ? 
        callback(event, data) : 
        callback(data);
    }
    
    // 保存原始回调的引用以便调试
    metadata.set(wrapper, {
      event,
      isWildcard: event === WILDCARD,
      isOnce: true,
      originalCallback: callback
    });
    
    return on(event, wrapper);
  }
  
  /**
   * 按优先级添加事件监听器
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   * @param {Object} [options] - 配置选项
   * @param {number} [options.priority=0] - 优先级(数字越大优先级越高)
   * @returns {Function} 用于移除监听器的函数
   */
  function priority(event, callback, options = { priority: 0 }) {
    if (typeof callback !== 'function') {
      throw new TypeError('事件监听器必须是函数');
    }
    
    // 存储优先级信息到专用的WeakMap中
    const priorityValue = options.priority || 0;
    if (priorityValue !== 0) {
      priorities.set(callback, priorityValue);
    }
    
    // 使该事件的缓存失效
    invalidateEventCache(event);
    
    // 注册监听器
    return on(event, callback);
  }
  
  /**
   * 使事件的回调缓存失效
   * @param {string} event - 事件名称
   */
  function invalidateEventCache(event) {
    // 增加事件的失效计数器
    const currentCount = invalidationCounters.get(event) || 0;
    invalidationCounters.set(event, currentCount + 1);
    
    // 如果是通配符事件的变更，需要使所有事件缓存失效
    if (event === WILDCARD) {
      // 清除所有事件的缓存计数器
      invalidationCounters.clear();
    }
  }
  
  /**
   * 获取并缓存排序后的回调数组
   * @param {string} event - 事件名称
   * @param {Set} specificCallbacks - 特定事件的回调集合
   * @param {Set} wildcardCallbacks - 通配符事件的回调集合
   * @returns {Array} 排序后的回调数组
   */
  function getSortedCallbacks(event, specificCallbacks, wildcardCallbacks) {
    // 检查缓存是否有效
    const cacheKey = { event };
    const cachedCallbacks = sortedCallbacksCache.get(cacheKey);
    const lastInvalidationCount = cachedCallbacks?.invalidationCount;
    const currentInvalidationCount = invalidationCounters.get(event) || 0;
    
    // 如果缓存有效，直接返回缓存的结果
    if (cachedCallbacks && lastInvalidationCount === currentInvalidationCount) {
      return cachedCallbacks.callbacks;
    }
    
    // 如果没有监听器，返回空数组常量
    if ((!specificCallbacks || specificCallbacks.size === 0) && 
        (!wildcardCallbacks || wildcardCallbacks.size === 0)) {
      return EMPTY_ARRAY;
    }
    
    // 收集所有回调
    const callbacks = [];
    
    // 添加特定事件的监听器
    if (specificCallbacks && specificCallbacks.size > 0) {
      specificCallbacks.forEach(cb => callbacks.push(cb));
    }
    
    // 添加通配符监听器
    if (wildcardCallbacks && wildcardCallbacks.size > 0) {
      wildcardCallbacks.forEach(cb => callbacks.push(cb));
    }
    
    // 检查是否需要排序
    let needsSorting = false;
    let i = callbacks.length;
    while (i--) {
      if (priorities.has(callbacks[i])) {
        needsSorting = true;
        break;
      }
    }
    
    // 根据优先级排序
    if (needsSorting && callbacks.length > 1) {
      callbacks.sort((a, b) => {
        const priorityA = priorities.get(a) || 0;
        const priorityB = priorities.get(b) || 0;
        return priorityB - priorityA; // 降序排列，优先级高的在前
      });
    }
    
    // 缓存结果
    sortedCallbacksCache.set(cacheKey, {
      callbacks,
      invalidationCount: currentInvalidationCount
    });
    
    return callbacks;
  }
  
  /**
   * 触发事件
   * @param {string} event - 事件名称
   * @param {*} data - 传递给监听器的数据
   * @param {Object} [options] - 配置选项
   * @param {boolean} [options.sync=false] - 是否同步触发
   * @returns {boolean} 是否有监听器被触发
   */
  function emit(event, data, options = {}) {
    const specificCallbacks = listeners.get(event);
    const wildcardCallbacks = listeners.get(WILDCARD);
    
    // 快速检查是否有监听器
    if ((!specificCallbacks || specificCallbacks.size === 0) && 
        (!wildcardCallbacks || wildcardCallbacks.size === 0)) {
      return false;
    }
    
    // 获取排序后的回调数组（利用缓存机制）
    const callbacks = getSortedCallbacks(event, specificCallbacks, wildcardCallbacks);
    
    // 如果没有回调函数，提前返回
    if (callbacks.length === 0) {
      return false;
    }
    
    // 执行回调的函数
    function executeCallbacks() {
      let i = 0;
      const len = callbacks.length;
      for (; i < len; i++) {
        const callback = callbacks[i];
        try {
          // 使用元数据判断是否为通配符监听器
          const meta = metadata.get(callback);
          if (meta && meta.isWildcard) {
            callback(event, data);
          } else {
            callback(data);
          }
        } catch (error) {
          console.error(`事件监听器错误 (${event}):`, error);
        }
      }
    }
    
    // 同步或异步触发
    if (options.sync) {
      executeCallbacks();
    } else {
      // 使用更高效的异步方法（根据环境选择）
      if (typeof queueMicrotask === 'function') {
        queueMicrotask(executeCallbacks);
      } else if (typeof Promise !== 'undefined') {
        Promise.resolve().then(executeCallbacks);
      } else {
        setTimeout(executeCallbacks, 0);
      }
    }
    
    if (debugEnabled) {
      const listenerCount = (listeners.get(event)?.size || 0) + 
                            (listeners.get(WILDCARD)?.size || 0);
      logEvent(event, data, listenerCount);
    }
    
    return true;
  }
  
  /**
   * 移除所有事件监听器
   * @param {string} [event] - 可选，特定事件名称
   * @returns {boolean} 操作是否成功
   */
  function removeAllListeners(event) {
    if (event) {
      // 移除特定事件的所有监听器
      invalidateEventCache(event);
      return listeners.delete(event);
    } else {
      // 移除所有事件的所有监听器
      listeners.clear();
      invalidationCounters.clear();
      return true;
    }
  }
  
  /**
   * 获取特定事件的监听器数量
   * @param {string} event - 事件名称
   * @returns {number} 监听器数量
   */
  function listenerCount(event) {
    const eventListeners = listeners.get(event);
    return eventListeners ? eventListeners.size : 0;
  }
  
  /**
   * 获取所有注册的事件名称
   * @returns {Array<string>} 事件名称数组
   */
  function eventNames() {
    return Array.from(listeners.keys());
  }
  
  /**
   * 根据过滤条件移除事件监听器
   * @param {Function} filterFn - 过滤函数，返回true的监听器将被移除
   * @returns {number} 被移除的监听器数量
   */
  function removeListeners(filterFn) {
    if (typeof filterFn !== 'function') {
      throw new TypeError('过滤函数必须是函数');
    }
    
    let removedCount = 0;
    
    // 使用数组存储要移除的项，避免在迭代时修改集合
    const toRemove = [];
    
    for (const [event, eventListeners] of listeners.entries()) {
      for (const callback of eventListeners) {
        if (filterFn(callback, event)) {
          toRemove.push([event, callback]);
        }
      }
    }
    
    // 批量移除
    for (const [event, callback] of toRemove) {
      if (off(event, callback)) {
        removedCount++;
      }
    }
    
    return removedCount;
  }
  
  /**
   * 创建事件对象，包含控制事件流的方法
   * @param {string} eventName - 事件名称
   * @param {*} data - 事件数据
   * @returns {Object} 事件对象
   */
  function createEventObject(eventName, data) {
    let propagationStopped = false;
    let defaultPrevented = false;
    
    return {
      type: eventName,
      data: data,
      stopPropagation() {
        propagationStopped = true;
      },
      preventDefault() {
        defaultPrevented = true;
      },
      isPropagationStopped() {
        return propagationStopped;
      },
      isDefaultPrevented() {
        return defaultPrevented;
      }
    };
  }
  
  /**
   * 可控制传播的事件触发
   * @param {string} event - 事件名称
   * @param {*} data - 传递给监听器的数据
   * @param {Object} [options] - 配置选项
   * @returns {Object} 事件对象
   */
  function emitControlled(event, data, options = {}) {
    const specificCallbacks = listeners.get(event);
    const wildcardCallbacks = listeners.get(WILDCARD);
    
    // 创建事件对象
    const eventObject = createEventObject(event, data);
    
    // 获取排序后的回调数组
    const callbacks = getSortedCallbacks(event, specificCallbacks, wildcardCallbacks);
    
    if (callbacks.length === 0) {
      return eventObject;
    }
    
    // 同步执行回调，以便正确处理传播控制
    const syncOptions = {...options, sync: true};
    
    // 执行回调函数
    for (const callback of callbacks) {
      try {
        const meta = metadata.get(callback);
        if (meta && meta.isWildcard) {
          callback(event, eventObject);
        } else {
          callback(eventObject);
        }
        
        // 检查是否停止传播
        if (eventObject.isPropagationStopped()) {
          break;
        }
      } catch (error) {
        console.error(`事件监听器错误 (${event}):`, error);
      }
    }
    
    return eventObject;
  }
  
  /**
   * 支持命名空间的事件触发
   * @param {string} event - 事件名称（可包含命名空间，如'audio.beat.detected'）
   * @param {*} data - 传递给监听器的数据
   * @param {Object} [options] - 配置选项
   * @returns {boolean} 是否有监听器被触发
   */
  function emitNamespaced(event, data, options = {}) {
    if (!event.includes('.')) {
      return emit(event, data, options);
    }
    
    // 对于命名空间事件，触发整个事件链
    // 例如: 'audio.beat.detected' 会触发:
    // 'audio.beat.detected', 'audio.beat.*', 'audio.*', '*'
    const parts = event.split('.');
    let triggered = false;
    
    // 触发完整事件
    triggered = emit(event, data, options) || triggered;
    
    // 触发每个层级的通配符事件
    let namespace = '';
    for (let i = 0; i < parts.length - 1; i++) {
      namespace += (i > 0 ? '.' : '') + parts[i];
      const wildcardEvent = namespace + '.*';
      triggered = emit(wildcardEvent, data, options) || triggered;
    }
    
    return triggered;
  }
  
  /**
   * 创建命名空间限定的事件总线
   * @param {string} namespace - 命名空间前缀
   * @returns {Object} 命名空间限定的事件总线
   */
  function createNamespace(namespace) {
    const namespacedBus = {};
    
    // 为每个主要方法创建命名空间版本
    namespacedBus.on = (event, callback) => 
      on(`${namespace}.${event}`, callback);
      
    namespacedBus.off = (event, callback) => 
      off(`${namespace}.${event}`, callback);
      
    namespacedBus.once = (event, callback) => 
      once(`${namespace}.${event}`, callback);
      
    namespacedBus.emit = (event, data, options) => 
      emitNamespaced(`${namespace}.${event}`, data, options);
      
    namespacedBus.priority = (event, callback, options) => 
      priority(`${namespace}.${event}`, callback, options);

    // 获取该命名空间下的所有事件
    namespacedBus.listEvents = () => {
      const prefix = `${namespace}.`;
      return eventNames().filter(name => name.startsWith(prefix));
    };
    
    return namespacedBus;
  }
  
  /**
   * 带上下文的事件监听
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   * @param {Object} context - 回调函数的this上下文
   * @param {Object} [options] - 其他配置选项
   * @returns {Function} 用于移除监听器的函数
   */
  function onWithContext(event, callback, context, options = {}) {
    if (typeof callback !== 'function') {
      throw new TypeError('事件监听器必须是函数');
    }
    
    // 创建绑定上下文的函数
    const boundCallback = callback.bind(context);
    
    // 存储原始回调引用，便于移除
    metadata.set(boundCallback, {
      event,
      isWildcard: event === WILDCARD,
      originalCallback: callback,
      context: context
    });
    
    // 应用优先级（如果有）
    if (options.priority !== undefined) {
      return priority(event, boundCallback, { priority: options.priority });
    }
    
    return on(event, boundCallback);
  }
  
  /**
   * 移除指定上下文的所有监听器
   * @param {Object} context - 指定的上下文对象
   * @returns {number} 移除的监听器数量
   */
  function offContext(context) {
    return removeListeners((callback, event) => {
      const meta = metadata.get(callback);
      return meta && meta.context === context;
    });
  }
  
  /**
   * 启用或禁用事件调试
   * @param {boolean} enabled - 是否启用调试
   * @param {Object} [options] - 调试选项
   */
  function debug(enabled, options = {}) {
    debugEnabled = enabled;
    
    if (!enabled) {
      // 清除调试数据
      eventStats.clear();
      eventHistory.length = 0;
      return;
    }
    
    // 设置历史记录大小
    if (options.historySize) {
      MAX_HISTORY = options.historySize;
    }
  }
  
  /**
   * 记录事件调试信息
   * @param {string} event - 事件名称
   * @param {*} data - 事件数据
   * @param {number} listenerCount - 监听器数量
   */
  function logEvent(event, data, listenerCount) {
    if (!debugEnabled) return;
    
    // 更新事件统计
    const stats = eventStats.get(event) || { count: 0, lastTriggered: null };
    stats.count++;
    stats.lastTriggered = new Date();
    eventStats.set(event, stats);
    
    // 添加到历史记录
    eventHistory.unshift({
      event,
      time: new Date(),
      listeners: listenerCount,
      data: debugEnabled ? data : '[数据已省略]'
    });
    
    // 限制历史记录大小
    if (eventHistory.length > MAX_HISTORY) {
      eventHistory.pop();
    }
  }
  
  /**
   * 获取事件统计信息
   * @returns {Object} 统计信息
   */
  function getDebugInfo() {
    if (!debugEnabled) {
      return { enabled: false };
    }
    
    return {
      enabled: true,
      stats: Array.from(eventStats).map(([event, stats]) => ({
        event,
        triggerCount: stats.count,
        lastTriggered: stats.lastTriggered
      })),
      history: [...eventHistory],
      registeredEvents: eventNames(),
      listenerCounts: eventNames().map(event => ({
        event,
        count: listenerCount(event)
      }))
    };
  }
  
  return eventBus;
} 