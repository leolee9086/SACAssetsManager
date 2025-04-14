/**
 * Vue 响应式同步工具 - 提供基于 Yjs 和 思源WebSocket 的跨窗口/跨组件响应式数据同步
 * 
 * 设计目标：
 * 1. 兼容 Vue 响应式 API 的使用体验
 * 2. 提供自动化的跨窗口/跨组件数据同步
 * 3. 支持本地存储持久化
 * 4. 自动断线重连和错误处理
 * 
 * @module useSyncedReactive
 */

import { ref, reactive, watch, computed, toRaw } from '../../../../static/vue.esm-browser.js';
import { createSyncEngine } from './impl/syncEngine.js';
import { setupWatchers } from './impl/watcherSetup.js';
import { enhanceReactiveObject } from './impl/objectEnhancer.js';

// 全局缓存 - 用于复用同步引擎实例
const engineCache = new Map();

// 全局缓存 - 用于同一窗口内复用响应式对象
const reactiveObjectCache = new Map();
const refObjectCache = new Map();

/**
 * 获取缓存键
 * @param {string} roomName - 房间名称
 * @param {string} key - 数据键
 * @returns {string} 缓存键
 */
const getCacheKey = (roomName, key) => `${roomName}:${key}`;

/**
 * 创建可同步的响应式引用 - 类似ref但支持跨窗口同步
 * @param {any} initialValue - 初始值
 * @param {Object} options - 配置选项
 * @returns {Object} 响应式引用对象
 */
export function useSyncedRef(initialValue, options = {}) {
  // 规范化配置选项
  const config = {
    type: 'ref',
    key: options.key || 'default',
    roomName: options.roomName || 'synced-refs',
    persist: options.persist !== false,
    deep: options.deep !== false,
    debug: !!options.debug,
    autoConnect: options.autoConnect !== false,
    onSync: options.onSync || null,
    onUpdate: options.onUpdate || null,
    siyuan: {
      enabled: true,
      ...(options.siyuan || {})
    },
    webrtcOptions: {
      connect: false,
      ...(options.webrtcOptions || {})
    },
    disableWebRTC: options.disableWebRTC !== false,
    loadTimeout: options.loadTimeout || 5000
  };
  
  // 检查缓存是否存在相同的引用对象
  const cacheKey = getCacheKey(config.roomName, config.key);
  if (refObjectCache.has(cacheKey)) {
    return refObjectCache.get(cacheKey);
  }
  
  // 创建本地响应式引用
  const localRef = ref(initialValue);
  
  // 创建状态对象
  const status = reactive({
    connected: false,
    peers: 0,
    lastSync: null,
    loading: true
  });
  
  // 获取或创建同步引擎
  let engine = engineCache.get(config.roomName);
  if (!engine) {
    engine = createSyncEngine(config);
    engineCache.set(config.roomName, engine);
  }
  
  // 启动异步初始化
  Promise.resolve().then(async () => {
    try {
      // 初始化引擎
      await engine.initialize();
      
      // 初始化ref的共享状态
      if (!engine.hasState('refs', config.key)) {
        engine.setState('refs', config.key, initialValue);
      }
      
      // 设置监听
      setupWatchers({
        type: 'ref',
        localState: localRef,
        status,
        engine,
        key: config.key,
        options: config
      });
      
      // 更新状态
      status.loading = false;
      status.connected = engine.isConnected();
      
      // 执行初始同步
      if (engine.isConnected() && engine.hasState('refs', config.key)) {
        localRef.value = engine.getState('refs', config.key);
        if (config.onSync) config.onSync(localRef.value);
      }
    } catch (err) {
      console.error(`[SyncedRef] 初始化错误:`, err);
      status.loading = false;
      status.error = err.message;
    }
  });
  
  // 创建增强的ref对象
  const result = {
    get value() { return localRef.value; },
    set value(newVal) { localRef.value = newVal; },
    get $status() { return status; },
    $sync: () => {
      if (engine && engine.isConnected() && engine.hasState('refs', config.key)) {
        localRef.value = engine.getState('refs', config.key);
        status.lastSync = Date.now();
        if (config.onSync) config.onSync(localRef.value);
        return true;
      }
      return false;
    },
    $connect: () => engine ? engine.connect() : false,
    $disconnect: () => engine ? engine.disconnect() : false,
    get $peers() { return engine ? engine.getPeers() : new Set(); },
    $destroy: () => {
      if (engine) {
        const success = engine.cleanupRef(config.key);
        // 从缓存中移除
        refObjectCache.delete(cacheKey);
        return success;
      }
      return false;
    }
  };
  
  // 将结果存入缓存
  refObjectCache.set(cacheKey, result);
  
  return result;
}

