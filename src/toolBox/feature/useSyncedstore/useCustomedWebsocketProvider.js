import * as Y from '../../../../static/yjs.js'
import * as awarenessProtocol from '../../../../static/y-protocols/awareness.js'
import * as syncProtocol from '../../../../static/y-protocols/sync.js'
import * as authProtocol from '../../../../static/y-protocols/auth.js'

// 消息类型常量
const MESSAGE_SYNC = 0
const MESSAGE_AWARENESS = 1
const MESSAGE_AUTH = 2
const MESSAGE_QUERY_AWARENESS = 3

// 默认的消息重连超时时间（毫秒）
const DEFAULT_RECONNECT_TIMEOUT = 30000

/**
 * 简易二进制编码器 - 替代lib0/encoding
 */
class SimpleEncoder {
  constructor() {
    this.buffer = []
  }
  
  // 写入可变长度整数
  writeVarUint(num) {
    do {
      let b = num & 127
      num >>>= 7
      if (num !== 0) {
        b |= 128
      }
      this.buffer.push(b)
    } while (num !== 0)
  }
  
  // 写入Uint8Array数组
  writeUint8Array(array) {
    this.writeVarUint(array.length)
    for (let i = 0; i < array.length; i++) {
      this.buffer.push(array[i])
    }
  }
  
  // 转换为Uint8Array
  toUint8Array() {
    return new Uint8Array(this.buffer)
  }
  
  // 获取当前编码器长度
  get length() {
    return this.buffer.length
  }
}

/**
 * 简易二进制解码器 - 替代lib0/decoding
 */
class SimpleDecoder {
  constructor(uint8Array) {
    this.buffer = uint8Array
    this.pos = 0
  }
  
  // 读取可变长度整数
  readVarUint() {
    let num = 0
    let mult = 1
    const len = this.buffer.length
    
    while (this.pos < len) {
      const b = this.buffer[this.pos++]
      const last = (b & 128) === 0
      num += mult * (b & 127)
      if (last) {
        return num
      }
      mult *= 128
    }
    throw new Error('未完成的VarInt')
  }
  
  // 读取Uint8Array数组
  readUint8Array() {
    const len = this.readVarUint()
    const array = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      array[i] = this.buffer[this.pos++]
    }
    return array
  }
  
  // 是否已经读取到末尾
  hasContent() {
    return this.pos < this.buffer.length
  }
}

/**
 * 简单广播通道实现 - 替代BroadcastChannel API
 */
class SimpleBroadcastChannel {
  static channels = new Map()
  
  constructor(name) {
    this.name = name
    this.onmessage = null
    
    if (!SimpleBroadcastChannel.channels.has(name)) {
      SimpleBroadcastChannel.channels.set(name, new Set())
    }
    
    SimpleBroadcastChannel.channels.get(name).add(this)
  }
  
  postMessage(message) {
    const channels = SimpleBroadcastChannel.channels.get(this.name) || new Set()
    
    for (const channel of channels) {
      if (channel !== this && channel.onmessage) {
        setTimeout(() => {
          try {
            channel.onmessage({ data: message })
          } catch (err) {
            console.error('广播通道消息处理错误', err)
          }
        }, 0)
      }
    }
  }
  
  close() {
    const channels = SimpleBroadcastChannel.channels.get(this.name)
    if (channels) {
      channels.delete(this)
      if (channels.size === 0) {
        SimpleBroadcastChannel.channels.delete(this.name)
      }
    }
  }
}

/**
 * 自定义WebSocket提供器
 */
