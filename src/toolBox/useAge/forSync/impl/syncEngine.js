/**
 * 同步引擎 - 负责与底层存储同步服务交互
 * 
 * 这个模块封装了与createSyncStore的交互，提供了更简单的API
 */

import { createSyncStore } from '../../../feature/useSyncedstore/useSyncstore.js';

// 全局引擎缓存 - 确保使用同一个房间名的所有实例共享同一个引擎
const globalEngineCache = new Map();

/**
 * 创建同步引擎
 * @param {Object} config - 配置选项
 * @returns {Object} 同步引擎实例
 */
export function createSyncEngine(config) {
  // 引擎状态
  let store = null;
  let initialized = false;
  let initPromise = null;
  let listeners = new Map();
  
  // 检查全局缓存中是否已存在该房间的引擎
  const cacheKey = `${config.roomName}`;
  if (globalEngineCache.has(cacheKey)) {
    const cachedEngine = globalEngineCache.get(cacheKey);
    if (config.debug) {
      console.log(`[SyncEngine] 复用现有引擎，房间: ${config.roomName}`);
    }
    return cachedEngine;
  }
  
  // 创建引擎实例
  const engine = {
    /**
     * 初始化引擎
     * @returns {Promise<void>}
     */
    initialize: async function() {
      // 如果已经在初始化中，返回当前的Promise
      if (initPromise) return initPromise;
      
      // 如果已经初始化完成，直接返回
      if (initialized && store) return Promise.resolve(store);
      
      // 创建初始化Promise
      initPromise = (async () => {
        try {
          // 创建存储配置
          const storeOptions = {
            roomName: config.roomName,
            initialState: { refs: {}, states: {} },
            persist: config.persist,
            autoConnect: config.autoConnect,
            autoSync: {
              enabled: true,
              interval: 500, // 更快的同步间隔
              adaptiveMode: true,
              heartbeatField: '_heartbeat_' // 确保心跳字段存在
            },
            webrtcOptions: config.webrtcOptions,
            disableWebRTC: config.disableWebRTC, 
            siyuan: config.siyuan,
            loadTimeout: config.loadTimeout
          };
          
          // 创建存储
          store = await createSyncStore(storeOptions);
          initialized = true;
          
          // 立即触发一次同步
          if (store && store.sync) {
            setTimeout(() => {
              try {
                store.sync();
                if (config.debug) {
                  console.log(`[SyncEngine] 初始化完成后触发同步，房间: ${config.roomName}`);
                }
              } catch (err) {
                console.error(`[SyncEngine] 初始同步触发失败:`, err);
              }
            }, 200);
          }
          
          if (config.debug) {
            console.log(`[SyncEngine] 创建同步引擎，房间: ${config.roomName}，状态:`, store.isConnected.value ? '已连接' : '未连接');
          }
          
          return store;
        } catch (err) {
          console.error(`[SyncEngine] 初始化错误:`, err);
          throw err;
        } finally {
          // 不管成功失败，都清除initPromise
          initPromise = null;
        }
      })();
      
      return initPromise;
    },
    
    /**
     * 检查是否初始化
     * @returns {boolean}
     */
    isInitialized: function() {
      return initialized;
    },
    
    /**
     * 检查连接状态
     * @returns {boolean}
     */
    isConnected: function() {
      return store ? store.isConnected.value : false;
    },
    
    /**
     * 获取对等节点
     * @returns {Set}
     */
    getPeers: function() {
      return store ? store.getPeers() : new Set();
    },
    
    /**
     * 检查状态是否存在
     * @param {string} type - 状态类型 ('refs' 或 'states')
     * @param {string} key - 状态键
     * @returns {boolean}
     */
    hasState: function(type, key) {
      if (!store || !store.store || !store.store.state) return false;
      return store.store.state[type] && store.store.state[type][key] !== undefined;
    },
    
    /**
     * 获取状态
     * @param {string} type - 状态类型 ('refs' 或 'states')
     * @param {string} key - 状态键
     * @returns {any}
     */
    getState: function(type, key) {
      if (!this.hasState(type, key)) return null;
      return store.store.state[type][key];
    },
    
    /**
     * 设置状态
     * @param {string} type - 类型
     * @param {string} key - 键
     * @param {any} value - 值
     * @returns {boolean} 是否成功
     */
    setState: function(type, key, value) {
      if (!store || !store.store || !store.store.state) return false;
      
      try {
        // 确保类型存在
        if (!store.store.state[type]) {
          store.store.state[type] = {};
        }
        
        // 特别处理数组中的对象，确保所有对象都被正确地深拷贝
        let safeValue;
        if (Array.isArray(value)) {
          safeValue = [];
          for (let i = 0; i < value.length; i++) {
            const item = value[i];
            if (item !== null && typeof item === 'object') {
              // 对对象和数组进行深拷贝
              safeValue.push(JSON.parse(JSON.stringify(item)));
            } else {
              safeValue.push(item);
            }
          }
        } else if (typeof value === 'object' && value !== null) {
          // 其他对象也进行深拷贝
          safeValue = JSON.parse(JSON.stringify(value));
        } else {
          // 原始类型直接使用
          safeValue = value;
        }
        
        // 设置值
        store.store.state[type][key] = safeValue;
        
        // 如果有主动同步函数，则调用
        if (store.sync) {
          setTimeout(() => store.sync(), 0);
        }
        
        return true;
      } catch (err) {
        console.error(`[SyncEngine] 设置状态失败:`, err);
        return false;
      }
    },
    
    /**
     * 连接
     * @returns {boolean}
     */
    connect: function() {
      return store ? store.connect() : false;
    },
    
    /**
     * 断开连接
     * @returns {boolean}
     */
    disconnect: function() {
      return store ? store.disconnect() : false;
    },
    
    /**
     * 添加事件监听器
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     */
    on: function(event, callback) {
      if (!store) return;
      
      // 安全地添加事件监听器
      try {
        store.on(event, callback);
        
        // 存储监听器以便清理
        if (!listeners.has(event)) {
          listeners.set(event, new Set());
        }
        listeners.get(event).add(callback);
      } catch (err) {
        console.warn(`[SyncEngine] 添加事件监听器失败: ${event}`, err);
        
        // 尝试使用emit方法
        if (store.emit) {
          // 创建一个包装函数，在store发出此事件时调用
          const wrapper = (...args) => {
            if (typeof callback === 'function') {
              try {
                callback(...args);
              } catch (e) {
                console.error(`[SyncEngine] 事件回调执行错误: ${event}`, e);
              }
            }
          };
          
          // 存储包装函数以便清理
          if (!listeners.has(event)) {
            listeners.set(event, new Set());
          }
          listeners.get(event).add(wrapper);
        }
      }
    },
    
    /**
     * 移除事件监听器
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     */
    off: function(event, callback) {
      if (!store) return;
      
      // 安全地移除事件监听器
      try {
        store.off(event, callback);
      } catch (err) {
        console.warn(`[SyncEngine] 移除事件监听器失败: ${event}`, err);
      }
      
      // 从存储中移除
      if (listeners.has(event)) {
        listeners.get(event).delete(callback);
      }
    },
    
    /**
     * 清理ref资源
     * @param {string} key - ref键
     * @returns {boolean}
     */
    cleanupRef: function(key) {
      // 实际上我们不从存储中删除数据，只是清理事件监听器
      return true;
    },
    
    /**
     * 清理reactive资源
     * @param {string} key - reactive键
     * @returns {boolean}
     */
    cleanupReactive: function(key) {
      // 实际上我们不从存储中删除数据，只是清理事件监听器
      return true;
    },
    
    /**
     * 销毁引擎资源
     */
    destroy: function() {
      // 移除所有事件监听器
      for (const [event, callbacks] of listeners.entries()) {
        for (const callback of callbacks) {
          if (store) store.off(event, callback);
        }
      }
      
      listeners.clear();
      
      // 断开连接但不销毁存储，因为可能被其他实例使用
      if (store) store.disconnect();
      
      // 从全局缓存中移除
      globalEngineCache.delete(cacheKey);
    }
  };
  
  // 将引擎添加到全局缓存
  globalEngineCache.set(cacheKey, engine);
  
  return engine;
} 