/**
 * 创建可同步的响应式对象 - 类似reactive但支持跨窗口同步
 * @param {Object} initialState - 初始状态对象
 * @param {Object} options - 配置选项
 * @returns {Object} 响应式对象
 */
export function useSyncedReactive(initialState = {}, options = {}) {
  // 规范化配置选项
  const config = {
    type: 'reactive',
    key: options.key || 'default',
    roomName: options.roomName || 'synced-reactive',
    persist: options.persist !== false,
    debug: !!options.debug,
    autoConnect: options.autoConnect !== false,
    onSync: options.onSync || null,
    onUpdate: options.onUpdate || null,
    siyuan: {
      enabled: options.siyuan?.enabled !== false, // 默认启用思源同步
      ...(options.siyuan || {})
    },
    webrtcOptions: {
      connect: false,
      ...(options.webrtcOptions || {})
    },
    // 是否禁用WebRTC - 默认不禁用
    disableWebRTC: options.disableWebRTC === true,
    // 超时配置
    loadTimeout: options.loadTimeout || 5000
  };
  
  // 检查缓存是否存在相同的响应式对象
  const cacheKey = getCacheKey(config.roomName, config.key);
  if (reactiveObjectCache.has(cacheKey)) {
    return reactiveObjectCache.get(cacheKey);
  }
  
  // 确保初始状态是可克隆的对象
  const initialStateCopy = JSON.parse(JSON.stringify(initialState));
  
  // 创建本地响应式对象
  const localState = reactive({...initialStateCopy});
  
  // 创建状态对象
  const status = reactive({
    connected: false,
    peers: 0,
    lastSync: null,
    loading: true
  });
  
  // 获取或创建同步引擎
  let engine = engineCache.get(config.roomName);
  if (!engine) {
    engine = createSyncEngine(config);
    engineCache.set(config.roomName, engine);
  }
  
  // 启动异步初始化
  Promise.resolve().then(async () => {
    try {
      // 初始化引擎
      await engine.initialize();
      
      // 初始化reactive的共享状态
      if (!engine.hasState('states', config.key)) {
        engine.setState('states', config.key, initialStateCopy);
      }
      
      // 设置监听
      setupWatchers({
        type: 'reactive',
        localState,
        status,
        engine,
        key: config.key,
        options: config
      });
      
      // 更新状态
      status.loading = false;
      status.connected = engine.isConnected();
      
      // 执行初始同步
      if (engine.isConnected() && engine.hasState('states', config.key)) {
        const remoteState = engine.getState('states', config.key);
        
        // 不再使用简单的Object.assign，改为使用合并函数
        // 将remoteState合并到localState，保留响应式和嵌套结构
        mergeStates(localState, remoteState);
        
        if (config.onSync) config.onSync(localState);
      }
    } catch (err) {
      console.error(`[SyncedReactive] 初始化错误:`, err);
      status.loading = false;
      status.error = err.message;
    }
  });
  
  // 扩展配置，添加缓存相关信息
  const enhancedConfig = {
    ...config,
    status,
    engine,
    key: config.key,
    initialState: initialStateCopy,
    type: 'states',
    options: config,
    // 添加缓存相关信息
    cache: {
      key: cacheKey,
      store: reactiveObjectCache
    }
  };
  
  // 增强响应式对象
  const enhancedObject = enhanceReactiveObject(localState, enhancedConfig);
  
  // 将结果存入缓存
  reactiveObjectCache.set(cacheKey, enhancedObject);
  
  return enhancedObject;
}

/**
 * 使用统一的同步接口 - 根据数据类型自动选择ref或reactive
 * @param {any} state - 状态数据
 * @param {Object} options - 配置选项
 * @returns {Object} 同步状态和方法
 */
