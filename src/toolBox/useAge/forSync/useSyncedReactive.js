/**
 * Vue 响应式同步工具 - 提供基于 SyncedStore 和 思源WebSocket 的跨窗口/跨组件响应式数据同步
 * 
 * 设计目标：
 * 1. 兼容 Vue 响应式 API 的使用体验
 * 2. 提供自动化的跨窗口/跨组件数据同步
 * 3. 支持本地存储持久化
 * 4. 自动断线重连和错误处理
 * 
 * @module useSyncedReactive
 */

import { ref, reactive, watch, nextTick, toRaw } from '../../../../static/vue.esm-browser.js';
import * as Vue from '../../../../static/vue.esm-browser.js';
import { syncedStore, enableVueBindings, getYjsDoc } from '../../../../static/@syncedstore/core.js';
import SiyuanProvider from '../../feature/useSyncedstore/useSiyuanProvider.js';

// 启用 Vue 绑定
enableVueBindings(Vue);

// 全局缓存 - 用于复用存储实例
const storeCache = new Map();

/**
 * 获取缓存键
 * @param {string} roomName - 房间名称
 * @param {string} key - 数据键
 * @returns {string} 缓存键
 */
const computeCacheKey = (roomName, key) => `${roomName}:${key}`;

/**
 * 创建可同步的响应式对象 - 类似reactive但支持跨窗口同步
 * @param {Object} initialState - 初始状态对象
 * @param {Object} options - 配置选项
 * @returns {Object} 响应式对象
 */
