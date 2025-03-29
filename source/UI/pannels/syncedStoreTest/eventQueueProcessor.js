/**
 * 事件队列处理器模块
 * 负责事件批处理、优先级排序和性能优化
 * @module eventQueueProcessor
 */

/**
 * 创建事件队列处理器
 * 用于管理事件队列，提供事件批处理、优先级排序和节流等功能
 * 
 * @param {Object} options - 配置选项
 * @param {Function} options.dispatch - 事件分发函数，接收(type, event, data)参数
 * @param {number} [options.throttleTime=16] - 事件节流时间(ms)，默认为16ms (~60fps)
 * @param {string[]} [options.highPriorityEvents=[]] - 高优先级事件类型数组，这些事件将立即处理
 * @param {string[]} [options.mergeableEvents=[]] - 可合并事件类型数组，队列中只保留最新的同类事件
 * @param {number} [options.batchSize=10] - 每批处理的最大事件数
 * @param {number} [options.flushInterval=100] - 强制刷新队列的间隔(ms)
 * @param {number} [options.maxQueueSize=1000] - 队列最大长度，超过将移除最早的事件
 * @param {Function} [options.errorHandler] - 错误处理函数，接收(error, eventInfo)参数
 * @returns {Object} 事件队列处理器API
 * 
 * @example
 * // 创建事件队列处理器
 * const queueProcessor = createEventQueueProcessor({
 *   dispatch: (type, event, data) => console.log(type, event, data),
 *   highPriorityEvents: ['keydown', 'mousedown'],
 *   mergeableEvents: ['mousemove', 'scroll']
 * });
 * 
 * // 添加事件到队列
 * queueProcessor.queueEvent('mousemove', mouseEvent, { x: 100, y: 200 });
 */
