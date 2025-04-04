import { computed,  onMounted, onUnmounted, nextTick,ref } from '../../../../static/vue.esm-browser.js';
import { useVirtualPosition } from './useVirtualPosition.js';
import { getItemsArray, safeExecute, scheduleIdleWork, cancelIdleWork } from './useVirtualScrollHelpers.js';
import { useScrollHandling } from './useScrollHandling.js';
import { useErrorHandling } from './useErrorHandling.js';
import { useVirtualScrollState } from './useVirtualScrollState.js';
import { createScrollEventHandler } from './useVirtualScrollEventHandler.js';
import { useVirtualScrollLayout } from './useVirtualScrollLayout.js';
import { useEmergencyRecovery } from './useEmergencyRecovery.js';
import { useSmoothScroll } from './useSmoothScroll.js';
import { useVirtualScrollPerformance } from './useVirtualScrollPerformance.js';
import { createPluginSystem, createStandardPlugin } from './useVirtualScrollPluginSystem.js';
import { createEventBus } from '../../../../src/toolBox/base/forEvent/useEventBus.js';

/**
 * 优化参数验证和类型安全
 * @param {Object} options - 配置选项
 * @returns {Object} - 验证后的选项
 */
function validateOptions(options) {
  if (options.itemHeight <= 0) {
    console.warn('itemHeight 必须大于0，使用默认值30px');
    options.itemHeight = 30;
  }
  
  if (options.buffer < 0) {
    console.warn('buffer 不能为负值，使用默认值20');
    options.buffer = 20;
  }
  
  if (options.dynamicItemHeight && typeof options.getItemHeight !== 'function') {
    console.warn('启用dynamicItemHeight但未提供getItemHeight函数，禁用动态高度');
    options.dynamicItemHeight = false;
  }
  
  return options;
}

/**
 * 创建虚拟滚动引擎 - 核心解耦版
 * @param {Object} options - 配置选项
 * @returns {Object} - 虚拟滚动状态和方法
 */
export function useVirtualScroll(options = {}) {
  // 默认选项 - 简化关键参数
  const defaultOptions = {
    items: [],
    itemHeight: 30,
    buffer: 20,
    overscan: 10,
    throttleMs: 32,
    // ... 保留其他默认选项 ...
  };
  
  // 验证并合并选项
  const opts = validateOptions({ ...defaultOptions, ...options });
  
  // 创建核心引擎
  const engine = createVirtualScrollEngine(opts);
  
  // 初始化插件
  engine.internalAPI.initializePlugins();
  
  // 返回完整的API
  return engine.getPublicAPI();
}

/**
 * 创建虚拟滚动引擎核心 - 使用重构的插件系统
 * @param {Object} options - 配置选项 
 * @returns {Object} - 引擎实例
 */
function createVirtualScrollEngine(options) {
  // 初始化引擎各部分组件
  const state = useVirtualScrollState(options);
  const positionCalculator = createPositionCalculator(options);
  const layoutCalculator = createLayoutCalculator(options, state, positionCalculator);
  const errorHandler = createErrorHandler(options);
  
  // 创建钩子系统
  const { hooks, registerHook, triggerHook } = createHookSystem();
  
  // 创建插件系统
  const pluginSystem = createPluginSystem();
  
  // 创建内部API
  const internalAPI = {
    state,
    options,
    positionCalculator,
    layoutCalculator,
    errorHandler,
    registerHook,
    triggerHook: (hookName, data) => triggerHook(hookName, data, errorHandler),
    getItems: () => getItemsArray(options.items),
    registerPlugin: pluginSystem.registerPlugin,
    getPlugin: pluginSystem.getPlugin,
    getAllPlugins: pluginSystem.getAllPlugins,
    initializePlugins: () => pluginSystem.initializePlugins(errorHandler),
    destroyPlugins: () => pluginSystem.destroyPlugins(errorHandler)
  };
  
  // 创建引擎对象
  const engine = {
    internalAPI,
    getPublicAPI: () => createPublicAPI(state, internalAPI)
  };
  
  // 注册所有插件工厂
  registerPluginFactories(pluginSystem);
  
  // 根据选项创建插件实例
  pluginSystem.createPlugins(engine, options);
  
  return engine;
}

/**
 * 创建位置计算器
 */
