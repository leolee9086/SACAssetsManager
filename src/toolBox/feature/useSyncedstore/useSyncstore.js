/**
 * @fileoverview 提供基于Yjs的实时协作状态管理功能
 * 
 * 该模块实现了以下核心功能：
 * - 基于WebRTC的P2P实时数据同步
 * - 自适应的同步间隔调整
 * - 自动重连和故障恢复
 * - IndexedDB本地持久化
 * - 网络诊断和性能监控
 * 
 * @module createSyncStore
 * @requires vue
 * @requires @syncedstore/core
 * @requires y-webrtc
 * @requires y-indexeddb
 * @requires yjs
 */

import { ref, watch } from '../../../../static/vue.esm-browser.js'
import { selectBestServers } from './useYjsSignalServers.js'
import { createDefaultAutoSyncConfig } from './forAutoSync.js'
import {
  diagnoseConnection,
  getConnectionQualityRating,
  generateDiagnosticMessage
} from './useNetworkDiagnostics.js'

// 导入管理器模块
import siyuanManager from './useSiyuanIntegration.js'
import documentManager, { resetRoomConnection } from './useDocumentManager.js'
import { createConnectionManager } from './useConnectionManager.js'
import { createPersistenceManager } from './usePersistenceManager.js'
import { createSyncManager } from './useSyncManager.js'

// 配置常量
const DEFAULT_ROOM_NAME = 'default-room'
const CONNECT_DELAY = 100
const DEFAULT_WEBRTC_CONFIG = {
  peerOpts: {
    config: {
      iceTransportPolicy: 'all',
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
      sdpSemantics: 'unified-plan'
    },
    trickle: true
  },
  pingInterval: 3000,
  maxConns: 20,
  connect: false,
  filterBcConns: true,
  maxRetries: 10
}

/**
 * 创建与Vue集成的同步状态管理器
 * @param {Object} options - 配置选项
 * @param {string} [options.roomName='default-room'] - 房间名称
 * @param {Object} [options.initialState={}] - 初始状态
 * @param {boolean} [options.persist=true] - 是否启用本地持久化
 * @param {Object} [options.webrtcOptions={}] - WebRTC连接配置
 * @param {boolean} [options.autoConnect=true] - 是否自动建立连接
 * @param {Object} [options.retryStrategy] - 重连策略
 * @param {number} [options.retryStrategy.maxRetries=5] - 最大重试次数
 * @param {number} [options.retryStrategy.initialDelay=1000] - 初始重试延迟(ms)
 * @param {number} [options.retryStrategy.maxDelay=30000] - 最大重试延迟(ms)
 * @param {Object} [options.autoSync] - 自动同步配置
 * @param {boolean} [options.forceNewDoc=false] - 是否强制创建新文档
 * @param {Object} [options.siyuan] - 思源同步配置
 * @param {boolean} [options.disableWebRTC=false] - 是否禁用WebRTC连接
 * @param {number} [options.loadTimeout=5000] - 本地数据加载超时时间(ms)
 * @returns {Promise<Object>} 同步状态管理器实例
 */