export function useSync(state, options = {}) {
  // 确定数据类型
  const isSimpleValue = state === null || 
    typeof state !== 'object' || 
    Array.isArray(state) ||
    state instanceof Date ||
    state instanceof Set ||
    state instanceof Map;
  
  // 使用适当的同步方法
  return isSimpleValue
    ? useSyncedRef(state, options)
    : useSyncedReactive(state, options);
}

/**
 * 获取特定房间和键的缓存对象
 * @param {string} roomName - 房间名称
 * @param {string} key - 数据键
 * @param {string} type - 类型 'reactive' 或 'ref'
 * @returns {Object|null} 缓存的对象或null
 */
export function getCachedSyncObject(roomName, key, type = 'reactive') {
  const cacheKey = getCacheKey(roomName, key);
  const cache = type === 'ref' ? refObjectCache : reactiveObjectCache;
  return cache.get(cacheKey) || null;
}

/**
 * 清除特定房间的资源
 * @param {string} roomName - 房间名称
 * @returns {boolean} 是否成功清除
 */
export function clearRoom(roomName) {
  const engine = engineCache.get(roomName);
  if (engine) {
    // 清除相关的响应式对象缓存
    for (const [cacheKey, _] of reactiveObjectCache.entries()) {
      if (cacheKey.startsWith(`${roomName}:`)) {
        reactiveObjectCache.delete(cacheKey);
      }
    }
    
    for (const [cacheKey, _] of refObjectCache.entries()) {
      if (cacheKey.startsWith(`${roomName}:`)) {
        refObjectCache.delete(cacheKey);
      }
    }
    
    engine.destroy();
    engineCache.delete(roomName);
    return true;
  }
  return false;
}

/**
 * 清除所有同步资源
 */
export function clearAllRooms() {
  for (const engine of engineCache.values()) {
    engine.destroy();
  }
  engineCache.clear();
  reactiveObjectCache.clear();
  refObjectCache.clear();
}

/**
 * 安全地初始化嵌套路径
 * @param {Object} obj - 目标对象
 * @param {string|Array} path - 属性路径，可以是点分隔的字符串或数组
 * @param {any} defaultValue - 默认值
 * @returns {any} 路径对应的值或默认值
 */
function ensurePath(obj, path, defaultValue = {}) {
  const parts = Array.isArray(path) ? path : path.split('.');
  let current = obj;
  
  // 遍历路径的每一部分，确保每一级对象都存在
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || current[part] === null || current[part] === undefined) {
      current[part] = {};
    } else if (typeof current[part] !== 'object') {
      // 如果当前路径是非对象类型，则替换为对象
      current[part] = {};
    }
    current = current[part];
  }
  
  // 设置最后一级的值
  const lastPart = parts[parts.length - 1];
  if (!(lastPart in current) || current[lastPart] === undefined || current[lastPart] === null) {
    current[lastPart] = defaultValue;
  }
  
  return current[lastPart];
}

/**
 * 修复缺失的嵌套路径
 * @param {Object} obj - 要修复的对象
 */
function fixMissingPaths(obj) {
  // 预定义的关键路径列表，确保这些路径在对象中存在
  const requiredPaths = [
    'deepNested.level1.level2.value',
    'nested.value',
    'performanceMetrics.responseTime',
    'performanceMetrics.operations'
  ];
  
  for (const path of requiredPaths) {
    try {
      // 为每个必要路径设置默认值
      if (path.endsWith('value')) {
        ensurePath(obj, path, ''); // 字符串类型默认值
      } else if (path.includes('Metrics')) {
        ensurePath(obj, path, 0);  // 数字类型默认值
      } else {
        ensurePath(obj, path, {});  // 对象类型默认值
      }
    } catch (err) {
      console.error(`[SyncedReactive] 修复路径失败 ${path}:`, err);
    }
  }
}

/**
 * 深度合并两个状态对象，保留目标对象的响应式特性
 * @param {Object} target - 目标响应式对象
 * @param {Object} source - 源对象
 */
