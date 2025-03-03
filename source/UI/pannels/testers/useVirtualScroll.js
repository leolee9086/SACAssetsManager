import { ref, computed, watch, onMounted, onUnmounted, nextTick } from '../../../../static/vue.esm-browser.js';
import { useThrottle, useDebounce } from './useEventModifiers.js';
import { usePerformanceMonitor } from './usePerformanceMonitor.js';

/**
 * 提供虚拟滚动功能的组合式API
 * @param {Object} options - 配置选项
 * @param {Array} options.items - 要显示的所有项目数组
 * @param {Number} options.itemHeight - 每个项目的估计高度(px)
 * @param {Number} options.maxVisibleItems - 一次最多显示的项目数
 * @param {Boolean} options.autoScroll - 是否自动滚动到底部
 * @param {Number} options.buffer - 上下缓冲区大小
 * @param {Number} options.overscan - 过扫描项的数量，提高滚动流畅度
 * @param {Number} options.throttleMs - 滚动事件节流时间(ms)
 * @param {Boolean} options.fallbackToStandard - 失败时是否回退到标准滚动
 * @param {Boolean} options.dynamicItemHeight - 是否使用动态项目高度
 * @param {Function} options.getItemHeight - 获取特定项目高度的函数
 * @param {Number} options.stabilityThreshold - 稳定性阈值，错误次数超过此值将回退
 * @param {String} options.preloadStrategy - 预加载策略 ('none', 'static', 'dynamic')
 * @param {String} options.cacheStrategy - 缓存策略 ('lru', 'simple', 'hybrid')
 * @param {String} options.scrollToItemAlignment - 滚动到项目时的对齐方式 ('start', 'center', 'end', 'auto')
 * @param {Boolean} options.scrollRestoration - 是否恢复上次滚动位置
 * @param {Boolean} options.adaptiveUpdate - 是否根据设备性能自适应调整更新策略
 * @param {Boolean} options.recycleDOM - 是否复用DOM元素
 * @param {Boolean} options.intersectionObserver - 是否使用IntersectionObserver优化
 * @returns {Object} - 虚拟滚动状态和方法
 */
