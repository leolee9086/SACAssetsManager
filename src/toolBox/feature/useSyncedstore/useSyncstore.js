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
 * @module useSyncStore
 * @requires vue
 * @requires @syncedstore/core
 * @requires y-webrtc
 * @requires y-indexeddb
 * @requires yjs
 */

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
import {
  createDocumentChangeRecorderWithContext,
  setupDocumentChangeMonitoringWithContext
} from './forDocumentChanges.js'

// 添加思源 WebSocket 相关配置
const siyuanConfig = {
  enabled: false,
  port: 6806,
  channel: 'sync',
  token: 'xqatmtk3jfpchiah',
  host: '127.0.0.1',
  autoReconnect: true
}

// 添加思源 WebSocket 连接管理
const siyuanManager = {
  connections: new Map(), // roomName -> { socket, status }
  
  async connect(roomName, options = {}) {
    const {
      port = siyuanConfig.port,
      channel = siyuanConfig.channel,
      token = siyuanConfig.token,
      host = siyuanConfig.host
    } = options

    try {
      const socket = new WebSocket(
        `ws://${host}:${port}/ws/broadcast?channel=${channel}_${roomName}&token=${token}`
      )
      
      return new Promise((resolve, reject) => {
        socket.onopen = () => {
          this.connections.set(roomName, {
            socket,
            status: 'connected'
          })
          console.log(`[思源同步] 房间 ${roomName} WebSocket 连接成功`)
          resolve(socket)
        }

        socket.onerror = (error) => {
          console.error(`[思源同步] 房间 ${roomName} WebSocket 连接失败:`, error)
          this.connections.delete(roomName)
          reject(error)
        }

        socket.onclose = () => {
          console.log(`[思源同步] 房间 ${roomName} WebSocket 连接关闭`)
          this.connections.delete(roomName)
          if (siyuanConfig.autoReconnect) {
            setTimeout(() => {
              this.connect(roomName, options)
            }, 1000)
          }
        }
      })
    } catch (error) {
      console.error(`[思源同步] 创建 WebSocket 连接失败:`, error)
      return null
    }
  },

  disconnect(roomName) {
    const conn = this.connections.get(roomName)
    if (conn?.socket) {
      conn.socket.close()
      this.connections.delete(roomName)
    }
  }
}

// 添加新的管理器
const documentManager = {
  // 存储文档实例
  docs: new Map(), // docId -> { ydoc, store, refCount, lastAccess }
  // 存储房间到文档的映射
  roomToDoc: new Map(), // roomName -> docId
  // 存储文档到房间的映射  
  docToRooms: new Map(), // docId -> Set<roomName>
  // 存储连接实例
  connections: new Map(), // roomName -> { provider, refCount, status }
  
  // 生成文档ID
  generateDocId(roomName) {
    // 可以根据需要自定义文档ID生成规则
    return roomName.split('/')[0]
  },

  // 获取或创建文档
  async getDocument(roomName, options = {}) {
    const docId = this.generateDocId(roomName)
    let docEntry = this.docs.get(docId)
    
    if (docEntry) {
      // 如果文档已存在，直接复用
      docEntry.refCount++
      docEntry.lastAccess = Date.now()
      
      // 添加房间映射
      this.addRoomMapping(docId, roomName)
      
      return {
        doc: docEntry.ydoc,
        store: docEntry.store,
        isExisting: true
      }
    }

    // 创建新文档
    const ydoc = new Y.Doc()
    const store = syncedStore({ state: {} }, ydoc)
    
    docEntry = {
      ydoc,
      store,
      refCount: 1,
      lastAccess: Date.now()
    }
    
    this.docs.set(docId, docEntry)
    this.addRoomMapping(docId, roomName)
    
    return {
      doc: ydoc,
      store,
      isExisting: false
    }
  },

  // 添加房间映射关系
  addRoomMapping(docId, roomName) {
    // 建立双向映射
    this.roomToDoc.set(roomName, docId)
    
    if (!this.docToRooms.has(docId)) {
      this.docToRooms.set(docId, new Set())
    }
    this.docToRooms.get(docId).add(roomName)
  },

  // 获取或创建连接
  async getConnection(roomName, ydoc, options = {}) {
    let conn = this.connections.get(roomName)
    
    if (conn) {
      // 如果连接已存在，增加引用计数并返回现有连接
      conn.refCount++
      return conn.provider
    }

    // 创建新连接
    const provider = new WebrtcProvider(roomName, ydoc, {
      ...options,
      connect: false // 确保初始化时不自动连接
    })
    
    this.connections.set(roomName, {
      provider,
      refCount: 1,
      status: 'initialized'
    })

    return provider
  },

  // 清理房间资源
  async cleanupRoom(roomName) {
    const docId = this.roomToDoc.get(roomName)
    if (!docId) return

    // 清理连接引用
    const conn = this.connections.get(roomName)
    if (conn) {
      conn.refCount--
      if (conn.refCount <= 0) {
        // 只有当没有其他引用时才断开连接
        try {
          conn.provider.disconnect()
          if (conn.provider.statusInterval) {
            clearInterval(conn.provider.statusInterval)
          }
        } catch (e) {
          console.warn('清理连接时出错:', e)
        }
        this.connections.delete(roomName)
      }
    }

    // 清理文档引用
    const docEntry = this.docs.get(docId)
    if (docEntry) {
      docEntry.refCount--
      
      // 从房间映射中移除当前房间
      this.docToRooms.get(docId).delete(roomName)
      this.roomToDoc.delete(roomName)
      
      // 只有当没有任何房间使用此文档时才清理
      if (docEntry.refCount <= 0) {
        this.docs.delete(docId)
        this.docToRooms.delete(docId)
      }
    }
  },

  // 获取文档的所有房间
  getDocumentRooms(docId) {
    return this.docToRooms.get(docId) || new Set()
  },

  // 获取房间对应的文档
  getRoomDocument(roomName) {
    return this.roomToDoc.get(roomName)
  }
}

