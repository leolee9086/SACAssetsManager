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
        Object.keys(localState).forEach(k => {
          if (!(k in remoteState)) delete localState[k];
        });
        Object.assign(localState, remoteState);
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