function createPositionCalculator(options) {
  return useVirtualPosition({
    itemHeight: options.itemHeight,
    dynamicItemHeight: options.dynamicItemHeight,
    getItemHeight: options.getItemHeight,
    cacheStrategy: options.cacheStrategy,
    getItems: () => getItemsArray(options.items)
  });
}

/**
 * 创建布局计算器
 */
function createLayoutCalculator(options, state, positionCalculator) {
  const { containerRef, visibleItemCount } = state;
  
  return useVirtualScrollLayout({
    containerRef,
    positionCalculator,
    visibleItemCount,
    getItems: () => getItemsArray(options.items),
    buffer: options.buffer,
    overscan: options.overscan,
    dynamicItemHeight: options.dynamicItemHeight
  });
}

/**
 * 创建错误处理器
 */
function createErrorHandler(options) {
  return useErrorHandling({
    fallbackToStandard: options.fallbackToStandard,
    stabilityThreshold: options.stabilityThreshold,
    debugMode: options.debugMode,
    logLevel: options.logLevel,
    onCriticalError: (error) => {
      // 这里会在后续被覆盖
      console.error('发生关键错误', error);
    },
    memoryLimit: options.memoryLimit
  });
}

/**
 * 使用事件总线创建钩子系统
 * @returns {Object} 包含钩子管理方法的对象
 */