export async function createSyncStore(options = {}) {
  const {
    roomName = DEFAULT_ROOM_NAME,
    initialState = {},
    persist = true,
    webrtcOptions = {},
    autoConnect = true,
    retryStrategy = {
      maxRetries: 5,
      initialDelay: 1000,
      maxDelay: 30000
    },
    autoSync = {
      ...createDefaultAutoSyncConfig(),
      ...options.autoSync
    },
    forceNewDoc = false,
    // 思源相关配置
    siyuan = {
      enabled: false,
      ...siyuanManager.config,
      ...options.siyuan
    },
    // 新增：是否禁用WebRTC选项
    disableWebRTC = false,
    // 新增：本地数据加载超时
    loadTimeout = 5000
  } = options

  // 创建响应式状态
  const isConnected = ref(false)
  const status = ref('初始化中')
  const isLocalDataLoaded = ref(false)

  // 获取或创建文档
  const docState = await documentManager.getDocument(roomName, { forceNewDoc })
  const { doc: ydoc, store, isExisting } = docState

  // 初始化状态（如果是新文档）
  if (!isExisting && Object.keys(initialState).length > 0) {
    initializeState(store, initialState)
  }

  // 使用持久化管理器处理本地数据
  const persistenceManager = persist 
    ? await setupPersistence(roomName, ydoc, initialState, store, status, isLocalDataLoaded, { loadTimeout })
    : handleNoPersistence(initialState, store, isLocalDataLoaded);

  // 连接思源
  let siyuanSocket = null;
  
  // 判断是否应该启用思源WebSocket连接
  // 当明确启用思源连接或者禁用WebRTC时优先使用思源连接
  const shouldUseSiyuan = siyuan.enabled || disableWebRTC;
  
  if (shouldUseSiyuan) {
    try {
      console.log(`[同步存储] 房间 ${roomName} 启用思源WebSocket连接`);
      siyuanSocket = await connectToSiyuan(roomName, {
        ...siyuan,
        enabled: true  // 确保启用思源连接
      }, store);
      
      if (siyuanSocket) {
        isConnected.value = true;
        status.value = '已连接(思源)';
        console.log(`[同步存储] 房间 ${roomName} 思源WebSocket连接成功`);
      } else {
        console.warn(`[同步存储] 房间 ${roomName} 思源WebSocket连接失败`);
      }
    } catch (err) {
      console.error(`[同步存储] 房间 ${roomName} 思源WebSocket连接出错:`, err);
    }
  }

  // 判断是否使用WebRTC - 只有在未禁用WebRTC且非强制使用思源时才使用WebRTC
  const useWebRTC = !disableWebRTC && !(siyuanSocket && shouldUseSiyuan);
  
  // 只有在需要使用WebRTC时才选择服务器和创建连接
  let provider = null;
  let connectionManager = null;
  
  if (useWebRTC) {
    // 选择最佳服务器
    status.value = '正在选择最佳服务器...'
    const bestServers = await selectBestServers()
    
    // 合并WebRTC选项
    const mergedWebRtcOptions = mergeWebRtcOptions(webrtcOptions, bestServers)

    // 获取或创建连接
    provider = await documentManager.getConnection(
      roomName, 
      ydoc, 
      mergedWebRtcOptions
    )

    // 创建连接管理器
    connectionManager = createConnectionManager({
      provider,
      roomName,
      retryStrategy,
      documentManager,
      ydoc,
      webrtcOptions: mergedWebRtcOptions,
      status,
      isConnected
    })

    // 如果设置了自动连接，则立即连接
    if (autoConnect) {
      setTimeout(() => connectionManager.connect(), CONNECT_DELAY)
    }
  } else {
    // 使用思源WebSocket时，使用空的连接管理器
    status.value = shouldUseSiyuan ? '使用思源WebSocket同步' : '未启用同步'
    console.log(`[同步存储] 房间 ${roomName} ${shouldUseSiyuan ? '使用思源WebSocket同步' : '未启用同步'}`);
    
    // 为避免空值错误，创建一个空的连接管理器
    connectionManager = {
      connect: () => false,
      disconnect: () => false,
      reconnect: () => false,
      getProvider: () => null,
      isConnected: () => shouldUseSiyuan && siyuanSocket !== null
    }
    
    // 如果思源WebSocket连接成功，设置连接状态
    if (shouldUseSiyuan && siyuanSocket !== null) {
      isConnected.value = true;
    }
  }

  // 创建同步管理器
  const syncManager = createSyncManager({
    ydoc,
    store,
    roomName,
    autoSync,
    getProvider: connectionManager.getProvider,
    siyuanSocket
  })

  // 只有在使用WebRTC时才获取provider和设置事件监听
  if (useWebRTC) {
    // 获取连接管理器中的provider
    provider = connectionManager.getProvider()
    
    // 设置连接和同步事件监听
    setupEventListeners(provider, isConnected, syncManager)
  }
  
  // 创建断开连接函数
  const disconnect = createDisconnectFunction(
    connectionManager, 
    syncManager, 
    persistenceManager, 
    documentManager, 
    roomName, 
    siyuanManager, 
    siyuanSocket
  )
  
  // 添加诊断功能
  const getDiagnostics = createDiagnosticsFunction(
    connectionManager, 
    syncManager, 
    persistenceManager, 
    roomName, 
    store
  )

  // 添加清除本地数据的功能
  const clearLocalData = async () => {
    return persistenceManager ? await persistenceManager.clearLocalData() : false
  }

  // 创建结果对象
  const result = createResultObject(
    store,
    ydoc,
    status,
    isConnected,
    isLocalDataLoaded,
    connectionManager,
    disconnect,
    syncManager,
    persistenceManager,
    clearLocalData,
    getDiagnostics,
    siyuanSocket
  )
  
  // 将连接存储在缓存中
  documentManager.connections.set(roomName, result)
  
  return result
}