export const createEventQueueProcessor = (options = {}) => {
  const {
    dispatch,                       // 事件分发函数
    throttleTime = 16,              // 事件节流时间(ms)
    highPriorityEvents = [],        // 高优先级事件类型
    mergeableEvents = [],           // 可合并事件类型
    batchSize = 10,                 // 每批处理的最大事件数
    flushInterval = 100,            // 强制刷新队列的间隔
    maxQueueSize = 1000,            // 队列最大长度
    errorHandler = console.error    // 错误处理函数
  } = options;
  
  // 验证dispatch是可调用的函数
  if (typeof dispatch !== 'function') {
    throw new Error('dispatch必须是一个函数');
  }
  
  // 事件队列
  let eventQueue = [];
  
  // 节流计时器
  let flushTimer = null;
  
  // 配置（使用Map提高查找性能）
  const highPriorityEventMap = new Map();
  const mergeableEventMap = new Map();
  
  // 初始化配置映射
  highPriorityEvents.forEach(type => highPriorityEventMap.set(type, true));
  mergeableEvents.forEach(type => mergeableEventMap.set(type, true));
  
  // 强制刷新计时器
  let forceFlushTimer = null;
  
  // 处理中标志，防止重入
  let isProcessing = false;
  
  // 性能统计
  const stats = {
    totalProcessed: 0,
    lastFlushTime: 0,
    averageProcessingTime: 0,
    maxProcessingTime: 0,
    overflowCount: 0,
    errorCount: 0
  };
  
  /**
   * 将事件添加到队列
   * 根据事件类型决定是立即处理、合并处理还是加入队列
   * 
   * @param {string} type - 事件类型
   * @param {Event|Object} event - 原始事件对象或合成事件
   * @param {Object} [data={}] - 附加数据
   * @returns {boolean} 是否成功将事件添加到队列
   * 
   * @throws {Error} 如果事件类型为空，则抛出错误
   */
  const queueEvent = (type, event, data = {}) => {
    // 参数验证
    if (!type) {
      const error = new Error('事件类型不能为空');
      if (errorHandler) errorHandler(error, { type, data });
      return false;
    }
    
    try {
      // 如果是高优先级事件，立即处理
      if (highPriorityEventMap.has(type)) {
        safeDispatch(type, event, data);
        return true;
      }
      
      // 检查队列是否已满
      if (eventQueue.length >= maxQueueSize) {
        // 移除最早的非合并事件
        const nonMergeableIndex = eventQueue.findIndex(item => !mergeableEventMap.has(item.type));
        if (nonMergeableIndex >= 0) {
          eventQueue.splice(nonMergeableIndex, 1);
        } else {
          // 如果没有非合并事件，移除最早的事件
          eventQueue.shift();
        }
        stats.overflowCount++;
      }
      
      // 对于可合并的事件类型，合并同类型事件
      if (mergeableEventMap.has(type)) {
        for (let i = 0; i < eventQueue.length; i++) {
          if (eventQueue[i].type === type) {
            eventQueue[i] = { type, event, data, timestamp: Date.now() };
            scheduleFlush();
            return true;
          }
        }
      }
      
      // 添加到队列
      eventQueue.push({ type, event, data, timestamp: Date.now() });
      
      // 启动定时器处理
      scheduleFlush();
      return true;
    } catch (error) {
      if (errorHandler) errorHandler(error, { type, data });
      stats.errorCount++;
      return false;
    }
  };
  
  /**
   * 安排队列刷新
   * 处理节流和强制刷新定时器
   * 
   * @private
   */
  const scheduleFlush = () => {
    // 启动定时器，如果尚未启动
    if (!flushTimer) {
      flushTimer = setTimeout(flush, throttleTime);
    }
    
    // 启动强制刷新计时器，确保事件不会在队列中停留太久
    if (!forceFlushTimer) {
      forceFlushTimer = setTimeout(() => {
        if (eventQueue.length > 0) {
          flush();
        }
      }, flushInterval);
    }
  };
  
  /**
   * 安全地调用事件分发函数
   * 包装错误处理
   * 
   * @param {string} type - 事件类型
   * @param {Event|Object} event - 事件对象
   * @param {Object} data - 附加数据
   * @private
   */
  const safeDispatch = (type, event, data) => {
    try {
      dispatch(type, event, data);
    } catch (error) {
      if (errorHandler) errorHandler(error, { type, event, data });
      stats.errorCount++;
    }
  };
  
  /**
   * 刷新事件队列
   * 将队列中的事件分批处理，并在需要时自动排序
   * 
   * @returns {number} 处理的事件数量
   */
  const flush = () => {
    // 如果队列为空或已在处理中，则返回
    if (eventQueue.length === 0 || isProcessing) return 0;
    
    // 设置处理中标志
    isProcessing = true;
    const startTime = performance.now();
    
    // 清除计时器
    clearTimeout(flushTimer);
    clearTimeout(forceFlushTimer);
    flushTimer = null;
    forceFlushTimer = null;
    
    try {
      // 复制队列并清空原队列
      const processBatchSize = Math.min(batchSize, eventQueue.length);
      const eventsToProcess = eventQueue.splice(0, processBatchSize);
      
      // 按时间戳排序
      eventsToProcess.sort((a, b) => a.timestamp - b.timestamp);
      
      // 按照事件类型分组处理
      const eventsByType = new Map();
      
      // 分组事件
      for (const e of eventsToProcess) {
        const { type, event, data } = e;
        if (!eventsByType.has(type)) {
          eventsByType.set(type, []);
        }
        eventsByType.get(type).push({ event, data });
      }
      
      // 处理事件
      let processedCount = 0;
      
      for (const [type, events] of eventsByType.entries()) {
        // 对于可合并事件，只处理最新的一个
        const toProcess = mergeableEventMap.has(type) ? 
          [events[events.length - 1]] : events;
        
        for (const { event, data } of toProcess) {
          safeDispatch(type, event, data);
          processedCount++;
        }
      }
      
      // 更新统计信息
      stats.totalProcessed += processedCount;
      
      // 如果队列中还有事件，继续处理
      if (eventQueue.length > 0) {
        flushTimer = setTimeout(flush, throttleTime);
      }
      
      // 计算处理时间并更新统计信息
      const processingTime = performance.now() - startTime;
      stats.lastFlushTime = processingTime;
      stats.averageProcessingTime = 
        (stats.averageProcessingTime * 0.9) + (processingTime * 0.1); // 指数平滑
      stats.maxProcessingTime = Math.max(stats.maxProcessingTime, processingTime);
      
      return processedCount;
    } catch (error) {
      if (errorHandler) errorHandler(error, { queueLength: eventQueue.length });
      stats.errorCount++;
      return 0;
    } finally {
      // 清除处理中标志
      isProcessing = false;
    }
  };
  
  /**
   * 设置事件优先级
   * 决定事件是立即处理还是加入队列
   * 
   * @param {string} eventType - 事件类型
   * @param {boolean} isHighPriority - 是否为高优先级
   */
  const setPriority = (eventType, isHighPriority) => {
    if (!eventType) return;
    
    if (isHighPriority) {
      highPriorityEventMap.set(eventType, true);
    } else {
      highPriorityEventMap.delete(eventType);
    }
  };
  
  /**
   * 设置事件是否可合并
   * 可合并事件在队列中仅保留最新的一个
   * 
   * @param {string} eventType - 事件类型
   * @param {boolean} isMergeable - 是否可合并
   */
  const setMergeable = (eventType, isMergeable) => {
    if (!eventType) return;
    
    if (isMergeable) {
      mergeableEventMap.set(eventType, true);
    } else {
      mergeableEventMap.delete(eventType);
    }
  };
  
  /**
   * 获取队列信息和统计数据
   * 
   * @returns {Object} 队列信息和性能统计
   */
  const getQueueInfo = () => {
    return {
      queueLength: eventQueue.length,
      highPriorityEvents: [...highPriorityEventMap.keys()],
      mergeableEvents: [...mergeableEventMap.keys()],
      oldestEvent: eventQueue.length > 0 ? eventQueue[0].timestamp : null,
      isProcessing,
      stats: { ...stats }
    };
  };
  
  /**
   * 重置统计信息
   */
  const resetStats = () => {
    Object.keys(stats).forEach(key => {
      stats[key] = 0;
    });
  };
  
  /**
   * 清理资源
   * 在组件卸载或不再需要时调用
   */
  const cleanup = () => {
    clearTimeout(flushTimer);
    clearTimeout(forceFlushTimer);
    flushTimer = null;
    forceFlushTimer = null;
    eventQueue = [];
    isProcessing = false;
  };
  
  // 返回公共API
  return {
    queueEvent,
    flush,
    getQueueInfo,
    setPriority,
    setMergeable,
    resetStats,
    cleanup
  };
}; 