export function useVirtualScroll(options = {}) {
  // 默认选项
  const defaultOptions = {
    items: [],
    itemHeight: 30,
    maxVisibleItems: 200,
    autoScroll: true,
    buffer: 20,
    overscan: 10,
    throttleMs: 16,
    fallbackToStandard: true,
    dynamicItemHeight: false,
    getItemHeight: null,
    stabilityThreshold: 5,
    preloadStrategy: 'dynamic',
    cacheStrategy: 'lru',
    scrollToItemAlignment: 'start',
    scrollRestoration: true,
    adaptiveUpdate: true,
    recycleDOM: false,
    intersectionObserver: true
  };
  
  const opts = { ...defaultOptions, ...options };
  
  // 状态 - 使用非响应式变量减少不必要的依赖收集
  const containerRef = ref(null);
  const isScrolling = ref(false);
  let scrollTimeout = null; // 非响应式
  const isScrolledToBottom = ref(true);
  const visibleItemCount = ref(opts.maxVisibleItems);
  const virtualScrollEnabled = ref(true);
  const viewportHeight = ref(0);
  let resizeObserver = null; // 非响应式
  let errorCount = 0; // 非响应式
  const itemsCache = new Map(); // 非响应式缓存 - 减少响应性开销
  let isInitialized = false; // 非响应式
  let lastScrollPosition = 0; // 记录最后的滚动位置
  
  // 使用抽离出的性能监控工具
  const performanceMonitor = usePerformanceMonitor({
    enableAdaptiveSettings: opts.adaptiveUpdate,
    onPerformanceIssue: (issue) => {
      // 处理性能问题
      if (issue.type === 'longTask' && issue.duration > 200) {
        console.warn('检测到严重性能问题，调整虚拟滚动参数');
      }
    },
    onSettingsChange: (newSettings) => {
      // 根据性能监控建议更新设置
      if (newSettings.throttleMs) {
        opts.throttleMs = newSettings.throttleMs;
      }
      if (typeof newSettings.batchSize !== 'undefined') {
        opts.buffer = Math.max(3, Math.min(30, newSettings.batchSize));
        opts.overscan = Math.max(1, Math.min(20, Math.floor(newSettings.batchSize / 2)));
      }
    }
  });
  
  // 创建局部滚动位置缓存，而不是全局的
  const scrollPositionCache = new Map();
  
  // 安全获取items数组，防止undefined错误
  const getItems = () => {
    return Array.isArray(opts.items?.value) ? opts.items.value : Array.isArray(opts.items) ? opts.items : [];
  };
  
  // 获取项目位置 - 优化超大数据集性能
  function getItemPosition(index) {
    if (index <= 0) return 0;
    
    try {
      let position = 0;
      const items = getItems();
      
      // 新增：位置缓存 - 减少重复计算
      const positionCacheKey = `pos_${index}`;
      if (itemsCache.has(positionCacheKey)) {
        return itemsCache.get(positionCacheKey);
      }
      
      if (opts.dynamicItemHeight && typeof opts.getItemHeight === 'function') {
        // 新增：分段缓存策略 - 记录每100个项目的起始位置
        const segmentSize = 100;
        const segmentIndex = Math.floor(index / segmentSize);
        const segmentKey = `segment_${segmentIndex}`;
        
        let startPos = 0;
        let startIdx = 0;
        
        // 查找最近的分段缓存点
        if (itemsCache.has(segmentKey)) {
          const segmentData = itemsCache.get(segmentKey);
          startPos = segmentData.position;
          startIdx = segmentData.index;
        } else {
          // 查找小于当前分段的最大分段缓存
          let maxSegment = -1;
          let maxSegmentData = null;
          
          for (let i = segmentIndex - 1; i >= 0; i--) {
            const key = `segment_${i}`;
            if (itemsCache.has(key)) {
              maxSegment = i;
              maxSegmentData = itemsCache.get(key);
              break;
            }
          }
          
          if (maxSegmentData) {
            startPos = maxSegmentData.position;
            startIdx = maxSegmentData.index;
          }
        }
        
        // 从最近的缓存点计算到目标索引
        for (let i = startIdx; i < index; i++) {
          startPos += getItemHeightByIndex(i);
          
          // 建立新的分段缓存点
          if (i > 0 && i % segmentSize === 0) {
            itemsCache.set(`segment_${Math.floor(i / segmentSize)}`, {
              position: startPos,
              index: i
            });
          }
        }
        
        // 缓存当前索引的位置
        itemsCache.set(positionCacheKey, startPos);
        
        return startPos;
      } else {
        position = index * opts.itemHeight;
      }
      
      return position;
    } catch (error) {
      console.error('计算项目位置时出错:', error);
      return index * opts.itemHeight; // 出错时回退到简单计算
    }
  }
  
  // 智能的缓存管理策略
  function manageCache() {
    try {
      const items = getItems();
      const totalCount = items.length;
      
      // 自适应缓存大小限制 - 根据项目总数调整
      let maxCacheSize = 1000; // 默认基础值
      
      if (totalCount > 100000) {
        maxCacheSize = 10000;
      } else if (totalCount > 10000) {
        maxCacheSize = 5000;
      } else if (totalCount > 1000) {
        maxCacheSize = 2000;
      }
      
      if (itemsCache.size <= maxCacheSize) return;
      
      // 优先保留视口附近的缓存项
      const currentIndex = containerRef.value ? 
        Math.floor(containerRef.value.scrollTop / opts.itemHeight) : 0;
      
      // 收集所有缓存键并按类型分组
      const heightKeys = [];
      const positionKeys = [];
      const segmentKeys = [];
      
      for (const key of itemsCache.keys()) {
        if (key.startsWith('pos_')) {
          positionKeys.push({
            key,
            index: parseInt(key.substring(4)),
            distance: Math.abs(parseInt(key.substring(4)) - currentIndex)
          });
        } else if (key.startsWith('segment_')) {
          segmentKeys.push({
            key,
            index: parseInt(key.substring(8))
          });
        } else if (!isNaN(key)) {
          heightKeys.push({
            key,
            index: parseInt(key),
            distance: Math.abs(parseInt(key) - currentIndex)
          });
        }
      }
      
      // LRU策略 - 优先删除距离当前视图最远的项目
      // 1. 先删除远离视口的位置缓存
      if (positionKeys.length > maxCacheSize * 0.4) {
        positionKeys.sort((a, b) => b.distance - a.distance);
        const toDeleteCount = Math.floor(positionKeys.length * 0.6);
        positionKeys.slice(0, toDeleteCount).forEach(item => itemsCache.delete(item.key));
      }
      
      // 2. 再删除远离视口的高度缓存
      if (heightKeys.length > maxCacheSize * 0.5) {
        heightKeys.sort((a, b) => b.distance - a.distance);
        const toDeleteCount = Math.floor(heightKeys.length * 0.4);
        heightKeys.slice(0, toDeleteCount).forEach(item => itemsCache.delete(item.key));
      }
      
      // 3. 最后如果还需要，精简分段缓存
      if (itemsCache.size > maxCacheSize && segmentKeys.length > 10) {
        // 保留均匀分布的分段缓存点
        const keepEvery = Math.ceil(segmentKeys.length / 10);
        segmentKeys.forEach((item, i) => {
          if (i % keepEvery !== 0) {
            itemsCache.delete(item.key);
          }
        });
      }
    } catch (error) {
      console.error('管理缓存时出错:', error);
      
      // 出错时使用简单的清理策略
      if (itemsCache.size > 5000) {
        const keysToDelete = [...itemsCache.keys()].slice(0, 1000);
        keysToDelete.forEach(key => itemsCache.delete(key));
      }
    }
  }
  
  // 获取特定索引项目的高度 - 增加错误处理
  function getItemHeightByIndex(index) {
    try {
      if (opts.dynamicItemHeight && typeof opts.getItemHeight === 'function') {
        // 先检查缓存
        if (itemsCache.has(index)) {
          return itemsCache.get(index);
        }
        
        const items = getItems();
        if (index >= 0 && index < items.length) {
          // 计算高度并缓存
          const height = Math.max(1, opts.getItemHeight(items[index], index) || opts.itemHeight);
          itemsCache.set(index, height);
          
          // 使用智能缓存管理而不是简单删除
          manageCache();
          
          return height;
        }
      }
      
      return opts.itemHeight;
    } catch (error) {
      console.error('获取项目高度时出错:', error);
      return opts.itemHeight; // 出错时使用默认高度
    }
  }
  
  // 计算属性 - 优化可见项目计算逻辑
  const visibleItems = computed(() => {
    try {
      const startTime = performance.now();
      const items = getItems();
      
      // 提前返回条件检查 - 减少不必要计算
      if (!virtualScrollEnabled.value || !items.length) {
        return items.slice(0, opts.maxVisibleItems);
      }
      
      if (!containerRef.value || !document.body.contains(containerRef.value)) {
        return items.slice(0, Math.min(opts.maxVisibleItems, items.length));
      }
      
      const container = containerRef.value;
      const { scrollTop, clientHeight } = container;
      const { itemHeight, overscan, buffer } = opts;
      
      let startIndex = 0;
      let endIndex = items.length;
      
      // 处理动态高度模式
      if (opts.dynamicItemHeight && typeof opts.getItemHeight === 'function') {
        // 高效的二分搜索算法找到起始索引
        let left = 0;
        let right = items.length - 1;
        
        while (left <= right) {
          const mid = Math.floor((left + right) / 2);
          const itemTop = getItemPosition(mid);
          
          if (itemTop < scrollTop - buffer * itemHeight) {
            left = mid + 1;
          } else {
            right = mid - 1;
          }
        }
        
        // 优化起始索引计算
        startIndex = Math.max(0, right);
        
        // 高效计算结束索引
        let currentHeight = 0;
        endIndex = startIndex;
        
        while (endIndex < items.length && currentHeight < clientHeight + buffer * itemHeight) {
          currentHeight += getItemHeightByIndex(endIndex);
          endIndex++;
        }
        
        // 添加过扫描以减少闪烁
        startIndex = Math.max(0, startIndex - overscan);
        endIndex = Math.min(items.length, endIndex + overscan);
      } else {
        // 固定高度计算 - 更高效
        startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
        endIndex = Math.min(
          items.length,
          Math.ceil((scrollTop + clientHeight) / itemHeight) + buffer + overscan
        );
      }
      
      // 自动滚动逻辑 - 如果启用了自动滚动且已滚动到底部
      if (opts.autoScroll && isScrolledToBottom.value && !isScrolling.value) {
        const count = Math.min(visibleItemCount.value, items.length);
        const result = items.slice(Math.max(0, items.length - count));
        
        // 性能监控
        trackPerformance(startTime);
        
        return result;
      }
      
      const result = items.slice(startIndex, endIndex);
      
      // 性能监控
      trackPerformance(startTime);
      
      return result;
    } catch (error) {
      console.error('计算可见项目时出错:', error);
      errorCount++;
      
      // 发生错误时检查是否需要回退到标准模式
      if (opts.fallbackToStandard && virtualScrollEnabled.value && errorCount >= opts.stabilityThreshold) {
        console.warn(`虚拟滚动发生${errorCount}次错误，回退到标准滚动模式`);
        virtualScrollEnabled.value = false;
      }
      
      const items = getItems();
      // 返回部分项目以确保界面不空白
      return items.slice(0, opts.maxVisibleItems);
    }
  });
  
  // 替换原始性能相关函数
  function trackPerformance(startTime) {
    performanceMonitor.trackOperation(startTime);
  }
  
  // 检测是否滚动到底部 - 增强版
  function checkScrolledToBottom() {
    if (!containerRef.value || !document.body.contains(containerRef.value)) return false;
    
    try {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.value;
      
      // 使用动态阈值，确保在不同大小的容器中都能准确检测
      const threshold = Math.min(20, Math.max(2, clientHeight * 0.05));
      const atBottom = scrollTop + clientHeight >= scrollHeight - threshold;
      
      // 只有当状态变化时才更新，减少不必要的重渲染
      if (isScrolledToBottom.value !== atBottom) {
        isScrolledToBottom.value = atBottom;
      }
      
      return atBottom;
    } catch (error) {
      console.error('检测滚动位置时出错:', error);
      return false;
    }
  }
  
  // 检测设备能力 - 新增函数
  function detectDeviceCapabilities() {
    try {
      // 获取设备信息
      if (navigator && 'deviceMemory' in navigator) {
        performanceMonitor.getRawData().deviceMemory = navigator.deviceMemory;
      }
      
      if (navigator && 'hardwareConcurrency' in navigator) {
        performanceMonitor.getRawData().hardwareConcurrency = navigator.hardwareConcurrency;
      }
      
      // 根据设备能力初始化配置
      if (performanceMonitor.getRawData().deviceMemory && performanceMonitor.getRawData().deviceMemory <= 2) {
        // 低内存设备调整
        opts.buffer = Math.max(5, Math.floor(opts.buffer * 0.7));
        opts.overscan = Math.max(2, Math.floor(opts.overscan * 0.7));
        opts.throttleMs = Math.min(50, opts.throttleMs * 1.5);
      }
      
      if (performanceMonitor.getRawData().hardwareConcurrency && performanceMonitor.getRawData().hardwareConcurrency <= 2) {
        // 低CPU能力设备调整
        opts.throttleMs = Math.min(60, opts.throttleMs * 1.8);
      }
    } catch (error) {
      console.error('检测设备能力时出错:', error);
    }
  }
  
  // 初始化性能监控 - 新增函数
  function initPerformanceMonitoring() {
    try {
      // 检测设备能力
      detectDeviceCapabilities();
      
      // 初始化性能观察器 (如果支持)
      if (typeof PerformanceObserver === 'function') {
        // 监控长任务
        try {
          const longTaskObserver = new PerformanceObserver(entries => {
            entries.getEntries().forEach(entry => {
              performanceMonitor.getRawData().longTaskCount++;
              performanceMonitor.getRawData().longTaskDuration += entry.duration;
              
              // 如果长任务过多，自动调整缓冲区和节流
              if (performanceMonitor.getRawData().longTaskCount > 5 && opts.adaptiveUpdate) {
                opts.buffer = Math.max(5, opts.buffer - 1);
                opts.throttleMs = Math.min(100, opts.throttleMs + 5);
              }
              
              if (entry.duration > 100) {
                performanceMonitor.getRawData().jankCount++;
              }
            });
          });
          
          longTaskObserver.observe({ entryTypes: ['longtask'] });
          
          // 保存引用以便清理
          performanceMonitor.getRawData().longTaskObserver = longTaskObserver;
        } catch (error) {
          console.error('监控长任务时出错:', error);
        }
        
        // 监控帧率
        if ('requestAnimationFrame' in window) {
          let lastFrameTime = performance.now();
          let frameTimes = [];
          
          const checkFrameRate = () => {
            const now = performance.now();
            const frameTime = now - lastFrameTime;
            lastFrameTime = now;
            
            // 收集帧时间
            frameTimes.push(frameTime);
            if (frameTimes.length > 60) frameTimes.shift();
            
            // 检测帧率下降
            if (frameTime > 50) { // 低于20fps
              performanceMonitor.getRawData().frameDrops++;
              
              // 自动调整
              if (opts.adaptiveUpdate && performanceMonitor.getRawData().frameDrops > 3) {
                opts.buffer = Math.max(3, opts.buffer - 1);
                opts.overscan = Math.max(2, opts.overscan - 1);
              }
            }
            
            // 继续检测
            if (isInitialized) {
              requestAnimationFrame(checkFrameRate);
            }
          };
          
          requestAnimationFrame(checkFrameRate);
        }
      }
    } catch (error) {
      console.error('初始化性能监控时出错:', error);
    }
  }
  
  // 替换原始跟踪滚动性能函数
  function trackScrollPerformance() {
    try {
      performanceMonitor.trackEvent('scroll');
      // 其余实现可以保留
      const now = performance.now();
      
      // 计算滚动速度
      if (performanceMonitor.getRawData().lastEventTimestamp > 0) {
        const timeDelta = now - performanceMonitor.getRawData().lastEventTimestamp;
        if (timeDelta > 0 && containerRef.value) {
          const posDelta = Math.abs(containerRef.value.scrollTop - lastScrollPosition);
          const velocity = posDelta / timeDelta; // px/ms
          
          // 根据滚动速度动态调整
          const rawData = performanceMonitor.getRawData();
          const avgVelocity = rawData.eventVelocity.length ? 
            rawData.eventVelocity.reduce((sum, item) => sum + item.velocity, 0) / rawData.eventVelocity.length : 0;
          
          // 高速滚动时自动调整以提高性能
          if (avgVelocity > 0.7 && opts.adaptiveUpdate) { // 快速滚动
            if (!rawData.fastScrollMode) {
              rawData.fastScrollMode = true;
              rawData.previousOverscan = opts.overscan;
              rawData.previousBuffer = opts.buffer;
              
              // 高速滚动时减少渲染项目
              opts.overscan = Math.max(1, Math.floor(opts.overscan * 0.5));
              opts.buffer = Math.max(3, Math.floor(opts.buffer * 0.7));
            }
          } else if (rawData.fastScrollMode && avgVelocity < 0.3) {
            // 恢复正常滚动模式
            rawData.fastScrollMode = false;
            if (typeof rawData.previousOverscan === 'number') {
              opts.overscan = rawData.previousOverscan;
            }
            if (typeof rawData.previousBuffer === 'number') {
              opts.buffer = rawData.previousBuffer;
            }
          }
        }
      }
    } catch (error) {
      console.error('跟踪滚动性能时出错:', error);
    }
  }
  
  // 使用抽离出的scheduleIdleWork函数
  function scheduleIdleWork(callback) {
    return performanceMonitor.scheduleIdleWork(callback);
  }
  
  // 优化的滚动处理函数
  const handleScroll = useThrottle(function() {
    try {
      if (!containerRef.value || !document.body.contains(containerRef.value)) return;
      
      performanceMonitor.getRawData().scrollEvents++;
      const wasAtBottom = isScrolledToBottom.value;
      
      lastScrollPosition = containerRef.value.scrollTop;
      
      // 跟踪滚动性能 - 新增调用
      trackScrollPerformance();
      
      // 更新滚动状态
      checkScrolledToBottom();
      
      // 只有不在滚动状态时才设置为true，减少状态变化
      if (!isScrolling.value) {
        isScrolling.value = true;
      }
      
      // 清除之前的定时器
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      
      // 设置新的定时器，滚动停止后恢复自动滚动
      scrollTimeout = setTimeout(() => {
        isScrolling.value = false;
        
        // 如果之前位于底部且启用了自动滚动，则滚动到底部
        if (opts.autoScroll && wasAtBottom) {
          scrollToBottom();
        }
        
        // 滚动停止后，在空闲时间执行缓存管理和性能调整
        scheduleIdleWork(() => {
          manageCache();
          if (opts.adaptiveUpdate) {
            adaptPerformanceSettings();
          }
        });
        
        scrollTimeout = null;
      }, 200);
    } catch (error) {
      console.error('处理滚动事件时出错:', error);
      errorCount++;
    }
  }, { delay: opts.throttleMs });
  
  // 设置窗口大小观察器 - 增强版
  function setupResizeObserver() {
    if (typeof window === 'undefined' || !containerRef.value) return;
    
    try {
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }
      
      // 检测ResizeObserver兼容性
      if (typeof ResizeObserver === 'function') {
        resizeObserver = new ResizeObserver(
          useThrottle(entries => {
            try {
              if (!containerRef.value || !document.body.contains(containerRef.value)) return;
              
              for (const entry of entries) {
                if (entry.target === containerRef.value) {
                  const { height } = entry.contentRect;
                  updateViewportSize(height);
                }
              }
            } catch (error) {
              console.error('处理大小变化时出错:', error);
            }
          }, { delay: 50 })
        );
        
        resizeObserver.observe(containerRef.value);
      } else {
        // 回退方案：使用窗口事件
        const handleResize = useThrottle(() => {
          if (!containerRef.value || !document.body.contains(containerRef.value)) return;
          
          const height = containerRef.value.clientHeight;
          updateViewportSize(height);
        }, { delay: 100 });
        
        window.addEventListener('resize', handleResize);
        
        // 存储事件引用以便清理
        containerRef.value._resizeHandler = handleResize;
      }
    } catch (error) {
      console.error('设置大小观察器时出错:', error);
      errorCount++;
    }
  }
  
  // 更新视图大小帮助函数
  function updateViewportSize(height) {
    if (height <= 0) return;
    
    // 使用估算的项目高度计算可见项目数量
    const newVisibleCount = Math.max(
      opts.maxVisibleItems, 
      Math.ceil(height / opts.itemHeight) * 2 + opts.buffer * 2
    );
    
    // 只在数值变化时更新，减少不必要的响应式触发
    if (viewportHeight.value !== height) {
      viewportHeight.value = height;
    }
    
    if (visibleItemCount.value !== newVisibleCount) {
      visibleItemCount.value = newVisibleCount;
    }
    
    // 如果处于底部，保持滚动到底部
    if (isScrolledToBottom.value && opts.autoScroll) {
      nextTick(() => scrollToBottom());
    }
  }
  
  // 完全重置虚拟滚动状态
  function reset() {
    try {
      // 清理缓存和状态
      itemsCache.clear();
      errorCount = 0;
      lastScrollPosition = 0;
      isScrolledToBottom.value = true;
      virtualScrollEnabled.value = true;
      
      // 重置性能监控
      performanceMonitor.getRawData().renderTime = [];
      performanceMonitor.getRawData().scrollEvents = 0;
      performanceMonitor.getRawData().lastRenderTimestamp = 0;
      
      nextTick(() => {
        if (opts.autoScroll && containerRef.value) {
          scrollToBottom(true);
        }
      });
    } catch (error) {
      console.error('重置虚拟滚动时出错:', error);
    }
  }
  
  // 优化的滚动到底部函数
  const debouncedScrollToBottom = useDebounce(
    function(immediate = false) {
      if (!containerRef.value || !document.body.contains(containerRef.value)) return;
      
      try {
        if (opts.autoScroll && !isScrolling.value || immediate) {
          nextTick(() => {
            if (containerRef.value && document.body.contains(containerRef.value)) {
              const scrollHeight = containerRef.value.scrollHeight;
              if (scrollHeight > 0) {
                containerRef.value.scrollTop = scrollHeight;
                isScrolledToBottom.value = true;
              }
            }
          });
        }
      } catch (error) {
        console.error('滚动到底部时出错:', error);
      }
    },
    { delay: 50, immediate: true }
  );
  
  // 创建一个scrollToBottom别名，以便代码中其他地方可以继续使用
  const scrollToBottom = debouncedScrollToBottom;
  
  // 优化滚动到指定项目
  function scrollToItem(index, behavior = 'smooth', align = 'start') {
    if (!containerRef.value || !document.body.contains(containerRef.value)) return;
    
    try {
      const items = getItems();
      if (index < 0 || index >= items.length) return;
      
      let scrollPosition;
      
      if (opts.dynamicItemHeight && typeof opts.getItemHeight === 'function') {
        scrollPosition = getItemPosition(index);
      } else {
        scrollPosition = index * opts.itemHeight;
      }
      
      // 处理不同的对齐方式
      if (align === 'center') {
        const itemHeight = getItemHeightByIndex(index);
        scrollPosition = scrollPosition - (containerRef.value.clientHeight / 2) + (itemHeight / 2);
      } else if (align === 'end') {
        const itemHeight = getItemHeightByIndex(index);
        scrollPosition = scrollPosition - containerRef.value.clientHeight + itemHeight;
      }
      
      // 安全滚动
      nextTick(() => {
        if (containerRef.value && document.body.contains(containerRef.value)) {
          containerRef.value.scrollTo({
            top: Math.max(0, Math.floor(scrollPosition)),
            behavior: ['auto', 'smooth', 'instant'].includes(behavior) ? behavior : 'smooth'
          });
        }
      });
    } catch (error) {
      console.error('滚动到指定项目时出错:', error);
    }
  }
  
  // 安全初始化函数
  function initialize(container) {
    if (!container || !document.body.contains(container)) return;
    
    try {
      // 清理旧资源
      cleanup();
      
      containerRef.value = container;
      
      // 添加滚动事件监听
      container.addEventListener('scroll', handleScroll, { passive: true });
      
      // 设置大小观察器
      setupResizeObserver();
      
      // 记录视口高度
      viewportHeight.value = container.clientHeight || 0;
      
      // 初始状态检查
      checkScrolledToBottom();
      
      // 初始滚动到底部
      if (opts.autoScroll) {
        nextTick(() => {
          scrollToBottom(true);
        });
      }
      
      isInitialized = true;
    } catch (error) {
      console.error('初始化虚拟滚动时出错:', error);
      errorCount++;
      
      // 如果初始化失败，回退到标准模式
      if (opts.fallbackToStandard) {
        virtualScrollEnabled.value = false;
      }
    }
  }
  
  // 增强的清理函数
  function cleanup() {
    try {
      // 清理滚动事件监听
      if (containerRef.value) {
        containerRef.value.removeEventListener('scroll', handleScroll);
        
        // 清理可能添加的窗口事件处理
        if (containerRef.value._resizeHandler) {
          window.removeEventListener('resize', containerRef.value._resizeHandler);
          containerRef.value._resizeHandler = null;
        }
      }
      
      // 清理大小观察器
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }
      
      // 清理定时器
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
        scrollTimeout = null;
      }
      
      isInitialized = false;
    } catch (error) {
      console.error('清理虚拟滚动资源时出错:', error);
    }
  }
  
  // 项目更新侦听器 - 优化性能
  watch(() => {
    const items = getItems();
    return items.length;
  }, (newLength, oldLength) => {
    try {
      // 只有在有新项目添加且已初始化时才滚动
      if (newLength > oldLength && isInitialized) {
        nextTick(() => {
          if (isScrolledToBottom.value && opts.autoScroll) {
            scrollToBottom();
          }
        });
      }
      
      // 当项目数量发生显著变化时，管理缓存
      if (Math.abs(newLength - oldLength) > 100) {
        manageCache();
      }
    } catch (error) {
      console.error('处理项目数量变化时出错:', error);
    }
  });
  
  // 容器引用变化侦听器
  watch(() => containerRef.value, (newContainer, oldContainer) => {
    if (newContainer !== oldContainer) {
      if (oldContainer) {
        oldContainer.removeEventListener('scroll', handleScroll);
      }
      
      if (newContainer && document.body.contains(newContainer)) {
        initialize(newContainer);
      }
    }
  });
  
  // 生命周期钩子
  onMounted(() => {
    nextTick(() => {
      if (containerRef.value && document.body.contains(containerRef.value)) {
        initialize(containerRef.value);
        
        // 启动性能监控
        performanceMonitor.startMonitoring();
      }
    });
  });
  
  onUnmounted(() => {
    cleanup();
    // 停止性能监控
    performanceMonitor.stopMonitoring();
  });
  
  // 替换原始adaptPerformanceSettings函数
  function adaptPerformanceSettings() {
    if (!opts.adaptiveUpdate) return;
    
    const currentSettings = {
      throttleMs: opts.throttleMs,
      batchSize: opts.buffer,
      overscan: opts.overscan,
      dynamicItemHeight: opts.dynamicItemHeight
    };
    
    const newSettings = performanceMonitor.adaptSettings(currentSettings);
    
    // 应用新设置
    if (newSettings.throttleMs) opts.throttleMs = newSettings.throttleMs;
    if (newSettings.batchSize) opts.buffer = newSettings.batchSize;
    if (newSettings.overscan) opts.overscan = newSettings.overscan;
    
    // 处理动态高度计算
    if (newSettings.performanceScore < 20 && opts.dynamicItemHeight) {
      console.warn('严重性能问题，暂时禁用动态高度计算');
      opts._originalDynamicHeight = opts.dynamicItemHeight;
      opts.dynamicItemHeight = false;
    } else if (newSettings.performanceScore > 70 && opts._originalDynamicHeight && !opts.dynamicItemHeight) {
      opts.dynamicItemHeight = true;
    }
  }
  
  // DOM元素回收复用功能 - 移至函数内部
  function setupDOMRecycling() {
    if (!opts.recycleDOM) return null;
    
    const poolSize = visibleItemCount.value * 1.5;
    const elementPool = [];
    
    // 创建元素池
    function createPool(tagName = 'div', count = poolSize) {
      while (elementPool.length < count) {
        const el = document.createElement(tagName);
        el.style.display = 'none';
        el.dataset.recycled = 'true';
        elementPool.push(el);
      }
    }
    
    // 从池中获取元素
    function getRecycledElement(tagName = 'div') {
      if (elementPool.length === 0) {
        createPool(tagName, Math.ceil(poolSize / 2));
      }
      return elementPool.pop();
    }
    
    // 回收元素
    function recycleElement(el) {
      if (!el || !el.parentNode) return;
      el.style.display = 'none';
      el.textContent = '';
      // 保留data-recycled属性，移除其他所有属性
      const attributes = Array.from(el.attributes);
      for (const attr of attributes) {
        if (attr.name !== 'data-recycled' && attr.name !== 'style') {
          el.removeAttribute(attr.name);
        }
      }
      elementPool.push(el);
    }
    
    return {
      getElement: getRecycledElement,
      recycleElement,
      poolSize: () => elementPool.length
    };
  }
  
  // 滚动位置保存和恢复功能 - 移至函数内部
  function saveScrollPosition(key) {
    if (!opts.scrollRestoration || !containerRef.value) return;
    
    try {
      const identifier = key || 'default';
      scrollPositionCache.set(identifier, containerRef.value.scrollTop);
    } catch (error) {
      console.error('保存滚动位置时出错:', error);
    }
  }
  
  function restoreScrollPosition(key) {
    if (!opts.scrollRestoration || !containerRef.value) return;
    
    try {
      const identifier = key || 'default';
      if (scrollPositionCache.has(identifier)) {
        const position = scrollPositionCache.get(identifier);
        nextTick(() => {
          if (containerRef.value && document.body.contains(containerRef.value)) {
            containerRef.value.scrollTop = position;
          }
        });
      }
    } catch (error) {
      console.error('恢复滚动位置时出错:', error);
    }
  }
  
  // 预加载策略设置功能 - 移至函数内部
  function setupPreloadStrategy() {
    if (opts.preloadStrategy === 'none' || typeof window === 'undefined') return null;
    
    let preloadObserver = null;
    const preloadDistance = opts.dynamicItemHeight ? 1000 : opts.itemHeight * 20;
    
    function preloadItem(item, index) {
      try {
        if (typeof opts.onItemPreload === 'function') {
          opts.onItemPreload(item, index);
        }
      } catch (error) {
        console.error('预加载项目时出错:', error);
      }
    }
    
    // 使用IntersectionObserver优化预加载
    if (opts.preloadStrategy === 'dynamic' && opts.intersectionObserver && 'IntersectionObserver' in window) {
      preloadObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          
          const index = parseInt(entry.target.dataset.index, 10);
          if (!isNaN(index)) {
            const items = getItems();
            // 预加载当前可见项之后的一批项目
            const preloadCount = Math.min(10, items.length - index - 1);
            for (let i = 1; i <= preloadCount; i++) {
              if (index + i < items.length) {
                preloadItem(items[index + i], index + i);
              }
            }
          }
        });
      }, {
        rootMargin: `0px 0px ${preloadDistance}px 0px`,
        threshold: 0.1
      });
      
      // 返回观察者便于稍后使用
      return preloadObserver;
    } else if (opts.preloadStrategy === 'static') {
      // 静态预加载策略 - 在滚动时预加载
      const handlePreload = useThrottle(() => {
        if (!containerRef.value || !document.body.contains(containerRef.value)) return;
        
        const items = getItems();
        const { scrollTop, clientHeight } = containerRef.value;
        const preloadBottom = scrollTop + clientHeight + preloadDistance;
        
        let preloadIndex = 0;
        let currentPosition = 0;
        
        // 找到需要预加载的索引
        while (preloadIndex < items.length && currentPosition < preloadBottom) {
          currentPosition += getItemHeightByIndex(preloadIndex);
          preloadIndex++;
        }
        
        // 预加载下一批项目
        const batchSize = 5;
        for (let i = preloadIndex; i < Math.min(items.length, preloadIndex + batchSize); i++) {
          preloadItem(items[i], i);
        }
      }, { delay: 300 });
      
      if (containerRef.value) {
        containerRef.value.addEventListener('scroll', handlePreload, { passive: true });
      }
      
      return handlePreload;
    }
    
    return null;
  }
  
  // 初始化预加载和DOM回收功能
  const preloadObserver = setupPreloadStrategy();
  const recycling = setupDOMRecycling();
  
  // 返回扩展的API
  return {
    containerRef,
    visibleItems,
    hasMoreItems: computed(() => {
      const items = getItems();
      return items.length > visibleItems.value.length;
    }),
    totalItems: computed(() => getItems().length),
    isScrolling,
    isScrolledToBottom,
    viewportHeight,
    
    // 方法
    initialize,
    scrollToBottom: debouncedScrollToBottom,
    scrollToItem,
    checkScrolledToBottom,
    reset,
    
    // 高级控制
    setVirtualScrollEnabled: (enabled) => {
      virtualScrollEnabled.value = enabled;
    },
    
    // 用性能监控替换原始性能API
    performance: {
      averageRenderTime: performanceMonitor.averageRenderTime,
      scrollEvents: computed(() => performanceMonitor.getRawData().scrollEvents),
      lastRenderTime: computed(() => performanceMonitor.getRawData().lastRenderTimestamp),
      frameDrops: computed(() => performanceMonitor.frameDrops.value),
      jankScore: computed(() => performanceMonitor.jankCount.value),
      longTasks: performanceMonitor.longTasks,
      deviceCapabilities: performanceMonitor.deviceCapabilities,
      performanceScore: performanceMonitor.performanceScore
    },
    
    // 调试信息
    debug: {
      errorCount: computed(() => errorCount),
      itemsCacheSize: computed(() => itemsCache.size),
      isInitialized: computed(() => isInitialized),
      visibleItemCount: computed(() => visibleItemCount.value),
      preloadActive: computed(() => !!preloadObserver),
      adaptiveSettings: computed(() => ({
        throttleMs: opts.throttleMs,
        buffer: opts.buffer,
        overscan: opts.overscan
      }))
    },
    
    // 新增方法和属性
    saveScrollPosition,
    restoreScrollPosition,
    
    // DOM回收相关
    recycling: recycling ? {
      poolSize: computed(() => recycling.poolSize()),
      getElement: recycling.getElement,
      recycleElement: recycling.recycleElement
    } : null
  };
} 