/**
 * 初始化状态对象
 * @param {Object} store - 存储对象
 * @param {Object} initialState - 初始状态
 */
function initializeState(store, initialState) {
  Object.entries(initialState).forEach(([key, value]) => {
    if (!(key in store.state)) {
      store.state[key] = value
    }
  })
}

/**
 * 设置持久化管理器
 * @param {string} roomName - 房间名
 * @param {Object} ydoc - Y.Doc实例
 * @param {Object} initialState - 初始状态
 * @param {Object} store - 存储对象
 * @param {Object} status - 状态引用
 * @param {Object} isLocalDataLoaded - 本地数据加载状态引用
 * @param {Object} options - 额外选项
 * @param {number} [options.loadTimeout] - 加载超时时间(ms)
 * @returns {Object} 持久化管理器实例
 */
async function setupPersistence(roomName, ydoc, initialState, store, status, isLocalDataLoaded, options = {}) {
  // 创建持久化管理器
  const persistenceManager = await createPersistenceManager({
    roomName,
    ydoc,
    initialState,
    store,
    status,
    isLocalDataLoaded
  })
  
  // 初始化并加载本地数据，使用可选的超时时间
  await persistenceManager.initAndLoad(options.loadTimeout)
  
  return persistenceManager
}

/**
 * 处理无持久化情况
 * @param {Object} initialState - 初始状态
 * @param {Object} store - 存储对象
 * @param {Object} isLocalDataLoaded - 本地数据加载状态引用
 * @returns {Object} 空持久化管理器
 */
function handleNoPersistence(initialState, store, isLocalDataLoaded) {
  // 直接标记为已加载
  isLocalDataLoaded.value = true
  
  // 返回空管理器
  return {
    initialize: async () => true,
    saveData: async () => true,
    loadData: async () => true,
    clearLocalData: async () => true,
    destroy: () => true
  }
}

/**
 * 合并WebRTC选项
 * @param {Object} userOptions - 用户提供的选项
 * @param {Array} bestServers - 最佳服务器列表
 * @returns {Object} 合并后的选项
 */
function mergeWebRtcOptions(userOptions, bestServers) {
  // 合并默认配置与用户配置
  const mergedOptions = {
    ...DEFAULT_WEBRTC_CONFIG,
    ...userOptions
  }
  
  // 如果找到了服务器，则使用它们
  if (bestServers && bestServers.length > 0) {
    mergedOptions.signaling = bestServers
  }
  
  return mergedOptions
}

/**
 * 连接到思源WebSocket
 * @param {string} roomName - 房间名称
 * @param {Object} config - 思源配置
 * @param {Object} store - 数据存储
 * @returns {Promise<WebSocket|null>} WebSocket实例或null
 */
