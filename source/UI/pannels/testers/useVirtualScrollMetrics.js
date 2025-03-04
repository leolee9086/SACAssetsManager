/**
 * 提供高精度、低开销的虚拟滚动性能指标收集和分析
 * 此模块专注于收集关键性能指标，以便虚拟滚动组件可以自适应优化
 */
import { ref, computed, watch, onMounted, onUnmounted } from '../../../../static/vue.esm-browser.js';

/**
 * 虚拟滚动性能指标收集与分析
 * @param {Object} options - 配置选项
 * @param {Boolean} options.enabled - 是否启用性能监控
 * @param {Number} options.sampleSize - 性能样本大小
 * @param {Number} options.adaptiveThreshold - 自适应阈值(ms)
 * @param {Boolean} options.logPerformanceIssues - 是否记录性能问题
 * @param {Function} options.onPerformanceIssue - 性能问题回调
 * @param {Function} options.onSettingsChange - 设置变更回调
 * @param {Number} options.criticalFrameTime - 关键帧时间(ms)，超过此值视为掉帧
 * @param {Boolean} options.collectMemoryStats - 是否收集内存统计信息
 * @param {Number} options.updateInterval - 更新间隔(ms)
 * @returns {Object} - 性能监控工具和指标
 */
export function useVirtualScrollMetrics(options = {}) {
  // 默认选项
  const defaultOptions = {
    enabled: true,
    sampleSize: 60,
    adaptiveThreshold: 16, // 16ms - 60fps的阈值
    logPerformanceIssues: false,
    onPerformanceIssue: null,
    onSettingsChange: null,
    criticalFrameTime: 100, // 100ms被视为严重掉帧
    collectMemoryStats: true,
    updateInterval: 5000 // 5秒更新一次全面性能数据
  };
  
  const opts = { ...defaultOptions, ...options };
  
  // 基本性能指标
  const renderTimes = ref([]);
  const scrollEvents = ref(0);
  const frameDrops = ref(0);
  const jankCount = ref(0);
  const longTasks = ref(0);
  const lastRenderTimestamp = ref(0);
  const averageRenderTime = ref(0);
  const performanceScore = ref(100);
  const performanceTrend = ref('stable');
  
  // 详细的性能历史记录
  const performanceHistory = {
    renderTimes: [],
    scrollEventTimes: [],
    longTaskTimes: [],
    memoryUsage: []
  };
  
  // 设备能力检测结果
  const deviceCapabilities = ref({
    memory: null,   // 估计内存容量(MB)
    cpu: null,      // 相对CPU性能(0-1)
    gpu: null,      // 估计GPU能力(0-1)
    mobile: null,   // 是否为移动设备
    connection: null, // 网络连接类型
    touchCapable: null, // 是否支持触摸
    highDPI: null,  // 是否为高DPI屏幕
    lowEndDevice: null // 是否为低端设备
  });
  
  // 内部状态
  let isMonitoring = false;
  let updateIntervalId = null;
  let lastSettingsUpdate = 0;
  let totalRenderTime = 0;
  let renderCount = 0;
  let previousScores = [];
  let memoryUsageStartValue = 0;
  
  /**
   * 记录渲染时间
   * @param {Number} time - 渲染时间(ms)
   */
  function recordRenderTime(time) {
    if (!opts.enabled || !isMonitoring) return;
    
    renderTimes.value.push(time);
    if (renderTimes.value.length > opts.sampleSize) {
      renderTimes.value.shift();
    }
    
    // 记录到历史中(限制增长)
    performanceHistory.renderTimes.push({
      time: Date.now(),
      duration: time
    });
    if (performanceHistory.renderTimes.length > 1000) {
      performanceHistory.renderTimes = performanceHistory.renderTimes.slice(-500);
    }
    
    // 更新平均值
    totalRenderTime += time;
    renderCount++;
    if (renderCount > 0) {
      averageRenderTime.value = totalRenderTime / renderCount;
    }
    
    lastRenderTimestamp.value = Date.now();
    
    // 检测性能问题
    if (time > opts.criticalFrameTime) {
      longTasks.value++;
      performanceHistory.longTaskTimes.push({
        time: Date.now(),
        duration: time
      });
      
      if (opts.logPerformanceIssues) {
        console.warn(`虚拟滚动性能问题: 渲染时间 ${time.toFixed(1)}ms 超过临界值 ${opts.criticalFrameTime}ms`);
      }
      
      if (opts.onPerformanceIssue) {
        opts.onPerformanceIssue({
          type: 'longTask',
          duration: time,
          timestamp: Date.now()
        });
      }
    }
    
    // 动态计算性能分数
    calculatePerformanceScore();
  }
  
  /**
   * 记录滚动事件
   */
  function recordScrollEvent() {
    if (!opts.enabled || !isMonitoring) return;
    
    scrollEvents.value++;
    
    // 记录到历史中
    performanceHistory.scrollEventTimes.push(Date.now());
    if (performanceHistory.scrollEventTimes.length > 1000) {
      performanceHistory.scrollEventTimes = performanceHistory.scrollEventTimes.slice(-500);
    }
    
    // 检测滚动密度(过多可能表示性能问题)
    const recentScrolls = performanceHistory.scrollEventTimes.filter(
      t => Date.now() - t < 1000
    ).length;
    
    if (recentScrolls > 60) { // 每秒超过60次滚动事件可能导致性能问题
      if (opts.logPerformanceIssues) {
        console.warn(`虚拟滚动性能警告: 检测到高频滚动事件 (${recentScrolls}/秒)`);
      }
    }
  }
  
  /**
   * 记录帧丢失
   */
  function recordFrameDrop() {
    if (!opts.enabled || !isMonitoring) return;
    
    frameDrops.value++;
    
    // 可能需要调整滚动逻辑
    jankCount.value++;
    
    // 严重抖动可能需要进一步优化
    if (frameDrops.value % 10 === 0 && opts.logPerformanceIssues) {
      console.warn(`虚拟滚动性能警告: 已检测到 ${frameDrops.value} 次帧丢失`);
    }
  }
  
  /**
   * 计算性能分数(0-100)
   */
  function calculatePerformanceScore() {
    if (renderTimes.value.length === 0) {
      performanceScore.value = 100;
      return;
    }
    
    // 基于多个性能指标计算综合分数
    const recentRenderTimes = renderTimes.value.slice(-Math.min(renderTimes.value.length, 20));
    const avgRenderTime = recentRenderTimes.reduce((sum, time) => sum + time, 0) / recentRenderTimes.length;
    
    // 基础分数从渲染时间计算
    let score = 100;
    
    // 渲染时间评分(16ms以下保持满分)
    if (avgRenderTime > 16) {
      score -= Math.min(40, ((avgRenderTime - 16) / 84) * 40);
    }
    
    // 帧丢失惩罚
    const recentDrops = frameDrops.value - (previousScores.length > 0 ? previousScores[0].frameDrops : 0);
    if (recentDrops > 0) {
      score -= Math.min(30, recentDrops * 3);
    }
    
    // 长任务惩罚
    const recentLongTasks = longTasks.value - (previousScores.length > 0 ? previousScores[0].longTasks : 0);
    if (recentLongTasks > 0) {
      score -= Math.min(30, recentLongTasks * 10);
    }
    
    // 确保分数在0-100范围内
    score = Math.max(0, Math.min(100, score));
    
    // 平滑分数变化
    if (previousScores.length > 0) {
      const prevScore = previousScores[0].score;
      score = prevScore * 0.7 + score * 0.3; // 70%旧值，30%新值
    }
    
    // 保存当前状态用于趋势分析
    previousScores.unshift({
      score,
      timestamp: Date.now(),
      frameDrops: frameDrops.value,
      longTasks: longTasks.value,
      avgRenderTime
    });
    
    // 只保留最近10个分数记录
    if (previousScores.length > 10) {
      previousScores.pop();
    }
    
    // 分析性能趋势
    if (previousScores.length >= 3) {
      const current = previousScores[0].score;
      const past = previousScores[previousScores.length - 1].score;
      
      if (current - past > 5) {
        performanceTrend.value = 'improving';
      } else if (past - current > 5) {
        performanceTrend.value = 'degrading';
      } else {
        performanceTrend.value = 'stable';
      }
    }
    
    performanceScore.value = Math.round(score);
  }
  
  /**
   * 收集内存使用统计信息
   */
  function collectMemoryStats() {
    if (!opts.collectMemoryStats || !isMonitoring) return;
    
    try {
      if (window.performance && window.performance.memory) {
        const memoryInfo = window.performance.memory;
        
        // 记录到历史
        performanceHistory.memoryUsage.push({
          time: Date.now(),
          usedJSHeapSize: memoryInfo.usedJSHeapSize,
          totalJSHeapSize: memoryInfo.totalJSHeapSize
        });
        
        // 限制历史记录大小
        if (performanceHistory.memoryUsage.length > 100) {
          performanceHistory.memoryUsage = performanceHistory.memoryUsage.slice(-50);
        }
        
        // 检测内存泄漏
        if (performanceHistory.memoryUsage.length > 10) {
          const startMem = performanceHistory.memoryUsage[0].usedJSHeapSize;
          const currentMem = memoryInfo.usedJSHeapSize;
          const growthRate = (currentMem - startMem) / startMem;
          
          // 如果内存增长超过50%且没有下降趋势，可能存在泄漏
          if (growthRate > 0.5 && opts.logPerformanceIssues) {
            console.warn(`可能的内存泄漏: JS堆内存增长了 ${(growthRate * 100).toFixed(1)}%`);
            
            if (opts.onPerformanceIssue) {
              opts.onPerformanceIssue({
                type: 'memoryLeak',
                growthRate,
                currentUsage: currentMem,
                timestamp: Date.now()
              });
            }
          }
        }
      }
    } catch (error) {
      // 某些浏览器可能不支持或限制内存API访问
      if (opts.logPerformanceIssues) {
        console.warn('无法收集内存统计信息:', error);
      }
    }
  }
  
  /**
   * 检测设备能力
   */
  function detectDeviceCapabilities() {
    // 检测是否为移动设备
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // 检测是否支持触摸
    const isTouchCapable = ('ontouchstart' in window) || 
                           (navigator.maxTouchPoints > 0) || 
                           (navigator.msMaxTouchPoints > 0);
    
    // 检测高DPI显示器
    const isHighDPI = window.devicePixelRatio > 1.5;
    
    // 尝试估计CPU能力
    let cpuScore = null;
    try {
      const start = performance.now();
      let counter = 0;
      for (let i = 0; i < 1000000; i++) {
        counter += Math.sqrt(i);
      }
      const end = performance.now();
      const duration = end - start;
      
      // 标准化CPU分数(越低越好)
      // 典型的高端设备可能在10-40ms完成
      cpuScore = Math.min(1, Math.max(0, 1 - (duration - 10) / 250));
    } catch (e) {
      console.warn('CPU性能检测失败:', e);
    }
    
    // 尝试估计可用内存
    let memoryEstimate = null;
    try {
      if (navigator.deviceMemory) {
        memoryEstimate = navigator.deviceMemory * 1024; // 转换为MB
      } else if (window.performance && window.performance.memory) {
        memoryEstimate = window.performance.memory.jsHeapSizeLimit / (1024 * 1024);
      }
    } catch (e) {
      // 忽略错误
    }
    
    // 尝试获取网络连接信息
    let connectionType = null;
    try {
      if (navigator.connection && navigator.connection.effectiveType) {
        connectionType = navigator.connection.effectiveType; // 2g, 3g, 4g, etc.
      }
    } catch (e) {
      // 忽略错误
    }
    
    // GPU能力估计(基于canvas性能)
    let gpuScore = null;
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      if (gl) {
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const vendor = ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : '';
        const renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '';
        
        // 基于常见的GPU字符串判断能力(简化版)
        const isHighEnd = /NVIDIA|AMD|Intel Iris|Apple GPU/i.test(renderer);
        const isMidRange = /Intel HD Graphics 4|Intel UHD Graphics/i.test(renderer);
        
        if (isHighEnd) gpuScore = 0.8;
        else if (isMidRange) gpuScore = 0.5;
        else gpuScore = 0.3;
        
        // 移动GPU通常性能较低
        if (isMobile) gpuScore *= 0.7;
      }
    } catch (e) {
      // 忽略错误
    }
    
    // 确定设备是否为低端设备
    const isLowEndDevice = (cpuScore !== null && cpuScore < 0.3) || 
                           (memoryEstimate !== null && memoryEstimate < 2048) ||
                           (connectionType === '2g' || connectionType === 'slow-2g');
    
    // 更新设备能力
    deviceCapabilities.value = {
      memory: memoryEstimate,
      cpu: cpuScore,
      gpu: gpuScore,
      mobile: isMobile,
      connection: connectionType,
      touchCapable: isTouchCapable,
      highDPI: isHighDPI,
      lowEndDevice: isLowEndDevice
    };
    
    return deviceCapabilities.value;
  }
  
  /**
   * 获取当前推荐设置
   * @returns {Object} - 推荐的性能设置
   */
  function getRecommendedSettings() {
    if (!opts.enabled || !isMonitoring) return {};
    
    const currentScore = performanceScore.value;
    const currentTrend = performanceTrend.value;
    const capabilities = deviceCapabilities.value;
    
    // 距离上次设置更新不足10秒则不更新
    if (Date.now() - lastSettingsUpdate < 10000) {
      return {};
    }
    
    const settings = {};
    
    // 根据性能分数和趋势调整设置
    if (currentScore < 50 || (currentScore < 70 && currentTrend === 'degrading')) {
      // 性能严重不足，采取激进措施
      settings.buffer = 5;  // 减小缓冲区
      settings.overscan = 2; // 减小过扫描
      settings.throttleMs = 100; // 增加节流时间
      settings.dynamicItemHeight = false; // 禁用动态高度
      settings.recycleDOM = true; // 启用DOM回收
    } else if (currentScore < 70) {
      // 性能较差，采取适度措施
      settings.buffer = 10;
      settings.overscan = 5;
      settings.throttleMs = 50;
      settings.recycleDOM = true;
    } else if (currentScore < 85 && currentTrend === 'degrading') {
      // 性能正在下降，预防性措施
      settings.throttleMs = 32;
      settings.buffer = 15;
    }
    
    // 考虑设备特性
    if (capabilities.mobile || capabilities.lowEndDevice) {
      settings.throttleMs = Math.max(settings.throttleMs || 0, 50);
      settings.recycleDOM = true;
    }
    
    // 如果检测到非常严重的性能问题
    if (longTasks.value > 5 && longTasks.value / renderCount > 0.1) {
      settings.dynamicItemHeight = false; // 动态高度可能是性能杀手
      settings.throttleMs = 100;
    }
    
    // 记录上次更新时间
    if (Object.keys(settings).length > 0) {
      lastSettingsUpdate = Date.now();
    }
    
    return settings;
  }
  
  /**
   * 检查是否应该应用自适应调整
   */
  function checkForAdaptiveAdjustment() {
    if (!opts.enabled || !opts.onSettingsChange) return false;
    
    const settings = getRecommendedSettings();
    if (Object.keys(settings).length > 0) {
      opts.onSettingsChange(settings);
      return true;
    }
    
    return false;
  }
  
  /**
   * 获取详细性能数据
   */
  function getDetailedPerformanceData() {
    return {
      renderTimes: [...renderTimes.value],
      averageRenderTime: averageRenderTime.value,
      scrollEvents: scrollEvents.value,
      frameDrops: frameDrops.value,
      jankCount: jankCount.value,
      longTasks: longTasks.value,
      performanceScore: performanceScore.value,
      performanceTrend: performanceTrend.value,
      deviceCapabilities: { ...deviceCapabilities.value },
      history: {
        renderTimes: [...performanceHistory.renderTimes],
        scrollEventTimes: [...performanceHistory.scrollEventTimes],
        longTaskTimes: [...performanceHistory.longTaskTimes],
        memoryUsage: [...performanceHistory.memoryUsage]
      }
    };
  }
  
  /**
   * 获取原始性能数据
   */
  function getRawData() {
    return {
      renderTimesArray: renderTimes.value,
      scrollEventsCount: scrollEvents.value,
      frameDropsCount: frameDrops.value,
      jankCount: jankCount.value,
      longTasksCount: longTasks.value,
      lastRenderTimestamp: lastRenderTimestamp.value
    };
  }
  
  /**
   * 开始性能监控
   */
  function startMonitoring() {
    if (isMonitoring) return;
    
    isMonitoring = true;
    
    // 检测设备能力
    detectDeviceCapabilities();
    
    // 设置定期更新
    if (opts.updateInterval > 0) {
      updateIntervalId = setInterval(() => {
        // 更新性能分数
        calculatePerformanceScore();
        
        // 收集内存统计
        if (opts.collectMemoryStats) {
          collectMemoryStats();
        }
        
        // 检查自适应调整
        checkForAdaptiveAdjustment();
      }, opts.updateInterval);
    }
    
    // 记录初始内存基准
    try {
      if (window.performance && window.performance.memory) {
        memoryUsageStartValue = window.performance.memory.usedJSHeapSize;
      }
    } catch (e) {
      // 忽略错误
    }
  }
  
  /**
   * 停止性能监控
   */
  function stopMonitoring() {
    isMonitoring = false;
    
    if (updateIntervalId) {
      clearInterval(updateIntervalId);
      updateIntervalId = null;
    }
  }
  
  /**
   * 重置性能统计
   */
  function resetMetrics() {
    renderTimes.value = [];
    scrollEvents.value = 0;
    frameDrops.value = 0;
    jankCount.value = 0;
    longTasks.value = 0;
    lastRenderTimestamp.value = 0;
    averageRenderTime.value = 0;
    
    totalRenderTime = 0;
    renderCount = 0;
    previousScores = [];
    
    performanceHistory.renderTimes = [];
    performanceHistory.scrollEventTimes = [];
    performanceHistory.longTaskTimes = [];
    performanceHistory.memoryUsage = [];
    
    // 重新计算性能分数
    performanceScore.value = 100;
    performanceTrend.value = 'stable';
  }
  
  // 生命周期钩子
  onMounted(() => {
    if (opts.enabled) {
      startMonitoring();
    }
  });
  
  onUnmounted(() => {
    stopMonitoring();
  });
  
  // 返回API
  return {
    // 响应式状态
    renderTimes,
    scrollEvents,
    frameDrops,
    jankCount,
    longTasks,
    lastRenderTimestamp,
    averageRenderTime,
    performanceScore,
    performanceTrend,
    deviceCapabilities,
    
    // 方法
    recordRenderTime,
    recordScrollEvent,
    recordFrameDrop,
    getRecommendedSettings,
    checkForAdaptiveAdjustment,
    getDetailedPerformanceData,
    getRawData,
    startMonitoring,
    stopMonitoring,
    resetMetrics,
    detectDeviceCapabilities,
    
    // 内部方法
    _calculatePerformanceScore: calculatePerformanceScore,
    _collectMemoryStats: collectMemoryStats
  };
} 