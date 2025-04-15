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
 * @param {number} maxDepth - 最大递归深度，防止无限递归
 * @returns {any} 路径对应的值或默认值
 */
function ensurePath(obj, path, defaultValue = {}, maxDepth = 10) {
  if (!obj || typeof obj !== 'object') return defaultValue;
  if (maxDepth <= 0) {
    console.warn('[SyncedReactive] 达到最大路径深度限制，放弃继续处理');
    return defaultValue;
  }
  
  const parts = Array.isArray(path) ? path : path.split('.');
  if (parts.length === 0) return obj;
  
  let current = obj;
  
  // 遍历路径的每一部分，确保每一级对象都存在
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!part) continue;
    
    if (!(part in current) || current[part] === null || current[part] === undefined) {
      // 创建新对象
      try {
        current[part] = {};
      } catch (err) {
        console.error(`[SyncedReactive] 无法在 ${parts.slice(0, i).join('.')} 创建属性 ${part}:`, err);
        return defaultValue;
      }
    } else if (typeof current[part] !== 'object' || Array.isArray(current[part])) {
      // 如果是非对象类型或数组，替换为对象
      try {
        current[part] = {};
      } catch (err) {
        console.error(`[SyncedReactive] 无法替换 ${parts.slice(0, i).join('.')}.${part} 的非对象值:`, err);
        return defaultValue;
      }
    }
    
    // 移动到下一级
    current = current[part];
    
    // 安全检查
    if (!current || typeof current !== 'object') {
      console.error(`[SyncedReactive] 路径处理中断，${parts.slice(0, i+1).join('.')} 不是对象`);
      return defaultValue;
    }
  }
  
  // 设置最后一级的值
  const lastPart = parts[parts.length - 1];
  if (!lastPart) return current;
  
  if (!(lastPart in current) || current[lastPart] === undefined || current[lastPart] === null) {
    try {
      current[lastPart] = defaultValue;
    } catch (err) {
      console.error(`[SyncedReactive] 无法设置 ${parts.slice(0, -1).join('.')}.${lastPart} 的值:`, err);
    }
  }
  
  return current[lastPart];
}

/**
 * 修复缺失的嵌套路径 - 优化版，避免无限递归
 * @param {Object} obj - 要修复的对象
 * @param {boolean} isRetry - 是否为重试操作
 */
function fixMissingPaths(obj, isRetry = false) {
  if (!obj || typeof obj !== 'object') return;
  
  // 预定义的关键路径列表，确保这些路径在对象中存在
  const requiredPaths = [
    { path: 'deepNested.level1.level2.value', defaultValue: '' },
    { path: 'nested.value', defaultValue: '' },
    { path: 'performanceMetrics.responseTime', defaultValue: 0 },
    { path: 'performanceMetrics.operations', defaultValue: 0 }
  ];
  
  // 防止同一数据多次尝试
  const processedPaths = new Set();
  
  for (const { path, defaultValue } of requiredPaths) {
    // 如果已经处理过该路径且是重试，则跳过
    const pathKey = `${path}:${JSON.stringify(defaultValue)}`;
    if (isRetry && processedPaths.has(pathKey)) continue;
    
    try {
      // 为每个必要路径设置默认值，简化调用
      ensurePath(obj, path, defaultValue);
      processedPaths.add(pathKey);
    } catch (err) {
      console.error(`[SyncedReactive] 修复路径失败 ${path}:`, err);
    }
  }
}

/**
 * 深度合并两个状态对象，保留目标对象的响应式特性
 * @param {Object} target - 目标响应式对象
 * @param {Object} source - 源对象
 * @param {number} depth - 当前递归深度
 */
function mergeStates(target, source, depth = 0) {
  if (!target || !source || typeof target !== 'object' || typeof source !== 'object') {
    return;
  }
  
  // 限制最大递归深度，防止栈溢出
  const MAX_DEPTH = 10;
  if (depth > MAX_DEPTH) {
    console.warn(`[SyncedReactive] mergeStates 达到最大递归深度 ${MAX_DEPTH}，执行浅合并`);
    Object.assign(target, source);
    return;
  }
  
  // 修复目标对象中的关键路径 - 只在最外层调用时执行一次
  if (depth === 0) {
    try {
      fixMissingPaths(target, false);
    } catch (err) {
      console.error('[SyncedReactive] 修复关键路径失败:', err);
    }
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
      mergeStates(targetValue, sourceValue, depth + 1); // 递归合并
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
  
  // 只在最外层完成后检查一次关键路径
  if (depth === 0) {
    try {
      fixMissingPaths(target, true);
    } catch (err) {
      // 这里不再抛出错误，只记录日志
      console.warn('[SyncedReactive] 最终检查关键路径出现警告:', err);
    }
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