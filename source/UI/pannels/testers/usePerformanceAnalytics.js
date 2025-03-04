import { ref, computed, onMounted, onUnmounted } from '../../../../static/vue.esm-browser.js';

/**
 * 高级性能分析与自适应优化工具
 * 
 * @param {Object} options - 配置选项
 * @param {Boolean} options.enableAdaptiveSettings - 是否启用自适应设置
 * @param {Function} options.onPerformanceIssue - 性能问题回调
 * @param {Function} options.onSettingsChange - 设置变更回调
 * @returns {Object} - 性能监控API
 */
export function usePerformanceAnalytics(options = {}) {
  // 默认选项
  const defaultOptions = {
    enableAdaptiveSettings: true,
    sampleSize: 60,
    longTaskThreshold: 50,
    criticalJankThreshold: 100,
    adaptationInterval: 5000,
    onPerformanceIssue: null,
    onSettingsChange: null
  };

  const opts = { ...defaultOptions, ...options };
  
  // 性能指标
  const frameDrops = ref(0);
  const jankCount = ref(0);
  const longTasks = ref([]);
  const deviceCapabilities = ref({
    tier: 'unknown',
    memory: 'unknown',
    cpu: 'unknown',
    gpu: 'unknown'
  });
  const performanceScore = ref(100);

  // 原始数据存储
  const rawData = {
    renderTime: [],
    scrollEvents: 0,
    lastEventTimestamp: 0,
    lastRenderTimestamp: 0,
    cacheHitRate: 0,
    cacheSize: 0,
    eventVelocity: [],
    fastScrollMode: false,
    previousOverscan: null,
    previousBuffer: null
  };

  // 检测设备能力
  function detectDeviceCapabilities() {
    try {
      // 尝试检测内存
      const memory = navigator.deviceMemory || 4; // 默认4GB
      
      // 粗略估计CPU性能
      let cpuScore = 1;
      if (window.navigator.hardwareConcurrency) {
        cpuScore = Math.min(16, window.navigator.hardwareConcurrency) / 4;
      }
      
      // 使用canvas检测GPU性能
      let gpuScore = 1;
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
          const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
          const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          // 检查是否为高性能GPU
          if (/(nvidia|amd|radeon|geforce)/i.test(renderer)) {
            gpuScore = 3;
          } else if (/(intel)/i.test(renderer)) {
            gpuScore = 2;
          }
        }
      } catch (e) {
        // 忽略错误，使用默认值
      }
      
      // 计算设备层级
      const totalScore = (memory / 4) * cpuScore * gpuScore;
      let tier = 'low';
      if (totalScore > 6) {
        tier = 'high';
      } else if (totalScore > 2) {
        tier = 'medium';
      }
      
      deviceCapabilities.value = {
        tier,
        memory: `${memory}GB`,
        cpu: `${window.navigator.hardwareConcurrency || 'unknown'} cores`,
        gpu: gpuScore === 3 ? 'high' : gpuScore === 2 ? 'medium' : 'low'
      };
      
      // 根据设备能力预设性能分数
      if (tier === 'high') {
        performanceScore.value = 100;
      } else if (tier === 'medium') {
        performanceScore.value = 75;
      } else {
        performanceScore.value = 50;
      }
    } catch (error) {
      console.error('检测设备能力时出错:', error);
    }
  }

  // FPS监控和帧丢失检测
  let lastFrameTime = 0;
  let fpsInterval = null;
  
  function monitorFrameRate() {
    let frameCount = 0;
    let lastCheck = performance.now();
    
    function checkFrame(timestamp) {
      if (lastFrameTime !== 0) {
        const delta = timestamp - lastFrameTime;
        // 帧时间超过33ms（低于30fps）视为丢帧
        if (delta > 33) {
          frameDrops.value++;
          // 帧时间超过临界值视为卡顿
          if (delta > opts.criticalJankThreshold) {
            jankCount.value++;
          }
        }
      }
      lastFrameTime = timestamp;
      frameCount++;
      
      // 每秒检查一次FPS
      if (timestamp - lastCheck >= 1000) {
        const fps = Math.round(frameCount * 1000 / (timestamp - lastCheck));
        
        // 调整性能分数
        if (fps < 30) {
          performanceScore.value = Math.max(10, performanceScore.value - 2);
        } else if (fps > 55 && performanceScore.value < 90) {
          performanceScore.value = Math.min(100, performanceScore.value + 1);
        }
        
        frameCount = 0;
        lastCheck = timestamp;
      }
      
      if (fpsInterval) {
        requestAnimationFrame(checkFrame);
      }
    }
    
    fpsInterval = requestAnimationFrame(checkFrame);
  }

  // 跟踪渲染性能
  function trackOperation(startTime) {
    const duration = performance.now() - startTime;
    
    // 记录渲染时间
    rawData.renderTime.push(duration);
    if (rawData.renderTime.length > opts.sampleSize) {
      rawData.renderTime.shift();
    }
    
    // 更新最后渲染时间戳
    rawData.lastRenderTimestamp = performance.now();
    
    // 检测长任务
    if (duration > opts.longTaskThreshold) {
      longTasks.value.push({
        duration,
        timestamp: Date.now(),
        type: 'render'
      });
      
      // 仅保留最近10条记录
      if (longTasks.value.length > 10) {
        longTasks.value.shift();
      }
      
      // 通知性能问题
      if (typeof opts.onPerformanceIssue === 'function') {
        opts.onPerformanceIssue({
          type: 'longTask',
          duration,
          timestamp: Date.now()
        });
      }
    }
  }

  // 跟踪事件
  function trackEvent(eventType) {
    const now = performance.now();
    
    if (eventType === 'scroll') {
      rawData.scrollEvents++;
      
      // 计算事件速度
      if (rawData.lastEventTimestamp > 0) {
        const timeDelta = now - rawData.lastEventTimestamp;
        if (timeDelta > 0) {
          rawData.eventVelocity.push({
            type: eventType,
            timestamp: now,
            velocity: 1 / timeDelta // 事件/毫秒
          });
          
          // 只保留最近的记录
          if (rawData.eventVelocity.length > 30) {
            rawData.eventVelocity.shift();
          }
        }
      }
    }
    
    rawData.lastEventTimestamp = now;
  }

  // 计算平均渲染时间
  const averageRenderTime = computed(() => {
    if (!rawData.renderTime.length) return 0;
    const sum = rawData.renderTime.reduce((acc, time) => acc + time, 0);
    return sum / rawData.renderTime.length;
  });

  // 自适应性能设置
  function adaptSettings(currentSettings) {
    if (!opts.enableAdaptiveSettings) return currentSettings;
    
    try {
      const newSettings = { ...currentSettings };
      
      // 计算设备综合性能评分(0-100)
      let currentScore = performanceScore.value;
      
      // 根据渲染时间和帧丢失情况调整
      if (averageRenderTime.value > 16) {
        currentScore -= Math.min(20, (averageRenderTime.value - 16) / 2);
      }
      
      if (frameDrops.value > 10) {
        currentScore -= Math.min(10, frameDrops.value / 10);
      }
      
      if (jankCount.value > 0) {
        currentScore -= Math.min(30, jankCount.value * 3);
      }
      
      // 确保分数在有效范围内
      currentScore = Math.max(0, Math.min(100, currentScore));
      
      // 更新性能分数
      performanceScore.value = currentScore;
      
      // 根据性能评分调整设置
      if (currentScore < 30) { // 低性能设备
        newSettings.throttleMs = 100;
        newSettings.batchSize = 5;
        newSettings.overscan = 2;
        newSettings.performanceScore = currentScore;
      } else if (currentScore < 60) { // 中等性能设备
        newSettings.throttleMs = 64;
        newSettings.batchSize = 10;
        newSettings.overscan = 5;
        newSettings.performanceScore = currentScore;
      } else { // 高性能设备
        newSettings.throttleMs = 32;
        newSettings.batchSize = 20;
        newSettings.overscan = 10;
        newSettings.performanceScore = currentScore;
      }
      
      // 通知设置变更
      if (typeof opts.onSettingsChange === 'function' && 
          (newSettings.throttleMs !== currentSettings.throttleMs || 
           newSettings.batchSize !== currentSettings.batchSize)) {
        opts.onSettingsChange(newSettings);
      }
      
      return newSettings;
    } catch (error) {
      console.error('调整性能设置时出错:', error);
      return currentSettings;
    }
  }

  // 调度空闲工作
  function scheduleIdleWork(callback) {
    if (typeof window === 'undefined') return;
    
    if (window.requestIdleCallback) {
      return window.requestIdleCallback(callback, { timeout: 500 });
    } else {
      return setTimeout(() => {
        const start = performance.now();
        callback({ didTimeout: false, timeRemaining: () => Math.max(0, 50 - (performance.now() - start)) });
      }, 0);
    }
  }

  // 启动监控
  function startMonitoring() {
    detectDeviceCapabilities();
    monitorFrameRate();
    
    // 定期调整性能设置
    if (opts.enableAdaptiveSettings) {
      const adaptInterval = setInterval(() => {
        adaptSettings({
          throttleMs: opts.throttleMs,
          batchSize: opts.buffer
        });
        
        // 重置计数器
        frameDrops.value = 0;
      }, opts.adaptationInterval);
      
      // 存储间隔ID以便清理
      window._adaptIntervalId = adaptInterval;
    }
  }

  // 停止监控
  function stopMonitoring() {
    if (fpsInterval) {
      cancelAnimationFrame(fpsInterval);
      fpsInterval = null;
    }
    
    if (window._adaptIntervalId) {
      clearInterval(window._adaptIntervalId);
      window._adaptIntervalId = null;
    }
  }

  // 生命周期钩子
  onMounted(() => {
    startMonitoring();
  });

  onUnmounted(() => {
    stopMonitoring();
  });

  // 返回API
  return {
    // 指标
    frameDrops,
    jankCount,
    longTasks,
    deviceCapabilities,
    performanceScore,
    averageRenderTime,
    
    // 方法
    trackOperation,
    trackEvent,
    adaptSettings,
    scheduleIdleWork,
    startMonitoring,
    stopMonitoring,
    getRawData: () => rawData
  };
} 