export class CustomedWebsocketProvider {
  constructor(serverUrl, roomName, doc, {
    connect = true,
    awareness = new awarenessProtocol.Awareness(doc),
    params = {},
    WebSocketPolyfill = WebSocket,
    resyncInterval = -1,
    maxBackoffTime = 10000,
    disableBc = false,
    bcChannel = null
  } = {}) {
    // 确保serverUrl不以斜杠结尾
    while (serverUrl && serverUrl[serverUrl.length - 1] === '/') {
      serverUrl = serverUrl.slice(0, serverUrl.length - 1)
    }
    
    this.serverUrl = serverUrl
    this.roomName = roomName
    this.doc = doc
    this.awareness = awareness
    this.params = params
    this.WebSocketClass = WebSocketPolyfill
    this.resyncInterval = resyncInterval
    this.maxBackoffTime = maxBackoffTime
    this.disableBc = disableBc
    this.bcChannel = bcChannel || `${serverUrl}/${roomName}`
    
    // 连接状态
    this.wsconnected = false
    this.wsconnecting = false
    this.bcconnected = false
    this.shouldConnect = connect
    
    // 重连相关
    this.wsUnsuccessfulReconnects = 0
    this.wsLastMessageReceived = 0
    
    // WebSocket实例
    this.ws = null
    
    // 同步状态
    this._synced = false
    
    // 广播通道
    this.bc = null
    
    // 事件监听器
    this._listeners = {
      sync: new Set(),
      status: new Set(),
      error: new Set(),
      'connection-error': new Set(),
      'connection-close': new Set(),
      peers: new Set()
    }
    
    // 设置定时器
    this._checkInterval = null
    this._resyncInterval = null
    this._bcSubscriber = null
    
    // 设置文档和感知更新处理函数
    this._updateHandler = (update, origin) => {
      if (origin !== this) {
        const encoder = new SimpleEncoder()
        encoder.writeVarUint(MESSAGE_SYNC)
        syncProtocol.writeUpdate(encoder, update)
        this._broadcastMessage(encoder.toUint8Array())
      }
    }
    
    this._awarenessUpdateHandler = ({ added, updated, removed }) => {
      const changedClients = [...added, ...updated, ...removed]
      if (changedClients.length > 0) {
        const encoder = new SimpleEncoder()
        encoder.writeVarUint(MESSAGE_AWARENESS)
        encoder.writeUint8Array(awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients))
        this._broadcastMessage(encoder.toUint8Array())
      }
    }
    
    this._exitHandler = () => {
      awarenessProtocol.removeAwarenessStates(
        this.awareness,
        [doc.clientID],
        'app closed'
      )
    }
    
    // 添加文档更新监听
    this.doc.on('update', this._updateHandler)
    
    // 添加感知状态更新监听
    this.awareness.on('update', this._awarenessUpdateHandler)
    
