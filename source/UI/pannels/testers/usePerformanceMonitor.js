import { ref, reactive, computed, onUnmounted } from '../../../../static/vue.esm-browser.js';

/**
 * 通用性能监控组合式API
 * @param {Object} options - 配置选项
 * @param {Number} options.sampleSize - 性能样本最大数量
 * @param {Boolean} options.enableLongTaskMonitoring - 是否监控长任务
 * @param {Boolean} options.enableFrameRateMonitoring - 是否监控帧率
 * @param {Boolean} options.enableAdaptiveSettings - 是否启用自适应设置
 * @param {Function} options.onPerformanceIssue - 性能问题回调函数
 * @param {Function} options.onSettingsChange - 设置变更回调函数
 * @returns {Object} - 性能监控状态和方法
 */
export function usePerformanceMonitor(options = {}) {
  // 默认选项
  const defaultOptions = {
    sampleSize: 100,
    enableLongTaskMonitoring: true,
    enableFrameRateMonitoring: true,
    enableAdaptiveSettings: true,
    onPerformanceIssue: null,
    onSettingsChange: null,
    // 添加性能阈值配置
    thresholds: {
      // 帧率
      lowFrameRate: 50, // 超过50ms表示帧率低于20fps
      // 事件频率
      highEventRate: 30, // 每秒超过30个事件视为高频率
      // 卡顿检测
      jankThreshold: 100, // 超过100ms的长任务视为卡顿
      // 性能评分阈值
      criticalPerformanceScore: 40, // 低于此分数视为严重性能问题
      warningPerformanceScore: 70, // 低于此分数视为中等性能问题
      // 渲染时间
      goodRenderTime: 16, // 16ms (60fps)的渲染时间视为良好
    }
  };
  
  const opts = { ...defaultOptions, ...options };
  // 确保thresholds存在并合并自定义阈值
  opts.thresholds = { ...defaultOptions.thresholds, ...(options.thresholds || {}) };
  
  // 使用响应式状态管理
  const isMonitoring = ref(false);
  const renderTimes = ref([]);
  const longTaskStats = reactive({
    count: 0,
    totalDuration: 0,
    jankCount: 0
  });
  const frameStats = reactive({
    drops: 0,
    lastTimestamp: 0
  });
  const eventStats = reactive({
    lastTimestamp: 0,
    velocities: []
  });
  const deviceInfo = reactive({
    memory: null,
    cpuCores: null,
    isLowEndDevice: false
  });
  const adaptiveSettings = ref({});
  
  // 资源管理
  const observers = ref([]);
  const animationFrameId = ref(null);
  const idleCallbackId = ref(null);
  
  // 统一错误处理函数
  function safeExecute(operation, fallbackValue = null, operationName = '') {
    try {
      return operation();
    } catch (error) {
      console.error(`性能监控错误(${operationName}):`, error);
      return fallbackValue;
    }
  }
  
  // 检测设备能力
  function detectDeviceCapabilities() {
    return safeExecute(() => {
      const deviceInfo = {
        memory: 'deviceMemory' in navigator ? navigator.deviceMemory : null,
        cpuCores: 'hardwareConcurrency' in navigator ? navigator.hardwareConcurrency : null,
        isLowEndDevice: false
      };
      
      deviceInfo.isLowEndDevice = (deviceInfo.memory && deviceInfo.memory <= 2) || 
                                 (deviceInfo.cpuCores && deviceInfo.cpuCores <= 2);
      
      return deviceInfo;
    }, { memory: null, cpuCores: null, isLowEndDevice: false }, '检测设备能力');
  }
  
  // 监控长任务
  function setupLongTaskMonitoring() {
    if (!opts.enableLongTaskMonitoring || typeof PerformanceObserver !== 'function') {
      return null;
    }
    
    return safeExecute(() => {
      const longTaskObserver = new PerformanceObserver(entries => {
        entries.getEntries().forEach(entry => {
          longTaskStats.count++;
          longTaskStats.totalDuration += entry.duration;
          
          if (entry.duration > opts.thresholds.jankThreshold) {
            longTaskStats.jankCount++;
          }
          
          notifyPerformanceIssue({
            type: 'longTask',
            duration: entry.duration,
            timestamp: entry.startTime
          });
        });
      });
      
      longTaskObserver.observe({ entryTypes: ['longtask'] });
      return longTaskObserver;
    }, null, '监控长任务');
  }
  
  // 监控帧率
  function setupFrameRateMonitoring() {
    if (!opts.enableFrameRateMonitoring || !('requestAnimationFrame' in window)) {
      return;
    }
    
    let lastFrameTime = performance.now();
    
    const checkFrameRate = () => {
      const now = performance.now();
      const frameTime = now - lastFrameTime;
      lastFrameTime = now;
      
      // 检测帧率下降
      if (frameTime > opts.thresholds.lowFrameRate) {
        frameStats.drops++;
        
        notifyPerformanceIssue({
          type: 'frameRate',
          duration: frameTime,
          timestamp: now
        });
      }
      
      // 继续检测
      if (isMonitoring.value) {
        animationFrameId.value = requestAnimationFrame(checkFrameRate);
      }
    };
    
    animationFrameId.value = requestAnimationFrame(checkFrameRate);
  }
  
  // 通知性能问题
  function notifyPerformanceIssue(issue) {
    if (typeof opts.onPerformanceIssue === 'function') {
      opts.onPerformanceIssue(issue);
    }
  }
  
  // 初始化性能监控
  function startMonitoring() {
    if (isMonitoring.value) return;
    isMonitoring.value = true;
    
    // 检测设备能力
    const capabilities = detectDeviceCapabilities();
    
    // 监控长任务
    const longTaskObserver = setupLongTaskMonitoring();
    if (longTaskObserver) {
      observers.value.push(longTaskObserver);
    }
    
    // 监控帧率
    setupFrameRateMonitoring();
    
    return capabilities;
  }
  
  // 停止监控
  function stopMonitoring() {
    if (!isMonitoring.value) return;
    isMonitoring.value = false;
    
    // 清理观察器
    observers.value.forEach(observer => {
      try {
        observer.disconnect();
      } catch (error) {
        console.error('断开性能观察器时出错:', error);
      }
    });
    observers.value = [];
    
    // 清理动画帧
    if (animationFrameId.value) {
      cancelAnimationFrame(animationFrameId.value);
      animationFrameId.value = null;
    }
    
    // 清理空闲回调
    if (idleCallbackId.value) {
      cancelIdleCallback(idleCallbackId.value);
      idleCallbackId.value = null;
    }
  }
  
  // 记录性能数据
  function trackOperation(startTime, operationType = 'render') {
    const duration = performance.now() - startTime;
    
    if (operationType === 'render') {
      renderTimes.value.push(duration);
      // 限制性能历史记录长度
      if (renderTimes.value.length > opts.sampleSize) {
        renderTimes.value.shift();
      }
    }
    
    return duration;
  }
  
  // 记录事件性能
  function trackEvent(type) {
    const now = performance.now();
    
    // 计算事件速率
    if (eventStats.lastTimestamp > 0) {
      const timeDelta = now - eventStats.lastTimestamp;
      if (timeDelta > 0) {
        const velocity = 1000 / timeDelta; // 每秒事件数
        
        eventStats.velocities.push({
          type,
          velocity,
          timestamp: now
        });
        
        if (eventStats.velocities.length > 20) {
          eventStats.velocities.shift();
        }
        
        // 如果事件频率过高，可能表明性能问题
        if (velocity > opts.thresholds.highEventRate) {
          notifyPerformanceIssue({
            type: 'highEventRate',
            eventType: type,
            rate: velocity,
            timestamp: now
          });
        }
      }
    }
    
    eventStats.lastTimestamp = now;
    return now;
  }
  
  // 使用requestIdleCallback优化空闲时间
  function scheduleIdleWork(callback) {
    return safeExecute(() => {
      if ('requestIdleCallback' in window) {
        if (idleCallbackId.value) {
          cancelIdleCallback(idleCallbackId.value);
        }
        
        idleCallbackId.value = requestIdleCallback(deadline => {
          if (deadline.timeRemaining() > 5) {
            callback(deadline.timeRemaining());
          }
        }, { timeout: 1000 });
        
        return idleCallbackId.value;
      } else {
        // 降级方案
        setTimeout(callback, 200);
        return null;
      }
    }, null, '调度空闲工作');
  }
  
  // 计算性能得分
  function calculatePerformanceScore() {
    let score = 100;
    
    // 计算平均渲染时间
    const avgRenderTime = renderTimes.value.length > 0 ? 
      renderTimes.value.reduce((a, b) => a + b, 0) / renderTimes.value.length : 0;
    
    // 各项指标对分数的影响
    if (avgRenderTime > opts.thresholds.goodRenderTime) {
      score -= Math.min(40, (avgRenderTime - opts.thresholds.goodRenderTime) * 2);
    }
    
    if (longTaskStats.count > 0) {
      score -= Math.min(20, longTaskStats.count * 2);
    }
    
    if (frameStats.drops > 0) {
      score -= Math.min(20, frameStats.drops * 3);
    }
    
    if (longTaskStats.jankCount > 0) {
      score -= Math.min(20, longTaskStats.jankCount * 4);
    }
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }
  
  // 根据性能得分生成建议设置
  function generateRecommendedSettings(currentSettings, performanceScore) {
    if (performanceScore < opts.thresholds.criticalPerformanceScore) {
      // 严重性能问题 - 更保守的设置
      return {
        throttleMs: currentSettings.throttleMs ? Math.min(120, currentSettings.throttleMs * 1.5) : 50,
        batchSize: currentSettings.batchSize ? Math.max(1, Math.floor(currentSettings.batchSize * 0.5)) : 5,
        prefetchCount: currentSettings.prefetchCount ? Math.max(0, Math.floor(currentSettings.prefetchCount * 0.3)) : 0,
        animationEnabled: false,
        qualityLevel: 'low',
        performanceScore
      };
    } else if (performanceScore < opts.thresholds.warningPerformanceScore) {
      // 中等性能问题 - 适度保守
      return {
        throttleMs: currentSettings.throttleMs ? Math.min(80, currentSettings.throttleMs * 1.2) : 30,
        batchSize: currentSettings.batchSize ? Math.max(3, Math.floor(currentSettings.batchSize * 0.7)) : 10,
        prefetchCount: currentSettings.prefetchCount ? Math.max(1, Math.floor(currentSettings.prefetchCount * 0.6)) : 2,
        animationEnabled: true,
        qualityLevel: 'medium',
        performanceScore
      };
    } else {
      // 性能良好 - 优化用户体验
      return {
        throttleMs: currentSettings.throttleMs ? Math.max(8, currentSettings.throttleMs * 0.8) : 16,
        batchSize: currentSettings.batchSize ? Math.min(50, currentSettings.batchSize * 1.2) : 20,
        prefetchCount: currentSettings.prefetchCount ? Math.min(20, currentSettings.prefetchCount * 1.5) : 10,
        animationEnabled: true,
        qualityLevel: 'high',
        performanceScore
      };
    }
  }
  
  // 自适应性能调整
  function adaptSettings(currentSettings = {}) {
    if (!opts.enableAdaptiveSettings) return currentSettings;
    
    return safeExecute(() => {
      // 计算性能得分
      const score = calculatePerformanceScore();
      
      // 生成建议设置
      const recommendations = generateRecommendedSettings(currentSettings, score);
      
      // 复制当前设置以避免修改原始对象
      const newSettings = { ...currentSettings, ...recommendations };
      
      // 通知设置变更
      if (typeof opts.onSettingsChange === 'function') {
        opts.onSettingsChange(newSettings, score);
      }
      
      // 记录调整结果
      adaptiveSettings.value = {
        timestamp: Date.now(),
        performanceScore: score,
        settings: newSettings
      };
      
      return newSettings;
    }, currentSettings, '自适应性能调整');
  }
  
  // 计算属性
  const performanceScore = computed(() => calculatePerformanceScore());
  
  const averageRenderTime = computed(() => {
    if (!renderTimes.value.length) return 0;
    return renderTimes.value.reduce((a, b) => a + b, 0) / renderTimes.value.length;
  });
  
  const averageEventRate = computed(() => {
    if (!eventStats.velocities.length) return 0;
    return eventStats.velocities.reduce((sum, item) => sum + item.velocity, 0) / 
           eventStats.velocities.length;
  });
  
  // 在组件卸载时自动清理资源
  onUnmounted(() => {
    stopMonitoring();
  });
  
  return {
    // 状态
    isMonitoring: computed(() => isMonitoring.value),
    performanceScore,
    averageRenderTime,
    averageEventRate,
    deviceCapabilities: computed(() => ({
      memory: deviceInfo.memory,
      cpuCores: deviceInfo.cpuCores,
      isLowEndDevice: deviceInfo.isLowEndDevice
    })),
    
    // 长任务和帧率数据
    longTasks: computed(() => ({
      count: longTaskStats.count,
      totalDuration: longTaskStats.totalDuration
    })),
    frameDrops: computed(() => frameStats.drops),
    jankCount: computed(() => longTaskStats.jankCount),
    
    // 方法
    startMonitoring,
    stopMonitoring,
    trackOperation,
    trackEvent,
    scheduleIdleWork,
    adaptSettings,
    
    // 原始性能数据 - 用于高级分析
    getRawData: () => ({
      renderTimes: [...renderTimes.value],
      longTaskStats: { ...longTaskStats },
      frameStats: { ...frameStats },
      eventStats: { ...eventStats },
      adaptiveSettings: { ...adaptiveSettings.value }
    })
  };
}
