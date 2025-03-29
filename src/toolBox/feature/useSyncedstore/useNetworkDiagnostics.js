import { getYjsValue } from '../../../../static/@syncedstore/core.js'
import * as Y from '../../../../static/yjs.js'

/**
 * 估算文档大小
 * @param {Y.Doc} doc Yjs文档
 * @returns {number} 文档大小(字节)
 */
export const getEstimatedDocSize = (doc) => {
  if (!doc) return 0
  try {
    const yDoc = getYjsValue(doc)
    if (yDoc) {
      const encoder = new Y.encoding.YDocEncoder(yDoc)
      const buf = encoder.toBuffer()
      return buf.byteLength
    }
    return 0
  } catch (e) {
    console.warn('估算文档大小失败', e)
    return -1
  }
}

/**
 * 检查是否有本地更改未同步
 * @param {Y.Doc} doc Yjs文档
 * @returns {boolean} 是否有未同步的更改
 */
export const hasLocalChanges = (doc) => {
  if (!doc) return false
  try {
    // 这里需要根据具体实现适配
    return false // 简化实现
  } catch (e) {
    return false
  }
}

/**
 * 获取文档更新次数
 * @param {Y.Doc} doc Yjs文档
 * @returns {number} 更新次数
 */
export const getUpdatesCount = (doc) => {
  if (!doc) return 0
  try {
    return 0 // 需要根据实际情况实现
  } catch (e) {
    return 0
  }
}

/**
 * 评估连接质量
 * @param {Object} info 连接信息
 * @returns {string} 连接质量评级
 */
export const getConnectionQualityRating = (info) => {
  if (!info.rtcStatus.connected) return '未连接'
  if (info.latency < 100) return '优秀'
  if (info.latency < 200) return '良好'
  if (info.latency < 500) return '一般'
  return '较差'
}

/**
 * 生成诊断消息和建议
 * @param {Object} info 诊断信息
 * @returns {string} 诊断消息
 */
export const generateDiagnosticMessage = (info) => {
  const messages = []
  
  if (!info.rtcStatus.connected) {
    messages.push('WebRTC未连接，请检查网络环境')
    if (!info.rtcStatus.signalingConnected) {
      messages.push('信令服务器连接失败，可能是防火墙限制或网络问题')
    }
  }
  
  if (info.latency > 500) {
    messages.push('网络延迟较高，可能影响协作体验')
  }
  
  const failedServers = info.signalingTests.filter(s => s.status !== '可用').length
  if (failedServers > 0) {
    messages.push(`${failedServers}个信令服务器连接异常，建议尝试使用自定义服务器`)
  }
  
  if (info.networkType === '2g' || info.networkType === 'slow-2g') {
    messages.push('检测到网络环境较差，协作功能可能受限')
  }
  
  return messages.join('；') || '连接正常，未发现明显问题'
}

/**
 * 诊断WebRTC连接状态
 * @param {WebrtcProvider} provider WebRTC提供者实例
 * @returns {Promise<Object>} 诊断结果
 */
export const diagnoseConnection = async (provider) => {
  if (!provider) return { status: '未初始化', peers: 0, latency: -1 }
  
  const peers = provider.awareness?.getStates()?.size || 0
  let latency = -1
  
  // 只在未连接时才测试信令服务器
  const signalingTests = provider.connected ? [] : await testSignalingServers(provider)
  latency = provider.connected ? 
    (provider._lastMessageReceived ? Date.now() - provider._lastMessageReceived : -1) :
    calculateOverallLatency(signalingTests)
  
  // 获取连接状态信息
  const connectionInfo = {
    status: provider.connected ? '已连接' : '未连接',
    peers,
    latency,
    signalingTests,
    rtcStatus: getRtcStatus(provider),
    docStats: getDocStats(provider),
    networkInfo: getNetworkInfo(provider),
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    ...getNetworkMetrics()
  }

  return connectionInfo
}

/**
 * 测试所有信令服务器
 * @param {WebrtcProvider} provider WebRTC提供者实例
 * @returns {Promise<Array>} 测试结果
 */
const testSignalingServers = async (provider) => {
  const signalingTests = []
  
  try {
    if (provider.signalingUrls?.length > 0) {
      for (const wsUrl of provider.signalingUrls) {
        const testResult = await testSignalingServer(wsUrl)
        signalingTests.push(testResult)
      }
    }
  } catch (e) {
    console.warn('测量信令服务器延迟失败', e)
  }
  
  return signalingTests
}

/**
 * 测试单个信令服务器
 * @param {string} wsUrl WebSocket URL
 * @returns {Promise<Object>} 测试结果
 */
const testSignalingServer = async (wsUrl) => {
  try {
    const url = wsUrl.replace('wss://', 'https://')
    const start = Date.now()
    const response = await fetch(url, { 
      method: 'HEAD', 
      cache: 'no-store',
      signal: AbortSignal.timeout(2000)
    })
    const currentLatency = Date.now() - start
    
    return {
      url: wsUrl,
      latency: currentLatency,
      status: response.ok ? '可用' : '响应异常',
      statusCode: response.status
    }
  } catch (e) {
    return {
      url: wsUrl,
      latency: -1,
      status: '连接失败',
      error: e.message
    }
  }
}

/**
 * 计算总体延迟
 * @param {Array} signalingTests 信令服务器测试结果
 * @returns {number} 最低延迟
 */
const calculateOverallLatency = (signalingTests) => {
  const validLatencies = signalingTests
    .map(test => test.latency)
    .filter(latency => latency > 0)
  
  return validLatencies.length > 0 
    ? Math.min(...validLatencies)
    : -1
}

/**
 * 获取RTC状态
 * @param {WebrtcProvider} provider WebRTC提供者实例
 * @returns {Object} RTC状态信息
 */
const getRtcStatus = (provider) => ({
  connected: provider.connected,
  connecting: !!provider.connecting,
  signalingConnected: provider.signalingConns?.size > 0,
  peerCount: provider.awareness?.getStates()?.size || 0,
  roomName: provider.roomName,
  bcConnected: !!provider.bcconnected
})

/**
 * 获取文档统计信息
 * @param {WebrtcProvider} provider WebRTC提供者实例
 * @returns {Object} 文档统计信息
 */
const getDocStats = (provider) => ({
  clientID: provider.doc?.clientID,
  size: getEstimatedDocSize(provider.doc),
  hasLocalChanges: hasLocalChanges(provider.doc),
  updatesCount: getUpdatesCount(provider.doc)
})

/**
 * 获取网络配置信息
 * @param {WebrtcProvider} provider WebRTC提供者实例
 * @returns {Object} 网络配置信息
 */
const getNetworkInfo = (provider) => ({
  signalingServers: provider.signalingUrls?.length || 0,
  iceServers: provider.peerOpts?.config?.iceServers?.length || 0
})

/**
 * 获取网络性能指标
 * @returns {Object} 网络性能指标
 */
const getNetworkMetrics = () => ({
  networkType: navigator.connection ? navigator.connection.effectiveType : '未知',
  downlink: navigator.connection ? navigator.connection.downlink : '未知',
  rtt: navigator.connection ? navigator.connection.rtt : '未知'
}) 