    // 设置窗口关闭/退出处理
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this._exitHandler)
    } else if (typeof process !== 'undefined') {
      process.on('exit', this._exitHandler)
    }
    
    // 设置连接检查定时器
    this._checkInterval = setInterval(() => {
      if (
        this.wsconnected && 
        DEFAULT_RECONNECT_TIMEOUT < (Date.now() - this.wsLastMessageReceived)
      ) {
        // 长时间没有收到消息，断开连接
        this._closeWebsocketConnection(new Error('连接超时'))
      }
    }, DEFAULT_RECONNECT_TIMEOUT / 10)
    
    // 设置重同步定时器
    if (resyncInterval > 0) {
      this._resyncInterval = setInterval(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          // 重新发送同步步骤1
          const encoder = new SimpleEncoder()
          encoder.writeVarUint(MESSAGE_SYNC)
          syncProtocol.writeSyncStep1(encoder, doc)
          this.ws.send(encoder.toUint8Array())
        }
      }, resyncInterval)
    }
    
    // 如果需要连接，则建立连接
    if (connect) {
      this.connect()
    }
  }
  
  /**
   * 生成WebSocket URL
   */
  get url() {
    const encodedParams = new URLSearchParams(this.params).toString()
    return `${this.serverUrl}/${this.roomName}${encodedParams ? '?' + encodedParams : ''}`
  }
  
  /**
   * 获取同步状态
   */
  get synced() {
    return this._synced
  }
  
  /**
   * 设置同步状态
   */
  set synced(state) {
    if (this._synced !== state) {
      this._synced = state
      this.emit('sync', [state])
    }
  }
  
  /**
   * 添加事件监听器
   */
  on(eventName, listener) {
    if (this._listeners[eventName]) {
      this._listeners[eventName].add(listener)
    }
    return this
  }
  
  /**
   * 移除事件监听器
   */
  off(eventName, listener) {
    if (this._listeners[eventName]) {
      this._listeners[eventName].delete(listener)
    }
    return this
  }
  
  /**
   * 触发事件
   */
  emit(eventName, args = []) {
    if (this._listeners[eventName]) {
      for (const listener of this._listeners[eventName]) {
        listener(...args)
      }
    }
  }
  
  /**
   * 连接广播通道
   */
  connectBc() {
    if (this.disableBc || this.bcconnected) {
      return
    }
    
    // 创建广播通道
    this.bc = new SimpleBroadcastChannel(this.bcChannel)
    this.bcconnected = true
    
    // 设置广播通道消息处理函数
    this._bcSubscriber = (event) => {
      const data = event.data
      this._readMessage(new Uint8Array(data), false)
    }
    
    this.bc.onmessage = this._bcSubscriber
    
    // 发送同步步骤1到广播通道
    const encoderSync = new SimpleEncoder()
    encoderSync.writeVarUint(MESSAGE_SYNC)
    syncProtocol.writeSyncStep1(encoderSync, this.doc)
    this.bc.postMessage(encoderSync.toUint8Array().buffer)
    
    // 广播本地状态
    const encoderState = new SimpleEncoder()
    encoderState.writeVarUint(MESSAGE_SYNC)
    syncProtocol.writeSyncStep2(encoderState, this.doc)
    this.bc.postMessage(encoderState.toUint8Array().buffer)
    
    // 查询感知状态
    const encoderAwarenessQuery = new SimpleEncoder()
    encoderAwarenessQuery.writeVarUint(MESSAGE_QUERY_AWARENESS)
    this.bc.postMessage(encoderAwarenessQuery.toUint8Array().buffer)
    
    // 广播本地感知状态
    const encoderAwarenessState = new SimpleEncoder()
    encoderAwarenessState.writeVarUint(MESSAGE_AWARENESS)
    encoderAwarenessState.writeUint8Array(
      awarenessProtocol.encodeAwarenessUpdate(this.awareness, [this.doc.clientID])
    )
    this.bc.postMessage(encoderAwarenessState.toUint8Array().buffer)
  }
  
  /**
   * 断开广播通道
   */
  disconnectBc() {
    // 广播断开连接消息（感知状态设为null）
    if (this.bcconnected) {
      const encoder = new SimpleEncoder()
      encoder.writeVarUint(MESSAGE_AWARENESS)
      encoder.writeUint8Array(
        awarenessProtocol.encodeAwarenessUpdate(this.awareness, [this.doc.clientID], new Map())
      )
      this._broadcastMessage(encoder.toUint8Array())
      
      this.bc.close()
      this.bc = null
      this.bcconnected = false
    }
  }
  
  /**
   * 广播消息
   */
  _broadcastMessage(message) {
    if (this.wsconnected && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(message)
    }
    if (this.bcconnected) {
      this.bc.postMessage(message.buffer)
    }
  }
  
  /**
   * 读取并处理消息
   */
  _readMessage(message, isFromWs) {
    const decoder = new SimpleDecoder(message)
    const encoder = new SimpleEncoder()
    const messageType = decoder.readVarUint()
    let sendReply = false
    
    if (messageType === MESSAGE_SYNC) {
      encoder.writeVarUint(MESSAGE_SYNC)
      const syncMessageType = syncProtocol.readSyncMessage(decoder, encoder, this.doc, this)
      
      if (syncMessageType === syncProtocol.messageYjsSyncStep1) {
        sendReply = true
      } else if (syncMessageType === syncProtocol.messageYjsSyncStep2 && isFromWs) {
        sendReply = true
        this.synced = true
      } else if (syncMessageType === syncProtocol.messageYjsUpdate) {
        this.synced = true
      }
    } else if (messageType === MESSAGE_AWARENESS) {
      awarenessProtocol.applyAwarenessUpdate(
        this.awareness,
        decoder.readUint8Array(),
        this
      )
    } else if (messageType === MESSAGE_QUERY_AWARENESS) {
      encoder.writeVarUint(MESSAGE_AWARENESS)
      encoder.writeUint8Array(
        awarenessProtocol.encodeAwarenessUpdate(
          this.awareness,
          Array.from(this.awareness.getStates().keys())
        )
      )
      sendReply = true
    } else if (messageType === MESSAGE_AUTH) {
      authProtocol.readAuthMessage(decoder, encoder, this)
      sendReply = true
    }
    
    if (sendReply && encoder.length > 1) {
      if (isFromWs) {
        this.ws.send(encoder.toUint8Array())
      } else if (this.bcconnected) {
        this.bc.postMessage(encoder.toUint8Array().buffer)
      }
    }
    
    return encoder
  }
  
  /**
   * 设置WebSocket连接
   */
  _setupWebsocketConnection() {
    if (this.wsconnecting || this.wsconnected) {
      return
    }
    
    this.wsconnecting = true
    this.emit('status', [{ status: 'connecting' }])
    
    const websocket = new this.WebSocketClass(this.url)
    
    websocket.binaryType = 'arraybuffer'
    
    websocket.onmessage = (event) => {
      this.wsLastMessageReceived = Date.now()
      this._readMessage(new Uint8Array(event.data), true)
    }
    
    websocket.onclose = (event) => {
      this.emit('connection-close', [event, websocket])
      this.wsconnecting = false
      this.wsconnected = false
      this.emit('status', [{ status: 'disconnected' }])
      
      // 尝试重连
      if (this.shouldConnect && this.wsUnsuccessfulReconnects <= 5) {
        this.wsUnsuccessfulReconnects++
        const timeout = Math.min(
          Math.pow(2, this.wsUnsuccessfulReconnects) * 100,
          this.maxBackoffTime
        )
        setTimeout(() => {
          this._setupWebsocketConnection()
        }, timeout)
      }
    }
    
    websocket.onopen = () => {
      this.wsLastMessageReceived = Date.now()
      this.wsconnecting = false
      this.wsconnected = true
      this.wsUnsuccessfulReconnects = 0
      this.emit('status', [{ status: 'connected' }])
      
      // 发送同步步骤1
      const encoder = new SimpleEncoder()
      encoder.writeVarUint(MESSAGE_SYNC)
      syncProtocol.writeSyncStep1(encoder, this.doc)
      websocket.send(encoder.toUint8Array())
    }
    
    websocket.onerror = (event) => {
      this.emit('connection-error', [event, websocket])
    }
    
    this.ws = websocket
  }
  
  /**
   * 关闭WebSocket连接
   */
  _closeWebsocketConnection(error = null) {
    if (this.ws) {
      try {
        this.ws.onclose = null
        this.ws.onmessage = null
        this.ws.onerror = null
        this.ws.close()
      } catch (e) {
        console.error('关闭WebSocket连接时出错:', e)
      }
      
      this.ws = null
      this.wsconnected = false
      this.wsconnecting = false
      
      if (error) {
        this.emit('error', [error])
      }
      
      this.emit('status', [{ status: 'disconnected' }])
    }
  }
  
  /**
   * 连接
   */
  connect() {
    this.shouldConnect = true
    if (!this.wsconnected && !this.wsconnecting) {
      this._setupWebsocketConnection()
      this.connectBc()
    }
  }
  
  /**
   * 断开连接
   */
  disconnect() {
    this.shouldConnect = false
    this.disconnectBc()
    
    if (this.ws) {
      this._closeWebsocketConnection()
    }
  }
  
  /**
   * 销毁
   */
  destroy() {
    this.disconnect()
    
    if (this._resyncInterval) {
      clearInterval(this._resyncInterval)
      this._resyncInterval = null
    }
    
    if (this._checkInterval) {
      clearInterval(this._checkInterval)
      this._checkInterval = null
    }
    
    this.awareness.off('update', this._awarenessUpdateHandler)
    this.doc.off('update', this._updateHandler)
    
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this._exitHandler)
    } else if (typeof process !== 'undefined') {
      process.off('exit', this._exitHandler)
    }
    
    // 清空所有监听器
    for (const eventName in this._listeners) {
      this._listeners[eventName].clear()
    }
  }
  
  /**
   * 获取当前连接的对等节点
   */
  getPeers() {
    return Array.from(this.awareness.getStates().keys())
      .filter(id => id !== this.doc.clientID)
  }
  
  /**
   * 获取当前连接状态
   */
  getConnectionStatus() {
    return {
      wsconnected: this.wsconnected,
      wsconnecting: this.wsconnecting,
      bcconnected: this.bcconnected,
      synced: this.synced,
      peers: this.getPeers().length,
      reconnectAttempts: this.wsUnsuccessfulReconnects
    }
  }
}