function createHookSystem() {
  // 导入事件总线创建函数
  const eventBus = createEventBus();
  
  // 预定义钩子类型及其执行模式
  const hookTypes = {
    beforeMount: 'sync',
    mounted: 'sync',
    beforeUpdate: 'sync', 
    updated: 'sync',
    beforeUnmount: 'sync',
    scrollStart: 'sync',
    scrollEnd: 'sync',
    itemVisibilityChange: 'async',
    error: 'sync',
    layoutCalculated: 'sync',    // 新增：布局计算完成钩子
    memoryWarning: 'sync',       // 新增：内存警告钩子
    itemsChanged: 'sync'         // 新增：数据源变化钩子
  };
  
  // 钩子历史记录
  const hookHistory = {
    enabled: false,
    maxEntries: 100,
    entries: []
  };
  
  // 钩子执行限制
  const hookLimits = {
    timeoutMs: 3000,
    syncMaxExecutionTime: 50
  };
  
  // 启用调试以便记录性能
  eventBus.enableDebug();
  
  // 添加调试钩子用于记录历史
  eventBus.extend('hookHistory', {
    init: (context) => {
      context.addHook('debug', (debugEvent) => {
        if (!hookHistory.enabled) return;
        
        // 仅记录钩子相关的事件
        if (debugEvent.type === 'emit') {
          const hookName = debugEvent.data.event;
          
          // 确认是有效的钩子事件
          if (hookTypes[hookName]) {
            hookHistory.entries.push({
              hookName,
              timestamp: debugEvent.timestamp,
              duration: debugEvent.data.duration || 0,
              callbackCount: debugEvent.data.listenersCount || 0,
              success: true,
              error: null
            });
            
            // 限制历史记录大小
            if (hookHistory.entries.length > hookHistory.maxEntries) {
              hookHistory.entries.shift();
            }
          }
        } else if (debugEvent.type === 'listener-error') {
          // 记录错误信息
          const hookName = debugEvent.data.event;
          
          if (hookTypes[hookName]) {
            hookHistory.entries.push({
              hookName,
              timestamp: debugEvent.timestamp,
              error: debugEvent.data.error?.message || '未知错误',
              success: false
            });
            
            // 限制历史记录大小
            if (hookHistory.entries.length > hookHistory.maxEntries) {
              hookHistory.entries.shift();
            }
          }
        }
      });
    }
  });
  
  /**
   * 注册钩子回调
   * @param {string} hookName 钩子名称
   * @param {Function} callback 回调函数
   * @param {Object} options 配置选项
   * @returns {Object} 注册结果和取消注册的函数
   */
  function registerHook(hookName, callback, options = {}) {
    if (!hookTypes[hookName]) {
      console.warn(`尝试注册未知钩子: "${hookName}"`);
      return { 
        success: false, 
        error: `未知钩子类型: ${hookName}`,
        cancel: () => false
      };
    }
    
    if (typeof callback !== 'function') {
      console.warn(`钩子必须是函数，收到: ${typeof callback}`);
      return { 
        success: false, 
        error: '钩子回调必须是函数',
        cancel: () => false
      };
    }
    
    // 使用事件总线的优先级和命名空间功能
    const eventOptions = {
      priority: options.priority || 0,
      namespace: options.namespace || 'hook:' + hookName
    };
    
    // 使用once功能处理一次性钩子
    let unsubscribe;
    if (options.once) {
      unsubscribe = eventBus.once(hookName, callback, eventOptions);
    } else {
      unsubscribe = eventBus.on(hookName, callback, eventOptions);
    }
    
    return {
      success: true,
      hookName,
      hookType: hookTypes[hookName],
      cancel: unsubscribe
    };
  }
  
  /**
   * 触发钩子执行
   * @param {string} hookName 钩子名称
   * @param {*} data 传递给钩子的数据
   * @param {Object} errorHandler 错误处理器
   * @returns {Promise<Object>} 执行结果
   */
  function triggerHook(hookName, data = {}, errorHandler = null) {
    // 验证钩子名称
    if (!hookTypes[hookName]) {
      return Promise.resolve({
        success: false,
        error: `未知钩子类型: ${hookName}`,
        results: [],
        executed: false,
        hookName,
        timing: { start: 0, end: 0, duration: 0 }
      });
    }
    
    const startTime = performance.now();
    const isSync = hookTypes[hookName] === 'sync';
    
    // 添加钩子类型信息到数据中
    const augmentedData = {
      ...data,
      __hookType: hookTypes[hookName]
    };
    
    // 使用事件总线触发事件
    const emitOptions = { sync: isSync };
    
    // 使用Promise包装以统一同步/异步接口
    return new Promise((resolve) => {
      // 同步模式下测量执行时间
      const result = eventBus.emit(hookName, augmentedData, emitOptions);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // 检查同步钩子执行时间
      if (isSync && duration > hookLimits.syncMaxExecutionTime) {
        console.warn(`同步钩子 "${hookName}" 执行时间过长: ${duration.toFixed(2)}ms`);
      }
      
      // 统一返回格式
      resolve({
        success: result,
        error: null,
        results: [], // 事件总线不返回具体结果
        executed: result,
        hookName,
        timing: {
          start: startTime,
          end: endTime,
          duration
        }
      });
    });
  }
  
  /**
   * 移除钩子回调
   * @param {string} hookName 钩子名称
   * @param {Function} callback 要移除的回调函数
   * @returns {Object} 移除结果
   */
  function removeHook(hookName, callback) {
    if (!hookTypes[hookName]) {
      return { success: false, error: `未知钩子类型: ${hookName}` };
    }
    
    const removed = eventBus.off(hookName, callback);
    
    return { success: true, removed };
  }
  
  /**
   * 通过命名空间移除钩子
   * @param {string} namespace 命名空间
   * @returns {boolean} 是否成功移除
   */
  function removeHooksByNamespace(namespace) {
    return eventBus.offByNamespace(namespace);
  }
  
  /**
   * 启用或禁用钩子历史记录
   * @param {boolean} enabled 是否启用
   * @param {Object} options 配置选项
   */
  function configureHistory(enabled, options = {}) {
    hookHistory.enabled = !!enabled;
    
    if (options.maxEntries) {
      hookHistory.maxEntries = options.maxEntries;
    }
    
    // 清除历史记录
    if (options.clear) {
      hookHistory.entries = [];
    }
  }
  
  /**
   * 配置钩子执行限制
   * @param {Object} limits 限制选项
   */
  function configureLimits(limits = {}) {
    Object.assign(hookLimits, limits);
  }
  
  // 返回钩子系统API
  return {
    registerHook,
    triggerHook,
    removeHook,
    removeHooksByNamespace,
    configureHistory,
    configureLimits,
    getHookTypes: () => ({ ...hookTypes }),
    getHookStats: () => Object.keys(hookTypes).reduce((stats, name) => {
      stats[name] = {
        type: hookTypes[name],
        count: eventBus.listenerCount(name)
      };
      return stats;
    }, {}),
    getHookHistory: () => ({
      enabled: hookHistory.enabled,
      entries: [...hookHistory.entries]
    }),
    // 暴露原始事件总线以便高级用法
    _eventBus: eventBus
  };
}

/**
 * 插件工厂：创建平滑滚动插件
 */
