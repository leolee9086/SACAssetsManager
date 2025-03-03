import { createEventBus } from './core/eventEmitter.js';

// 导入导出工具
import { exportToJson } from './exporters/jsonExporter.js';
import { exportToCsv } from './exporters/csvExporter.js';
import { exportToTimeline } from './exporters/timelineExporter.js';
// 导入默认配置
import { defaultDetectionParams } from './config/detectionParams.js';
// 导入预设配置
import { presets } from './config/presets.js';
// 将状态管理抽取为独立模块
import { createDetectorState } from './state/detectorState.js';
// 将处理逻辑抽取为单独模块
import { createAudioProcessor } from './processors/audioProcessor.js';
// 将可视化逻辑抽取为单独模块
import { createVisualizer } from './visualization/visualizer.js';

// 创建自定义错误类 - 增强错误类型系统
class BeatDetectorError extends Error {
  constructor(context, originalError, errorCode) {
    super(`${context}: ${originalError?.message || '未知错误'}`);
    this.name = 'BeatDetectorError';
    this.context = context;
    this.originalError = originalError;
    this.errorCode = errorCode || 'ERR_UNKNOWN';
    this.timestamp = Date.now();
  }
  
  // 添加错误信息格式化方法
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      context: this.context,
      errorCode: this.errorCode,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

// 改进错误处理服务 - 增加错误重试和详细日志
const createErrorHandler = (eventBus) => {
  // 错误代码映射表
  const ERROR_CODES = {
    AUDIO_LOAD: 'ERR_AUDIO_LOAD',
    ANALYSIS: 'ERR_ANALYSIS',
    EXPORT: 'ERR_EXPORT',
    CONFIG: 'ERR_CONFIG',
    WORKER: 'ERR_WORKER',
    MEMORY: 'ERR_MEMORY',
    TIMEOUT: 'ERR_TIMEOUT',
    BROWSER_SUPPORT: 'ERR_BROWSER_SUPPORT'
  };
  
  // 错误严重级别
  const SEVERITY = {
    INFO: 'info',
    WARNING: 'warning',
    ERROR: 'error',
    FATAL: 'fatal'
  };
  
  // 错误历史记录
  const errorHistory = [];
  const MAX_ERROR_HISTORY = 50;
  
  return {
    ERROR_CODES,
    SEVERITY,
    
    /**
     * 处理错误并决定是否抛出
     * @param {string} context - 错误上下文
     * @param {Error} error - 原始错误
     * @param {string} errorCode - 错误代码
     * @param {string} severity - 错误严重级别
     * @param {boolean} throwError - 是否抛出错误
     * @returns {BeatDetectorError|void} 包装后的错误
     */
    handleError(context, error, errorCode = ERROR_CODES.ERROR, severity = SEVERITY.ERROR, throwError = true) {
      const wrappedError = new BeatDetectorError(context, error, errorCode);
      
      // 保存到错误历史
      errorHistory.unshift({
        error: wrappedError,
        severity,
        timestamp: wrappedError.timestamp
      });
      
      // 限制历史记录大小
      if (errorHistory.length > MAX_ERROR_HISTORY) {
        errorHistory.pop();
      }
      
      // 发送带严重级别的错误事件
      eventBus.emit('error', { 
        message: context, 
        error: wrappedError,
        severity,
        timestamp: wrappedError.timestamp
      });
      
      // 条件性记录错误日志
      if (severity === SEVERITY.FATAL || severity === SEVERITY.ERROR) {
        console.error(`[BeatDetector] ${severity.toUpperCase()}:`, wrappedError);
      }
      
      if (throwError) {
        throw wrappedError;
      }
      
      return wrappedError;
    },
    
    // 添加警告处理方法
    warning(context, message) {
      eventBus.emit('warning', { 
        context, 
        message,
        timestamp: Date.now()
      });
      console.warn(`[BeatDetector] WARNING: ${context} - ${message}`);
    },
    
    // 添加信息日志方法
    info(context, message) {
      eventBus.emit('info', {
        context,
        message,
        timestamp: Date.now()
      });
      
      if (window.DEBUG_BEAT_DETECTOR) {
        console.info(`[BeatDetector] INFO: ${context} - ${message}`);
      }
    },
    
    // 获取错误历史记录
    getErrorHistory() {
      return [...errorHistory];
    },
    
    // 清除错误历史
    clearErrorHistory() {
      errorHistory.length = 0;
    }
  };
};

// 优化导出服务 - 增加错误处理和缓存
const createExportService = (state, errorHandler) => {
  // 添加结果缓存
  const cache = new Map();
  
  return {
    /**
     * 导出分析结果
     * @param {string} format - 导出格式
     * @param {Object} data - 要导出的数据
     * @param {Object} options - 导出选项
     * @returns {*} 导出的结果
     */
    export(format, data, options = {}) {
      try {
        const formatLower = format.toLowerCase();
        const cacheKey = `${formatLower}-${JSON.stringify(options)}`;
        
        // 检查缓存
        if (!options.skipCache && cache.has(cacheKey)) {
          return cache.get(cacheKey);
        }
        
        let result;
        switch(formatLower) {
          case 'json':
            result = exportToJson(data, options);
            break;
          case 'csv':
            result = exportToCsv(data, options);
            break;
          case 'timeline':
            result = exportToTimeline(data, options);
            break;
          default:
            throw new Error(`不支持的导出格式: ${format}`);
        }
        
        // 缓存结果
        if (!options.skipCache) {
          cache.set(cacheKey, result);
        }
        
        return result;
      } catch (err) {
        return errorHandler.handleError(
          `导出${format}格式失败`, 
          err, 
          errorHandler.ERROR_CODES.EXPORT
        );
      }
    },
    
    // 清除缓存
    clearCache() {
      cache.clear();
    }
  };
};

// 改进的浏览器兼容性检测
const checkBrowserSupport = () => {
  const unsupportedFeatures = [];
  const warnings = [];
  
  // 检查核心功能支持
  if (!window.AudioContext && !window.webkitAudioContext) {
    unsupportedFeatures.push('AudioContext');
  }
  
  if (!window.Worker) {
    unsupportedFeatures.push('Web Workers');
  }
  
  // 检查可选功能
  if (!(window.performance && performance.now)) {
    warnings.push('performance.now() API不可用，性能监控将被禁用');
  }
  
  // 检查音频工作线程支持
  const audioWorkletSupport = !!(window.AudioWorkletNode && 
                               (window.AudioContext || window.webkitAudioContext)?.prototype?.audioWorklet);
  if (!audioWorkletSupport) {
    warnings.push('AudioWorklet不可用，将使用备用方案');
  }
  
  // 检查SharedArrayBuffer支持（用于更高效的线程通信）
  const sharedArrayBufferSupport = typeof SharedArrayBuffer !== 'undefined';
  if (!sharedArrayBufferSupport) {
    warnings.push('SharedArrayBuffer不可用，跨线程性能将受限');
  }
  
  return { unsupportedFeatures, warnings, audioWorkletSupport, sharedArrayBufferSupport };
};

// 优化的深度合并函数 - 增加类型检查和安全措施
const deepMerge = (target, source) => {
  // 类型检查提前退出
  if (!source || typeof source !== 'object') return target;
  if (!target || typeof target !== 'object') return { ...source };
  
  // 处理数组合并
  if (Array.isArray(target) && Array.isArray(source)) {
    return [...source]; // 选择替换策略，可根据需求修改
  }
  
  // 防止合并不兼容的类型
  if (Array.isArray(target) !== Array.isArray(source)) {
    return { ...source }; // 类型不兼容时使用源对象
  }
  
  // 创建目标对象的副本
  const output = { ...target };
  
  // 防止无限递归的最大深度
  const MAX_MERGE_DEPTH = 20;
  
  // 递归合并函数
  const mergeRecursive = (tgt, src, depth = 0) => {
    // 防止过深递归
    if (depth > MAX_MERGE_DEPTH) {
      console.warn('deepMerge: 达到最大递归深度');
      return src;
    }
    
    // 基本情况：非对象直接返回
    if (!src || typeof src !== 'object') return src;
    if (!tgt || typeof tgt !== 'object') return { ...src };
    
    // 处理数组
    if (Array.isArray(src)) return [...src];
    
    const result = { ...tgt };
    
    // 合并所有属性
    for (const key in src) {
      if (Object.prototype.hasOwnProperty.call(src, key)) {
        const srcVal = src[key];
        const tgtVal = tgt[key];
        
        // 递归合并对象
        if (srcVal && typeof srcVal === 'object' && 
            tgtVal && typeof tgtVal === 'object' && 
            !Array.isArray(srcVal) && !Array.isArray(tgtVal)) {
          result[key] = mergeRecursive(tgtVal, srcVal, depth + 1);
        } else {
          result[key] = srcVal;
        }
      }
    }
    
    return result;
  };
  
  return mergeRecursive(output, source);
};

// 改进的性能监控 - 增加更多自动清理和平均值计算
const createPerformanceMonitor = (eventBus, options = {}) => {
  const HISTORY_LIMIT = options.metricsHistoryLimit || 100;
  
  return {
    markers: {},
    durations: {},
    counts: {},
    history: {}, // 存储历史性能数据
    
    mark(name) {
      // 使用高精度时间或降级
      this.markers[name] = (window.performance && performance.now) ? 
        performance.now() : Date.now();
      return this.markers[name];
    },
    
    measure(start, end, category = 'default') {
      if (!this.markers[start] || !this.markers[end]) {
        return null;
      }
      
      const duration = this.markers[end] - this.markers[start];
      const measureName = `${start}-${end}`;
      
      // 记录持续时间统计
      if (!this.durations[measureName]) {
        this.durations[measureName] = {
          min: duration,
          max: duration,
          total: duration,
          count: 1,
          average: duration,
          category
        };
      } else {
        const stat = this.durations[measureName];
        stat.min = Math.min(stat.min, duration);
        stat.max = Math.max(stat.max, duration); 
        stat.total += duration;
        stat.count++;
        stat.average = stat.total / stat.count;
      }
      
      // 记录历史数据用于趋势分析
      if (!this.history[measureName]) {
        this.history[measureName] = [];
      }
      
      this.history[measureName].push({
        duration,
        timestamp: Date.now()
      });
      
      // 限制历史记录大小
      while (this.history[measureName].length > HISTORY_LIMIT) {
        this.history[measureName].shift();
      }
      
      // 发送性能事件
      eventBus.emit('performanceMeasure', {
        name: measureName,
        duration,
        category,
        stats: { ...this.durations[measureName] }
      });
      
      return duration;
    },
    
    count(name, category = 'default') {
      if (!this.counts[name]) {
        this.counts[name] = { count: 1, category };
      } else {
        this.counts[name].count++;
      }
      
      return this.counts[name].count;
    },
    
    getMetrics() {
      return { 
        markers: { ...this.markers },
        durations: { ...this.durations },
        counts: { ...this.counts }
      };
    },
    
    // 获取趋势分析数据
    getTrends(measureName) {
      if (!this.history[measureName]) {
        return null;
      }
      
      const data = this.history[measureName];
      if (data.length < 2) return null;
      
      // 计算趋势线
      let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
      const n = data.length;
      
      data.forEach((point, i) => {
        sumX += i;
        sumY += point.duration;
        sumXY += i * point.duration;
        sumX2 += i * i;
      });
      
      // 线性回归: y = mx + b
      const m = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) || 0;
      const b = (sumY - m * sumX) / n || 0;
      
      return {
        slope: m, // 正值表示性能在下降，负值表示性能在提升
        intercept: b,
        improving: m < 0,
        data: [...data]
      };
    },
    
    // 清理特定类别的指标
    clearCategory(category) {
      for (const key in this.durations) {
        if (this.durations[key].category === category) {
          delete this.durations[key];
          delete this.history[key];
        }
      }
      
      for (const key in this.counts) {
        if (this.counts[key].category === category) {
          delete this.counts[key];
        }
      }
    },
    
    reset() {
      this.markers = {};
      this.durations = {};
      this.counts = {};
      this.history = {};
    }
  };
};

