import { ref, computed } from '../../../../static/vue.esm-browser.js';
import { safeExecute } from './useVirtualScrollHelpers.js';

/**
 * 虚拟滚动性能监控与优化组合式API
 * @param {Object} options - 性能优化配置选项
 * @param {Boolean} options.enabled - 是否启用性能监控
 * @param {Number} options.sampleSize - 性能采样大小
 * @param {Number} options.adaptiveThreshold - 自适应调整的阈值（毫秒）
 * @param {Boolean} options.logPerformanceIssues - 是否记录性能问题
 * @param {Function} options.onPerformanceIssue - 性能问题回调
 * @param {Function} options.onSettingsChange - 设置更改回调
 * @returns {Object} 性能监控与优化API
 */
export function useVirtualScrollPerformance(options = {}) {
  // 默认配置
  const defaultOptions = {
    enabled: true,
    sampleSize: 60,
    adaptiveThreshold: 16,
    logPerformanceIssues: false,
    onPerformanceIssue: null,
    onSettingsChange: null,
    stabilizationPeriod: 1000,
    maxAdjustmentsPerMinute: 3,
  };

  const opts = { ...defaultOptions, ...options };
  
  // 性能指标
  const renderTimes = [];
  const scrollEvents = ref(0);
  const frameDrops = ref(0);
  const jankCount = ref(0);
  const longTasks = ref(0);
  const lastRenderTimestamp = ref(0);
  const averageRenderTime = ref(0);
  const performanceScore = ref(100);
  const performanceTrend = ref('stable');
  const adjustmentHistory = [];

  // 设备能力检测
  const deviceCapabilities = ref({
    memory: null,
    cpu: null,
    mobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
    touchscreen: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    lowEndDevice: false,
    slowNetwork: navigator.connection ? navigator.connection.effectiveType === 'slow-2g' || 
                                       navigator.connection.effectiveType === '2g' : false
  });

  /**
   * 检测设备能力
   */
  function detectDeviceCapabilities() {
    try {
      // CPU性能估算
      const cpuStart = performance.now();
      let sum = 0;
      for (let i = 0; i < 1000000; i++) {
        sum += Math.sqrt(i);
      }
      const cpuTime = performance.now() - cpuStart;
      const cpuScore = Math.min(1, Math.max(0, 1 - (cpuTime / 1000)));
      
      // 内存估算
      const memoryInfo = performance?.memory;
      const memoryMB = memoryInfo ? Math.round(memoryInfo.jsHeapSizeLimit / 1048576) : null;
      
      deviceCapabilities.value = {
        ...deviceCapabilities.value,
        cpu: cpuScore,
        memory: memoryMB,
        lowEndDevice: cpuScore < 0.5 || (memoryMB !== null && memoryMB < 2048)
      };
    } catch (e) {
      console.warn('设备能力检测失败', e);
    }
  }

  /**
   * 记录渲染时间
   * @param {Number} time - 渲染耗时（毫秒）
   */
  function recordRenderTime(time) {
    if (!opts.enabled) return;
    
    renderTimes.push(time);
    lastRenderTimestamp.value = performance.now();
    
    // 限制样本大小
    if (renderTimes.length > opts.sampleSize) {
      renderTimes.shift();
    }
    
    // 更新平均值
    if (renderTimes.length > 0) {
      averageRenderTime.value = renderTimes.reduce((sum, t) => sum + t, 0) / renderTimes.length;
    }
    
    // 检测卡顿
    if (time > opts.adaptiveThreshold * 2) {
      jankCount.value++;
      
      if (time > 100) {
        longTasks.value++;
      }
      
      if (opts.onPerformanceIssue) {
        safeExecute(() => {
          opts.onPerformanceIssue({
            type: time > 100 ? 'longTask' : 'jank',
            duration: time,
            timestamp: performance.now()
          });
        });
      }
    }
    
    // 更新性能评分
    updatePerformanceScore();
  }

  /**
   * 记录滚动事件
   */
  function recordScrollEvent() {
    if (!opts.enabled) return;
    scrollEvents.value++;
  }

  /**
   * 记录帧丢失
   */
  function recordFrameDrop() {
    if (!opts.enabled) return;
    frameDrops.value++;
    updatePerformanceScore();
  }

  /**
   * 更新性能评分
   */
  function updatePerformanceScore() {
    if (!opts.enabled || renderTimes.length < 5) return;
    
    // 计算基于平均渲染时间的分数 (16ms = 60fps 为理想目标)
    const renderScore = Math.max(0, 100 - (averageRenderTime.value - 8) * 5);
    
    // 计算基于卡顿率的分数
    const jankRate = jankCount.value / Math.max(1, scrollEvents.value);
    const jankScore = Math.max(0, 100 - jankRate * 1000);
    
    // 计算帧丢失率分数
    const frameDropRate = frameDrops.value / Math.max(1, scrollEvents.value);
    const frameDropScore = Math.max(0, 100 - frameDropRate * 500);
    
    // 综合评分 (加权平均)
    const score = Math.round(renderScore * 0.5 + jankScore * 0.3 + frameDropScore * 0.2);
    
    // 检测趋势
    const prevScore = performanceScore.value;
    performanceScore.value = score;
    
    if (score < prevScore - 10) {
      performanceTrend.value = 'declining';
    } else if (score > prevScore + 10) {
      performanceTrend.value = 'improving';
    } else {
      performanceTrend.value = 'stable';
    }
  }

  /**
   * 检查是否需要自适应调整
   * @returns {Boolean} 是否建议进行调整
   */
  function checkForAdaptiveAdjustment() {
    if (!opts.enabled) return false;
    
    // 检查调整频率限制
    const now = Date.now();
    const recentAdjustments = adjustmentHistory.filter(time => now - time < 60000).length;
    
    if (recentAdjustments >= opts.maxAdjustmentsPerMinute) {
      return false;
    }
    
    // 仅在性能分数较低或趋势下降时调整
    const shouldAdjust = performanceScore.value < 75 || 
                         (performanceScore.value < 85 && performanceTrend.value === 'declining');
    
    if (shouldAdjust) {
      adjustmentHistory.push(now);
      // 限制历史记录大小
      if (adjustmentHistory.length > 20) {
        adjustmentHistory.shift();
      }
    }
    
    return shouldAdjust;
  }

  /**
   * 获取推荐的优化设置
   * @returns {Object} 推荐设置
   */
  function getRecommendedSettings() {
    if (!opts.enabled || performanceScore.value > 90) {
      return {};
    }
    
    const settings = {};
    
    // 基于平均渲染时间推荐设置
    if (averageRenderTime.value > 25) {
      settings.buffer = 10;          // 减小缓冲区
      settings.overscan = 3;         // 减小过扫描
      settings.throttleMs = 50;      // 增加节流时间
      settings.dynamicItemHeight = false; // 禁用动态高度
      settings.recycleDOM = true;    // 启用DOM回收
    } else if (averageRenderTime.value > 16) {
      settings.buffer = 15;
      settings.overscan = 5;
      settings.throttleMs = 32;
    }
    
    // 设备是低端设备时的特殊优化
    if (deviceCapabilities.value.lowEndDevice) {
      settings.buffer = Math.min(settings.buffer || 15, 8);
      settings.throttleMs = Math.max(settings.throttleMs || 32, 50);
      settings.dynamicItemHeight = false;
      settings.recycleDOM = true;
    }
    
    return settings;
  }

  /**
   * 获取优化建议
   * @returns {Array} 优化建议数组
   */
  function getOptimizationSuggestions() {
    const suggestions = [];
    
    if (averageRenderTime.value > 16) {
      suggestions.push({
        id: 'highRenderTime',
        severity: averageRenderTime.value > 30 ? 'high' : 'medium',
        message: `渲染时间过长 (${averageRenderTime.value.toFixed(1)}ms)`,
        recommendation: '减小buffer和overscan值，或启用recycleDOM'
      });
    }
    
    if (jankCount.value > 5) {
      suggestions.push({
        id: 'jank',
        severity: 'high',
        message: `检测到卡顿 (${jankCount.value}次)`,
        recommendation: '增加throttleMs值，减少每帧渲染工作量'
      });
    }
    
    if (frameDrops.value > 10) {
      suggestions.push({
        id: 'frameDrops',
        severity: 'medium',
        message: `检测到掉帧 (${frameDrops.value}次)`,
        recommendation: '检查滚动事件处理器，简化渲染逻辑'
      });
    }
    
    return suggestions;
  }

  /**
   * 获取详细性能数据
   * @returns {Object} 详细性能数据
   */
  function getDetailedPerformanceData() {
    return {
      renderTimes: [...renderTimes],
      averageRenderTime: averageRenderTime.value,
      jankCount: jankCount.value,
      longTasks: longTasks.value,
      frameDrops: frameDrops.value,
      scrollEvents: scrollEvents.value,
      performanceScore: performanceScore.value,
      performanceTrend: performanceTrend.value,
      deviceCapabilities: { ...deviceCapabilities.value },
      jankRate: scrollEvents.value > 0 ? (jankCount.value / scrollEvents.value) : 0,
      adjustmentHistory: [...adjustmentHistory]
    };
  }

  /**
   * 获取原始数据
   */
  function getRawData() {
    return {
      renderTimes,
      scrollEvents: scrollEvents.value,
      lastRenderTimestamp: lastRenderTimestamp.value
    };
  }

  /**
   * 开始监控
   */
  function startMonitoring() {
    if (!opts.enabled) return;
    
    // 检测设备能力
    detectDeviceCapabilities();
  }

  /**
   * 停止监控
   */
  function stopMonitoring() {
    // 清理资源，可为将来扩展预留
  }

  /**
   * 重置性能数据
   */
  function resetData() {
    renderTimes.length = 0;
    scrollEvents.value = 0;
    frameDrops.value = 0;
    jankCount.value = 0;
    longTasks.value = 0;
    lastRenderTimestamp.value = 0;
    averageRenderTime.value = 0;
    performanceScore.value = 100;
    performanceTrend.value = 'stable';
    adjustmentHistory.length = 0;
  }

  return {
    // 状态
    averageRenderTime,
    scrollEvents,
    frameDrops,
    jankCount,
    longTasks,
    performanceScore,
    performanceTrend,
    deviceCapabilities,
    
    // 方法
    recordRenderTime,
    recordScrollEvent,
    recordFrameDrop,
    checkForAdaptiveAdjustment,
    getRecommendedSettings,
    getOptimizationSuggestions,
    getDetailedPerformanceData,
    getRawData,
    startMonitoring,
    stopMonitoring,
    resetData
  };
} 