async function connectToSiyuan(roomName, config, store) {
  try {
    console.log(`[思源同步] 房间 ${roomName} 开始连接到思源WebSocket`);
    
    // 更新思源配置
    siyuanManager.updateConfig(config);
    
    // 连接到思源WebSocket
    const socket = await siyuanManager.connect(roomName, config);
    
    if (!socket) {
      console.error(`[思源同步] 房间 ${roomName} 连接到思源WebSocket失败`);
      return null;
    }
    
    // 添加消息处理程序
    siyuanManager.addMessageHandler(roomName, (message) => {
      try {
        if (message.type === 'sync' && message.state) {
          console.log(`[思源同步] 房间 ${roomName} 收到同步数据，正在合并...`);
          
          // 合并远程数据到本地状态
          mergeRemoteState(store.state, message.state);
          
          // 触发自定义同步事件
          if (store._eventHandlers?.sync) {
            for (const handler of store._eventHandlers.sync) {
              try {
                handler(message.state);
              } catch (error) {
                console.error(`[思源同步] 同步事件处理器执行出错:`, error);
              }
            }
          }
        }
      } catch (error) {
        console.error(`[思源同步] 处理消息出错:`, error);
      }
    });
    
    // 每10秒发送一次心跳保持连接
    const heartbeatInterval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        try {
          socket.send(JSON.stringify({
            type: 'heartbeat',
            room: roomName,
            timestamp: Date.now()
          }));
        } catch (e) {
          console.warn(`[思源同步] 发送心跳包失败:`, e);
        }
      }
    }, 10000);
    
    // 保存心跳定时器，以便在断开连接时清理
    const connState = siyuanManager.getConnectionStatus(roomName);
    if (connState) {
      connState.heartbeatInterval = heartbeatInterval;
    }
    
    // 初始化时发送一次完整数据
    setTimeout(() => {
      sendDataToSiyuan(socket, roomName, store);
    }, 500);
    
    console.log(`[思源同步] 房间 ${roomName} 连接到思源WebSocket成功`);
    return socket;
  } catch (error) {
    console.error(`[思源同步] 连接到思源WebSocket出错:`, error);
    return null;
  }
}

/**
 * 向思源WebSocket发送数据
 * @param {WebSocket} socket - WebSocket实例
 * @param {string} roomName - 房间名称
 * @param {Object} store - 数据存储
 */
function sendDataToSiyuan(socket, roomName, store) {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  
  try {
    const data = {
      type: 'sync',
      room: roomName,
      state: store.state,
      timestamp: Date.now()
    };
    
    socket.send(JSON.stringify(data));
    console.log(`[思源同步] 房间 ${roomName} 向思源发送同步数据成功`);
  } catch (error) {
    console.error(`[思源同步] 发送数据到思源WebSocket出错:`, error);
  }
}

/**
 * 合并远程状态到本地状态
 * @param {Object} localState - 本地状态
 * @param {Object} remoteState - 远程状态
 */
function mergeRemoteState(localState, remoteState) {
  if (!localState || !remoteState) return;
  
  // 遍历远程状态的所有键
  for (const key in remoteState) {
    // 跳过心跳字段
    if (key === '_heartbeat_') continue;
    
    if (typeof remoteState[key] === 'object' && remoteState[key] !== null) {
      // 对象类型，递归合并
      if (!localState[key] || typeof localState[key] !== 'object') {
        localState[key] = {};
      }
      mergeRemoteState(localState[key], remoteState[key]);
    } else {
      // 基础类型，直接覆盖
      if (localState[key] !== remoteState[key]) {
        localState[key] = remoteState[key];
      }
    }
  }
}

/**
 * 设置连接事件监听
 * @param {Object} provider - WebRTC提供者实例
 * @param {Object} isConnected - 连接状态引用
 * @param {Object} syncManager - 同步管理器实例
 */