/**
 * 创建音频卡点检测器
 * @param {Object} options - 检测配置选项
 * @returns {Object} 卡点检测器API
 */
function createBeatDetector(options = {}) {
  // 检查浏览器兼容性
  const { unsupportedFeatures, warnings, audioWorkletSupport, sharedArrayBufferSupport } = checkBrowserSupport();
  
  // 事件总线优先创建，确保错误处理可用
  const eventBus = createEventBus();
  
  // 创建错误处理器
  const errorHandler = createErrorHandler(eventBus);
  
  // 记录兼容性警告
  warnings.forEach(warning => {
    errorHandler.warning('浏览器兼容性', warning);
  });
  
  try {
    // 检查关键浏览器兼容性
    if (unsupportedFeatures.length > 0) {
      throw new Error(`浏览器不支持以下必要功能: ${unsupportedFeatures.join(', ')}`);
    }
    
    // 检查和合并配置
    if (!options) options = {};
    
    // 选择最佳处理模式
    const processingMode = determineOptimalProcessingMode(audioWorkletSupport, sharedArrayBufferSupport);
    
    // 防止配置错误
    let mergedConfig;
    try {
      const userConfig = options.preset ? 
        deepMerge(defaultDetectionParams, presets[options.preset] || {}) : 
        defaultDetectionParams;
      
      mergedConfig = deepMerge(userConfig, options);
      
      // 添加自动检测到的处理模式
      mergedConfig.processingMode = processingMode;
    } catch (configError) {
      errorHandler.warning('配置合并失败，使用默认配置', configError.message);
      mergedConfig = { 
        ...defaultDetectionParams,
        processingMode
      };
    }
    
    // 使用不可变配置
    const configRef = { ...mergedConfig };
    const config = Object.freeze({ ...configRef });
    
    // 创建性能监控
    const performance = createPerformanceMonitor(eventBus, config);
    
    // 创建模块化组件 - 注入错误处理器
    const state = createDetectorState(eventBus, errorHandler);
    const processor = createAudioProcessor(config, state, eventBus, errorHandler);
    const visualizer = createVisualizer(state, eventBus, errorHandler);
    const exportService = createExportService(state, errorHandler);
    
    // 资源管理系统 - 跟踪并确保释放
    const resourceManager = {
      resources: new Set(),
      
      register(resource, disposeMethod = 'dispose') {
        if (resource && typeof resource[disposeMethod] === 'function') {
          this.resources.add({ resource, disposeMethod });
          return true;
        }
        return false;
      },
      
      async releaseAll() {
        const releasePromises = [];
        
        for (const { resource, disposeMethod } of this.resources) {
          try {
            const disposeResult = resource[disposeMethod]();
            if (disposeResult instanceof Promise) {
              releasePromises.push(disposeResult);
            }
          } catch (err) {
            errorHandler.warning('释放资源失败', err.message);
          }
        }
        
        this.resources.clear();
        
        if (releasePromises.length > 0) {
          await Promise.all(releasePromises);
        }
      }
    };
    
    // 注册需要释放的资源
    resourceManager.register(processor);
    resourceManager.register(visualizer);
    
    // 添加内存监控
    const memoryMonitor = {
      warningThresholdMB: 200,
      criticalThresholdMB: 500,
      checkInterval: null,
      
      startMonitoring(intervalMs = 30000) {
        if (this.checkInterval) return;
        
        this.checkInterval = setInterval(() => {
          this.checkMemoryUsage();
        }, intervalMs);
      },
      
      stopMonitoring() {
        if (this.checkInterval) {
          clearInterval(this.checkInterval);
          this.checkInterval = null;
        }
      },
      
      checkMemoryUsage() {
        // 只在支持 performance.memory 的浏览器中工作
        if (window.performance && performance.memory) {
          const usedHeapMB = performance.memory.usedJSHeapSize / (1024 * 1024);
          
          eventBus.emit('memoryUsage', {
            usedHeapMB,
            totalHeapMB: performance.memory.totalJSHeapSize / (1024 * 1024),
            timestamp: Date.now()
          });
          
          if (usedHeapMB > this.criticalThresholdMB) {
            errorHandler.warning('内存使用临界', `内存使用率高: ${Math.round(usedHeapMB)}MB`);
            this.attemptMemoryRecovery();
          } else if (usedHeapMB > this.warningThresholdMB) {
            errorHandler.info('内存使用警告', `内存使用率较高: ${Math.round(usedHeapMB)}MB`);
          }
        }
      },
      
      attemptMemoryRecovery() {
        // 尝试恢复内存
        exportService.clearCache();
        
        // 强制垃圾回收不是可行的，但可以移除对大型对象的引用
        state.compactData();
        
        if (window.gc && typeof window.gc === 'function') {
          try {
            window.gc();
          } catch (e) {
            // 大多数浏览器不允许手动触发 GC
          }
        }
      }
    };
    
    // 状态管理
    let isDisposed = false;
    let isAnalyzing = false;
    let isProcessingCommand = false;
    
    // 命令队列系统 - 防止并发问题
    const commandQueue = {
      queue: [],
      
      async execute(commandFn, context) {
        return new Promise((resolve, reject) => {
          const task = { commandFn, context, resolve, reject };
          
          this.queue.push(task);
          this.processQueue();
        });
      },
      
      async processQueue() {
        if (isProcessingCommand || this.queue.length === 0) return;
        
        try {
          isProcessingCommand = true;
          const task = this.queue.shift();
          
          try {
            const result = await task.commandFn();
            task.resolve(result);
          } catch (err) {
            task.reject(err);
          }
        } finally {
          isProcessingCommand = false;
          
          // 处理队列中的下一个任务
          if (this.queue.length > 0) {
            setTimeout(() => this.processQueue(), 0);
          }
        }
      },
      
      clearQueue() {
        for (const task of this.queue) {
          task.reject(new Error('命令队列已清空'));
        }
        this.queue = [];
      }
    };
    
    // 启动内存监控
    memoryMonitor.startMonitoring();
    
    // 自动垃圾回收定时器
    let autoGCInterval = null;
    if (options.enableAutoGC !== false) {
      autoGCInterval = setInterval(() => {
        if (!isAnalyzing) {
          exportService.clearCache();
          state.compactData();
        }
      }, options.autoGCInterval || 300000); // 默认5分钟
    }
    
    // 返回增强的API
    return {
      // 核心功能
      loadAudio: async (source, options = {}) => {
        if (isDisposed) {
          return errorHandler.handleError(
            '检测器已销毁', 
            new Error('无法在销毁的检测器上调用方法'),
            errorHandler.ERROR_CODES.CONFIG
          );
        }
        
        return commandQueue.execute(async () => {
          try {
            performance.mark('loadStart');
            const result = await processor.loadAudio(source, options);
            performance.mark('loadEnd');
            
            const duration = performance.measure('loadStart', 'loadEnd');
            eventBus.emit('metrics', { 
              type: 'load', 
              duration,
              source: typeof source === 'string' ? 'url' : 'file'
            });
            
            return result;
          } catch (err) {
            throw errorHandler.handleError(
              '加载音频失败',
              err,
              errorHandler.ERROR_CODES.AUDIO_LOAD,
              errorHandler.SEVERITY.ERROR,
              false
            );
          }
        }, 'loadAudio');
      },
      
      analyze: async (options = {}) => {
        if (isDisposed) {
          return errorHandler.handleError(
            '检测器已销毁', 
            new Error('无法在销毁的检测器上调用方法'),
            errorHandler.ERROR_CODES.CONFIG
          );
        }
        
        return commandQueue.execute(async () => {
          try {
            isAnalyzing = true;
            performance.mark('analyzeStart');
            
            // 添加分析超时机制
            let analysisPromise = processor.analyze(options);
            
            if (options.timeout) {
              analysisPromise = Promise.race([
                analysisPromise,
                new Promise((_, reject) => {
                  setTimeout(() => reject(new Error('分析超时')), options.timeout);
                })
              ]);
            }
            
            const result = await analysisPromise;
            
            performance.mark('analyzeEnd');
            const duration = performance.measure('analyzeStart', 'analyzeEnd');
            
            eventBus.emit('metrics', { 
              type: 'analyze', 
              duration,
              resultSize: JSON.stringify(result).length
            });
            
            return result;
          } catch (err) {
            throw errorHandler.handleError(
              '分析音频失败',
              err,
              err.message === '分析超时' ? 
                errorHandler.ERROR_CODES.TIMEOUT : 
                errorHandler.ERROR_CODES.ANALYSIS,
              errorHandler.SEVERITY.ERROR,
              false
            );
          } finally {
            isAnalyzing = false;
          }
        }, 'analyze');
      },
      
      cancelAnalysis: () => {
        if (isDisposed) return false;
        
        if (isAnalyzing) {
          processor.cancelAnalysis();
          commandQueue.clearQueue();
          isAnalyzing = false;
          return true;
        }
        return false;
      },
      
      // 导出功能
      exportResults: (format, options = {}) => {
        if (isDisposed) {
          return errorHandler.handleError(
            '检测器已销毁', 
            new Error('无法在销毁的检测器上调用方法'),
            errorHandler.ERROR_CODES.CONFIG
          );
        }
        
        try {
          performance.mark('exportStart');
          const result = exportService.export(format, state.get(), options);
          performance.mark('exportEnd');
          
          performance.measure('exportStart', 'exportEnd');
          return result;
        } catch (err) {
          throw errorHandler.handleError(
            `导出${format}格式失败`, 
            err, 
            errorHandler.ERROR_CODES.EXPORT
          );
        }
      },
      
      // 状态管理
      updateBeats: (beats) => {
        if (isDisposed) {
          return errorHandler.handleError(
            '检测器已销毁', 
            new Error('无法在销毁的检测器上调用方法'),
            errorHandler.ERROR_CODES.CONFIG
          );
        }
        
        try {
          return state.updateBeats(beats);
        } catch (err) {
          throw errorHandler.handleError(
            '更新节拍失败', 
            err, 
            errorHandler.ERROR_CODES.CONFIG
          );
        }
      },
      
      // 可视化
      visualize: (container, options = {}) => {
        if (isDisposed) {
          return errorHandler.handleError(
            '检测器已销毁', 
            new Error('无法在销毁的检测器上调用方法'),
            errorHandler.ERROR_CODES.CONFIG
          );
        }
        
        try {
          return visualizer.render(container, options);
        } catch (err) {
          throw errorHandler.handleError(
            '渲染可视化组件失败', 
            err, 
            errorHandler.ERROR_CODES.CONFIG
          );
        }
      },
      
      // 事件处理
      on: eventBus.on,
      off: eventBus.off,
      once: eventBus.once,
      
      // 配置管理
      getConfig: () => ({ ...config }),
      updateConfig: (newConfig) => {
        if (isDisposed) {
          return errorHandler.handleError(
            '检测器已销毁', 
            new Error('无法在销毁的检测器上调用方法'),
            errorHandler.ERROR_CODES.CONFIG
          );
        }
        
        try {
          return processor.updateConfig(newConfig);
        } catch (err) {
          throw errorHandler.handleError(
            '更新配置失败', 
            err, 
            errorHandler.ERROR_CODES.CONFIG
          );
        }
      },
      
      // 性能指标
      getPerformanceMetrics: () => performance.getMetrics(),
      
      // 错误历史
      getErrorHistory: () => errorHandler.getErrorHistory(),
      clearErrorHistory: () => errorHandler.clearErrorHistory(),
      
      // 状态查询
      isAnalyzing: () => isAnalyzing,
      isDisposed: () => isDisposed,
      
      // 资源释放
      dispose: async () => {
        if (isDisposed) {
          return true; // 幂等操作
        }
        
        // 标记为已销毁
        isDisposed = true;
        
        try {
          // 取消任何正在进行的操作
          if (isAnalyzing) {
            processor.cancelAnalysis();
          }
          
          // 清除自动 GC 定时器
          if (autoGCInterval) {
            clearInterval(autoGCInterval);
            autoGCInterval = null;
          }
          
          // 停止内存监控
          memoryMonitor.stopMonitoring();
          
          // 清除命令队列
          commandQueue.clearQueue();
          
          // 释放所有注册的资源
          await resourceManager.releaseAll();
          
          // 手动释放其他资源
          exportService.clearCache();
          eventBus.removeAllListeners();
          performance.reset();
          
          return true;
        } catch (err) {
          errorHandler.handleError(
            '释放资源失败', 
            err, 
            errorHandler.ERROR_CODES.CONFIG,
            errorHandler.SEVERITY.WARNING,
            false
          );
          return false;
        }
      }
    };
  } catch (err) {
    // 处理初始化错误
    errorHandler.handleError(
      '初始化检测器失败', 
      err, 
      'ERR_INIT', 
      'fatal'
    );
    throw err; // 重新抛出让调用者知道
  }
}

// 确定最佳处理模式
function determineOptimalProcessingMode(audioWorkletSupport, sharedArrayBufferSupport) {
  if (audioWorkletSupport) {
    return 'audioworklet'; // 最优选择
  } else if (sharedArrayBufferSupport) {
    return 'sharedworker'; // 次优选择
  } else {
    return 'worker'; // 基本选择
  }
}

// 优化辅助函数，减少代码重复
export const detectBeatsFromSource = async (source, options = {}) => {
  const detector = createBeatDetector(options);
  try {
    await detector.loadAudio(source);
    const results = await detector.analyze();
    return results;
  } finally {
    // 确保资源释放
    detector.dispose();
  }
};

// 重构为使用通用函数
export const detectBeatsFromFile = async (file, options = {}) => {
  return detectBeatsFromSource(file, options);
};

export const detectBeatsFromUrl = async (url, options = {}) => {
  return detectBeatsFromSource(url, options);
};



// 导出主函数和预设
export {
  createBeatDetector,
  presets
};
