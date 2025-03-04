import { ref, computed, watch, onMounted, onUnmounted } from '../../../../static/vue.esm-browser.js';

/**
 * 高级性能优化引擎，具有长期数据分析和智能调整能力
 * @param {Object} options - 配置选项
 * @returns {Object} - 性能优化API
 */
export function usePerformanceOptimizer(options = {}) {
  // 默认配置
  const defaultOptions = {
    enabled: true,
    sampleSize: 100,
    historyLength: 24, // 保留24小时的历史数据
    samplingInterval: 10000, // 10秒采样间隔
    adaptiveThreshold: 0.2, // 20%变化触发适应性调整
    minRenderTime: 8, // 最小渲染时间（毫秒）
    targetRenderTime: 16.67, // 目标渲染时间（60fps）
    maxRenderTime: 33.33, // 最大可接受渲染时间（30fps）
    stabilityPeriod: 5000, // 稳定期（毫秒）
    learningRate: 0.05, // 学习率
    deviceProfileEnabled: true, // 启用设备档案
    debugLog: false, // 启用调试日志
    memoryMonitoring: true, // 启用内存监控
    memoryThreshold: 0.8, // 内存阈值（占用比例）
    sessionPersistence: true, // 会话持久化
    storageKey: 'vs-performance-data', // 存储键名
    adaptationStrategies: ['buffer', 'throttle', 'overscan'], // 自适应策略
  };

  // 合并选项
  const opts = { ...defaultOptions, ...options };

  // 状态变量
  const isMonitoring = ref(false);
  const renderTimes = ref([]);
  const scrollEvents = ref(0);
  const frameDrops = ref(0);
  const longTasks = ref([]);
  const memoryUsage = ref({ used: 0, limit: 0, ratio: 0 });
  const performanceScore = ref(100);
  const adaptationHistory = ref([]);

  // 设备能力检测结果
  const deviceCapabilities = ref({
    memory: null, // MB
    cpu: null, // 相对性能分数 (0-1)
    gpu: null, // 相对性能分数 (0-1)
    mobile: null, // 是否移动设备
    connection: null, // 网络连接类型
    browser: null, // 浏览器信息
    screen: null // 屏幕信息
  });

  // 历史性能数据 - 按小时分段存储
  const hourlyData = ref(new Array(opts.historyLength).fill().map(() => ({
    timestamp: 0,
    samples: [],
    avgRenderTime: 0,
    maxRenderTime: 0,
    frameDrops: 0,
    memoryPeak: 0,
    settings: null
  })));

  // 当前性能状态
  const currentState = ref({
    trend: 'stable', // stable, improving, degrading
    lastAdaptation: 0,
    stableCounter: 0,
    optimalSettings: null,
    performanceIssues: [],
    memoryLeakProbability: 0,
    adaptationPending: false
  });

  // 计算平均渲染时间
  const averageRenderTime = computed(() => {
    if (renderTimes.value.length === 0) return 0;
    return renderTimes.value.reduce((a, b) => a + b, 0) / renderTimes.value.length;
  });

  // 计算抖动率 (jank rate)
  const jankRate = computed(() => {
    if (scrollEvents.value === 0) return 0;
    return frameDrops.value / scrollEvents.value;
  });

  // 当前性能趋势
  const performanceTrend = computed(() => {
    return currentState.value.trend;
  });

  /**
   * 启动性能监控
   */
  function startMonitoring() {
    if (isMonitoring.value) return;
    isMonitoring.value = true;
    
    // 初始化监控
    detectDeviceCapabilities();
    setupPerformanceObservers();
    setupMemoryMonitoring();
    loadHistoricalData();
    
    // 定期保存历史数据
    startHistoryTracking();
  }

  /**
   * 停止性能监控
   */
  function stopMonitoring() {
    if (!isMonitoring.value) return;
    isMonitoring.value = false;
    
    // 清理所有观察器
    cleanupPerformanceObservers();
    cleanupMemoryMonitoring();
    stopHistoryTracking();
    
    // 保存最终数据
    if (opts.sessionPersistence) {
      saveHistoricalData();
    }
  }

  // 内部变量存储性能观察器和定时器
  let performanceObserver = null;
  let longTaskObserver = null;
  let memoryCheckInterval = null;
  let historySaveInterval = null;

  /**
   * 设置性能观察器
   */
  function setupPerformanceObservers() {
    if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') return;

    try {
      // 监控长任务
      if (PerformanceObserver.supportedEntryTypes.includes('longtask')) {
        longTaskObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            longTasks.value.push({
              duration: entry.duration,
              startTime: entry.startTime,
              name: entry.name
            });
            
            // 只保留最近的50个长任务记录
            if (longTasks.value.length > 50) {
              longTasks.value.shift();
            }
            
            // 更新性能分数
            updatePerformanceScore();
            
            // 检查是否需要适应性调整
            checkForAdaptiveAdjustment();
          });
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });
      }

      // 监控布局变化和渲染性能
      if (PerformanceObserver.supportedEntryTypes.includes('layout-shift')) {
        performanceObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.value > 0.1) {
              frameDrops.value++;
              updatePerformanceScore();
            }
          });
        });
        performanceObserver.observe({ entryTypes: ['layout-shift'] });
      }
    } catch (error) {
      console.warn('性能监控设置失败:', error);
    }
  }

  /**
   * 设置内存监控
   */
  function setupMemoryMonitoring() {
    if (!opts.memoryMonitoring || typeof window === 'undefined') return;
    
    // 尝试使用performance.memory (Chrome)或其他方法获取内存使用情况
    memoryCheckInterval = setInterval(() => {
      try {
        if (window.performance && window.performance.memory) {
          const mem = window.performance.memory;
          memoryUsage.value = {
            used: Math.round(mem.usedJSHeapSize / (1024 * 1024)),
            limit: Math.round(mem.jsHeapSizeLimit / (1024 * 1024)),
            ratio: mem.usedJSHeapSize / mem.jsHeapSizeLimit
          };
          
          detectMemoryLeak();
        }
      } catch (e) {
        // 某些浏览器可能不支持或禁止访问内存信息
        if (opts.debugLog) {
          console.warn('内存监控失败:', e);
        }
      }
    }, 30000); // 每30秒检查一次，降低性能开销
  }

  /**
   * 检测内存泄漏
   */
  function detectMemoryLeak() {
    // 使用历史数据分析趋势
    const samples = hourlyData.value
      .filter(h => h.timestamp > 0)
      .map(h => h.memoryPeak);
      
    if (samples.length < 3) return; // 需要足够的数据点
    
    // 计算斜率
    const slope = calculateTrendSlope(samples);
    
    // 如果斜率持续增长，可能存在内存泄漏
    if (slope > 0.1) {
      currentState.value.memoryLeakProbability += 0.1;
      if (currentState.value.memoryLeakProbability > 0.7) {
        // 高概率内存泄漏
        currentState.value.performanceIssues.push({
          type: 'memoryLeak',
          severity: 'high',
          timestamp: Date.now(),
          data: { slope, samples }
        });
        
        // 防止重复报告
        currentState.value.memoryLeakProbability = 0.7;
      }
    } else {
      // 逐渐降低概率
      currentState.value.memoryLeakProbability = Math.max(0, currentState.value.memoryLeakProbability - 0.05);
    }
  }

  /**
   * 计算趋势斜率
   */
  function calculateTrendSlope(samples) {
    if (samples.length < 2) return 0;
    
    // 简化线性回归
    let n = samples.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;
    
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += samples[i] || 0;
      sumXY += i * (samples[i] || 0);
      sumXX += i * i;
    }
    
    // 避免除以零
    if (n * sumXX === sumX * sumX) return 0;
    
    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }

  /**
   * 清理性能观察器
   */
  function cleanupPerformanceObservers() {
    if (performanceObserver) {
      performanceObserver.disconnect();
      performanceObserver = null;
    }
    
    if (longTaskObserver) {
      longTaskObserver.disconnect();
      longTaskObserver = null;
    }
  }

  /**
   * 清理内存监控
   */
  function cleanupMemoryMonitoring() {
    if (memoryCheckInterval) {
      clearInterval(memoryCheckInterval);
      memoryCheckInterval = null;
    }
  }

  /**
   * 启动历史数据跟踪
   */
  function startHistoryTracking() {
    if (historySaveInterval) return;
    
    // 定期保存历史数据
    historySaveInterval = setInterval(() => {
      updateHistoricalData();
      
      if (opts.sessionPersistence) {
        saveHistoricalData();
      }
    }, opts.samplingInterval);
  }

  /**
   * 停止历史数据跟踪
   */
  function stopHistoryTracking() {
    if (historySaveInterval) {
      clearInterval(historySaveInterval);
      historySaveInterval = null;
    }
  }

  /**
   * 读取历史性能数据
   */
  function loadHistoricalData() {
    if (!opts.sessionPersistence || typeof localStorage === 'undefined') return;
    
    try {
      const data = localStorage.getItem(opts.storageKey);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          hourlyData.value = parsed;
        }
      }
    } catch (e) {
      console.warn('读取性能历史数据失败:', e);
    }
  }

  /**
   * 保存历史性能数据
   */
  function saveHistoricalData() {
    if (!opts.sessionPersistence || typeof localStorage === 'undefined') return;
    
    try {
      localStorage.setItem(opts.storageKey, JSON.stringify(hourlyData.value));
    } catch (e) {
      console.warn('保存性能历史数据失败:', e);
    }
  }

  /**
   * 更新历史数据
   */
  function updateHistoricalData() {
    const now = Date.now();
    const hourIndex = Math.floor(Date.now() / 3600000) % opts.historyLength;
    
    // 如果是新的小时，重置该小时的数据
    if (hourlyData.value[hourIndex].timestamp === 0 || 
        now - hourlyData.value[hourIndex].timestamp > 3600000) {
      hourlyData.value[hourIndex] = {
        timestamp: now,
        samples: [],
        avgRenderTime: 0,
        maxRenderTime: 0,
        frameDrops: 0,
        memoryPeak: 0,
        settings: null
      };
    }
    
    // 添加当前样本
    if (renderTimes.value.length > 0) {
      const currentSample = {
        time: now,
        avg: averageRenderTime.value,
        max: Math.max(...renderTimes.value),
        drops: frameDrops.value,
        memory: memoryUsage.value.used
      };
      
      hourlyData.value[hourIndex].samples.push(currentSample);
      
      // 更新聚合数据
      hourlyData.value[hourIndex].avgRenderTime = 
        hourlyData.value[hourIndex].samples.reduce((sum, s) => sum + s.avg, 0) / 
        hourlyData.value[hourIndex].samples.length;
      
      hourlyData.value[hourIndex].maxRenderTime = 
        Math.max(...hourlyData.value[hourIndex].samples.map(s => s.max));
      
      hourlyData.value[hourIndex].frameDrops = frameDrops.value;
      
      hourlyData.value[hourIndex].memoryPeak = 
        Math.max(hourlyData.value[hourIndex].memoryPeak, memoryUsage.value.used);
    }
  }

  /**
   * 记录渲染时间
   * @param {Number} time - 渲染时间(ms)
   */
  function recordRenderTime(time) {
    if (!isMonitoring.value || typeof time !== 'number' || isNaN(time)) return;
    
    renderTimes.value.push(time);
    
    // 保持固定样本大小
    if (renderTimes.value.length > opts.sampleSize) {
      renderTimes.value.shift();
    }
    
    // 更新性能分数
    updatePerformanceScore();
    
    // 检查是否需要适应性调整
    checkForAdaptiveAdjustment();
  }

  /**
   * 记录滚动事件
   */
  function recordScrollEvent() {
    if (!isMonitoring.value) return;
    scrollEvents.value++;
  }

  /**
   * 记录帧丢失
   * @param {Number} count - 丢失的帧数
   */
  function recordFrameDrop(count = 1) {
    if (!isMonitoring.value) return;
    frameDrops.value += count;
    updatePerformanceScore();
  }

  /**
   * 更新性能分数
   */
  function updatePerformanceScore() {
    if (renderTimes.value.length === 0) return;
    
    // 基于多个因素计算性能分数
    const avgScore = Math.max(0, 100 - (averageRenderTime.value / opts.targetRenderTime - 1) * 50);
    const dropScore = Math.max(0, 100 - (frameDrops.value / (scrollEvents.value + 1)) * 200);
    const taskScore = Math.max(0, 100 - (longTasks.value.length * 5));
    const memoryScore = memoryUsage.value.ratio > 0 
      ? Math.max(0, 100 - (memoryUsage.value.ratio / opts.memoryThreshold) * 100)
      : 100;
    
    // 加权平均
    performanceScore.value = Math.round(
      avgScore * 0.4 + 
      dropScore * 0.3 + 
      taskScore * 0.2 + 
      memoryScore * 0.1
    );
    
    // 更新趋势
    updatePerformanceTrend();
  }

  /**
   * 更新性能趋势
   */
  function updatePerformanceTrend() {
    if (hourlyData.value.filter(h => h.timestamp > 0).length < 2) {
      currentState.value.trend = 'stable';
      return;
    }
    
    // 获取最近两小时的性能数据
    const recentHours = hourlyData.value
      .filter(h => h.timestamp > 0)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 2);
    
    if (recentHours.length < 2) {
      currentState.value.trend = 'stable';
      return;
    }
    
    const current = recentHours[0].avgRenderTime;
    const previous = recentHours[1].avgRenderTime;
    
    if (previous === 0) {
      currentState.value.trend = 'stable';
      return;
    }
    
    const change = (current - previous) / previous;
    
    if (change > 0.1) {
      currentState.value.trend = 'degrading';
    } else if (change < -0.1) {
      currentState.value.trend = 'improving';
    } else {
      currentState.value.trend = 'stable';
      currentState.value.stableCounter++;
      
      // 如果性能稳定一段时间，保存当前设置作为最优设置
      if (currentState.value.stableCounter >= 5 && performanceScore.value > 80) {
        currentState.value.optimalSettings = getCurrentSettings();
      }
    }
  }

  /**
   * 检查是否需要进行自适应调整
   */
  function checkForAdaptiveAdjustment() {
    if (!opts.enabled || !isMonitoring.value) return false;
    
    // 限制调整频率
    const now = Date.now();
    if (now - currentState.value.lastAdaptation < opts.stabilityPeriod) {
      return false;
    }
    
    // 检查性能分数是否低于阈值
    if (performanceScore.value < 70 || averageRenderTime.value > opts.maxRenderTime) {
      currentState.value.adaptationPending = true;
      return true;
    }
    
    return false;
  }

  /**
   * 获取推荐的性能设置
   * @returns {Object} 推荐设置
   */
  function getRecommendedSettings() {
    if (!opts.enabled || !isMonitoring.value) {
      return null;
    }
    
    // 如果性能良好且存在最优设置，返回最优设置
    if (performanceScore.value > 80 && currentState.value.optimalSettings) {
      return currentState.value.optimalSettings;
    }
    
    // 根据当前性能状况创建建议设置
    const settings = {};
    
    // 判断哪些方面需要调整
    const needsBufferReduction = averageRenderTime.value > opts.targetRenderTime * 1.2;
    const needsThrottleIncrease = frameDrops.value > scrollEvents.value * 0.1;
    const needsMemoryOptimization = memoryUsage.value.ratio > opts.memoryThreshold * 0.9;
    
    // 调整缓冲区大小
    if (needsBufferReduction && opts.adaptationStrategies.includes('buffer')) {
      const currentBuffer = getCurrentSettings().buffer || 20;
      settings.buffer = Math.max(5, Math.ceil(currentBuffer * 0.8));
    }
    
    // 调整节流时间
    if (needsThrottleIncrease && opts.adaptationStrategies.includes('throttle')) {
      const currentThrottle = getCurrentSettings().throttleMs || 32;
      settings.throttleMs = Math.min(100, Math.ceil(currentThrottle * 1.25));
    }
    
    // 调整overscan
    if ((needsBufferReduction || needsMemoryOptimization) && 
        opts.adaptationStrategies.includes('overscan')) {
      const currentOverscan = getCurrentSettings().overscan || 10;
      settings.overscan = Math.max(2, Math.ceil(currentOverscan * 0.7));
    }
    
    // 特殊情况：长任务过多
    if (longTasks.value.length > 10 && longTasks.value.some(t => t.duration > 100)) {
      settings.recycleDOM = true;
      settings.dynamicItemHeight = false;
    }
    
    // 记录调整建议
    if (Object.keys(settings).length > 0) {
      adaptationHistory.value.push({
        timestamp: Date.now(),
        score: performanceScore.value,
        avgRenderTime: averageRenderTime.value,
        settings
      });
      
      // 只保留最新的20条记录
      if (adaptationHistory.value.length > 20) {
        adaptationHistory.value.shift();
      }
      
      currentState.value.lastAdaptation = Date.now();
      currentState.value.adaptationPending = false;
    }
    
    return settings;
  }

  /**
   * 获取当前设置
   * @returns {Object} 当前设置
   */
  function getCurrentSettings() {
    // 此方法应由外部调用方提供当前设置
    // 在实际使用时会被外部传入的当前设置覆盖
    return {
      buffer: 20,
      throttleMs: 32,
      overscan: 10,
      recycleDOM: false,
      dynamicItemHeight: true
    };
  }

  /**
   * 设置当前设置获取器
   * @param {Function} getter - 获取当前设置的函数
   */
  function setCurrentSettingsGetter(getter) {
    if (typeof getter === 'function') {
      getCurrentSettings = getter;
    }
  }

  /**
   * 检测设备能力
   */
  function detectDeviceCapabilities() {
    if (!opts.deviceProfileEnabled || typeof window === 'undefined') return;
    
    // 检测设备类型
    deviceCapabilities.value.mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    
    // 检测浏览器
    deviceCapabilities.value.browser = {
      name: getBrowserName(),
      version: getBrowserVersion(),
      engine: getBrowserEngine()
    };
    
    // 检测屏幕
    if (window.screen) {
      deviceCapabilities.value.screen = {
        width: window.screen.width,
        height: window.screen.height,
        pixelRatio: window.devicePixelRatio || 1
      };
    }
    
    // 检测网络
    if (navigator.connection) {
      deviceCapabilities.value.connection = {
        type: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt,
        saveData: navigator.connection.saveData
      };
    }
    
    // 估算CPU性能
    estimateCpuPerformance().then(score => {
      deviceCapabilities.value.cpu = score;
    });
    
    // 估算内存
    if (window.performance && window.performance.memory) {
      deviceCapabilities.value.memory = 
        Math.round(window.performance.memory.jsHeapSizeLimit / (1024 * 1024));
    }
    
    // 估算GPU能力
    estimateGpuPerformance().then(score => {
      deviceCapabilities.value.gpu = score;
    });
  }

  /**
   * 估算CPU性能
   * @returns {Promise<number>} CPU性能分数 (0-1)
   */
  async function estimateCpuPerformance() {
    return new Promise(resolve => {
      const startTime = performance.now();
      let counter = 0;
      const maxIterations = 10000000;
      
      // 简单的计算密集型任务
      while (counter < maxIterations && performance.now() - startTime < 50) {
        counter++;
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // 计算相对性能分数
      // 高性能设备可能在50ms内完成所有迭代，得分接近1
      // 低性能设备可能只完成一小部分迭代，得分接近0
      const score = Math.min(1, counter / maxIterations);
      
      resolve(score);
    });
  }

  /**
   * 估算GPU性能
   * @returns {Promise<number>} GPU性能分数 (0-1)
   */
  async function estimateGpuPerformance() {
    return new Promise(resolve => {
      // 创建临时canvas进行简单测试
      const canvas = document.createElement('canvas');
      canvas.width = 1000;
      canvas.height = 1000;
      canvas.style.position = 'absolute';
      canvas.style.left = '-9999px';
      document.body.appendChild(canvas);
      
      const ctx = canvas.getContext('2d') || canvas.getContext('webgl');
      if (!ctx) {
        document.body.removeChild(canvas);
        resolve(0.5); // 无法测试，返回中等分数
        return;
      }
      
      const startTime = performance.now();
      let frames = 0;
      const maxFrames = 100;
      
      function drawFrame() {
        if (frames >= maxFrames || performance.now() - startTime > 1000) {
          const duration = performance.now() - startTime;
          const fps = frames / (duration / 1000);
          document.body.removeChild(canvas);
          
          // 基于fps计算分数，60fps以上为1，10fps以下为0
          const score = Math.min(1, Math.max(0, (fps - 10) / 50));
          resolve(score);
          return;
        }
        
        // 绘制复杂图形
        if (ctx instanceof CanvasRenderingContext2D) {
          ctx.clearRect(0, 0, 1000, 1000);
          for (let i = 0; i < 100; i++) {
            ctx.fillStyle = `rgba(${Math.random() * 255},${Math.random() * 255},${Math.random() * 255},0.5)`;
            ctx.beginPath();
            ctx.arc(Math.random() * 1000, Math.random() * 1000, Math.random() * 50, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          // WebGL上下文
          // 简单清屏操作
          ctx.clear(ctx.COLOR_BUFFER_BIT);
        }
        
        frames++;
        requestAnimationFrame(drawFrame);
      }
      
      requestAnimationFrame(drawFrame);
    });
  }

  /**
   * 获取浏览器名称
   */
  function getBrowserName() {
    const ua = navigator.userAgent;
    if (ua.indexOf("Firefox") > -1) return "Firefox";
    if (ua.indexOf("Opera") > -1 || ua.indexOf("OPR") > -1) return "Opera";
    if (ua.indexOf("Edge") > -1) return "Edge";
    if (ua.indexOf("Chrome") > -1) return "Chrome";
    if (ua.indexOf("Safari") > -1) return "Safari";
    if (ua.indexOf("MSIE") > -1 || ua.indexOf("Trident") > -1) return "IE";
    return "Unknown";
  }

  /**
   * 获取浏览器版本
   */
  function getBrowserVersion() {
    let match = navigator.userAgent.match(/(firefox|opera|chrome|safari|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
    if (match[1]?.toLowerCase() === 'trident') {
      let ver = /\brv[ :]+(\d+)/g.exec(navigator.userAgent) || [];
      return ver[1] || '';
    }
    return match[2] || '';
  }

  /**
   * 获取浏览器渲染引擎
   */
  function getBrowserEngine() {
    const ua = navigator.userAgent;
    if (ua.indexOf("Gecko") > -1 && ua.indexOf("KHTML") === -1) return "Gecko";
    if (ua.indexOf("AppleWebKit") > -1) return "WebKit";
    if (ua.indexOf("Trident") > -1) return "Trident";
    if (ua.indexOf("Blink") > -1) return "Blink";
    return "Unknown";
  }

  /**
   * 获取详细性能数据
   */
  function getDetailedPerformanceData() {
    return {
      renderTimes: renderTimes.value,
      averageRenderTime: averageRenderTime.value,
      scrollEvents: scrollEvents.value,
      frameDrops: frameDrops.value,
      longTasks: longTasks.value,
      memoryUsage: memoryUsage.value,
      performanceScore: performanceScore.value,
      deviceCapabilities: deviceCapabilities.value,
      trend: currentState.value.trend,
      history: hourlyData.value.filter(h => h.timestamp > 0),
      adaptations: adaptationHistory.value
    };
  }

  /**
   * 获取性能优化建议
   */
  function getOptimizationSuggestions() {
    const suggestions = [];
    
    if (averageRenderTime.value > opts.targetRenderTime * 1.5) {
      suggestions.push({
        area: 'rendering',
        severity: 'high',
        message: '渲染时间过长',
        recommendation: '减少虚拟滚动缓冲区大小，关闭动态高度'
      });
    }
    
    if (frameDrops.value > scrollEvents.value * 0.2) {
      suggestions.push({
        area: 'scrolling',
        severity: 'high',
        message: '滚动帧丢失严重',
        recommendation: '增加节流时间，减少渲染项目数量'
      });
    }
    
    if (longTasks.value.length > 10) {
      suggestions.push({
        area: 'javascript',
        severity: 'medium',
        message: '长任务过多',
        recommendation: '分解计算密集型操作，使用虚拟DOM回收'
      });
    }
    
    if (memoryUsage.value.ratio > opts.memoryThreshold) {
      suggestions.push({
        area: 'memory',
        severity: 'high',
        message: '内存占用过高',
        recommendation: '清理缓存，减少预加载，启用DOM回收'
      });
    }
    
    return suggestions;
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

  return {
    // 状态
    isMonitoring,
    performanceScore,
    averageRenderTime,
    jankRate,
    performanceTrend,
    deviceCapabilities,
    memoryUsage,
    
    // 控制方法
    startMonitoring,
    stopMonitoring,
    
    // 记录方法
    recordRenderTime,
    recordScrollEvent,
    recordFrameDrop,
    
    // 适应性调整
    getRecommendedSettings,
    setCurrentSettingsGetter,
    checkForAdaptiveAdjustment,
    
    // 高级数据
    getDetailedPerformanceData,
    getOptimizationSuggestions,
    
    // 内部状态访问
    getCurrentState: () => currentState.value,
    getRawData: () => ({
      renderTimes: renderTimes.value,
      scrollEvents: scrollEvents.value,
      frameDrops: frameDrops.value,
      longTasks: longTasks.value,
      lastRenderTimestamp: renderTimes.value.length > 0 ? Date.now() : 0
    })
  };
} 