function setupEventListeners(provider, isConnected, syncManager) {
  if (!provider) return;

  provider.on('status', event => {
    if (event.status === 'connected') {
      isConnected.value = true
      
      // 连接成功，触发同步
      syncManager.triggerSync()
    } else if (event.status === 'disconnected') {
      isConnected.value = false
    }
  })
  
  provider.on('sync', isSynced => {
    if (isSynced) {
      syncManager.onSynced()
    }
  })
}

/**
 * 创建断开连接函数
 * @param {Object} connectionManager - 连接管理器实例
 * @param {Object} syncManager - 同步管理器实例
 * @param {Object} persistenceManager - 持久化管理器实例
 * @param {Object} documentManager - 文档管理器实例
 * @param {string} roomName - 房间名称
 * @param {Object} siyuanManager - 思源管理器实例
 * @param {Object} siyuanSocket - 思源WebSocket连接
 * @returns {Function} 断开连接函数
 */
function createDisconnectFunction(
  connectionManager, 
  syncManager, 
  persistenceManager, 
  documentManager, 
  roomName, 
  siyuanManager, 
  siyuanSocket
) {
  return async () => {
    try {
      // 停止同步
      syncManager.stopSync()
      
      // 断开WebRTC连接
      connectionManager.disconnect()
      
      // 断开思源WebSocket连接
      if (siyuanSocket) {
        siyuanManager.disconnect(roomName)
      }
      
      // 清理文档和连接
      await documentManager.cleanupRoom(roomName)
      
      // 清理持久化资源
      if (persistenceManager) {
        await persistenceManager.destroy()
      }
      
      return true
    } catch (error) {
      console.error(`[同步状态] 断开连接时出错:`, error)
      return false
    }
  }
}

/**
 * 创建诊断功能
 * @param {Object} connectionManager - 连接管理器实例
 * @param {Object} syncManager - 同步管理器实例
 * @param {Object} persistenceManager - 持久化管理器实例
 * @param {string} roomName - 房间名称
 * @param {Object} store - 存储对象
 * @returns {Function} 诊断函数
 */
function createDiagnosticsFunction(
  connectionManager, 
  syncManager, 
  persistenceManager, 
  roomName, 
  store
) {
  return async () => {
    const provider = connectionManager.getProvider()
    const peersCount = provider ? provider.awareness.getStates().size : 0
    
    const diagResult = await diagnoseConnection(
      provider,
      syncManager ? syncManager.getStatus() : null,
      persistenceManager ? { enabled: true, lastSave: persistenceManager.lastSave } : { enabled: false }
    )
    
    const storeSize = JSON.stringify(store.state).length
    
    return {
      roomName,
      connection: {
        type: provider ? 'webrtc' : 'siyuan',
        connected: provider ? provider.connected : !!siyuanManager.getConnectionStatus(roomName),
        peers: peersCount,
        ...diagResult
      },
      sync: syncManager ? syncManager.getStatus() : null,
      storage: {
        enabled: !!persistenceManager,
        size: storeSize,
        lastSave: persistenceManager ? persistenceManager.lastSave : null
      },
      quality: getConnectionQualityRating(diagResult),
      message: generateDiagnosticMessage(diagResult, !!persistenceManager, peersCount)
    }
  }
}

/**
 * 创建结果对象
 * @param {Object} store - 存储对象
 * @param {Object} ydoc - Y.Doc实例
 * @param {Object} status - 状态引用
 * @param {Object} isConnected - 连接状态引用
 * @param {Object} isLocalDataLoaded - 本地数据加载状态引用
 * @param {Object} connectionManager - 连接管理器实例
 * @param {Function} disconnect - 断开连接函数
 * @param {Object} syncManager - 同步管理器实例
 * @param {Object} persistenceManager - 持久化管理器实例
 * @param {Function} clearLocalData - 清除本地数据函数
 * @param {Function} getDiagnostics - 诊断函数
 * @param {Object} siyuanSocket - 思源WebSocket连接
 * @returns {Object} 结果对象
 */
