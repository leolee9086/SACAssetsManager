/**
 * @fileoverview 同步管理器 - 管理文档自动同步和变更监控
 * 
 * 该模块负责处理YJS文档的自动同步、变更监控和同步间隔自适应调整，
 * 支持基于网络状况和文档变更频率的自适应同步间隔计算。
 * 
 * @module syncManager
 * @requires yjs
 */

import {
  calculateOptimalSyncIntervalWithOptions,
  createDefaultAutoSyncConfig,
  updateAutoSyncConfig,
  getAutoSyncStatus
} from './forAutoSync.js'

import {
  createDocumentChangeRecorderWithContext,
  setupDocumentChangeMonitoringWithContext
} from './forDocumentChanges.js'

// 常量配置
const MAX_CHANGE_HISTORY = 10
const INTERVAL_CHANGE_THRESHOLD = 0.2

/**
 * 创建同步管理器
 * @param {Object} options - 配置选项
 * @param {Object} options.ydoc - Y.Doc实例
 * @param {Object} options.store - 数据存储实例
 * @param {Object} options.roomName - 房间名称
 * @param {Object} options.autoSync - 自动同步配置
 * @param {function} options.getProvider - 获取提供者函数
 * @param {Object} options.siyuanSocket - 思源WebSocket（可选）
 * @returns {Object} 同步管理器实例
 */
