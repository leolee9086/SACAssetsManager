import { ref, computed } from '../../../../static/vue.esm-browser.js';
import { scheduleIdleWork, cancelIdleWork } from './useVirtualScrollHelpers.js';

/**
 * 提供自适应性能优化的组合式API
 * @param {Object} options - 配置选项
 * @param {Boolean} options.enabled - 是否启用自适应性能
 * @param {Function} options.onSettingsChange - 设置变更回调
 * @param {Function} options.onPerformanceIssue - 性能问题回调
 * @returns {Object} - 自适应性能API
 */
export function useAdaptivePerformance(options = {}) {
  // 默认选项
  const defaultOptions = {
    enabled: true,
    onSettingsChange: null,
    onPerformanceIssue: null,
    monitorInterval: 5000,
    longTaskThreshold: 50
  };
  
  const opts = { ...defaultOptions, ...options };
  
  // 性能数据
  const rawData = {
    renderTime: [],
    scrollEvents: 0,
    lastRenderTimestamp: 0,
    lastEventTimestamp: 0,
    frameDrops: 0,
    longTasks: [],
    eventVelocity: [],
    cacheHitRate: 0,
    cacheSize: 0,
    fastScrollMode: false,
    previousOverscan: null,
    previousBuffer: null,
    monitoringStartTime: 0,
    monitoringActive: false,
    monitoringInterval: null
  };
  
  // 设备能力评分
  const deviceCapabilities = ref({
    score: 0,
    frameRate: 60,
    deviceMemory: typeof navigator !== 'undefined' && navigator.deviceMemory ? navigator.deviceMemory : 4,
    hardwareConcurrency: typeof navigator !== 'undefined' && navigator.hardwareConcurrency ? navigator.hardwareConcurrency : 4,
    connection: null,
    isLowEnd: false
  });
  
  // 性能指标
  const averageRenderTime = computed(() => {
    if (!rawData.renderTime.length) return 0;
    return rawData.renderTime.reduce((sum, time) => sum + time, 0) / rawData.renderTime.length;
  });
  
  const frameDrops = computed(() => rawData.frameDrops);
  const jankCount = computed(() => rawData.longTasks.length);
  const longTasks = computed(() => rawData.longTasks);
  const performanceScore = computed(() => {
    // 计算整体性能得分 (0-100)
    const renderScore = Math.max(0, 100 - (averageRenderTime.value > 16 ? (averageRenderTime.value - 16) * 4 : 0));
    const jankScore = Math.max(0, 100 - jankCount.value * 10);
    const memoryScore = Math.min(100, deviceCapabilities.value.deviceMemory * 12.5);
    
    return Math.round((renderScore * 0.5) + (jankScore * 0.3) + (memoryScore * 0.2));
  });
  
  /**
   * 开始性能监控
   */
  function startMonitoring() {
    if (rawData.monitoringActive) return;
    
    detectDeviceCapabilities();
    
    rawData.monitoringActive = true;
    rawData.monitoringStartTime = performance.now();
    
    // 定期检查性能指标
    if (!rawData.monitoringInterval) {
      rawData.monitoringInterval = setInterval(() => {
        // 计算FPS
        if (rawData.renderTime.length > 200) {
          rawData.renderTime = rawData.renderTime.slice(-100);
        }
        
        // 清理旧的速度数据
        if (rawData.eventVelocity.length > 50) {
          rawData.eventVelocity = rawData.eventVelocity.slice(-25);
        }
        
        // 清理过期的长任务
        const now = performance.now();
        rawData.longTasks = rawData.longTasks.filter(task => (now - task.timestamp) < 30000);
      }, opts.monitorInterval);
    }
  }
  
  /**
   * 停止性能监控
   */
  function stopMonitoring() {
    rawData.monitoringActive = false;
    
    if (rawData.monitoringInterval) {
      clearInterval(rawData.monitoringInterval);
      rawData.monitoringInterval = null;
    }
  }
  
  /**
   * 检测设备能力
   */
  function detectDeviceCapabilities() {
    try {
      // 检测设备内存
      if (navigator && 'deviceMemory' in navigator) {
        deviceCapabilities.value.deviceMemory = navigator.deviceMemory;
      }
      
      // 检测CPU核心数
      if (navigator && 'hardwareConcurrency' in navigator) {
        deviceCapabilities.value.hardwareConcurrency = navigator.hardwareConcurrency;
      }
      
      // 检测网络情况
      if (navigator && 'connection' in navigator) {
        const connection = navigator.connection;
        if (connection) {
          deviceCapabilities.value.connection = {
            type: connection.effectiveType,
            downlink: connection.downlink,
            rtt: connection.rtt,
            saveData: connection.saveData
          };
        }
      }
      
      // 检测设备帧率
      if (typeof window !== 'undefined' && 'requestAnimationFrame' in window) {
        let frameCount = 0;
        let lastTime = performance.now();
        const countFrame = (timestamp) => {
          frameCount++;
          if (timestamp - lastTime >= 1000) {
            deviceCapabilities.value.frameRate = frameCount;
            frameCount = 0;
            lastTime = timestamp;
          }
          if (rawData.monitoringActive && frameCount < 100) {
            requestAnimationFrame(countFrame);
          }
        };
        requestAnimationFrame(countFrame);
      }
      
      // 计算设备能力得分
      const memoryScore = Math.min(8, deviceCapabilities.value.deviceMemory) / 8;
      const cpuScore = Math.min(8, deviceCapabilities.value.hardwareConcurrency) / 8;
      const frameRateScore = deviceCapabilities.value.frameRate >= 60 ? 1 : deviceCapabilities.value.frameRate / 60;
      
      deviceCapabilities.value.score = Math.round((memoryScore * 0.3 + cpuScore * 0.4 + frameRateScore * 0.3) * 100);
      deviceCapabilities.value.isLowEnd = deviceCapabilities.value.score < 50;
      
      // 初始化建议基于设备能力
      suggestInitialSettings();
    } catch (error) {
      console.error('检测设备能力时出错:', error);
    }
  }
  
  /**
   * 建议初始设置
   */
  function suggestInitialSettings() {
    const score = deviceCapabilities.value.score;
    const isLowEnd = deviceCapabilities.value.isLowEnd;
    
    const initialSettings = {
      throttleMs: isLowEnd ? 80 : score < 70 ? 50 : 32,
      batchSize: isLowEnd ? 10 : score < 70 ? 15 : 20,
      overscan: isLowEnd ? 3 : score < 70 ? 5 : 10,
      recycleDOM: isLowEnd,
      intersectionObserver: !isLowEnd
    };
    
    if (opts.onSettingsChange) {
      opts.onSettingsChange(initialSettings);
    }
    
    return initialSettings;
  }
  
  /**
   * 跟踪操作性能
   * @param {Number} startTime - 操作开始时间
   */
  function trackOperation(startTime) {
    if (!rawData.monitoringActive) return;
    
    try {
      const now = performance.now();
      const duration = now - startTime;
      
      rawData.renderTime.push(duration);
      rawData.lastRenderTimestamp = now;
      
      // 检测长任务
      if (duration > opts.longTaskThreshold) {
        rawData.longTasks.push({
          duration,
          timestamp: now,
          type: 'render'
        });
        
        if (opts.onPerformanceIssue) {
          opts.onPerformanceIssue({
            type: 'longTask',
            duration,
            timestamp: now
          });
        }
      }
      
      // 限制数组大小
      if (rawData.renderTime.length > 500) {
        rawData.renderTime = rawData.renderTime.slice(-200);
      }
    } catch (error) {
      console.error('跟踪操作性能时出错:', error);
    }
  }
  
  /**
   * 跟踪事件性能
   * @param {String} eventType - 事件类型
   */
  function trackEvent(eventType) {
    if (!rawData.monitoringActive) return;
    
    try {
      const now = performance.now();
      
      if (eventType === 'scroll') {
        rawData.scrollEvents++;
        
        // 测量帧率
        if (rawData.lastEventTimestamp > 0) {
          const timeDelta = now - rawData.lastEventTimestamp;
          if (timeDelta < 1000/30) { // 低于30fps
            rawData.frameDrops++;
          }
        }
      }
      
      rawData.lastEventTimestamp = now;
    } catch (error) {
      console.error('跟踪事件性能时出错:', error);
    }
  }
  
  /**
   * 自适应设置
   * @param {Object} currentSettings - 当前设置
   * @returns {Object} - 建议的新设置
   */
  function adaptSettings(currentSettings) {
    if (!opts.enabled || !rawData.monitoringActive) return currentSettings;
    
    try {
      const score = performanceScore.value;
      const avgRenderTime = averageRenderTime.value;
      
      // 深拷贝当前设置
      const newSettings = { ...currentSettings };
      
      // 根据性能分数和渲染时间调整设置
      if (score < 30 || avgRenderTime > 30) {
        // 性能很差，大幅降低配置
        newSettings.throttleMs = Math.max(currentSettings.throttleMs, 80);
        newSettings.batchSize = Math.min(currentSettings.batchSize, 10);
        newSettings.overscan = Math.min(currentSettings.overscan, 3);
        newSettings.performanceScore = score;
      } else if (score < 60 || avgRenderTime > 20) {
        // 性能一般，适度降低配置
        newSettings.throttleMs = Math.max(currentSettings.throttleMs, 50);
        newSettings.batchSize = Math.min(currentSettings.batchSize, 15);
        newSettings.overscan = Math.min(currentSettings.overscan, 5);
        newSettings.performanceScore = score;
      } else if (score > 80 && avgRenderTime < 10) {
        // 性能很好，可以提高配置
        newSettings.throttleMs = 32;
        newSettings.batchSize = Math.min(30, currentSettings.batchSize + 2);
        newSettings.overscan = Math.min(15, currentSettings.overscan + 1);
        newSettings.performanceScore = score;
      }
      
      // 通知设置变更
      if (JSON.stringify(newSettings) !== JSON.stringify(currentSettings) && opts.onSettingsChange) {
        opts.onSettingsChange(newSettings);
      }
      
      return newSettings;
    } catch (error) {
      console.error('自适应设置时出错:', error);
      return currentSettings;
    }
  }
  
  /**
   * 安排空闲工作
   * @param {Function} callback - 回调函数
   */
  function scheduleIdleWork(callback) {
    return scheduleIdleWork(callback, { timeout: 1000 });
  }
  
  /**
   * 获取原始性能数据
   * @returns {Object} - 原始数据
   */
  function getRawData() {
    return rawData;
  }
  
  // 返回功能API
  return {
    startMonitoring,
    stopMonitoring,
    trackOperation,
    trackEvent,
    adaptSettings,
    scheduleIdleWork,
    getRawData,
    deviceCapabilities,
    averageRenderTime,
    frameDrops,
    jankCount,
    longTasks,
    performanceScore
  };
} 