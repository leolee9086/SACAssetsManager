import { checkBatteryStatus } from '../../base/useBrowser/useDevice/useBetteryInfo.js'

// 常量配置
const DEFAULT_LATENCY = 200
const DEFAULT_NETWORK_TYPE = 'unknown'
const FETCH_TIMEOUT = 2000

// 变更频率阈值
const HIGH_CHANGE_FREQUENCY = 10
const MEDIUM_CHANGE_FREQUENCY = 5
const LOW_CHANGE_FREQUENCY = 0.5
const VERY_LOW_CHANGE_FREQUENCY = 0.1

// 网络延迟阈值 (ms)
const HIGH_LATENCY = 500
const LOW_LATENCY = 100

// 调整率
const CHANGE_THRESHOLD = 0.2
const FREQ_HIGH_ADJUST = 0.7
const FREQ_MEDIUM_ADJUST = 0.85
const FREQ_LOW_ADJUST = 1.15
const FREQ_VERY_LOW_ADJUST = 1.3
const LATENCY_HIGH_ADJUST = 1.2
const LATENCY_LOW_ADJUST = 0.9
const NETWORK_4G_ADJUST = 0.9
const NETWORK_3G_ADJUST = 1.1
const NETWORK_2G_ADJUST = 1.5
const BATTERY_LOW_ADJUST = 1.3

// 电池阈值
const LOW_BATTERY = 0.2

// 默认配置
const DEFAULT_CONFIG = {
  enabled: false,
  interval: 5000,
  minInterval: 1000,
  maxInterval: 30000,
  adaptiveMode: true,
  syncOnChange: true,
  heartbeatField: '_lastSyncTime',
  batteryAware: true,
  networkAware: true
}

/**
 * 获取当前网络连接信息
 * @returns {Object|null} 网络连接信息或null
 */
function getNetworkConnection() {
  return navigator.connection || navigator.mozConnection || navigator.webkitConnection || null
}

/**
 * 获取网络类型
 * @param {Object} connection 网络连接对象
 * @returns {string} 网络类型
 */
function getNetworkType(connection) {
  return connection ? connection.effectiveType : DEFAULT_NETWORK_TYPE
}

/**
 * 测量与服务器的延迟
 * @param {Array} signalingUrls 信令服务器URL列表
 * @param {number} defaultLatency 默认延迟值
 * @returns {Promise<number>} 测量的延迟值(毫秒)
 */
