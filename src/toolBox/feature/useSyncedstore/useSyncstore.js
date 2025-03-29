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
import { syncedStore, getYjsValue } from '../../../../static/@syncedstore/core.js'
import { WebrtcProvider } from '../../../../static/y-webrtc.js'
import { IndexeddbPersistence } from '../../../../static/y-indexeddb.js'
import * as Y from '../../../../static/yjs.js'
import { 
  GLOBAL_SIGNALING_SERVERS, 
  checkAllServers, 
  getOptimalServer,
  selectBestServers
} from './useYjsSignalServers.js'
// 用于跟踪房间连接和Y.Doc的全局缓存
import { resetRoomConnectionWithContext } from './forRoomConnection.js'
import {
  calculateOptimalSyncIntervalWithOptions,
  createDefaultAutoSyncConfig,
  updateAutoSyncConfig,
  getAutoSyncStatus
} from './forAutoSync.js'
import {
  diagnoseConnection,
  getConnectionQualityRating,
  generateDiagnosticMessage
} from './networkDiagnostics.js'
import {
  createDocumentChangeRecorderWithContext,
  setupDocumentChangeMonitoringWithContext
} from './forDocumentChanges.js'
// 导入思源WebSocket管理器
import siyuanManager from './siyuanManager.js'
// 导入文档管理器
import documentManager, { resetRoomConnection } from './documentManager.js'
// 导入连接管理器
import { createConnectionManager } from './connectionManager.js'

