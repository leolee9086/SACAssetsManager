/**
 * @fileoverview 事件系统诊断模块
 * 
 * @description
 * 提供系统自检和调试功能。该模块用于监控事件系统的健康状态，
 * 诊断潜在问题，提供详细的运行时信息，辅助开发和维护。
 * 
 * @module systemDiagnostics
 * 
 * @example
 * // 基本使用方法：
 * import { createSystemDiagnostics } from './systemDiagnostics.js';
 * 
 * const diagnostics = createSystemDiagnostics({
 *   eventDispatcher: myDispatcher,
 *   eventNormalizer: myNormalizer,
 *   eventProcessors: {
 *     keyboard: keyboardHandler,
 *     mouse: mouseHandler
 *   },
 *   getState: () => eventState.value,
 *   logLevel: 'warn'
 * });
 * 
 * // 运行系统自检
 * const results = diagnostics.runDiagnostics();
 * console.log(results);
 * 
 * // 获取系统快照
 * const snapshot = diagnostics.getSystemSnapshot();
 * 
 * // 设置日志级别
 * diagnostics.setLogLevel('debug');
 * 
 * @function createSystemDiagnostics
 * @param {Object} options - 配置选项
 * @param {Object} [options.eventDispatcher=null] - 事件调度器实例
 * @param {Object} [options.eventNormalizer=null] - 事件标准化器实例
 * @param {Object} [options.eventProcessors={}] - 各事件处理器实例映射
 * @param {Function} [options.getState=()=>{}] - 获取事件系统状态的函数
 * @param {string} [options.logLevel='warn'] - 日志级别（debug|info|warn|error|none）
 * @returns {Object} 系统诊断工具API
 * 
 * @property {Function} runDiagnostics - 执行系统自检并返回结果
 * @property {Function} getSystemSnapshot - 获取系统状态快照
 * @property {Function} setLogLevel - 设置日志级别
 * @property {string[]} logLevels - 可用的日志级别列表
 * 
 * @maintainer 此模块需要特别注意以下维护问题：
 * 1. 诊断性能：确保诊断过程不会明显影响事件系统性能
 * 2. 日志管理：避免在生产环境产生过多日志
 * 3. 接口检测：当相关模块API变更时，同步更新接口检测逻辑
 * 4. 维护独立性：诊断模块不应成为事件系统正常运行的必要依赖
 * 5. 安全考虑：确保诊断信息不会泄露敏感数据
 * 
 * @version 1.0.0
 */

/**
 * 创建系统诊断工具
 * @param {Object} options - 配置项
 * @returns {Object} 诊断工具API
 */
export const createSystemDiagnostics = (options = {}) => {
  const {
    eventDispatcher = null,        // 事件调度器
    eventNormalizer = null,        // 事件标准化器
    eventProcessors = {},          // 各事件处理器
    getState = () => ({}),         // 获取状态函数
    logLevel = 'warn'              // 日志级别
  } = options;
  
  // 日志级别配置
  const LogLevels = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    NONE: 4
  };
  
  // 当前日志级别
  let currentLogLevel = LogLevels[logLevel.toUpperCase()] || LogLevels.WARN;
  
  /**
   * 记录日志
   * @param {number} level - 日志级别
   * @param {...any} args - 日志参数
   */
  const log = (level, ...args) => {
    if (level >= currentLogLevel) {
      const methods = {
        [LogLevels.DEBUG]: console.debug,
        [LogLevels.INFO]: console.info,
        [LogLevels.WARN]: console.warn,
        [LogLevels.ERROR]: console.error
      };
      
      const method = methods[level] || console.log;
      method('[事件系统诊断]', ...args);
    }
  };
  
  /**
   * 执行系统自检
   * @returns {Object} 自检结果
   */
  const runDiagnostics = () => {
    const results = {
      passed: true,
      components: {},
      errors: [],
      warnings: []
    };
    
    // 检查事件标准化器
    if (eventNormalizer) {
      const normalizerRequiredMethods = ['normalizeEvent', 'createSyntheticEvent'];
      const missingNormalizerMethods = normalizerRequiredMethods.filter(
        method => typeof eventNormalizer[method] !== 'function'
      );
      
      results.components.eventNormalizer = {
        status: missingNormalizerMethods.length === 0 ? 'passed' : 'failed',
        missingMethods: missingNormalizerMethods
      };
      
      if (missingNormalizerMethods.length > 0) {
        results.passed = false;
        results.errors.push(`事件标准化器缺少必要方法: ${missingNormalizerMethods.join(', ')}`);
      }
    } else {
      results.components.eventNormalizer = { status: 'missing' };
      results.warnings.push('未提供事件标准化器');
    }
    
    // 检查事件调度器
    if (eventDispatcher) {
      const dispatcherRequiredMethods = [
        'addEventListener', 'removeEventListener', 'dispatch', 
        'emitEvent', 'cleanup', 'getStats'
      ];
      const missingDispatcherMethods = dispatcherRequiredMethods.filter(
        method => typeof eventDispatcher[method] !== 'function'
      );
      
      results.components.eventDispatcher = {
        status: missingDispatcherMethods.length === 0 ? 'passed' : 'failed',
        missingMethods: missingDispatcherMethods
      };
      
      if (missingDispatcherMethods.length > 0) {
        results.passed = false;
        results.errors.push(`事件调度器缺少必要方法: ${missingDispatcherMethods.join(', ')}`);
      }
    } else {
      results.components.eventDispatcher = { status: 'missing' };
      results.passed = false;
      results.errors.push('未提供事件调度器');
    }
    
    // 检查各事件处理器
    Object.entries(eventProcessors).forEach(([name, processor]) => {
      if (!processor) {
        results.components[name] = { status: 'missing' };
        results.warnings.push(`未提供${name}处理器`);
        return;
      }
      
      // 检查处理器必要方法
      const requiredMethods = ['bindEvents', 'cleanup'];
      const missingMethods = requiredMethods.filter(
        method => typeof processor[method] !== 'function'
      );
      
      results.components[name] = {
        status: missingMethods.length === 0 ? 'passed' : 'failed',
        missingMethods
      };
      
      if (missingMethods.length > 0) {
        results.warnings.push(`${name}处理器缺少方法: ${missingMethods.join(', ')}`);
      }
    });
    
    // 记录诊断结果
    if (results.passed) {
      log(LogLevels.INFO, '系统自检通过');
    } else {
      log(LogLevels.ERROR, '系统自检失败', results.errors);
    }
    
    if (results.warnings.length > 0) {
      log(LogLevels.WARN, '系统自检警告', results.warnings);
    }
    
    return results;
  };
  
  /**
   * 获取系统状态快照
   * @returns {Object} 系统状态
   */
  const getSystemSnapshot = () => {
    const state = getState();
    const dispatcherStats = eventDispatcher?.getStats() || {};
    const errorMetrics = eventDispatcher?.getErrorMetrics() || {};
    
    return {
      timestamp: Date.now(),
      state,
      stats: dispatcherStats,
      errors: errorMetrics,
      diagnostics: runDiagnostics()
    };
  };
  
  /**
   * 设置日志级别
   * @param {string} level - 日志级别
   */
  const setLogLevel = (level) => {
    currentLogLevel = LogLevels[level.toUpperCase()] || currentLogLevel;
  };
  
  // 返回公共API
  return {
    runDiagnostics,
    getSystemSnapshot,
    setLogLevel,
    logLevels: Object.keys(LogLevels)
  };
}; 