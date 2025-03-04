import { ref, computed } from '../../../../static/vue.esm-browser.js';

/**
 * 提供统一的错误处理和日志记录功能
 * @param {Object} options - 配置选项
 * @param {Boolean} options.fallbackToStandard - 遇到错误时是否回退到标准模式
 * @param {Number} options.stabilityThreshold - 出错次数阈值，超过将触发回退
 * @param {Function} options.onCriticalError - 严重错误发生时的回调函数
 * @param {Boolean} options.debugMode - 是否启用调试模式
 * @param {String} options.logLevel - 日志级别 ('debug', 'info', 'warn', 'error', 'none')
 * @returns {Object} - 错误处理工具集
 */
export function useErrorHandling(options = {}) {
  // 默认选项
  const defaultOptions = {
    fallbackToStandard: true,
    stabilityThreshold: 5,
    onCriticalError: null,
    debugMode: false,
    logLevel: 'warn' // 默认仅记录警告和错误
  };
  
  const opts = { ...defaultOptions, ...options };
  
  // 状态
  const errorCount = ref(0);
  const errorLog = ref([]);
  const lastError = ref(null);
  const isFallbackMode = ref(false);
  
  // 日志级别映射
  const logLevels = {
    'debug': 0,
    'info': 1,
    'warn': 2,
    'error': 3,
    'none': 4
  };
  
  /**
   * 记录错误并增加错误计数
   * @param {Error|String} error - 错误对象或错误信息
   * @param {String} context - 错误发生的上下文
   * @param {Boolean} isCritical - 是否为严重错误
   */
  function logError(error, context = '未知上下文', isCritical = false) {
    if (logLevels[opts.logLevel] <= logLevels.error) {
      console.error(`${context}:`, error);
    }
    
    // 创建错误记录
    const timestamp = new Date().toISOString();
    const errorObj = {
      message: error?.message || String(error),
      stack: error?.stack,
      context,
      timestamp,
      isCritical
    };
    
    // 更新状态
    errorCount.value++;
    lastError.value = errorObj;
    errorLog.value.push(errorObj);
    
    // 限制日志大小
    if (errorLog.value.length > 100) {
      errorLog.value.shift();
    }
    
    // 严重错误处理
    if (isCritical && typeof opts.onCriticalError === 'function') {
      try {
        opts.onCriticalError(errorObj);
      } catch (callbackError) {
        // 避免回调中的错误导致无限循环
        if (logLevels[opts.logLevel] <= logLevels.error) {
          console.error('错误回调执行失败:', callbackError);
        }
      }
    }
    
    // 检查是否需要回退
    checkFallbackCondition();
  }
  
  /**
   * 检查是否需要回退到标准模式
   */
  function checkFallbackCondition() {
    if (opts.fallbackToStandard && !isFallbackMode.value && errorCount.value >= opts.stabilityThreshold) {
      isFallbackMode.value = true;
      
      if (logLevels[opts.logLevel] <= logLevels.warn) {
        console.warn(`发生${errorCount.value}次错误，回退到标准模式`);
      }
      
      // 触发回调
      if (typeof opts.onCriticalError === 'function') {
        try {
          opts.onCriticalError({
            message: '达到错误阈值，回退到标准模式',
            context: '稳定性检查',
            timestamp: new Date().toISOString(),
            isCritical: true
          });
        } catch (error) {
          // 避免回调中的错误
          if (logLevels[opts.logLevel] <= logLevels.error) {
            console.error('回退模式回调执行失败:', error);
          }
        }
      }
    }
  }
  
  /**
   * 安全执行函数，捕获并处理任何错误
   * @param {Function} fn - 要执行的函数
   * @param {String} context - 执行上下文
   * @param {Function} onError - 错误处理回调
   * @param {Boolean} isCritical - 是否为关键操作
   * @returns {*} - 函数的返回值，出错时返回undefined
   */
  function safeExecute(fn, context = '未知操作', onError = null, isCritical = false) {
    try {
      return fn();
    } catch (error) {
      logError(error, context, isCritical);
      
      if (typeof onError === 'function') {
        try {
          onError(error);
        } catch (callbackError) {
          // 避免错误处理回调中的错误
          if (logLevels[opts.logLevel] <= logLevels.error) {
            console.error('错误处理回调执行失败:', callbackError);
          }
        }
      }
      
      return undefined;
    }
  }
  
  /**
   * 记录警告信息
   * @param {String} message - 警告信息
   * @param {String} context - 警告上下文
   */
  function logWarning(message, context = '未知上下文') {
    if (logLevels[opts.logLevel] <= logLevels.warn) {
      console.warn(`${context}: ${message}`);
    }
  }
  
  /**
   * 记录信息
   * @param {String} message - 信息内容
   * @param {String} context - 信息上下文
   */
  function logInfo(message, context = '未知上下文') {
    if (logLevels[opts.logLevel] <= logLevels.info) {
      console.info(`${context}: ${message}`);
    }
  }
  
  /**
   * 记录调试信息
   * @param {String} message - 调试信息
   * @param {String} context - 调试上下文
   */
  function logDebug(message, context = '未知上下文') {
    if (opts.debugMode && logLevels[opts.logLevel] <= logLevels.debug) {
      console.debug(`${context}: ${message}`);
    }
  }
  
  /**
   * 重置错误状态
   */
  function resetErrorState() {
    errorCount.value = 0;
    isFallbackMode.value = false;
    lastError.value = null;
    // 保留错误日志以便调试
  }
  
  /**
   * 创建带上下文的错误处理器
   * @param {String} contextName - 上下文名称
   * @returns {Object} - 带上下文的错误处理工具
   */
  function createContextLogger(contextName) {
    return {
      logError: (error, isCritical = false) => logError(error, contextName, isCritical),
      logWarning: (message) => logWarning(message, contextName),
      logInfo: (message) => logInfo(message, contextName),
      logDebug: (message) => logDebug(message, contextName),
      safeExecute: (fn, onError = null, isCritical = false) => 
        safeExecute(fn, contextName, onError, isCritical)
    };
  }
  
  // 导出的API
  return {
    // 状态
    errorCount,
    isFallbackMode,
    lastError,
    errorLog: computed(() => errorLog.value),
    
    // 方法
    logError,
    logWarning,
    logInfo,
    logDebug,
    safeExecute,
    resetErrorState,
    createContextLogger,
    
    // 工具
    shouldFallback: computed(() => isFallbackMode.value)
  };
} 