export function useSyncedReactive(initialState = {}, options = {}) {
  // 规范化配置选项
  const config = {
    key: options.key || 'default',
    roomName: options.roomName || 'synced-reactive',
    persist: options.persist !== false,
    debug: !!options.debug,
    autoConnect: options.autoConnect !== false,
    onSync: options.onSync || null,
    onUpdate: options.onUpdate || null,
    siyuan: {
      enabled: options.siyuan?.enabled !== false,
      ...(options.siyuan || {})
    }
  };
  
  // 添加调试日志
  const log = (...args) => {
    if (config.debug) {
      console.log(`[useSyncedReactive] [${config.roomName}:${config.key}]`, ...args);
    }
  };
  
  // 检查缓存中是否已有此存储
  const cacheKey = computeCacheKey(config.roomName, config.key);
  if (storeCache.has(cacheKey)) {
    const cachedStore = storeCache.get(cacheKey);
    return cachedStore.data;
  }
  
  log(`创建新的SyncedStore实例: ${config.roomName}:${config.key}`);
  
  // 创建状态对象 - 使用Vue的reactive确保完全响应式
  const status = reactive({
    connected: false,
    peers: 0,
    lastSync: null,
    loading: true,
    error: null
  });
  
  // 创建存储结构，SyncedStore要求根对象必须为空对象
  const storeDefinition = {
    [config.key]: {}
  };
  
  // 创建SyncedStore
  const store = syncedStore(storeDefinition);
  
  // 获取目标数据，即store.default或store[config.key]
  const data = store[config.key];
  
  // 在初始化完SyncedStore后，将initialState的属性复制到data
  if (initialState && typeof initialState === 'object') {
    // 直接初始化数据，不再使用nextTick延迟
    try {
      Object.keys(initialState).forEach(key => {
        // 深度复制每个属性
        if (typeof initialState[key] === 'object' && initialState[key] !== null) {
          if (Array.isArray(initialState[key])) {
            // 初始化数组
            if (!data[key]) {
              data[key] = [];
            }
            initialState[key].forEach((item, index) => {
              data[key][index] = item;
            });
          } else {
            // 初始化对象
            if (!data[key]) {
              data[key] = {};
            }
            Object.keys(initialState[key]).forEach(subKey => {
              data[key][subKey] = initialState[key][subKey];
            });
          }
        } else {
          // 简单值直接赋值
          data[key] = initialState[key];
        }
      });
      log('初始数据已复制到同步存储');
    } catch (err) {
      console.error('[useSyncedReactive] 初始化数据时出错:', err);
    }
  }
  
  // 正确获取Yjs文档
  const doc = getYjsDoc(store);
  
  // 确保doc有clientID
  if (!doc.clientID) {
    doc.clientID = Math.floor(Math.random() * 1000000);
    log('为doc对象添加了缺失的clientID:', doc.clientID);
  }
  
  // 创建思源Provider
  const provider = new SiyuanProvider(config.roomName, doc, {
    connect: config.autoConnect,
    siyuanConfig: config.siyuan
  });
  
  // 设置状态监听
  provider.on('status', (statusEvent) => {
    console.log(`[useSyncedReactive] [${config.roomName}:${config.key}] 收到状态事件:`, statusEvent);
    
    // 使用响应式方式更新状态
    const updateStatus = () => {
      if (statusEvent.status === 'connected') {
        status.connected = true;
        status.lastSync = Date.now();
        
        // 触发同步回调
        if (config.onSync) {
          config.onSync(data);
        }
        
        console.log(`[useSyncedReactive] [${config.roomName}:${config.key}] 连接成功，状态已更新为"已连接"`);
      } else if (statusEvent.status === 'disconnected' || statusEvent.status === 'error') {
        status.connected = false;
        console.log(`[useSyncedReactive] [${config.roomName}:${config.key}] 连接断开或错误，状态已更新为"未连接"`);
      } else if (statusEvent.status === 'auth_failed') {
        status.error = '鉴权失败';
        status.connected = false;
        console.log(`[useSyncedReactive] [${config.roomName}:${config.key}] 鉴权失败，状态已更新为"未连接"`);
      }
    };
    
    // 确保在Vue的响应式系统中执行更新
    if (Vue.nextTick) {
      Vue.nextTick(updateStatus);
    } else {
      nextTick(updateStatus);
    }
  });
  
  // 文档更新监听
  doc.on('update', () => {
    status.lastSync = Date.now();
    
    // 触发更新回调
    if (config.onUpdate) {
      config.onUpdate(data);
    }
  });
  
  // 定期更新连接节点数量
  const updatePeers = () => {
    try {
      const peers = provider.getPeers();
      status.peers = peers.size;
    } catch (err) {
      console.warn('[useSyncedReactive] 获取连接节点失败:', err);
    }
  };
  
  const peersInterval = setInterval(updatePeers, 5000);
  updatePeers(); // 初始更新一次
  
  // 创建包装代理，而不是使用Object.defineProperties
  const syncApi = {
    $status: status,
    $syncStatus: () => {
      // 检查provider状态并强制更新status对象
      let changed = false;
      if (provider && provider.wsconnected && !status.connected) {
        status.connected = true;
        changed = true;
        console.log(`[useSyncedReactive] [${config.roomName}:${config.key}] 手动更新状态：已连接`);
      } else if (provider && !provider.wsconnected && status.connected) {
        status.connected = false;
        changed = true;
        console.log(`[useSyncedReactive] [${config.roomName}:${config.key}] 手动更新状态：未连接`);
      }
      return changed;
    },
    $sync: () => {
      status.lastSync = Date.now();
      if (config.onSync) {
        config.onSync(data);
      }
      return true;
    },
    $connect: () => provider.connect(),
    $disconnect: () => {
      provider.disconnect();
      return true;
    },
    $peers: provider.getPeers(),
    $destroy: () => {
      clearInterval(peersInterval);
      provider.destroy();
      storeCache.delete(cacheKey);
      return true;
    },
    $provider: provider,
    $store: store,
    $doc: doc
  };
  
  // 创建代理对象，合并原始数据和API
  const proxy = new Proxy(data, {
    get(target, prop) {
      // 优先从API对象中获取属性
      if (prop in syncApi) {
        // 对于getter类型的API，动态获取最新值
        if (prop === '$peers') {
          return provider.getPeers();
        }
        return syncApi[prop];
      }
      // 否则从原始数据中获取
      return target[prop];
    }
  });
  
  // 设置加载状态
  nextTick(() => {
    status.loading = false;
  });
  
  // 确保基本数据结构的完整性
  const ensureDataIntegrity = () => {
    // 检查initialState中的所有顶级键是否都已经被创建
    if (initialState && typeof initialState === 'object') {
      Object.keys(initialState).forEach(key => {
        if (data[key] === undefined) {
          // 如果键不存在，重新创建
          if (typeof initialState[key] === 'object' && initialState[key] !== null) {
            if (Array.isArray(initialState[key])) {
              data[key] = [...initialState[key]];
            } else {
              data[key] = {...initialState[key]};
            }
          } else {
            data[key] = initialState[key];
          }
          log(`修复了缺失的数据结构: ${key}`);
        }
      });
    }
  };
  
  // 执行数据完整性检查
  ensureDataIntegrity();
  
  // 缓存存储实例
  storeCache.set(cacheKey, {
    store,
    data: proxy, // 缓存代理对象而不是原始数据
    provider
  });
  
  return proxy; // 返回代理对象
}

