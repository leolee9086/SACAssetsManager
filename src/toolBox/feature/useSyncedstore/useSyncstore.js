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
    }
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
    ? await setupPersistence(roomName, ydoc, initialState, store, status, isLocalDataLoaded)
    : handleNoPersistence(initialState, store, isLocalDataLoaded);

  // 选择最佳服务器
  status.value = '正在选择最佳服务器...'
  const bestServers = await selectBestServers()
  
  // 合并WebRTC选项
  const mergedWebRtcOptions = mergeWebRtcOptions(webrtcOptions, bestServers)

  // 连接思源
  const siyuanSocket = siyuan.enabled 
    ? await connectToSiyuan(roomName, siyuan, store)
    : null;

  // 获取或创建连接
  let provider = await documentManager.getConnection(
    roomName, 
    ydoc, 
    mergedWebRtcOptions
  )

  // 创建连接管理器
  const connectionManager = createConnectionManager({
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

  // 创建同步管理器
  const syncManager = createSyncManager({
    ydoc,
    store,
    roomName,
    autoSync,
    getProvider: connectionManager.getProvider,
    siyuanSocket
  })

  // 获取连接管理器中的provider
  provider = connectionManager.getProvider()
  
  // 设置连接和同步事件监听
  setupEventListeners(provider, isConnected, syncManager)
  
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
 * @returns {Object} 持久化管理器实例
 */
async function setupPersistence(roomName, ydoc, initialState, store, status, isLocalDataLoaded) {
  // 创建持久化管理器
  const persistenceManager = await createPersistenceManager({
    roomName,
    ydoc,
    initialState,
    store,
    status,
    isLocalDataLoaded
  })
  
  // 初始化并加载本地数据
  await persistenceManager.initAndLoad()
  return persistenceManager
}

/**
 * 处理不使用持久化的情况
 * @param {Object} initialState - 初始状态
 * @param {Object} store - 存储对象
 * @param {Object} isLocalDataLoaded - 本地数据加载状态引用
 * @returns {null} 无持久化管理器
 */
function handleNoPersistence(initialState, store, isLocalDataLoaded) {
  // 如果不使用持久化，直接填充初始状态
  Object.entries(initialState).forEach(([key, value]) => {
    if (!(key in store.state)) {
      store.state[key] = value
    }
  })
  isLocalDataLoaded.value = true // 无本地存储，视为已加载
  return null
}

/**
 * 合并WebRTC选项
 * @param {Object} userOptions - 用户提供的选项
 * @param {Object} bestServers - 最佳服务器信息
 * @returns {Object} 合并后的选项
 */
function mergeWebRtcOptions(userOptions, bestServers) {
  return {
    ...DEFAULT_WEBRTC_CONFIG,
    signaling: userOptions.signaling || bestServers.signalingServers,
    iceServers: userOptions.iceServers || bestServers.iceServers,
    peerOpts: userOptions.peerOpts || DEFAULT_WEBRTC_CONFIG.peerOpts,
    pingInterval: userOptions.pingInterval || DEFAULT_WEBRTC_CONFIG.pingInterval,
    maxConns: userOptions.maxConns || DEFAULT_WEBRTC_CONFIG.maxConns,
    filterBcConns: userOptions.filterBcConns !== undefined ? userOptions.filterBcConns : DEFAULT_WEBRTC_CONFIG.filterBcConns,
    maxRetries: userOptions.maxRetries || DEFAULT_WEBRTC_CONFIG.maxRetries
  }
}

/**
 * 连接到思源笔记
 * @param {string} roomName - 房间名
 * @param {Object} config - 思源配置
 * @param {Object} store - 存储对象
 * @returns {Object|null} 思源Socket或null
 */
async function connectToSiyuan(roomName, config, store) {
  try {
    const socket = await siyuanManager.connect(roomName, config)
    
    if (socket) {
      // 添加思源 WebSocket 消息处理
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          // 处理来自思源的同步消息
          if (data.type === 'sync' && data.room === roomName) {
            // 将数据更新到 YJS 文档
            Object.entries(data.state).forEach(([key, value]) => {
              store.state[key] = value
            })
          }
        } catch (error) {
          console.warn('[思源同步] 处理消息失败:', error)
        }
      }
      return socket
    }
  } catch (error) {
    console.warn('[思源同步] 连接失败，将仅使用 WebRTC:', error)
  }
  return null
}

/**
 * 设置事件监听器
 * @param {Object} provider - WebRTC提供者
 * @param {Object} isConnected - 连接状态引用
 * @param {Object} syncManager - 同步管理器
 */
function setupEventListeners(provider, isConnected, syncManager) {
  // 当连接状态改变时，启动或停止同步
  provider.on('status', event => {
    if (event.status === 'connected') {
      syncManager.setupAutoSync()
    }
  })
  
  // 监视连接状态变化以启动自动同步
  watch(isConnected, (newValue) => {
    if (newValue === true) {
      syncManager.setupAutoSync()
    } else {
      syncManager.stopSync()
    }
  })
}

