/**
 * 通用日志系统
 * 提供灵活的日志记录功能，适用于任何模块
 * 
 * @param {String} level 日志级别: 'none', 'error', 'warn', 'info', 'debug', 'verbose'
 * @param {Object} options 日志配置选项
 * @param {String} options.prefix 日志前缀
 * @param {Boolean} options.includeTimestamp 是否包含时间戳
 * @param {Function} options.errorCallback 错误回调函数
 * @param {Boolean} options.logToConsole 是否输出到控制台
 * @param {Array} options.logHistory 日志历史记录数组（传入引用可记录所有日志）
 * @param {Number} options.maxHistory 最大历史记录数量
 * @param {Function} options.formatter 自定义日志格式化函数
 * @param {Object} options.transport 自定义日志传输对象
 * @returns {Object} 日志对象
 */
export function createLogger(level = 'error', options = {}) {
  const {
    prefix = '',
    includeTimestamp = false,
    errorCallback = null,
    logToConsole = true,
    logHistory = null,
    maxHistory = 1000,
    formatter = null,
    transport = null,
  } = options;
  
  const levels = {
    'none': 0,
    'error': 1,
    'warn': 2,
    'info': 3,
    'debug': 4,
    'verbose': 5
  };
  
  let currentLevel = levels[level] || levels.error;
  
  // 默认的日志格式化函数
  const defaultFormatter = (type, args) => {
    const timestamp = includeTimestamp ? `[${new Date().toISOString()}] ` : '';
    const prefixStr = prefix ? `${prefix} ` : '';
    return `${timestamp}${prefixStr}${args.join(' ')}`;
  };
  
  // 使用自定义格式化函数或默认函数
  const formatMessage = formatter || defaultFormatter;
  
  // 记录日志历史
  const recordLog = (type, message) => {
    if (logHistory && Array.isArray(logHistory)) {
      logHistory.push({
        type,
        message,
        timestamp: new Date(),
      });
      
      // 控制日志历史数量
      if (logHistory.length > maxHistory) {
        logHistory.shift();
      }
    }
  };
  
  // 处理日志输出
  const logHandler = (type, args) => {
    if (levels[type] <= currentLevel) {
      const message = formatMessage(type, args);
      
      // 使用自定义传输或默认控制台输出
      if (transport && typeof transport[type] === 'function') {
        transport[type](message, ...args);
      } else if (logToConsole) {
        switch (type) {
          case 'error': console.error(message); break;
          case 'warn': console.warn(message); break;
          case 'info': console.info(message); break;
          case 'debug': 
          case 'verbose':
          default: console.log(message);
        }
      }
      
      recordLog(type, message);
      
      // 错误回调处理
      if (type === 'error' && errorCallback && typeof errorCallback === 'function') {
        try {
          errorCallback(type, message, args);
        } catch (e) {
          console.error('日志错误回调执行失败:', e);
        }
      }
    }
  };
  
  // 创建日志实例
  const logger = {
    error: (...args) => logHandler('error', args),
    warn: (...args) => logHandler('warn', args),
    info: (...args) => logHandler('info', args),
    debug: (...args) => logHandler('debug', args),
    verbose: (...args) => logHandler('verbose', args),
    
    // 带标签的子日志器
    tag: (tagName) => {
      const newPrefix = prefix ? `${prefix}:${tagName}` : tagName;
      return createLogger(
        Object.keys(levels).find(key => levels[key] === currentLevel) || 'error', 
        { ...options, prefix: newPrefix }
      );
    },
    
    // 日志级别控制
    getLevel: () => {
      return Object.keys(levels).find(key => levels[key] === currentLevel) || 'unknown';
    },
    
    setLevel: (newLevel) => {
      if (levels[newLevel] !== undefined) {
        currentLevel = levels[newLevel];
        return true;
      }
      return false;
    },
    
    // 日志历史记录管理
    getHistory: () => {
      return logHistory ? [...logHistory] : [];
    },
    
    clearHistory: () => {
      if (logHistory && Array.isArray(logHistory)) {
        logHistory.length = 0;
      }
    },
    
    // 工具方法：条件日志记录
    logIf: (condition, level, ...args) => {
      if (condition && logger[level]) {
        logger[level](...args);
      }
    },
    
    // 工具方法：性能计时
    time: (label) => {
      if (currentLevel >= levels.debug) {
        console.time(label);
      }
    },
    
    timeEnd: (label) => {
      if (currentLevel >= levels.debug) {
        console.timeEnd(label);
      }
    },
    
    // 创建子日志器，可以继承父日志器的配置，但有自己的级别设置
    child: (childOptions = {}) => {
      return createLogger(
        childOptions.level || Object.keys(levels).find(key => levels[key] === currentLevel) || 'error',
        { ...options, ...childOptions }
      );
    }
  };
  
  return logger;
}

// 默认导出一个全局日志实例
export default createLogger('error'); 