/**
 * 创建可同步的响应式引用 - 类似ref但支持跨窗口同步
 * @param {any} initialValue - 初始值
 * @param {Object} options - 配置选项
 * @returns {Object} 响应式引用对象
 */
export function useSyncedRef(initialValue, options = {}) {
  // 将简单值包装为对象，然后使用useSyncedReactive
  const wrappedState = { value: initialValue };
  const reactiveObj = useSyncedReactive(wrappedState, {
    ...options,
    key: options.key || 'refs-default'
  });
  
  // 创建类ref接口 - 使用代理对象的方式访问属性
  const refInterface = {
    get value() { return reactiveObj.value; },
    set value(newVal) { reactiveObj.value = newVal; }
  };
  
  // 使用代理包装refInterface，转发所有$开头的API调用到reactiveObj
  return new Proxy(refInterface, {
    get(target, prop) {
      if (prop.startsWith('$')) {
        return reactiveObj[prop];
      }
      return target[prop];
    }
  });
}

/**
 * 通用同步API - 自动检测值类型并使用相应的同步方法
 * @param {any} state - 状态（对象或简单值）
 * @param {Object} options - 配置选项
 * @returns {Object} 同步对象
 */
export function useSync(state, options = {}) {
  if (typeof state === 'object' && state !== null && !Array.isArray(state)) {
    const reactive = useSyncedReactive(state, options);
    return {
      state: reactive,
      get value() { return reactive; },
      status: reactive.$status,
      sync: reactive.$sync,
      connect: reactive.$connect,
      disconnect: reactive.$disconnect,
      destroy: reactive.$destroy
    };
  } else {
    const ref = useSyncedRef(state, options);
    return {
      get state() { return ref.value; },
      set state(newVal) { ref.value = newVal; },
      get value() { return ref.value; },
      set value(newVal) { ref.value = newVal; },
      status: ref.$status,
      sync: ref.$sync,
      connect: ref.$connect,
      disconnect: ref.$disconnect,
      destroy: ref.$destroy
    };
  }
}

/**
 * 获取已缓存的同步对象
 * @param {string} roomName - 房间名称
 * @param {string} key - 数据键
 * @returns {Object|null} 同步对象或null
 */
export function getCachedSyncObject(roomName, key) {
  const cacheKey = computeCacheKey(roomName, key);
  const cached = storeCache.get(cacheKey);
  return cached ? cached.data : null;
}

/**
 * 清除房间中的所有同步对象
 * @param {string} roomName - 房间名称
 * @returns {boolean} 是否成功
 */
export function clearRoom(roomName) {
  let found = false;
  
  // 删除所有与该房间相关的缓存
  for (const [key, value] of storeCache.entries()) {
    if (key.startsWith(`${roomName}:`)) {
      value.data.$destroy();
      storeCache.delete(key);
      found = true;
    }
  }
  
  return found;
}

/**
 * 清除所有房间和同步对象
 * @returns {number} 清除的房间数量
 */
export function clearAllRooms() {
  const roomCount = storeCache.size;
  
  for (const [key, value] of storeCache.entries()) {
    value.data.$destroy();
  }
  
  storeCache.clear();
  
  return roomCount;
} 