function createSmoothScrollPlugin(engine, options) {
  return createStandardPlugin(engine, options, {
    name: 'smoothScroll',
    version: '1.0.0',
    setup: (engine, options) => {
      const smoothScroller = useSmoothScroll({
        enabled: options.smoothScrolling,
        defaultDuration: 300,
        defaultEasing: 'easeInOutCubic',
        onScrollStart: () => engine.internalAPI.triggerHook('scrollStart'),
        onScrollEnd: (info) => engine.internalAPI.triggerHook('scrollEnd', info),
        safeMode: true
      });
      
      return {
        to: (position, config) => {
          const { containerRef } = engine.internalAPI.state;
          if (containerRef.value) {
            return smoothScroller.smoothScrollTo(containerRef.value, position, config);
          }
          return Promise.resolve(false);
        },
        
        setEnabled: (enabled) => {
          smoothScroller.setEnabled(enabled);
        }
      };
    },
    
    initialize: (engine, options, publicAPI) => {
      const originalPublicAPI = engine.getPublicAPI();
      const originalScrollToItem = originalPublicAPI.scrollToItem;
      
      originalPublicAPI.scrollToItem = (index, alignment, smooth = options.smoothScrolling) => {
        if (!smooth) {
          return originalScrollToItem(index, alignment);
        }
        
        const { positionCalculator, state } = engine.internalAPI;
        const position = positionCalculator.getScrollPositionForIndex(
          index, alignment, state.containerRef.value
        );
        
        if (position !== null && state.containerRef.value) {
          return publicAPI.to(position);
        }
        return false;
      };
      return Promise.resolve();
    },
    destroy: (engine, options, publicAPI) => {
      // 确保清理所有资源
      return Promise.resolve();
    },
    onError: (error) => {
      console.error('[平滑滚动插件]错误:', error);
    }
  });
}

/**
 * 插件工厂：创建错误恢复插件
 */
function createErrorRecoveryPlugin(engine, options) {
  return createStandardPlugin(engine, options, {
    name: 'errorRecovery',
    version: '1.0.0',
    setup: (engine, options) => {
      const { errorHandler, state } = engine.internalAPI;
      
      const emergencyRecovery = useEmergencyRecovery({
        enabled: options.fallbackToStandard,
        recoveryAttempts: options.recoveryAttempts || 3,
        recoveryDelay: options.recoveryDelay || 5000,
        onRecoverySuccess: (info) => {
          console.info(`虚拟滚动已在第${info.attemptCount}次尝试后恢复正常`);
        },
        onRecoveryFail: (info) => {
          console.warn(`虚拟滚动恢复失败(${info.attemptCount}/${options.recoveryAttempts || 3})`, info.error);
          if (info.attemptCount >= (options.recoveryAttempts || 3)) {
            state.virtualScrollEnabled.value = false;
            console.error('虚拟滚动无法恢复，已永久禁用');
          }
        }
      });
      
      return {
        forceRecover: () => {
          // 实现强制立即恢复
          state.virtualScrollEnabled.value = true;
          emergencyRecovery.cancelRecovery();
          return true;
        },
        
        scheduleRecovery: (onSuccess, errorInfo) => {
          return emergencyRecovery.scheduleRecovery(onSuccess, errorInfo);
        },
        
        cancelRecovery: emergencyRecovery.cancelRecovery,
        
        getRecoveryState: emergencyRecovery.getRecoveryState
      };
    },
    
    initialize: (engine, options, publicAPI) => {
      const { errorHandler, state } = engine.internalAPI;
      
      // 绑定错误处理器
      errorHandler.onCriticalError = (error) => {
        state.virtualScrollEnabled.value = !error.isCritical;
        
        if (error.isCritical && options.fallbackToStandard) {
          const emergencyRecovery = engine.internalAPI.getPlugin('errorRecovery');
          if (emergencyRecovery && emergencyRecovery.publicAPI) {
            emergencyRecovery.publicAPI.scheduleRecovery(() => {
              state.virtualScrollEnabled.value = true;
              console.info('虚拟滚动已自动恢复');
            }, { errorType: error.type, timestamp: Date.now() });
          }
        }
      };
    }
  });
}

/**
 * 插件工厂：创建自适应性能优化插件
 */
