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
 * @param {Object} options.siyuanProvider - 思源WebSocket提供者（可选）
 * @returns {Object} 同步管理器实例
 */
export function createSyncManager(options) {
  const {
    ydoc,
    store,
    roomName,
    autoSync = createDefaultAutoSyncConfig(),
    getProvider,
    siyuanProvider = null
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
    
    // 立即执行一次同步，不等待定时器
    setTimeout(executeSync, 100)
    
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
    
    console.log(`[同步] 触发同步, 房间: ${roomName}, Provider状态:`, provider?.connected ? '已连接' : '未连接')
    
    // WebRTC同步
    if (provider?.connected) {
      try {
        const syncTimestamp = Date.now()
        
        // 更新心跳字段触发同步
        store.state[autoSync.heartbeatField] = syncTimestamp
        
        // 调用provider的同步方法（如果存在）
        if (typeof provider.sync === 'function') {
          provider.sync()
          console.log(`[同步] 调用provider.sync()成功, 房间: ${roomName}`)
        }
        
        // 调用awareness同步（如果存在）
        if (provider.awareness && typeof provider.awareness.update === 'function') {
          provider.awareness.update({ lastSync: syncTimestamp })
          console.log(`[同步] 更新awareness状态, 房间: ${roomName}`)
        }
        
        lastSyncTime = syncTimestamp
        recordDocumentChange()
        synced = true
        
        console.log(`[同步] WebRTC同步完成, 房间: ${roomName}`)
      } catch (err) {
        console.error(`[同步] WebRTC同步出错:`, err)
      }
    } else {
      console.warn(`[同步] WebRTC未连接或不可用, 房间: ${roomName}`)
    }

    // 思源同步 - 使用传入的siyuanProvider而不是socket
    if (siyuanProvider && siyuanProvider.wsconnected) {
      try {
        const success = syncWithSiyuanProvider(siyuanProvider)
        synced = success || synced
        console.log(`[同步] 思源同步${success ? '成功' : '失败'}, 房间: ${roomName}`)
      } catch (err) {
        console.error(`[同步] 思源同步出错:`, err)
      }
    }

    return synced
  }

  /**
   * 通过思源Provider同步数据
   * @param {Object} provider - 思源Provider实例
   * @returns {boolean} 是否成功同步
   */
  function syncWithSiyuanProvider(provider) {
    try {
      // 检查思源Provider是否可用
      if (!provider || !provider.wsconnected) {
        console.warn(`[同步] 思源Provider未连接，尝试重新连接`);
        return false;
      }
      
      const syncTimestamp = Date.now();
      
      // 调用sync方法 - 添加重试机制
      let success = false;
      try {
        provider.sync();
        success = true;
      } catch (syncError) {
        console.warn(`[同步] 思源同步首次尝试失败，准备重试:`, syncError);
        
        // 重试思源同步
        setTimeout(() => {
          try {
            provider.sync();
            console.log(`[同步] 思源同步重试成功, 房间: ${roomName}`);
          } catch (retryError) {
            console.error(`[同步] 思源同步重试失败:`, retryError);
          }
        }, 500);
      }
      
      // 更新最后同步时间
      lastSyncTime = syncTimestamp;
      recordDocumentChange();
      
      // 添加确认同步机制 - 再次同步以确保数据一致性
      if (success) {
        setTimeout(() => {
          try {
            if (provider && provider.wsconnected) {
              provider.sync();
              console.log(`[同步] 思源数据确认同步完成, 房间: ${roomName}`);
            }
          } catch (confirmError) {
            console.warn(`[同步] 思源数据确认同步失败:`, confirmError);
          }
        }, 1000); // 1秒后进行确认同步
      }
      
      return success;
    } catch (error) {
      console.error(`[同步] 通过思源Provider同步失败:`, error);
      return false;
    }
  }



  /**
   * 更新自动同步配置
   * @param {Object} config - 新的配置
   * @returns {Object} 更新后的配置
   */
  function setConfig(config) {
    // 更新配置
    Object.assign(autoSync, updateAutoSyncConfig(autoSync, config));
    
    // 如果启用了自动同步，重新启动
    if (autoSync.enabled) {
      startAutoSync();
    } else {
      stopAutoSync();
    }
    
    console.log(`[同步管理器] 房间 ${roomName} 更新配置:`, {...autoSync});
    return { ...autoSync };
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
   * 同步完成时的回调函数
   */
  function onSynced() {
    console.log(`[同步] 房间 ${roomName} 同步完成`);
    lastSyncTime = Date.now();
    recordDocumentChange();
    
    // 如果启用了自适应间隔，重新计算同步间隔
    if (autoSync.adaptive && autoSync.enabled && autoSyncTimer) {
      recalculateAndApplyInterval();
    }
  }

  /**
   * 启动自动同步
   * @returns {boolean} 是否成功启动
   */
  function startAutoSync() {
    // 清理现有设置
    stopAutoSync();
    
    // 重新初始化
    setupAutoSync();
    
    console.log(`[同步管理器] 房间 ${roomName} 启动自动同步，间隔: ${adaptiveInterval}ms`);
    return true;
  }

  /**
   * 停止自动同步
   */
  function stopAutoSync() {
    clearCurrentTimer();
    
    if (cleanupFunction) {
      cleanupFunction();
      cleanupFunction = null;
    }
    
    console.log(`[同步管理器] 房间 ${roomName} 停止自动同步`);
  }

  // 初始化
  if (autoSync.enabled) {
    startAutoSync();
  }

  return {
    triggerSync,
    onSynced,
    startAutoSync,
    stopAutoSync,
    setConfig,
    getStatus,
    getSiyuanProvider: () => siyuanProvider,
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