export function createSyncManager(options) {
  const {
    ydoc,
    store,
    roomName,
    autoSync = createDefaultAutoSyncConfig(),
    getProvider,
    siyuanSocket
  } = options

  // 同步状态变量
  let autoSyncTimer = null
  let lastSyncTime = Date.now()
  let changeFrequency = 0
  let lastNetworkCheck = {
    time: Date.now(),
    latency: 200,
    type: 'unknown'
  }
  let adaptiveInterval = autoSync.interval
  let cleanupFunction = null

  // 创建文档变更记录器
  const changeRecorder = createDocumentChangeRecorderWithContext({
    maxHistory: MAX_CHANGE_HISTORY
  })

  /**
   * 记录文档变更
   * @returns {number} 变更频率
   */
  function recordDocumentChange() {
    changeFrequency = changeRecorder.recordChange()
    return changeFrequency
  }

  /**
   * 执行定时同步
   */
  function executeSync() {
    const provider = getProvider()
    if (provider && provider.connected) {
      // 更新心跳字段触发同步
      store.state[autoSync.heartbeatField] = Date.now()
      lastSyncTime = Date.now()
      
      // 重新计算并应用新的间隔
      recalculateAndApplyInterval()
      
      console.log(`[自动同步] 房间 ${roomName} 执行定时同步`)
    }
  }

  /**
   * 重新计算同步间隔并在必要时应用新间隔
   */
  function recalculateAndApplyInterval() {
    const newInterval = calculateOptimalSyncIntervalWithOptions({
      autoSync,
      lastNetworkCheck,
      lastSyncTime,
      changeFrequency,
      adaptiveInterval
    })
    
    // 如果间隔变化超过阈值，重新设置定时器
    const changeRatio = Math.abs(newInterval - adaptiveInterval) / adaptiveInterval;
    if (changeRatio > INTERVAL_CHANGE_THRESHOLD) {
      adaptiveInterval = newInterval
      console.log(`[自适应同步] 房间 ${roomName} 调整同步间隔为: ${adaptiveInterval}ms`)
      
      // 重新设置定时器
      clearInterval(autoSyncTimer)
      autoSyncTimer = setInterval(executeSync, adaptiveInterval)
    }
  }

  /**
   * 配置并启动自动同步
   * @returns {Function|null} 清理函数
   */
  function setupAutoSync() {
    // 清理现有的计时器
    clearCurrentTimer()
    
    // 如果自动同步未启用，则返回
    if (!autoSync.enabled) return null
    
    // 计算最佳同步间隔
    const intervalOptions = {
      autoSync,
      lastNetworkCheck,
      lastSyncTime,
      changeFrequency,
      adaptiveInterval
    }
    adaptiveInterval = calculateOptimalSyncIntervalWithOptions(intervalOptions)
    
    // 设置定时同步，使用自适应间隔
    autoSyncTimer = setInterval(executeSync, adaptiveInterval)
    
    console.log(`[自适应同步] 房间 ${roomName} 初始同步间隔: ${adaptiveInterval}ms`)
    
    // 设置文档变更监听
    setupDocumentChangeMonitoring()
    
    // 返回清理函数
    return stopSync
  }

  /**
   * 清除当前的定时器
   */
  function clearCurrentTimer() {
    if (autoSyncTimer) {
      clearInterval(autoSyncTimer)
      autoSyncTimer = null
    }
  }

  /**
   * 设置文档变更监控
   */
  function setupDocumentChangeMonitoring() {
    if (cleanupFunction) {
      cleanupFunction()
    }
    cleanupFunction = setupDocumentChangeMonitoringWithContext(ydoc, changeRecorder)
  }

  /**
   * 手动触发同步
   * @returns {boolean} 是否成功触发同步
   */
  function triggerSync() {
    let synced = false
    const provider = getProvider()
    
    // WebRTC同步
    if (provider?.connected) {
      const syncTimestamp = Date.now()
      store.state[autoSync.heartbeatField] = syncTimestamp
      lastSyncTime = syncTimestamp
      recordDocumentChange()
      synced = true
    }

    // 思源同步
    if (siyuanSocket) {
      synced = syncWithSiyuan() || synced
    }

    return synced
  }

  /**
   * 通过思源同步数据
   * @returns {boolean} 是否成功同步
   */
  function syncWithSiyuan() {
    try {
      siyuanSocket.send(JSON.stringify({
        type: 'sync',
        room: roomName,
        state: store.state
      }))
      return true
    } catch (error) {
      console.warn('[思源同步] 发送同步消息失败:', error)
      return false
    }
  }

  /**
   * 更新自动同步配置
   * @param {Object} config - 新的配置
   * @returns {Object} 更新后的配置
   */
  function setConfig(config) {
    Object.assign(autoSync, updateAutoSyncConfig(autoSync, config))
    setupAutoSync()
    return { ...autoSync }
  }

  /**
   * 获取同步状态
   * @returns {Object} 同步状态信息
   */
  function getStatus() {
    return getAutoSyncStatus({
      autoSync,
      autoSyncTimer,
      adaptiveInterval,
      changeFrequency,
      lastNetworkCheck,
      lastSyncTime
    })
  }

  /**
   * 停止同步
   */
  function stopSync() {
    clearCurrentTimer()
    
    if (cleanupFunction) {
      cleanupFunction()
      cleanupFunction = null
    }
  }

  /**
   * 更新网络检查信息
   * @param {Object} networkInfo - 网络信息
   */
  function updateNetworkInfo(networkInfo) {
    lastNetworkCheck = {
      ...lastNetworkCheck,
      ...networkInfo,
      time: Date.now()
    }
    
    // 网络状态变化时重新计算同步间隔
    if (autoSync.enabled && autoSyncTimer) {
      adaptiveInterval = calculateOptimalSyncIntervalWithOptions({
        autoSync,
        lastNetworkCheck,
        lastSyncTime,
        changeFrequency,
        adaptiveInterval
      })
    }
  }

  // 初始化
  setupAutoSync()

  return {
    setupAutoSync,
    triggerSync,
    setConfig,
    getStatus,
    stopSync,
    updateNetworkInfo,
    // 内部状态导出（用于调试和诊断）
    getInternalState: () => ({
      autoSync: { ...autoSync },
      lastSyncTime,
      changeFrequency,
      adaptiveInterval,
      lastNetworkCheck: { ...lastNetworkCheck }
    })
  }
}

export default {
  createSyncManager
} 