// 移除思源配置，使用从模块导入的配置
// 添加思源 WebSocket 相关配置
const siyuanConfig = siyuanManager.config

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
    roomName = 'default-room',
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
    // 添加思源相关配置
    siyuan = {
      enabled: false,
      ...siyuanConfig,
      ...options.siyuan
    }
  } = options

  // 获取或创建文档
  const docState = await documentManager.getDocument(roomName, { forceNewDoc })
  const { doc: ydoc, store, isExisting } = docState

  // 初始化状态
  if (!isExisting && Object.keys(initialState).length > 0) {
    Object.entries(initialState).forEach(([key, value]) => {
      if (!(key in store.state)) {
        store.state[key] = value
      }
    })
  }

  // 创建响应式状态
  const isConnected = ref(false)
  const status = ref('初始化中')
  const isLocalDataLoaded = ref(false)  // 添加本地数据加载状态

  // 配置本地持久化 - 移到前面优先加载本地数据
  let persistence = null
  if (persist) {
    try {
      console.log(`[本地优先] 开始从本地加载房间 ${roomName} 数据...`)
      persistence = new IndexeddbPersistence(roomName, ydoc)
      
      // 创建一个Promise来等待本地数据加载
      await new Promise((resolve) => {
        // 检查是否已经加载完毕(防止永久等待)
        const checkLoaded = () => {
          // IndexedDB已加载完成的标志，可以通过属性检测
          if (persistence.synced) {
            console.log(`[本地优先] 房间 ${roomName} 本地数据已加载`)
            return true
          }
          return false
        }
        
        // 如果已加载，直接解析
        if (checkLoaded()) {
          resolve()
          return
        }
        
        // 设置超时，避免永久等待
        const timeout = setTimeout(() => {
          console.warn(`[本地优先] 等待本地数据超时，继续初始化`)
          resolve()
        }, 2000)
        
        // 监听同步事件
        persistence.once('synced', () => {
          clearTimeout(timeout)
          console.log(`[本地优先] 房间 ${roomName} 本地数据同步完成`)
          
          // 在同步完成后，初始化数据（如果本地没有数据）
          const isEmpty = Object.keys(store.state).length === 0
          if (isEmpty) {
            // 将初始状态填充到同步存储中
            Object.entries(initialState).forEach(([key, value]) => {
              store.state[key] = value
            })
          }
          
          status.value = '已从本地加载'
          isLocalDataLoaded.value = true
          resolve()
        })
      })
      
      // 确保状态正确反映
      isLocalDataLoaded.value = true
      
    } catch (e) {
      console.error(`创建持久化存储时出错:`, e)
      // 如果本地加载失败，仍然需要标记为已加载，使用初始状态
      isLocalDataLoaded.value = true
      
      // 使用初始状态
      Object.entries(initialState).forEach(([key, value]) => {
        if (!(key in store.state)) {
          store.state[key] = value
        }
      })
    }
  } else {
    // 如果不使用持久化，直接填充初始状态
    Object.entries(initialState).forEach(([key, value]) => {
      if (!(key in store.state)) {
        store.state[key] = value
      }
    })
    isLocalDataLoaded.value = true // 无本地存储，视为已加载
  }

  // 选择最佳服务器 - 在本地数据加载后进行
  status.value = '正在选择最佳服务器...'
  const bestServers = await selectBestServers()
  
  // 合并WebRTC选项
  const mergedWebRtcOptions = {
    signaling: webrtcOptions.signaling || bestServers.signalingServers,
    iceServers: webrtcOptions.iceServers || bestServers.iceServers,
    peerOpts: webrtcOptions.peerOpts || {
      config: {
        iceTransportPolicy: 'all',
        iceCandidatePoolSize: 10,
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require',
        sdpSemantics: 'unified-plan'
      },
      trickle: true
    },
    pingInterval: webrtcOptions.pingInterval || 3000,
    maxConns: webrtcOptions.maxConns || 20,
    connect: false,
    filterBcConns: webrtcOptions.filterBcConns !== undefined ? webrtcOptions.filterBcConns : true,
    maxRetries: webrtcOptions.maxRetries || 10
  }

  // 在创建 WebRTC 提供者之前尝试连接思源 WebSocket
  let siyuanSocket = null
  if (siyuan.enabled) {
    try {
      siyuanSocket = await siyuanManager.connect(roomName, siyuan)
      
      if (siyuanSocket) {
        // 添加思源 WebSocket 消息处理
        siyuanSocket.onmessage = (event) => {
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
      }
    } catch (error) {
      console.warn('[思源同步] 连接失败，将仅使用 WebRTC:', error)
    }
  }

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
    setTimeout(() => connectionManager.connect(), 100)
  }

  // 添加自动同步相关变量
  let autoSyncTimer = null
  let lastSyncTime = Date.now()
  let changeFrequency = 0    // 文档变更频率
  let lastNetworkCheck = {   // 上次网络检查结果
    time: Date.now(),
    latency: 200,  // 默认假设200ms延迟
    type: 'unknown'
  }
  let adaptiveInterval = autoSync.interval  // 当前自适应间隔
  const MAX_CHANGE_HISTORY = 10
  
  
  // 创建文档变更记录器
  const changeRecorder = createDocumentChangeRecorderWithContext({
    maxHistory: MAX_CHANGE_HISTORY
  })
  
  // 替换原有的变更记录逻辑
  const recordDocumentChange = () => {
    changeFrequency = changeRecorder.recordChange()
    return changeFrequency
  }

  // 实现自动同步功能
  const setupAutoSync = async () => {
    if (autoSyncTimer) {
      clearInterval(autoSyncTimer)
      autoSyncTimer = null
    }
    
    if (!autoSync.enabled) return
    
    const IntervalOptions = {
      autoSync,
      lastNetworkCheck,
      lastSyncTime,
      changeFrequency,
      adaptiveInterval
    }
    adaptiveInterval = calculateOptimalSyncIntervalWithOptions(IntervalOptions)
    
    // 设置定时同步，使用自适应间隔
    autoSyncTimer = setInterval(async () => {
      // 执行心跳同步
      const provider = connectionManager.getProvider()
      if (provider && provider.connected) {
        // 更新心跳字段触发同步
        store.state[autoSync.heartbeatField] = Date.now()
        lastSyncTime = Date.now()
        
        // 重新计算并应用新的间隔（异步）
        const newInterval = calculateOptimalSyncIntervalWithOptions({
          autoSync,
          lastNetworkCheck,
          lastSyncTime,
          changeFrequency,
          adaptiveInterval
        })
        
        // 如果间隔变化超过20%，重新设置定时器
        if (Math.abs(newInterval - adaptiveInterval) / adaptiveInterval > 0.2) {
          adaptiveInterval = newInterval
          console.log(`[自适应同步] 房间 ${roomName} 调整同步间隔为: ${adaptiveInterval}ms`)
          
          // 重新设置定时器
          clearInterval(autoSyncTimer)
          
          autoSyncTimer = setInterval(async () => {
            const provider = connectionManager.getProvider()
            if (provider && provider.connected) {
              store.state[autoSync.heartbeatField] = Date.now()
              lastSyncTime = Date.now()
              console.log(`[自动同步] 房间 ${roomName} 执行定时同步`)
            }
          }, adaptiveInterval)
        }
        
        console.log(`[自动同步] 房间 ${roomName} 执行定时同步`)
      }
    }, adaptiveInterval)
    
    console.log(`[自适应同步] 房间 ${roomName} 初始同步间隔: ${adaptiveInterval}ms`)
    
    // 监听文档变更，使用新的监控设置
    const cleanup = setupDocumentChangeMonitoringWithContext(ydoc, changeRecorder)
    
    // 返回清理函数
    return () => {
      if (cleanup) cleanup()
    }
  }
  
  // 获取连接管理器中的provider
  provider = connectionManager.getProvider()
  
  // 设置自动同步（连接后启动）
  provider.on('status', event => {
    if (event.status === 'connected') {
      setupAutoSync()
    }
  })
  
  // 监视连接状态变化以启动自动同步
  watch(isConnected, (newValue) => {
    if (newValue === true) {
      setupAutoSync()
    } else if (autoSyncTimer) {
      clearInterval(autoSyncTimer)
      autoSyncTimer = null
    }
  })
  
  // 扩展断开连接函数，处理持久化和思源连接
  const disconnect = () => {
    // 使用连接管理器断开WebRTC连接
    connectionManager.disconnect()
    
    if (persistence) {
      try {
        persistence.destroy()
        console.log(`房间 ${roomName} 持久化存储已销毁`)
      } catch (e) {
        console.error(`销毁房间 ${roomName} 持久化存储时出错:`, e)
      }
      persistence = null
    }
    
    // 清理自动同步计时器
    if (autoSyncTimer) {
      clearInterval(autoSyncTimer)
      autoSyncTimer = null
    }

    documentManager.cleanupRoom(roomName)

    // 断开思源 WebSocket 连接
    if (siyuanSocket) {
      siyuanManager.disconnect(roomName)
      siyuanSocket = null
    }
  }
  
  // 添加诊断功能
  const getDiagnostics = async () => {
    const connectionInfo = await diagnoseConnection(connectionManager.getProvider())
    const { reconnectAttempts } = connectionManager.getReconnectInfo()
    
    return {
      ...connectionInfo,
      roomName,
      reconnectAttempts,
      persistenceEnabled: !!persistence,
      localData: Object.keys(store.state).length > 0,
      connectionQuality: getConnectionQualityRating(connectionInfo),
      diagnosticMessage: generateDiagnosticMessage(connectionInfo)
    }
  }
    
  // 修改 triggerSync 函数以支持思源同步
  const triggerSync = () => {
    let synced = false
    const provider = connectionManager.getProvider()
    
    if (provider?.connected) {
      const syncTimestamp = Date.now()
      store.state[autoSync.heartbeatField] = syncTimestamp
      lastSyncTime = syncTimestamp
      recordDocumentChange()
      synced = true
    }

    // 通过思源 WebSocket 同步
    if (siyuanSocket) {
      try {
        siyuanSocket.send(JSON.stringify({
          type: 'sync',
          room: roomName,
          state: store.state
        }))
        synced = true
      } catch (error) {
        console.warn('[思源同步] 发送同步消息失败:', error)
      }
    }

    return synced
  }

  // 改进返回结果的结构
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
      triggerSync,
      setConfig: (config) => {
        Object.assign(autoSync, updateAutoSyncConfig(autoSync, config))
        setupAutoSync()
        return autoSync
      },
      getStatus: () => getAutoSyncStatus({
        autoSync,
        autoSyncTimer,
        adaptiveInterval,
        changeFrequency,
        lastNetworkCheck,
        lastSyncTime
      })
    },
    
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
  const { reconnectTimer } = connectionManager.getReconnectInfo()
  result.reconnectTimer = reconnectTimer
  result.triggerSync = triggerSync
  result.setAutoSync = result.sync.setConfig
  result.getAutoSyncStatus = result.sync.getStatus
  result.siyuanSocket = siyuanSocket
  result.siyuanEnabled = !!siyuanSocket
  
  // 将连接存储在缓存中
  documentManager.connections.set(roomName, result)
  
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