/**
 * 重置指定房间的连接状态
 * @param {string} roomName - 需要重置的房间名称
 * @returns {void}
 */
export const resetRoomConnection = async (roomName) => {
  const connection = documentManager.connections.get(roomName)
  if (connection) {
    await connection.disconnect()
    documentManager.connections.delete(roomName)
    // 等待资源清理
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  await documentManager.cleanupRoom(roomName)
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

  // 选择最佳服务器
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

  // 设置事件监听器
  const setupProviderEvents = (provider) => {
    provider.on('status', event => {
      console.log(`房间 ${roomName} 状态事件:`, event.status)
      const reallyConnected = provider.connected || event.status === 'connected'
      isConnected.value = reallyConnected
      status.value = reallyConnected ? '已连接' : '连接断开'
      
      if (reallyConnected) {
        reconnectAttempts = 0
        if (reconnectTimer) {
          clearTimeout(reconnectTimer)
          reconnectTimer = null
        }
      }
    })

    // 添加连接状态检查
    const checkConnectionStatus = () => {
      const currentlyConnected = !!provider.connected
      if (isConnected.value !== currentlyConnected) {
        isConnected.value = currentlyConnected
        status.value = currentlyConnected ? '已连接' : '连接断开'
      }
    }
    
    const statusInterval = setInterval(checkConnectionStatus, 2000)
    provider.statusInterval = statusInterval

    provider.on('error', error => {
      console.error(`房间 ${roomName} 连接错误:`, error)
      status.value = '连接错误'
    })

    provider.on('connection-error', (error, peer) => {
      console.warn(`房间 ${roomName} 与对等方 ${peer} 连接失败:`, error)
    })

    provider.on('peers', peers => {
      console.log(`房间 ${roomName} 当前对等节点: ${peers.length} 个`)
    })
  }

  // 设置事件监听
  setupProviderEvents(provider)

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
  

  
  // 创建并优化WebRTC提供者
  let reconnectAttempts = 0
  let reconnectTimer = null
  
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
      
      // 改进：只在连续失败多次后才进行服务器健康检查
      if (reconnectAttempts === 3) { // 只在第3次重试时检查一次
        console.log('执行一次性服务器健康检查...')
        // 在后台刷新服务器健康状态，不阻塞重连过程
        checkAllServers().then(results => {
          console.log('服务器健康检查结果:', 
            results.map(r => `${r.url}: ${r.available ? '可用' : '不可用'} (${r.latency}ms)`).join(', ')
          )
        }).catch(e => {
          console.warn('服务器健康检查失败:', e)
        })
      }
      
      provider = await documentManager.getConnection(roomName, ydoc, mergedWebRtcOptions)
      setupProviderEvents(provider)
      if (provider) connect()
    }, delay)
  }
  
  // 创建初始提供者
  provider = await documentManager.getConnection(roomName, ydoc, mergedWebRtcOptions)
  
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
    documentManager.connections.delete(roomName)
    
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
  
  // 修改重连函数
  const reconnect = async () => {
    status.value = '正在重新连接...'
    reconnectAttempts = 0
    
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
    
    // 重新获取连接
    provider = await documentManager.getConnection(roomName, ydoc, mergedWebRtcOptions)
    setupProviderEvents(provider)
    
    if (provider) {
      connect()
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
    
  // 修改 triggerSync 函数以支持思源同步
  const triggerSync = () => {
    let synced = false
    
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
    }),
    siyuanSocket,
    siyuanEnabled: !!siyuanSocket
  }
  
  // 将连接存储在缓存中
  documentManager.connections.set(roomName, result)
  
  return result
}

/**
 * 设置房间的自动同步配置
 * @param {string} roomName - 房间名称
 * @param {Object|boolean} config - 自动同步配置或开关状态
 * @param {boolean} [config.enabled] - 是否启用自动同步
 * @param {number} [config.interval] - 同步间隔(ms)
 * @param {string} [config.heartbeatField] - 心跳字段名称
 * @returns {Object|null} 更新后的配置或失败时返回null
 */
export function setRoomAutoSync(roomName, config) {
  const connection = documentManager.connections.get(roomName)
  if (!connection || typeof connection.setAutoSync !== 'function') {
    console.warn(`无法设置自动同步：找不到房间 ${roomName} 的连接`)
    return null
  }
  
  return connection.setAutoSync(config)
}

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
export function getRoomAutoSyncStatus(roomName) {
  const connection = documentManager.connections.get(roomName)
  if (!connection || typeof connection.getAutoSyncStatus !== 'function') {
    return null
  }
  
  return connection.getAutoSyncStatus()
}

// 添加思源配置更新函数
export function updateSiyuanConfig(config = {}) {
  Object.assign(siyuanConfig, config)
}