function createResultObject(
  store,
  ydoc,
  status,
  isConnected,
  isLocalDataLoaded,
  connectionManager,
  disconnect,
  syncManager,
  persistenceManager,
  clearLocalData,
  getDiagnostics,
  siyuanSocket
) {
  // 使用独立的 Map 存储事件处理器，避免在 store 对象上添加属性
  const eventHandlers = new Map();
  
  return {
    // 存储和文档
    store,
    ydoc,
    
    // 状态
    status,
    isConnected,
    isLocalDataLoaded,
    
    // 连接方法
    connect: connectionManager.connect,
    disconnect,
    reconnect: connectionManager.reconnect,
    
    // 同步方法
    sync: () => syncManager.triggerSync(),
    
    // 持久化方法
    clearLocalData,
    
    // 诊断
    getDiagnostics,
    
    // 获取提供者和连接节点
    getProvider: connectionManager.getProvider,
    getPeers: () => {
      const provider = connectionManager.getProvider();
      
      // 思源WebSocket连接
      if (siyuanSocket) {
        return new Set(['siyuan-ws']);
      }
      
      // WebRTC连接
      if (provider && provider.connected) {
        // 如果provider提供了getPeers方法
        if (provider.getPeers) {
          return provider.getPeers();
        }
        
        // 旧版本兼容 - Y-WebRTC提供者
        if (provider.signalingConns) {
          return new Set(Object.keys(provider.signalingConns));
        }
      }
      
      return new Set();
    },
    
    // 事件处理 - 使用独立的 Map
    on(eventName, callback) {
      if (!eventHandlers.has(eventName)) {
        eventHandlers.set(eventName, []);
      }
      
      eventHandlers.get(eventName).push(callback);
      return this;
    },
    
    off(eventName, callback) {
      if (!eventHandlers.has(eventName)) return this;
      
      if (callback) {
        const handlers = eventHandlers.get(eventName);
        eventHandlers.set(eventName, handlers.filter(cb => cb !== callback));
      } else {
        eventHandlers.set(eventName, []);
      }
      
      return this;
    },
    
    emit(eventName, ...args) {
      if (!eventHandlers.has(eventName)) return this;
      
      const handlers = eventHandlers.get(eventName);
      for (const callback of handlers) {
        try {
          callback(...args);
        } catch (error) {
          console.error(`[SyncStore] 事件处理错误: ${eventName}`, error);
        }
      }
      
      return this;
    }
  };
}

/**
 * 设置指定房间的同步配置
 * @param {string} roomName - 房间名称
 * @param {Object} config - 同步配置
 * @returns {boolean} 是否成功
 */
export function setSyncConfig(roomName, config) {
  const conn = documentManager.connections.get(roomName)
  if (conn) {
    const syncManager = conn._debug.getSyncManager()
    if (syncManager) {
      return syncManager.setConfig(config)
    }
  }
  return false
}

/**
 * 获取指定房间的同步状态
 * @param {string} roomName - 房间名称
 * @returns {Object|null} 同步状态
 */
export function getSyncStatus(roomName) {
  const conn = documentManager.connections.get(roomName)
  if (conn) {
    const syncManager = conn._debug.getSyncManager()
    if (syncManager) {
      return syncManager.getStatus()
    }
  }
  return null
}

/**
 * 更新思源配置
 * @param {Object} config - 思源配置
 * @returns {Object} 更新后的配置
 */
export function updateSiyuanConfig(config = {}) {
  return siyuanManager.updateConfig(config)
}

// 为向后兼容保留原函数名
export const useSyncStore = createSyncStore


// 为向后兼容保留原函数名
export const setRoomAutoSync = setSyncConfig

// 为向后兼容保留原函数名
export const getRoomAutoSyncStatus = getSyncStatus

// 重新导出resetRoomConnection函数，防止修改前后的接口变化
export { resetRoomConnection }

