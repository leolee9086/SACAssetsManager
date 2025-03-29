/**
 * 同步管理器
 * 负责创建和管理 Y.js 同步提供器（Provider）和 Y.doc 文档
 * 整合了useSyncStore的高级功能
 */

import * as Y from '../../../../static/yjs.js'
import { WebsocketProvider } from '../../../../static/y-websocket.js'
import { WebrtcProvider } from '../../../../static/y-webrtc.js'
import { 
  createSyncStore, 
  resetRoomConnection,
  updateSiyuanConfig 
} from '../../../../src/toolBox/feature/useSyncedstore/useSyncstore.js'

/**
 * 同步管理器类，作为useSyncStore的包装器
 * 提供简化的API接口，同时利用useSyncStore的高级功能
 */
export class SyncManager {
  constructor(options = {}) {
    this.ydoc = options.ydoc || new Y.Doc()
    this.provider = null
    this.roomId = options.roomId || 'default-room'
    this.clientId = options.clientId || `client-${Math.random().toString(36).slice(2, 7)}`
    this.username = options.username || '匿名用户'
    this.color = options.color || '#1a73e8'
    
    // 回调函数
    this.onSynced = options.onSynced || (() => {})
    this.onDisconnect = options.onDisconnect || (() => {})
    this.onAwarenessUpdate = options.onAwarenessUpdate || (() => {})
    
    // 内部存储同步管理器实例
    this.syncStore = null
    
    if (options.providerType && options.roomId) {
      this.connect(options)
    }
  }
  
  /**
   * 连接到同步服务
   */
  async connect(options = {}) {
    // 使用传入的选项或保留当前选项
    this.ydoc = options.ydoc || this.ydoc
    this.roomId = options.roomId || this.roomId
    this.clientId = options.clientId || this.clientId
    this.username = options.username || this.username
    this.providerType = options.providerType || 'websocket'
    
    // 断开现有连接
    this.disconnect()
    
    try {
      // 准备useSyncStore配置选项
      const syncOptions = {
        roomName: this.roomId,
        initialState: {},
        persist: true,
        autoConnect: true,
        forceNewDoc: false,
        webrtcOptions: {
          // 设置自定义信令服务器
          signaling: ['wss://signaling.yjs.dev', 'wss://demos.yjs.dev']
        },
        retryStrategy: {
          maxRetries: 5,
          initialDelay: 1000,
          maxDelay: 10000
        },
        autoSync: {
          enabled: true,
          interval: 1000,
          heartbeatField: '_lastSync'
        }
      }
      
      // 根据提供器类型选择不同的配置
      if (this.providerType === 'websocket') {
        syncOptions.connectionType = 'websocket'
        syncOptions.websocketUrl = 'wss://demos.yjs.dev'
      }
      
      // 使用已有的Y.Doc
      syncOptions.ydoc = this.ydoc
      
      // 创建高级同步管理器
      this.syncStore = await createSyncStore(syncOptions)
      
      // 设置本地感知状态
      if (this.syncStore.provider?.awareness) {
        this.syncStore.provider.awareness.setLocalState({
          name: this.username,
          color: this.color,
          clientId: this.clientId
        })
      }
      
      // 为兼容性保存provider引用
      this.provider = this.syncStore.provider
      
      // 监听连接状态
      this.setupEventListeners()
      
      return this.provider
    } catch (err) {
      console.error('连接失败:', err)
      throw err
    }
  }
  
  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    if (!this.syncStore || !this.syncStore.provider) return
    
    // 监听状态变化
    this.syncStore.provider.on('synced', () => {
      console.log('同步完成')
      if (this.onSynced) this.onSynced()
    })
    
    this.syncStore.provider.on('disconnect', () => {
      console.log('连接断开')
      if (this.onDisconnect) this.onDisconnect()
    })
    
    // 监听感知状态更新
    if (this.syncStore.provider.awareness) {
      this.syncStore.provider.awareness.on('update', ({ added, updated, removed }) => {
        console.log('感知状态变更:', { added, updated, removed })
        
        if (this.onAwarenessUpdate) {
          this.onAwarenessUpdate(this.syncStore.provider.awareness.getStates())
        }
      })
    }
  }
  
  /**
   * 断开连接
   */
  disconnect() {
    // 清理旧的事件监听器
    if (this.provider) {
      if (this.provider.awareness) {
        this.provider.awareness.off('update')
      }
      this.provider.off('synced')
      this.provider.off('disconnect')
    }
    
    // 使用高级同步存储的断开方法
    if (this.syncStore) {
      this.syncStore.disconnect()
    } else if (this.provider) {
      // 兼容旧的断开方法
      this.provider.disconnect()
    }
    
    this.provider = null
    this.syncStore = null
  }
  
  /**
   * 判断当前客户端是否是主机
   * （第一个连接的客户端被视为主机）
   */
  isHost() {
    if (!this.provider || !this.provider.awareness) return false
    
    const states = this.provider.awareness.getStates()
    const clients = Array.from(states.keys())
    
    // 如果当前客户端ID是所有客户端中最小的，则视为主机
    const localClientId = this.provider.awareness.clientID
    return clients.length > 0 && Math.min(...clients) === localClientId
  }
  
  /**
   * 获取活跃用户列表
   */
  getActiveUsers() {
    if (!this.provider || !this.provider.awareness) return []
    
    const states = this.provider.awareness.getStates()
    
    return Array.from(states.entries()).map(([id, state]) => ({
      id,
      name: state.name || `用户${id}`,
      color: state.color || '#ccc',
      isLocal: id === this.provider.awareness.clientID
    }))
  }
  
  /**
   * 更新本地用户状态
   */
  updateLocalState(state) {
    if (!this.provider || !this.provider.awareness) return
    
    const currentState = this.provider.awareness.getLocalState() || {}
    this.provider.awareness.setLocalState({
      ...currentState,
      ...state
    })
  }
  
  /**
   * 获取诊断信息
   */
  getDiagnostics() {
    // 优先使用高级同步存储提供的诊断信息
    if (this.syncStore && typeof this.syncStore.getDiagnostics === 'function') {
      return this.syncStore.getDiagnostics()
    }
    
    // 兼容原有的诊断方法
    return {
      connected: !!this.provider,
      roomId: this.roomId,
      clientId: this.clientId,
      username: this.username,
      providerType: this.providerType,
      isHost: this.isHost(),
      activeUsers: this.getActiveUsers(),
      yDocStats: this.getYDocStats()
    }
  }
  
  /**
   * 获取Y.Doc文档统计信息
   */
  getYDocStats() {
    if (!this.ydoc) return null
    
    return {
      clientID: this.ydoc.clientID,
      gc: this.ydoc.gc,
      store: Object.keys(this.ydoc.store.clients).length,
      collections: Array.from(this.ydoc.share.keys())
    }
  }
  
  /**
   * 手动触发同步
   */
  triggerSync() {
    if (this.syncStore && typeof this.syncStore.triggerSync === 'function') {
      return this.syncStore.triggerSync()
    }
    return false
  }
}

// 保留默认导出以兼容现有代码
export default SyncManager 