function createAdaptivePerformancePlugin(engine, options) {
  return createStandardPlugin(engine, options, {
    name: 'adaptivePerformance',
    version: '1.0.0',
    setup: (engine, options) => {
      const performanceMonitor = useVirtualScrollPerformance({
        enabled: options.adaptivePerformance,
        throttleMs: options.throttleMs,
        frameRateThreshold: options.frameRateThreshold || 45,
        adaptationDelay: options.adaptationDelay || 1000,
        minOverscan: Math.max(1, options.minOverscan || 3),
        maxOverscan: options.overscan || 10,
        debugMode: options.debugMode
      });
      
      return {
        getPerformanceMetrics: () => performanceMonitor.getMetrics(),
        
        enableAdaptation: (enable = true) => {
          performanceMonitor.setEnabled(enable);
          return true;
        },
        
        resetAdaptation: () => {
          performanceMonitor.reset();
          return true;
        },
        
        setAdaptationSettings: (settings) => {
          performanceMonitor.updateSettings(settings);
          return true;
        },
        
        // 添加监控方法供initialize调用
        startMonitoring: () => performanceMonitor.startMonitoring(),
        stopMonitoring: () => performanceMonitor.stopMonitoring(),
        markLayoutStart: () => performanceMonitor.markLayoutStart(),
        markLayoutEnd: () => performanceMonitor.markLayoutEnd(),
        getRecommendedOverscan: () => performanceMonitor.getRecommendedOverscan(),
        dispose: () => {
          // 清理性能监控资源
          if (performanceMonitor.dispose) {
            performanceMonitor.dispose();
          }
        }
      };
    },
    
    initialize: (engine, options, publicAPI) => {
      const { state } = engine.internalAPI;
      
      // 初始化性能监控
      state.overscan = ref(options.overscan || 10);
      
      // 注册滚动性能监控
      engine.internalAPI.registerHook('scrollStart', () => {
        publicAPI.startMonitoring();
      });
      
      engine.internalAPI.registerHook('scrollEnd', () => {
        publicAPI.stopMonitoring();
        
        // 应用自适应优化
        const newOverscan = publicAPI.getRecommendedOverscan();
        if (newOverscan !== null && newOverscan !== state.overscan.value) {
          if (options.debugMode) {
            console.info(`自适应性能：调整 overscan ${state.overscan.value} -> ${newOverscan}`);
          }
          state.overscan.value = newOverscan;
        }
      });
      
      // 注册布局计算的性能钩子
      engine.internalAPI.registerHook('beforeUpdate', () => {
        publicAPI.markLayoutStart();
      });
      
      engine.internalAPI.registerHook('updated', () => {
        publicAPI.markLayoutEnd();
      });
    },
    
    destroy: (engine, options, publicAPI) => {
      // 使用publicAPI中的dispose方法清理资源
      publicAPI.dispose();
    }
  });
}

/**
 * 插件工厂管理器 - 统一插件注册
 */
function registerPluginFactories(pluginSystem) {
  // 注册所有插件工厂，集中管理
  pluginSystem.registerPluginFactory('smoothScroll', createSmoothScrollPlugin, false);
  pluginSystem.registerPluginFactory('adaptivePerformance', createAdaptivePerformancePlugin, false);
  pluginSystem.registerPluginFactory('errorRecovery', createErrorRecoveryPlugin, false);
  
  // 创建简单插件的辅助函数
  const createSimplePlugin = (name, version = '0.1.0', defaultEnabled = false, customInit = null) => {
    pluginSystem.registerPluginFactory(name, 
      (engine, options) => createStandardPlugin(engine, options, {
        name,
        version,
        setup: () => ({}),
        initialize: () => {
          if (customInit && typeof customInit === 'function') {
            customInit(engine, options);
          }
          return Promise.resolve();
        }
      }), 
      defaultEnabled
    );
  };
  
  // 使用辅助函数简化注册过程
  createSimplePlugin('domRecycling', '0.1.0', false, (engine, options) => {
    if (options.debugMode) {
      console.info('DOM回收插件已初始化，但功能尚未实现');
    }
  });
  
  createSimplePlugin('layoutOptimization', '0.1.0', true);
  createSimplePlugin('memoryManagement', '0.1.0', true);
  createSimplePlugin('lifecycle', '0.1.0', true);
}

/**
 * 创建公共API
 */