async function measureLatency(signalingUrls, defaultLatency) {
  if (!signalingUrls || signalingUrls.length === 0) {
    return defaultLatency
  }

  const testUrl = signalingUrls[0].replace('wss://', 'https://')
  const start = Date.now()
  
  try {
    await fetch(testUrl, { 
      method: 'HEAD',
      cache: 'no-store',
      signal: AbortSignal.timeout(FETCH_TIMEOUT)
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
async function checkNetworkCondition(provider, lastCheck = { latency: DEFAULT_LATENCY, type: DEFAULT_NETWORK_TYPE }) {
  try {
    const connection = getNetworkConnection()
    const networkType = getNetworkType(connection)
    
    const signalingUrls = provider?.signalingUrls || []
    const latency = await measureLatency(signalingUrls, lastCheck.latency)
    
    return {
      time: Date.now(),
      latency,
      type: networkType
    }
  } catch (e) {
    console.warn('网络状况检查失败:', e)
    return lastCheck
  }
}

/**
 * 根据变更频率调整同步间隔
 * @param {number} interval 当前间隔
 * @param {number} frequency 变更频率
 * @returns {number} 调整后的间隔
 */
function adjustByChangeFrequency(interval, frequency) {
  if (frequency <= 0) return interval
  
  // 频繁变更时缩短间隔
  if (frequency > HIGH_CHANGE_FREQUENCY) {
    return interval * FREQ_HIGH_ADJUST
  } 
  
  if (frequency > MEDIUM_CHANGE_FREQUENCY) {
    return interval * FREQ_MEDIUM_ADJUST
  }
  
  // 低频变更时延长间隔
  if (frequency < VERY_LOW_CHANGE_FREQUENCY) {
    return interval * FREQ_VERY_LOW_ADJUST
  } 
  
  if (frequency < LOW_CHANGE_FREQUENCY) {
    return interval * FREQ_LOW_ADJUST
  }
  
  return interval
}

/**
 * 根据网络状况调整同步间隔
 * @param {number} interval 当前间隔
 * @param {Object} networkCheck 网络检查结果
 * @returns {number} 调整后的间隔
 */
function adjustByNetworkCondition(interval, networkCheck) {
  if (!networkCheck) return interval
  
  let adjusted = interval
  
  // 根据延迟调整
  if (networkCheck.latency > HIGH_LATENCY) {
    adjusted *= LATENCY_HIGH_ADJUST // 高延迟时增加间隔
  } else if (networkCheck.latency < LOW_LATENCY) {
    adjusted *= LATENCY_LOW_ADJUST // 低延迟时减少间隔
  }

  // 根据网络类型调整
  if (networkCheck.type === '4g') {
    adjusted *= NETWORK_4G_ADJUST
  } else if (networkCheck.type === '3g') {
    adjusted *= NETWORK_3G_ADJUST
  } else if (networkCheck.type === '2g') {
    adjusted *= NETWORK_2G_ADJUST
  }
  
  return adjusted
}

/**
 * 计算最佳同步间隔
 * @param {Object} options 配置选项
 * @returns {number} 计算得出的同步间隔(ms)
 */
export function calculateOptimalSyncIntervalWithOptions(options) {
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
  newInterval = adjustByChangeFrequency(newInterval, changeFrequency)

  // 考虑网络状态
  if (autoSync.networkAware && lastNetworkCheck) {
    newInterval = adjustByNetworkCondition(newInterval, lastNetworkCheck)
  }

  // 考虑电池状态
  if (autoSync.batteryAware && navigator.getBattery) {
    adjustByBatteryStatus(newInterval).then(adjusted => {
      newInterval = adjusted
    }).catch(() => {
      // 忽略错误
    })
  }

  // 确保间隔在允许范围内
  newInterval = Math.max(autoSync.minInterval, Math.min(autoSync.maxInterval, newInterval))

  // 如果变化不大，保持原间隔
  const changeRatio = Math.abs(newInterval - adaptiveInterval) / adaptiveInterval
  if (changeRatio < CHANGE_THRESHOLD) {
    return adaptiveInterval
  }

  return Math.round(newInterval)
}

/**
 * 根据电池状态调整同步间隔
 * @param {number} interval 当前间隔
 * @returns {Promise<number>} 调整后的间隔
 */
async function adjustByBatteryStatus(interval) {
  try {
    const battery = await navigator.getBattery()
    if (!battery.charging && battery.level < LOW_BATTERY) {
      return interval * BATTERY_LOW_ADJUST // 低电量时增加间隔
    }
    return interval
  } catch {
    return interval
  }
}

/**
 * 创建自动同步配置
 * @returns {Object} 默认的自动同步配置
 */
export function createDefaultAutoSyncConfig() {
  return { ...DEFAULT_CONFIG }
}

/**
 * 设置自动同步配置
 * @param {Object} currentConfig 当前配置
 * @param {Object|boolean} newConfig 新配置或布尔值
 * @returns {Object} 更新后的配置
 */
export function updateAutoSyncConfig(currentConfig, newConfig) {
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
export function getAutoSyncStatus({
  autoSync,
  autoSyncTimer,
  adaptiveInterval,
  changeFrequency,
  lastNetworkCheck,
  lastSyncTime
}) {
  return {
    ...autoSync,
    active: !!autoSyncTimer,
    currentInterval: adaptiveInterval,
    changeFrequency: Math.round(changeFrequency * 100) / 100,
    networkStatus: lastNetworkCheck,
    lastSyncTime
  }
}
  