/**
 * 与我们的WSS连通性检查配合使用的高级WebSocket提供器
 */
export class EnhancedWebsocketProvider extends CustomedWebsocketProvider {
  constructor(serverUrls, roomName, doc, options = {}) {
    // 使用第一个URL作为初始URL
    const initialServerUrl = Array.isArray(serverUrls) ? serverUrls[0] : serverUrls
    
    // 保存所有可用的服务器URL
    this.allServerUrls = Array.isArray(serverUrls) ? serverUrls : [serverUrls]
    this.currentServerIndex = 0
    this.healthCheckTimer = null
    this.healthCheckInterval = options.healthCheckInterval || 60000 // 默认1分钟检查一次
    
    super(initialServerUrl, roomName, doc, options)
    
    // 定期执行健康检查
    if (this.allServerUrls.length > 1) {
      this.healthCheckTimer = setInterval(() => {
        this._performHealthCheck()
      }, this.healthCheckInterval)
    }
  }
  
  /**
   * 执行健康检查
   */
  async _performHealthCheck() {
    if (!this.wsconnected || this.wsconnecting) {
      return // 如果正在连接中或已连接，不执行健康检查
    }
    
    try {
      // 简单健康检查：尝试连接每个服务器，记录响应时间
      const results = await Promise.all(
        this.allServerUrls.map(async (url) => {
          const testUrl = url.replace('wss://', 'https://')
          try {
            const startTime = Date.now()
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 3000)
            
            const response = await fetch(testUrl, {
              method: 'HEAD',
              signal: controller.signal,
              cache: 'no-store'
            })
            
            clearTimeout(timeoutId)
            const latency = Date.now() - startTime
            
            return {
              url,
              available: response.ok,
              latency
            }
          } catch (e) {
            return {
              url,
              available: false,
              latency: Infinity
            }
          }
        })
      )
      
      // 找出最快的可用服务器
      const availableServers = results.filter(r => r.available)
      if (availableServers.length > 0) {
        const fastestServer = availableServers.sort((a, b) => a.latency - b.latency)[0]
        const fastestServerIndex = this.allServerUrls.indexOf(fastestServer.url)
        
        // 如果找到了更快的服务器且不是当前服务器，则切换
        if (fastestServerIndex !== this.currentServerIndex && fastestServer.latency < 500) {
          console.log(`切换到更快的服务器: ${fastestServer.url} (${fastestServer.latency}ms)`)
          this.switchServer(fastestServerIndex)
        }
      }
    } catch (e) {
      console.warn('执行WebSocket服务器健康检查时出错:', e)
    }
  }
  
  /**
   * 切换到不同的服务器
   */
  switchServer(serverIndex) {
    if (serverIndex < 0 || serverIndex >= this.allServerUrls.length) {
      return false
    }
    
    const wasConnected = this.wsconnected
    
    // 断开当前连接
    this.disconnect()
    
    // 切换服务器
    this.currentServerIndex = serverIndex
    this.serverUrl = this.allServerUrls[serverIndex]
    
    // 如果之前是连接状态，则重新连接
    if (wasConnected) {
      setTimeout(() => {
        this.connect()
      }, 100)
    }
    
    return true
  }
  
  /**
   * 获取下一个可用的服务器
   */
  switchToNextServer() {
    const nextIndex = (this.currentServerIndex + 1) % this.allServerUrls.length
    return this.switchServer(nextIndex)
  }
  
  /**
   * 销毁资源
   */
  destroy() {
    super.destroy()
    
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
      this.healthCheckTimer = null
    }
  }
}