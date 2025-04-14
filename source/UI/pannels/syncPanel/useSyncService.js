/**
 * 同步数据服务 - 提供跨面板/跨Tab的数据同步功能
 * 
 * 该模块封装了useSyncedReactive，提供更简单的跨组件数据同步API
 * 可以被任何Vue组件引入并使用，无需关心底层实现
 */

import { ref, reactive } from '../../../../static/vue.esm-browser.js';
import { useSyncedReactive, useSyncedRef } from '../../../../src/toolBox/useAge/forSync/useSyncedReactive.js';

// 全局实例缓存 - 用于复用已创建的同步实例
// 格式: Map<`${roomName}:${key}`, syncInstance>
const syncInstanceCache = new Map();

/**
 * 创建同步数据服务
 * @param {Object} options - 配置选项
 * @returns {Object} 同步数据服务实例
 */
export function createSyncService(options = {}) {
  const {
    // 同步配置
    namespace = 'default',             // 命名空间，用于隔离不同功能的数据
    id = 'default',                    // 数据ID，用于区分同一命名空间下的不同数据
    initialData = {},                  // 初始数据
    persist = true,                    // 是否持久化
    debug = false,                     // 调试模式
    
    // 事件回调
    onConnected = null,                // 连接成功回调
    onDisconnected = null,             // 连接断开回调
    onSynced = null,                   // 数据同步回调
    onError = null,                    // 错误回调
    
    // 高级选项
    customRoomName = null,             // 自定义房间名
    customKey = null,                  // 自定义数据键
    customSiyuanConfig = null,         // 自定义思源配置
  } = options;
  
  // 生成房间名和数据键
  const roomName = customRoomName || `sync-service-${namespace}`;
  const dataKey = customKey || id;
  const cacheKey = `${roomName}:${dataKey}`;
  
  // 检查缓存中是否已有该实例
  if (syncInstanceCache.has(cacheKey)) {
    const cachedInstance = syncInstanceCache.get(cacheKey);
    
    if (debug) {
      console.log(`[同步服务] 复用已存在的实例: ${cacheKey}`);
    }
    
    return cachedInstance;
  }
  
  // 状态对象
  const syncStatus = reactive({
    connected: false,
    loading: true,
    peers: 0,
    lastSync: null,
    error: null
  });
  
  // 同步实例
  let syncInstance = null;
  let syncControl = null;
  
  /**
   * 初始化同步数据
   */
  async function init() {
    try {
      syncStatus.loading = true;
      syncStatus.error = null;
      
      // 根据数据类型选择同步方法
      syncControl = await useSyncedReactive(
        initialData, 
        {
          roomName,
          key: dataKey,
          persist,
          debug,
          onSync: (data) => {
            syncStatus.lastSync = Date.now();
            if (onSynced) onSynced(data);
          },
          onUpdate: (data, source) => {
            // 可在此处添加更新回调逻辑
          },
          // 思源WebSocket配置
          siyuan: {
            enabled: true,
            ...(customSiyuanConfig || {})
          }
        }
      );
      
      // 保存数据引用
      syncInstance = syncControl;
      
      // 更新状态
      syncStatus.loading = false;
      syncStatus.connected = syncControl.$status.connected;
      syncStatus.peers = syncControl.$status.peers || 0;
      
      // 监听连接状态
      watchConnectionStatus();
      
      if (debug) {
        console.log(`[同步服务] 创建同步数据成功: ${cacheKey}`, syncInstance);
      }
      
    } catch (err) {
      syncStatus.loading = false;
      syncStatus.error = err.message || '创建同步数据失败';
      
      if (onError) onError(err);
      
      if (debug) {
        console.error(`[同步服务] 创建同步数据失败: ${cacheKey}`, err);
      }
    }
  }
  
  /**
   * 监听连接状态变化
   */
  function watchConnectionStatus() {
    if (!syncControl || !syncControl.$status) return;
    
    // 设置监听器监控连接状态变化
    Object.defineProperty(syncStatus, 'connected', {
      get: () => syncControl.$status.connected,
      enumerable: true
    });
    
    Object.defineProperty(syncStatus, 'peers', {
      get: () => syncControl.$status.peers || 0,
      enumerable: true
    });
    
    // 添加连接状态变化回调
    const originalConnected = syncStatus.connected;
    setInterval(() => {
      if (syncControl && syncControl.$status) {
        const newConnected = syncControl.$status.connected;
        
        // 连接状态变化触发回调
        if (originalConnected !== newConnected) {
          if (newConnected && onConnected) {
            onConnected();
          } else if (!newConnected && onDisconnected) {
            onDisconnected();
          }
        }
      }
    }, 1000);
  }
  
  /**
   * 同步服务接口
   */
  const service = {
    // 数据访问 - 直接使用syncInstance本身
    data: syncInstance,
    
    // 状态访问
    status: syncStatus,
    
    // 控制方法
    connect() {
      if (syncInstance) return syncInstance.$connect();
      return false;
    },
    
    disconnect() {
      if (syncInstance) return syncInstance.$disconnect();
      return false;
    },
    
    sync() {
      if (syncInstance) return syncInstance.$sync();
      return false;
    },
    
    // 重置数据
    reset() {
      if (syncInstance) {
        return syncInstance.$reset();
      }
      return false;
    },
    
    // 更新部分数据
    update(partial) {
      if (!syncInstance) return false;
      
      Object.entries(partial).forEach(([key, value]) => {
        syncInstance[key] = value;
      });
      
      return true;
    },
    
    // 获取连接节点
    getPeers() {
      if (syncInstance) return syncInstance.$peers;
      return new Set();
    },
    
    // 销毁同步服务，清理资源
    destroy() {
      if (syncInstance) {
        syncInstance.$destroy();
        syncInstanceCache.delete(cacheKey);
        return true;
      }
      return false;
    }
  };
  
  // 启动初始化
  init().then(() => {
    // 缓存该实例
    syncInstanceCache.set(cacheKey, service);
  });
  
  return service;
}

/**
 * 创建命名空间服务 - 用于更方便地创建多个同一命名空间下的同步数据
 * @param {string} namespace - 命名空间
 * @param {Object} defaultOptions - 默认选项
 * @returns {Function} 创建函数
 */
export function createNamespacedSync(namespace, defaultOptions = {}) {
  return (id, options = {}) => {
    return createSyncService({
      namespace,
      id,
      ...defaultOptions,
      ...options
    });
  };
}

/**
 * 工具方法 - 创建预配置的同步服务工厂
 * @param {Object} config - 默认配置
 * @returns {Function} 创建函数
 */
export function configureSyncService(config = {}) {
  return (options = {}) => {
    return createSyncService({
      ...config,
      ...options
    });
  };
}

/**
 * 全局方法 - 获取所有活跃的同步实例
 * @returns {Map} 活跃的同步实例
 */
export function getActiveSyncInstances() {
  return new Map(syncInstanceCache);
}

/**
 * 全局方法 - 清理所有同步实例
 */
export function clearAllSyncInstances() {
  for (const service of syncInstanceCache.values()) {
    if (service.destroy) {
      service.destroy();
    }
  }
  
  syncInstanceCache.clear();
}

// 默认导出
export default {
  createSyncService,
  createNamespacedSync,
  configureSyncService,
  getActiveSyncInstances,
  clearAllSyncInstances
}; 