/**
 * 创建断开连接函数
 * @param {Object} connectionManager - 连接管理器
 * @param {Object} syncManager - 同步管理器
 * @param {Object} persistenceManager - 持久化管理器
 * @param {Object} documentManager - 文档管理器
 * @param {string} roomName - 房间名
 * @param {Object} siyuanManager - 思源管理器
 * @param {Object} siyuanSocket - 思源Socket
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
  return () => {
    // 使用连接管理器断开WebRTC连接
    connectionManager.disconnect()
    
    // 停止同步
    syncManager.stopSync()
    
    // 销毁持久化实例
    if (persistenceManager) {
      persistenceManager.destroy()
    }

    // 清理文档
    documentManager.cleanupRoom(roomName)

    // 断开思源 WebSocket 连接
    if (siyuanSocket) {
      siyuanManager.disconnect(roomName)
    }
  }
}

/**
 * 创建诊断函数
 * @param {Object} connectionManager - 连接管理器
 * @param {Object} syncManager - 同步管理器
 * @param {Object} persistenceManager - 持久化管理器
 * @param {string} roomName - 房间名
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
    const connectionInfo = await diagnoseConnection(connectionManager.getProvider())
    const { reconnectAttempts } = connectionManager.getReconnectInfo()
    const syncState = syncManager.getInternalState()
    
    return {
      ...connectionInfo,
      roomName,
      reconnectAttempts,
      persistenceEnabled: !!persistenceManager,
      persistenceSynced: persistenceManager ? persistenceManager.isSynced() : false,
      localData: Object.keys(store.state).length > 0,
      connectionQuality: getConnectionQualityRating(connectionInfo),
      diagnosticMessage: generateDiagnosticMessage(connectionInfo),
      syncState
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
 * @param {Object} connectionManager - 连接管理器
 * @param {Function} disconnect - 断开连接函数
 * @param {Object} syncManager - 同步管理器
 * @param {Object} persistenceManager - 持久化管理器
 * @param {Function} clearLocalData - 清除本地数据函数
 * @param {Function} getDiagnostics - 诊断函数
 * @param {Object} siyuanSocket - 思源Socket
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
  const provider = connectionManager.getProvider()
  const { reconnectTimer } = connectionManager.getReconnectInfo()
  
  // 创建结构化结果
  const result = {
    // 数据
    store: store.state,
    ydoc,
    
    // 状态
    status,
    isConnected,
    isLocalDataLoaded,
    
    // 连接管理
    connection: {
      connect: connectionManager.connect,
      disconnect,
      reconnect: connectionManager.reconnect,
      provider
    },
    
    // 同步管理
    sync: {
      triggerSync: syncManager.triggerSync,
      setConfig: syncManager.setConfig,
      getStatus: syncManager.getStatus,
      stopSync: syncManager.stopSync
    },
    
    // 持久化
    persistence: persistenceManager ? {
      clearLocalData,
      isSynced: persistenceManager.isSynced,
      sync: persistenceManager.sync
    } : null,
    
    // 诊断
    diagnostics: {
      getDiagnostics,
      reconnectInfo: connectionManager.getReconnectInfo()
    },
    
    // 思源相关
    siyuan: {
      socket: siyuanSocket,
      enabled: !!siyuanSocket
    }
  }
  
  // 兼容旧版API - 使其保持平坦的结构
  result.provider = provider
  result.disconnect = disconnect
  result.reconnect = connectionManager.reconnect
  result.connect = connectionManager.connect
  result.getDiagnostics = getDiagnostics
  result.clearLocalData = clearLocalData
  result.reconnectTimer = reconnectTimer
  result.triggerSync = syncManager.triggerSync
  result.setAutoSync = syncManager.setConfig
  result.getAutoSyncStatus = syncManager.getStatus
  result.siyuanSocket = siyuanSocket
  result.siyuanEnabled = !!siyuanSocket
  
  return result
}

// 为向后兼容保留原函数名
export const useSyncStore = createSyncStore

/**
 * 设置房间的自动同步配置
 * @param {string} roomName - 房间名称
 * @param {Object|boolean} config - 自动同步配置或开关状态
 * @param {boolean} [config.enabled] - 是否启用自动同步
 * @param {number} [config.interval] - 同步间隔(ms)
 * @param {string} [config.heartbeatField] - 心跳字段名称
 * @returns {Object|null} 更新后的配置或失败时返回null
 */
export function setSyncConfig(roomName, config) {
  const connection = documentManager.connections.get(roomName)
  if (!connection || typeof connection.setAutoSync !== 'function') {
    console.warn(`无法设置同步配置：找不到房间 ${roomName} 的连接`)
    return null
  }
  
  return connection.setAutoSync(config)
}

// 为向后兼容保留原函数名
export const setRoomAutoSync = setSyncConfig

/**
 * 获取房间的自动同步状态
 * @param {string} roomName - 房间名称
 * @returns {Object|null} 自动同步状态信息或失败时返回null
 * @property {boolean} enabled - 是否启用自动同步
 * @property {number} interval - 当前同步间隔
 * @property {number} changeFrequency - 文档变更频率
 * @property {Object} lastNetworkCheck - 最近一次网络检查信息
 * @property {number} lastSyncTime - 上次同步时间戳
 */
export function getSyncStatus(roomName) {
  const connection = documentManager.connections.get(roomName)
  if (!connection || typeof connection.getAutoSyncStatus !== 'function') {
    return null
  }
  
  return connection.getAutoSyncStatus()
}

// 为向后兼容保留原函数名
export const getRoomAutoSyncStatus = getSyncStatus

// 更新思源配置函数，使用siyuanManager模块
export function updateSiyuanConfig(config = {}) {
  return siyuanManager.updateConfig(config)
}

// 为向后兼容导出思源管理器部分接口
export const getSiyuanStatus = siyuanManager.getConnectionStatus

// 重新导出resetRoomConnection函数，防止修改前后的接口变化
export { resetRoomConnection }