function createPublicAPI(state, internalAPI) {
  const { containerRef, isScrolling, isScrolledToBottom, viewportHeight } = state;
  
  // 使用计算属性实时获取可见项目
  const visibleItems = computed(() => {
    const items = internalAPI.getItems();
    const { startIndex, endIndex } = internalAPI.layoutCalculator.getVisibleRange() || { startIndex: 0, endIndex: 0 };
    
    // 确保索引在有效范围内
    if (startIndex >= 0 && endIndex >= startIndex && items.length > 0) {
      return items.slice(Math.max(0, startIndex), Math.min(items.length, endIndex + 1));
    }
    return [];
  });
  
  return {
    containerRef,
    visibleItems,
    totalItems: computed(() => internalAPI.getItems().length),
    isScrolling,
    isScrolledToBottom,
    viewportHeight,
    
    // 添加初始化方法
    initialize: () => {
      internalAPI.triggerHook('beforeMount');
      nextTick(() => {
        if (containerRef.value) {
          internalAPI.triggerHook('mounted');
        }
      });
      return true;
    },
    
    // 添加重置方法
    reset: () => {
      // 重置滚动位置
      if (containerRef.value) {
        containerRef.value.scrollTop = 0;
      }
      
      // 清除缓存的项目高度（如果有）
      if (internalAPI.positionCalculator.resetCache) {
        internalAPI.positionCalculator.resetCache();
      }
      
      // 触发重新计算
      internalAPI.triggerHook('beforeUpdate');
      nextTick(() => {
        internalAPI.triggerHook('updated');
      });
      
      return true;
    },
    
    // 滚动到底部的完整实现
    scrollToBottom: () => {
      const { containerRef } = state;
      if (!containerRef.value) return false;
      
      // 首先尝试使用平滑滚动插件（如果启用）
      const smoothScrollPlugin = internalAPI.getPlugin('smoothScroll');
      if (smoothScrollPlugin && smoothScrollPlugin.publicAPI) {
        const totalHeight = internalAPI.positionCalculator.getTotalSize();
        return smoothScrollPlugin.publicAPI.to(totalHeight);
      }
      
      // 否则使用标准方法
      const container = containerRef.value;
      container.scrollTop = container.scrollHeight - container.clientHeight;
      
      // 触发滚动钩子
      internalAPI.triggerHook('scrollStart');
      
      // 使用requestAnimationFrame确保滚动完成后触发scrollEnd
      requestAnimationFrame(() => {
        internalAPI.triggerHook('scrollEnd', {
          position: container.scrollTop,
          scrollHeight: container.scrollHeight,
          clientHeight: container.clientHeight
        });
      });
      
      return true;
    },
    
    scrollToItem: (index, alignment = 'auto', smooth = false) => {
      const items = internalAPI.getItems();
      
      // 验证索引是否有效
      if (index < 0 || index >= items.length) {
        console.warn(`滚动索引 ${index} 超出范围 [0-${items.length - 1}]`);
        return false;
      }
      
      // 验证容器是否存在
      if (!containerRef.value) {
        console.warn('无法滚动：容器元素不存在');
        return false;
      }
      
      // 检查是否可以使用平滑滚动插件
      if (smooth) {
        const smoothScrollPlugin = internalAPI.getPlugin('smoothScroll');
        if (smoothScrollPlugin && smoothScrollPlugin.publicAPI) {
          const position = internalAPI.positionCalculator.getScrollPositionForIndex(
            index, alignment, containerRef.value
          );
          
          if (position !== null) {
            return smoothScrollPlugin.publicAPI.to(position);
          }
        }
      }
      
      // 标准滚动实现
      const position = internalAPI.positionCalculator.getScrollPositionForIndex(
        index, alignment, containerRef.value
      );
      
      if (position !== null) {
        containerRef.value.scrollTop = position;
        
        // 触发滚动事件钩子
        internalAPI.triggerHook('scrollStart');
        
        // 确保滚动完成后触发scrollEnd
        requestAnimationFrame(() => {
          const container = containerRef.value;
          if (container) {
            internalAPI.triggerHook('scrollEnd', {
              position: container.scrollTop,
              scrollHeight: container.scrollHeight,
              clientHeight: container.clientHeight
            });
          }
        });
        
        return true;
      }
      
      return false;
    },
    
    // 获取插件API
    getPluginAPI: (name) => {
      const plugin = internalAPI.getPlugin(name);
      return plugin ? plugin.publicAPI : null;
    }
  };
}
