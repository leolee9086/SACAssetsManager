import { checkBatteryStatus } from '../../base/useBrowser/useDevice/useBetteryInfo.js'


/**
 * 获取当前网络连接信息
 * @returns {Object|null} 网络连接信息或null
 */
const getNetworkConnection = () => 
    navigator.connection || navigator.mozConnection || navigator.webkitConnection || null
  
  /**
   * 获取网络类型
   * @param {Object} connection 网络连接对象
   * @returns {string} 网络类型
   */
  const getNetworkType = (connection) => 
    connection ? connection.effectiveType : 'unknown'
  
  /**
   * 测量与服务器的延迟
   * @param {Array} signalingUrls 信令服务器URL列表
   * @param {number} defaultLatency 默认延迟值
   * @returns {Promise<number>} 测量的延迟值(毫秒)
   */
  const measureLatency = async (signalingUrls, defaultLatency) => {
    if (!signalingUrls || signalingUrls.length === 0) {
      return defaultLatency
    }
  
    const testUrl = signalingUrls[0].replace('wss://', 'https://')
    const start = Date.now()
    
    try {
      await fetch(testUrl, { 
        method: 'HEAD',
        cache: 'no-store',
        signal: AbortSignal.timeout(2000)
      })
      return Date.now() - start
    } catch (e) {
      return defaultLatency
    }
  }
  
  /**
   * 检测网络状况
   * @param {Object} provider WebRTC提供者
   * @param {Object} lastCheck 上次检查结果
   * @returns {Promise<Object>} 网络状况信息
   */
  const checkNetworkCondition = async (provider, lastCheck = { latency: 200, type: 'unknown' }) => {
    try {
      const connection = getNetworkConnection()
      const networkType = getNetworkType(connection)
      
      const signalingUrls = provider?.signalingUrls || []
      const latency = await measureLatency(signalingUrls, lastCheck.latency)
      
      const networkCheck = {
        time: Date.now(),
        latency,
        type: networkType
      }
      
      return networkCheck
    } catch (e) {
      console.warn('网络状况检查失败:', e)
      return lastCheck
    }
  }

/**
 * 计算最佳同步间隔
 * @param {Object} options 配置选项
 * @returns {number} 计算得出的同步间隔(ms)
 */
export const calculateOptimalSyncIntervalWithOptions = (options) => {
  const {
    autoSync,
    lastNetworkCheck,
    lastSyncTime,
    changeFrequency,
    adaptiveInterval
  } = options

  if (!autoSync.adaptiveMode) {
    return autoSync.interval
  }

  let newInterval = autoSync.interval

  // 基于变更频率调整
  if (changeFrequency > 0) {
    // 频繁变更时缩短间隔
    if (changeFrequency > 10) {
      newInterval *= 0.7
    } else if (changeFrequency > 5) {
      newInterval *= 0.85
    }
    // 低频变更时延长间隔
    else if (changeFrequency < 0.1) {
      newInterval *= 1.3
    } else if (changeFrequency < 0.5) {
      newInterval *= 1.15
    }
  }

  // 考虑网络状态
  if (autoSync.networkAware && lastNetworkCheck) {
    if (lastNetworkCheck.latency > 500) {
      newInterval *= 1.2 // 高延迟时增加间隔
    } else if (lastNetworkCheck.latency < 100) {
      newInterval *= 0.9 // 低延迟时减少间隔
    }

    // 根据网络类型调整
    if (lastNetworkCheck.type === '4g') {
      newInterval *= 0.9
    } else if (lastNetworkCheck.type === '3g') {
      newInterval *= 1.1
    } else if (lastNetworkCheck.type === '2g') {
      newInterval *= 1.5
    }
  }

  // 考虑电池状态
  if (autoSync.batteryAware && navigator.getBattery) {
    navigator.getBattery().then(battery => {
      if (!battery.charging && battery.level < 0.2) {
        newInterval *= 1.3 // 低电量时增加间隔
      }
    }).catch(() => {
      // 忽略错误
    })
  }

  // 确保间隔在允许范围内
  newInterval = Math.max(autoSync.minInterval, Math.min(autoSync.maxInterval, newInterval))

  // 如果变化不大，保持原间隔
  const changeRatio = Math.abs(newInterval - adaptiveInterval) / adaptiveInterval
  if (changeRatio < 0.2) {
    return adaptiveInterval
  }

  return Math.round(newInterval)
}

/**
 * 创建自动同步配置
 * @returns {Object} 默认的自动同步配置
 */
export const createDefaultAutoSyncConfig = () => ({
  enabled: false,
  interval: 5000,
  minInterval: 1000,
  maxInterval: 30000,
  adaptiveMode: true,
  syncOnChange: true,
  heartbeatField: '_lastSyncTime',
  batteryAware: true,
  networkAware: true
})

/**
 * 设置自动同步配置
 * @param {Object} currentConfig 当前配置
 * @param {Object|boolean} newConfig 新配置或布尔值
 * @returns {Object} 更新后的配置
 */
export const updateAutoSyncConfig = (currentConfig, newConfig) => {
  if (typeof newConfig === 'boolean') {
    return { ...currentConfig, enabled: newConfig }
  }
  return { ...currentConfig, ...newConfig }
}

/**
 * 获取自动同步状态
 * @param {Object} params 状态参数
 * @returns {Object} 自动同步状态信息
 */
export const getAutoSyncStatus = ({
  autoSync,
  autoSyncTimer,
  adaptiveInterval,
  changeFrequency,
  lastNetworkCheck,
  lastSyncTime
}) => ({
  ...autoSync,
  active: !!autoSyncTimer,
  currentInterval: adaptiveInterval,
  changeFrequency: Math.round(changeFrequency * 100) / 100,
  networkStatus: lastNetworkCheck,
  lastSyncTime
})
  