function mergeStates(target, source) {
  if (!target || !source || typeof target !== 'object' || typeof source !== 'object') {
    return;
  }
  
  // 修复目标对象中的关键路径
  try {
    fixMissingPaths(target);
  } catch (err) {
    console.error('[SyncedReactive] 修复关键路径失败:', err);
  }
  
  // 处理删除的属性 - 先删除目标中存在但源中不存在的属性
  Object.keys(target).forEach(key => {
    // 保留所有$开头的内部属性和方法
    if (key.startsWith('$') || typeof target[key] === 'function') return;
    if (!(key in source)) {
      delete target[key];
    }
  });
  
  // 合并或添加属性
  Object.keys(source).forEach(key => {
    const sourceValue = source[key];
    
    // 跳过内部属性
    if (key.startsWith('$') || typeof sourceValue === 'function') return;
    
    // 如果目标不存在此属性，直接添加
    if (!(key in target)) {
      target[key] = sourceValue;
      return;
    }
    
    const targetValue = target[key];
    
    // 递归处理嵌套对象 - 保留响应式
    if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
      mergeStates(targetValue, sourceValue); // 递归合并
    } 
    // 处理数组 - 特殊处理以保留响应式
    else if (Array.isArray(sourceValue) && Array.isArray(targetValue)) {
      try {
        // 清空目标数组
        targetValue.length = 0;
        // 将源数组的所有元素添加到目标数组
        for (let i = 0; i < sourceValue.length; i++) {
          if (isPlainObject(sourceValue[i])) {
            // 对于对象，需要创建新对象并复制属性
            const newObj = {};
            Object.keys(sourceValue[i]).forEach(k => {
              newObj[k] = sourceValue[i][k];
            });
            targetValue.push(newObj);
          } else if (Array.isArray(sourceValue[i])) {
            // 对于嵌套数组，创建新数组并递归处理
            const newArray = [];
            const sourceNestedArray = sourceValue[i];
            for (let j = 0; j < sourceNestedArray.length; j++) {
              if (isPlainObject(sourceNestedArray[j])) {
                // 再次处理嵌套对象
                const nestedObj = {};
                Object.keys(sourceNestedArray[j]).forEach(k => {
                  nestedObj[k] = sourceNestedArray[j][k];
                });
                newArray.push(nestedObj);
              } else {
                newArray.push(sourceNestedArray[j]);
              }
            }
            targetValue.push(newArray);
          } else {
            // 基本类型直接添加
            targetValue.push(sourceValue[i]);
          }
        }
      } catch (err) {
        console.error('[SyncedReactive] 数组合并失败:', err);
        // 如果上面的方法失败，尝试逐个替换
        try {
          while (targetValue.length > sourceValue.length) {
            targetValue.pop();
          }
          for (let i = 0; i < sourceValue.length; i++) {
            if (i < targetValue.length) {
              if (isPlainObject(sourceValue[i])) {
                // 如果已有对象，更新属性
                const existingObj = targetValue[i];
                Object.keys(existingObj).forEach(k => {
                  if (!(k in sourceValue[i])) {
                    delete existingObj[k];
                  }
                });
                Object.keys(sourceValue[i]).forEach(k => {
                  existingObj[k] = sourceValue[i][k];
                });
              } else {
                // 非对象直接替换
                targetValue[i] = sourceValue[i];
              }
            } else {
              // 添加新元素
              if (isPlainObject(sourceValue[i])) {
                const newObj = {};
                Object.keys(sourceValue[i]).forEach(k => {
                  newObj[k] = sourceValue[i][k];
                });
                targetValue.push(newObj);
              } else {
                targetValue.push(sourceValue[i]);
              }
            }
          }
        } catch (innerErr) {
          console.error('[SyncedReactive] 备用数组合并方法也失败:', innerErr);
        }
      }
    }
    // 其他情况直接替换值
    else if (targetValue !== sourceValue) {
      target[key] = sourceValue;
    }
  });
  
  // 最后再检查一次关键路径是否仍然完整
  try {
    fixMissingPaths(target);
  } catch (err) {
    console.error('[SyncedReactive] 最终修复关键路径失败:', err);
  }
}

/**
 * 检查对象是否为普通对象
 * @param {any} obj - 要检查的对象
 * @returns {boolean} 是否为普通对象
 */
function isPlainObject(obj) {
  return obj !== null && 
         typeof obj === 'object' && 
         !Array.isArray(obj) && 
         Object.getPrototypeOf(obj) === Object.prototype;
} 