import { ref, watch } from '../../../../static/vue.esm-browser.js'
import { syncedStore, getYjsValue } from '../../../../static/@syncedstore/core.js'
import { WebrtcProvider } from '../../../../static/y-webrtc.mjs'
import { IndexeddbPersistence } from '../../../../static/y-indexeddb.mjs'
import * as Y from '../../../../static/yjs.js'
import { 
  GLOBAL_SIGNALING_SERVERS, 
  checkAllServers, 
  getOptimalServer ,
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
const roomConnections = new Map()
const roomDocs = new Map()

export const resetRoomConnection=(roomName)=>{
  resetRoomConnectionWithContext({roomConnections,roomDocs,roomName})
}
/**
 * 这个函数有两个参数,所有有两个参数的函数都应该是这样分配的:
 * 1. 第一个参数是目标,它会被函数改动
 * 2. 第二个参数是配置,它不会被改动,并且会被函数使用
 * @param {*} changeHistory 
 * @param {*} options 
 * @returns 
 */
const recordDocumentChangeWithContext = (changeHistory,options = {}) => {
  let changeFrequency=0
  const {  MAX_CHANGE_HISTORY } = options
  const now = Date.now()
  changeHistory.push(now)
  // 保持历史记录在限定范围内
  if (changeHistory.length > MAX_CHANGE_HISTORY) {
    changeHistory.shift()
  }
  
  // 计算变更频率 (次数/分钟)
  if (changeHistory.length >= 2) {
    const oldestChange = changeHistory[0]
    const timeSpan = now - oldestChange
    // 防止除零错误
    if (timeSpan > 0) {
      // 转换为每分钟变更次数
      changeFrequency = (changeHistory.length - 1) / (timeSpan / 60000)
    }
  }
  return changeFrequency
}
/**
 * 创建清理函数，用于清理现有连接资源
 * @param {string} roomName 房间名称
 * @param {Object} options 配置选项
 * @returns {void}
 */
function createCleanupFunction(roomName, options = {}) {
  // 获取现有连接
  const existingConnection = roomConnections.get(roomName)
  if (existingConnection) {
    try {
      existingConnection.disconnect()
      
      // 清理重连计时器
      if (existingConnection.reconnectTimer) {
        clearTimeout(existingConnection.reconnectTimer)
      }
    } catch (e) {
      console.error('断开连接时出错:', e)
    }
    roomConnections.delete(roomName)
  }
  
  // 最关键修复：确保在切换房间时清除旧文档
  // 这里对复用逻辑进行修改，因为房间ID变更时需要清除文档
  const forceNewDoc = options.forceNewDoc === true
  
  // 仅当指定强制创建新文档或文档不存在时才创建新文档
  if (forceNewDoc && roomDocs.has(roomName)) {
    roomDocs.delete(roomName)
    console.log(`为房间 ${roomName} 强制创建新文档`)
  }
}

/**
 * 准备Y.Doc文档，从缓存获取或创建新文档
 * @param {string} roomName 房间名称
 * @returns {Object} Y.Doc文档
 */
function prepareYDoc(roomName) {
  let ydoc
  if (roomDocs.has(roomName)) {
    ydoc = roomDocs.get(roomName)
    console.log(`复用房间 ${roomName} 的现有Yjs文档`)
  } else {
    ydoc = new Y.Doc()
    roomDocs.set(roomName, ydoc)
    console.log(`为房间 ${roomName} 创建新的Yjs文档`)
  }
  return ydoc
}


/**
 * 创建与Vue集成的同步状态
 * @param {Object} options 配置选项
 * @returns {Object} 同步状态和方法
 */
export async function useSyncStore(options = {}) {
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
    // 修改自动同步配置选项，增加智能调整参数
    autoSync = {
      ...createDefaultAutoSyncConfig(),
      ...options.autoSync
    }
  } = options
  
  // 清理并创建资源
  createCleanupFunction(roomName, options)
  
  // 响应式状态
  const isConnected = ref(false)
  const status = ref('初始化中')
  
  // 获取或创建Y.Doc
  const ydoc = prepareYDoc(roomName)
  
  // 创建同步存储
  const store = syncedStore({
    state: {}  // 必须是空对象
  }, ydoc)
  
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
  
  // 存储文档变更历史，用于计算变更频率
  const changeHistory = []
  const MAX_CHANGE_HISTORY = 10
  
  
 
  const DocmentChangeRecordOptions={
    MAX_CHANGE_HISTORY
  }

  // 记录文档变更,使用recordDocumentChangeWithContext进行处理
  const recordDocumentChange = () => {
    changeFrequency = recordDocumentChangeWithContext(changeHistory,DocmentChangeRecordOptions)
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
    
    // 创建初始状态快照
   
    
    // 设置定时同步，使用自适应间隔
    autoSyncTimer = setInterval(async () => {
      // 执行心跳同步
      if (provider && provider.connected) {
        // 更新心跳字段触发同步
        store.state[autoSync.heartbeatField] = Date.now()
        lastSyncTime = Date.now()
        
        // 重新计算并应用新的间隔（异步）
        calculateOptimalSyncInterval().then(newInterval => {
          // 如果间隔变化超过20%，重新设置定时器
          if (Math.abs(newInterval - adaptiveInterval) / adaptiveInterval > 0.2) {
            adaptiveInterval = newInterval
            console.log(`[自适应同步] 房间 ${roomName} 调整同步间隔为: ${adaptiveInterval}ms`)
            
            // 重新设置定时器
            clearInterval(autoSyncTimer)
            
            autoSyncTimer = setInterval(async () => {
              if (provider && provider.connected) {
                store.state[autoSync.heartbeatField] = Date.now()
                lastSyncTime = Date.now()
                console.log(`[自动同步] 房间 ${roomName} 执行定时同步`)
              }
            }, adaptiveInterval)
          }
        })
        
        console.log(`[自动同步] 房间 ${roomName} 执行定时同步`)
      }
    }, adaptiveInterval)
    
    console.log(`[自适应同步] 房间 ${roomName} 初始同步间隔: ${adaptiveInterval}ms`)
    
    // 监听文档变更，用于计算变更频率
    const unobserveDoc = observeDocChanges(ydoc, recordDocumentChange)
    
    // 返回清理函数
    return () => {
      if (unobserveDoc) unobserveDoc()
    }
  }
  
  // 监听Y.Doc变更
  const observeDocChanges = (doc, callback) => {
    if (!doc) return null
    
    // 设置更新观察者
    doc.on('update', (update, origin) => {
      callback(update, origin)
    })
    
    // 返回清理函数
    return () => {
      doc.off('update', callback)
    }
  }
  
  // 选择最佳服务器
  status.value = '正在选择最佳服务器...'
  const bestServers = await selectBestServers()
  
  // 合并WebRTC选项
  const mergedWebRtcOptions = {
    signaling: webrtcOptions.signaling || bestServers.signalingServers,
    iceServers: webrtcOptions.iceServers || bestServers.iceServers,
    // 添加其他WebRTC选项
    peerOpts: webrtcOptions.peerOpts || {
      config: {
        iceTransportPolicy: 'all',
        iceCandidatePoolSize: 10,
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require',
        sdpSemantics: 'unified-plan'
      },
      // 启用TrickleICE以加快连接速度
      trickle: true
    },
    pingInterval: webrtcOptions.pingInterval || 3000,
    maxConns: webrtcOptions.maxConns || 20,
    connect: false, // 重要：初始化时不要自动连接
    filterBcConns: webrtcOptions.filterBcConns !== undefined ? webrtcOptions.filterBcConns : true,
    maxRetries: webrtcOptions.maxRetries || 10
  }
  
  // 创建并优化WebRTC提供者
  let provider = null
  let reconnectAttempts = 0
  let reconnectTimer = null
  
  const createProvider = async () => {
    try {
      // 重新选择最佳服务器
      // 改进：在多次重连失败后使用优化的服务器检测功能
      const servers = reconnectAttempts > 2 
        ? await (async () => {
            try {
              // 尝试使用优化的服务器检测功能
              const bestServer = await getOptimalServer(true)
              if (bestServer) {
                return { 
                  signalingServers: [bestServer, ...GLOBAL_SIGNALING_SERVERS.filter(s => s !== bestServer)],
                  iceServers: mergedWebRtcOptions.iceServers 
                }
              }
            } catch (e) {
              console.warn('重连时优化的服务器检测失败:', e)
            }
            // 如果优化方法失败，回退到原有方法
            return await selectBestServers()
          })() 
        : { signalingServers: mergedWebRtcOptions.signaling, iceServers: mergedWebRtcOptions.iceServers }
        
      // 更新选项
      const updatedOptions = {
        ...mergedWebRtcOptions,
        signaling: servers.signalingServers,
        iceServers: servers.iceServers,
        connect: false // 重要：初始化时不要自动连接
      }
      
      provider = new WebrtcProvider(roomName, ydoc, updatedOptions)
      
      // 添加事件监听器
      provider.on('status', event => {
        // 修复：确保状态更新始终正确
        console.log(`房间 ${roomName} 状态事件:`, event.status)
        
        // 修复：使用provider.connected作为主要指标
        const reallyConnected = provider.connected || event.status === 'connected'
        isConnected.value = reallyConnected
        status.value = reallyConnected ? '已连接' : '连接断开'
        
        // 重置重连计数器
        if (reallyConnected) {
          reconnectAttempts = 0
          if (reconnectTimer) {
            clearTimeout(reconnectTimer)
            reconnectTimer = null
          }
        }
      })
      
      // 添加：监听provider.connected属性变化
      const checkConnectionStatus = () => {
        const currentlyConnected = !!provider.connected
        
        // 只有状态不一致时才更新
        if (isConnected.value !== currentlyConnected) {
          console.log(`房间 ${roomName} 连接状态检测更新:`, currentlyConnected)
          isConnected.value = currentlyConnected
          status.value = currentlyConnected ? '已连接' : '连接断开'
        }
      }
      
      // 定期检查实际连接状态
      const statusInterval = setInterval(checkConnectionStatus, 2000)
      provider.statusInterval = statusInterval
      
      provider.on('error', error => {
        console.error(`房间 ${roomName} 连接错误:`, error)
        status.value = '连接错误'
      })
      
      // 监控连接过程中的失败情况
      provider.on('connection-error', (error, peer) => {
        console.warn(`房间 ${roomName} 与对等方 ${peer} 连接失败:`, error)
      })
      // 监控连接成功的情况
      provider.on('peers', peers => {
        console.log(`房间 ${roomName} 当前对等节点: ${peers.length} 个`)
      })
      
      return provider
    } catch (e) {
      console.error(`创建WebRTC提供者时出错:`, e)
      status.value = '提供者创建失败'
      return null
    }
  }
  
  const connect = () => {
    if (provider && !provider.connected) {
      try {
        provider.connect()
        console.log(`房间 ${roomName} 开始连接`)
      } catch (e) {
        console.error(`房间 ${roomName} 连接失败:`, e)
        attemptReconnect()
      }
    }
  }
  
  // 智能重连函数
  const attemptReconnect = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    
    if (reconnectAttempts >= retryStrategy.maxRetries) {
      console.error(`房间 ${roomName} 重连超过最大次数，停止尝试`)
      status.value = '重连失败'
      isConnected.value = false
      return
    }
    
    reconnectAttempts++
    const delay = Math.min(
      retryStrategy.initialDelay * Math.pow(1.5, reconnectAttempts - 1),
      retryStrategy.maxDelay
    )
    
    status.value = `重连中 (${reconnectAttempts}/${retryStrategy.maxRetries})...`
    console.log(`房间 ${roomName} 将在 ${delay}ms 后第 ${reconnectAttempts} 次重连`)
    
    reconnectTimer = setTimeout(async () => {
      if (provider) {
        try {
          provider.disconnect()
        } catch (e) {
          console.warn('断开现有连接时出错', e)
        }
      }
      
      // 改进：在重连时进行服务器健康检查
      if (reconnectAttempts > 2) {
        console.log(`重连尝试 ${reconnectAttempts}，执行全面服务器健康检查...`)
        // 在后台刷新服务器健康状态，不阻塞重连过程
        checkAllServers().then(results => {
          console.log('服务器健康检查结果:', 
            results.map(r => `${r.url}: ${r.available ? '可用' : '不可用'} (${r.latency}ms)`).join(', ')
          )
        }).catch(e => {
          console.warn('服务器健康检查失败:', e)
        })
      }
      
      provider = await createProvider()
      if (provider) connect()
    }, delay)
  }
  
  // 创建初始提供者
  provider = await createProvider()
  
  // 如果设置了自动连接，则立即连接
  if (autoConnect && provider) {
    setTimeout(connect, 100)
  }
  
  // 配置本地持久化
  let persistence = null
  if (persist) {
    try {
      persistence = new IndexeddbPersistence(roomName, ydoc)
      persistence.on('synced', () => {
        // 在同步完成后，初始化数据（如果本地没有数据）
        const isEmpty = Object.keys(store.state).length === 0
        if (isEmpty) {
          // 将初始状态填充到同步存储中
          Object.entries(initialState).forEach(([key, value]) => {
            store.state[key] = value
          })
        }
        status.value = '已同步到本地'
        console.log(`房间 ${roomName} 已同步到本地存储`)
      })
    } catch (e) {
      console.error(`创建持久化存储时出错:`, e)
    }
  } else {
    // 如果不使用持久化，直接填充初始状态
    Object.entries(initialState).forEach(([key, value]) => {
      store.state[key] = value
    })
  }
  
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
  
  // 断开连接
  const disconnect = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    
    if (provider) {
      // 添加：清理状态检查计时器
      if (provider.statusInterval) {
        clearInterval(provider.statusInterval)
        provider.statusInterval = null
      }
      
      try {
        provider.disconnect()
        console.log(`房间 ${roomName} 已断开连接`)
      } catch (e) {
        console.error(`断开房间 ${roomName} 连接时出错:`, e)
      }
    }
    
    if (persistence) {
      try {
        persistence.destroy()
        console.log(`房间 ${roomName} 持久化存储已销毁`)
      } catch (e) {
        console.error(`销毁房间 ${roomName} 持久化存储时出错:`, e)
      }
      persistence = null
    }
    
    isConnected.value = false
    status.value = '已断开连接'
    
    // 从连接缓存中移除，但保留文档缓存
    roomConnections.delete(roomName)
    
    // 清理自动同步计时器
    if (autoSyncTimer) {
      clearInterval(autoSyncTimer)
      autoSyncTimer = null
    }
  }
  
  // 修改重连函数以重新设置自动同步
  const reconnect = async () => {
    status.value = '正在重新连接...'
    reconnectAttempts = 0 // 重置计数器
    
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    
    if (provider) {
      try {
        provider.disconnect()
      } catch (e) {
        console.warn('断开现有连接时出错', e)
      }
    }
    
    // 重新创建提供者但保持相同的Y.Doc
    // 改进：在重连前检查最佳服务器
    if (reconnectAttempts > 1) {
      try {
        console.log('重新连接前检查服务器状态...')
        const bestServer = await getOptimalServer(true)
        if (bestServer) {
          console.log('发现更优服息器:', bestServer)
        }
      } catch (e) {
        console.warn('检查服务器状态失败:', e)
      }
    }
    
    provider = await createProvider()
    if (provider) {
      connect()
      // 连接成功后重新设置自动同步
      provider.on('status', event => {
        if (event.status === 'connected') {
          setupAutoSync()
        }
      })
    }
  }
  
  // 添加诊断功能
  const getDiagnostics = async () => {
    const connectionInfo = await diagnoseConnection(provider)
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
    
  // 添加一个执行同步的方法
  const triggerSync = () => {
    if (!provider || !provider.connected) return false
    
    const syncTimestamp = Date.now()
    store.state[autoSync.heartbeatField] = syncTimestamp
    lastSyncTime = syncTimestamp
    
    // 记录变更
    recordDocumentChange()
    
    // 额外向awareness发送更新
    if (provider.awareness) {
      provider.awareness.setLocalStateField('_sync', syncTimestamp)
    }
    
    return true
  }
  const result = {
    store: store.state,
    status,
    isConnected,
    disconnect,
    reconnect,
    connect,
    ydoc,
    provider,
    getDiagnostics, // 添加诊断功能
    reconnectTimer, // 存储计时器引用以便清理
    triggerSync,  // 导出触发同步的方法
    // 添加控制自动同步的方法
    setAutoSync: (config) => {
      Object.assign(autoSync, updateAutoSyncConfig(autoSync, config))
      setupAutoSync()
      return autoSync
    },
    getAutoSyncStatus: () => getAutoSyncStatus({
      autoSync,
      autoSyncTimer,
      adaptiveInterval,
      changeFrequency,
      lastNetworkCheck,
      lastSyncTime
    })
  }
  
  // 将连接存储在缓存中
  roomConnections.set(roomName, result)
  
  return result
}

/**
 * 设置房间的自动同步配置
 * @param {string} roomName 房间名称
 * @param {Object|boolean} config 自动同步配置或布尔值开关
 * @returns {Object|null} 当前配置或null（如果失败）
 */
export function setRoomAutoSync(roomName, config) {
  const connection = roomConnections.get(roomName)
  if (!connection || typeof connection.setAutoSync !== 'function') {
    console.warn(`无法设置自动同步：找不到房间 ${roomName} 的连接`)
    return null
  }
  
  return connection.setAutoSync(config)
}

/**
 * 获取房间的自动同步状态
 * @param {string} roomName 房间名称
 * @returns {Object|null} 自动同步状态或null（如果失败）
 */
export function getRoomAutoSyncStatus(roomName) {
  const connection = roomConnections.get(roomName)
  if (!connection || typeof connection.getAutoSyncStatus !== 'function') {
    return null
  }
  
  return connection.getAutoSyncStatus()
}
