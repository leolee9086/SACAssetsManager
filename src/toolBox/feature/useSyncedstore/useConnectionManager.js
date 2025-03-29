/**
 * @fileoverview WebRTC连接管理器 - 负责处理P2P连接的建立、监控和重连
 * 
 * 该模块提供WebRTC连接的创建、事件监听、状态监控和智能重连功能。
 * 采用渐进式退避算法进行重连，并支持连接状态的实时监控。
 * 
 * @module connectionManager
 * @requires vue
 */

import { checkAllServers } from './useYjsSignalServers.js'

// 常量配置
const STATUS_CHECK_INTERVAL = 2000
const DEFAULT_RETRY_STRATEGY = {
  maxRetries: 5,
  initialDelay: 1000,
  maxDelay: 30000
}
const BACKOFF_FACTOR = 1.5
const SERVER_CHECK_RETRY = 3

/**
 * 创建连接管理器
 * @param {Object} options - 配置选项
 * @param {Object} options.provider - WebRTC提供者实例
 * @param {string} options.roomName - 房间名称
 * @param {Object} options.retryStrategy - 重连策略
 * @param {Object} options.documentManager - 文档管理器实例
 * @param {Object} options.ydoc - Y.Doc实例
 * @param {Object} options.webrtcOptions - WebRTC连接选项
 * @param {Object} options.status - 响应式状态对象
 * @param {Object} options.isConnected - 响应式连接状态
 * @returns {Object} 连接管理器实例
 */
export function createConnectionManager(options) {
  const {
    provider: initialProvider,
    roomName,
    retryStrategy = DEFAULT_RETRY_STRATEGY,
    documentManager,
    ydoc,
    webrtcOptions,
    status,
    isConnected
  } = options

  let provider = initialProvider
  let reconnectAttempts = 0
  let reconnectTimer = null

  /**
   * 设置提供者事件监听
   * @param {Object} provider - WebRTC提供者实例
   */
  function setupProviderEvents(provider) {
    provider.on('status', event => handleStatusChange(event, provider));
    setupConnectionStatusCheck(provider);
    setupErrorHandlers(provider);
  }

  /**
   * 处理状态变更事件
   * @param {Object} event - 状态事件对象
   * @param {Object} provider - WebRTC提供者实例
   */
  function handleStatusChange(event, provider) {
    console.log(`房间 ${roomName} 状态事件:`, event.status)
    const reallyConnected = provider.connected || event.status === 'connected'
    isConnected.value = reallyConnected
    status.value = reallyConnected ? '已连接' : '连接断开'
    
    if (reallyConnected) {
      resetReconnectState()
    }
  }

  /**
   * 重置重连状态
   */
  function resetReconnectState() {
    reconnectAttempts = 0
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  /**
   * 设置连接状态检查
   * @param {Object} provider - WebRTC提供者实例
   */
  function setupConnectionStatusCheck(provider) {
    const statusInterval = setInterval(() => {
      const currentlyConnected = !!provider.connected
      if (isConnected.value !== currentlyConnected) {
        isConnected.value = currentlyConnected
        status.value = currentlyConnected ? '已连接' : '连接断开'
      }
    }, STATUS_CHECK_INTERVAL)
    
    provider.statusInterval = statusInterval
  }

  /**
   * 设置错误处理程序
   * @param {Object} provider - WebRTC提供者实例
   */
  function setupErrorHandlers(provider) {
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

  /**
   * 连接到WebRTC网络
   */
  function connect() {
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

  /**
   * 智能重连函数
   */
  function attemptReconnect() {
    clearExistingReconnectTimer()
    
    if (reconnectAttempts >= retryStrategy.maxRetries) {
      handleMaxRetriesExceeded()
      return
    }
    
    reconnectAttempts++
    const delay = calculateBackoffDelay()
    
    status.value = `重连中 (${reconnectAttempts}/${retryStrategy.maxRetries})...`
    console.log(`房间 ${roomName} 将在 ${delay}ms 后第 ${reconnectAttempts} 次重连`)
    
    reconnectTimer = setTimeout(performReconnection, delay)
  }

  /**
   * 清除现有的重连计时器
   */
  function clearExistingReconnectTimer() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  /**
   * 处理超过最大重试次数的情况
   */
  function handleMaxRetriesExceeded() {
    console.error(`房间 ${roomName} 重连超过最大次数，停止尝试`)
    status.value = '重连失败'
    isConnected.value = false
  }

  /**
   * 计算退避延迟时间
   * @returns {number} 延迟时间(ms)
   */
  function calculateBackoffDelay() {
    return Math.min(
      retryStrategy.initialDelay * Math.pow(BACKOFF_FACTOR, reconnectAttempts - 1),
      retryStrategy.maxDelay
    )
  }

  /**
   * 执行重连操作
   */
  async function performReconnection() {
    disconnectExistingProvider()
    
    // 只在连续失败多次后才进行服务器健康检查
    if (reconnectAttempts === SERVER_CHECK_RETRY) {
      performServerHealthCheck()
    }
    
    provider = await documentManager.getConnection(roomName, ydoc, webrtcOptions)
    setupProviderEvents(provider)
    if (provider) connect()
  }

  /**
   * 断开现有提供者的连接
   */
  function disconnectExistingProvider() {
    if (provider) {
      try {
        provider.disconnect()
      } catch (e) {
        console.warn('断开现有连接时出错', e)
      }
    }
  }

  /**
   * 执行服务器健康检查
   */
  function performServerHealthCheck() {
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

  /**
   * 断开连接
   */
  function disconnect() {
    clearExistingReconnectTimer()
    
    if (provider) {
      cleanupProvider()
    }
    
    isConnected.value = false
    status.value = '已断开连接'
  }

  /**
   * 清理提供者资源
   */
  function cleanupProvider() {
    // 清理状态检查计时器
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

  /**
   * 重新连接
   */
  async function reconnect() {
    status.value = '正在重新连接...'
    reconnectAttempts = 0
    
    clearExistingReconnectTimer()
    disconnectExistingProvider()
    
    // 重新获取连接
    provider = await documentManager.getConnection(roomName, ydoc, webrtcOptions)
    setupProviderEvents(provider)
    
    if (provider) {
      connect()
    }
  }

  // 为初始提供者设置事件
  if (provider) {
    setupProviderEvents(provider)
  }

  return {
    connect,
    disconnect,
    reconnect,
    attemptReconnect,
    setupProviderEvents,
    getProvider: () => provider,
    setProvider: (newProvider) => {
      provider = newProvider
      setupProviderEvents(provider)
      return provider
    },
    getReconnectInfo: () => ({
      reconnectAttempts,
      reconnectTimer
    })
  }
}

export default {
  createConnectionManager
} 