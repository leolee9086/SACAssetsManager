import { GLOBAL_STUN_SERVERS,ASIA_PACIFIC_STUN_TURN_SERVERS } from './useStunServers.js'

export const GLOBAL_SIGNALING_SERVERS = [
    'wss://y-webrtc-signaling.onrender.com',
    'wss://signaling.yjs.dev',
    'wss://y-webrtc-signaling-us.herokuapp.com', 
    'wss://y-webrtc-signaling-eu.herokuapp.com',
    'wss://signaling.meething.space',
    'wss://webrtc-signaling.glitch.me',
]



// 亚地区及中国大陆可能更稳定的信令服务器,预留
export  const ASIA_PACIFIC_SIGNALING_SERVERS = [
]


// 检查单个 WSS 服务器连通性
const checkServerConnection = (url, timeout = 3000) => 
  new Promise((resolve) => {
    const startTime = Date.now()
    const ws = new WebSocket(url)
    const timeoutId = setTimeout(() => {
      ws.close()
      resolve({ url, status: 'timeout', latency: timeout, available: false })
    }, timeout)
    
    ws.onopen = () => {
      clearTimeout(timeoutId)
      const latency = Date.now() - startTime
      ws.close()
      resolve({ url, status: 'connected', latency, available: true })
    }
    
    ws.onerror = () => {
      clearTimeout(timeoutId)
      ws.close()
      resolve({ url, status: 'error', latency: Date.now() - startTime, available: false })
    }

    // 添加close事件处理
    ws.onclose = () => {
      clearTimeout(timeoutId)
      if (!ws.__opened) { // 如果未触发过open事件
        resolve({ url, status: 'closed', latency: Date.now() - startTime, available: false })
      }
    }
  })

// 检查所有服务器连通性并排序
export const checkAllServers = async () => {
  const results = await Promise.all(
    GLOBAL_SIGNALING_SERVERS.map(url => checkServerConnection(url))
  )
  
  // 按照延迟排序（可用的排在前面）
  return results.sort((a, b) => {
    if (a.available && !b.available) return -1
    if (!a.available && b.available) return 1
    return a.latency - b.latency
  })
}

// 获取最佳可用服务器
export const getBestAvailableServer = async () => {
  const results = await checkAllServers()
  const availableServer = results.find(server => server.available)
  return availableServer ? availableServer.url : null // 改为返回null而不是第一个服务器
}

// 带缓存的最佳服务器选择（避免频繁检测）
let cachedServerInfo = {
  url: null,
  timestamp: 0
}
const CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存

export const getOptimalServer = async (forceCheck = false, useFirstAsFallback = true) => {
  const now = Date.now()
  
  if (!forceCheck && cachedServerInfo.url && (now - cachedServerInfo.timestamp < CACHE_DURATION)) {
    return cachedServerInfo.url
  }
  
  const serverUrl = await getBestAvailableServer()
  cachedServerInfo = {
    url: serverUrl || (useFirstAsFallback ? GLOBAL_SIGNALING_SERVERS[0] : null),
    timestamp: now
  }
  
  return cachedServerInfo.url
}




/**
 * 根据网络环境选择最佳服务器
 * 这个简单实现基于访问时间来评估最快的服务器
 */
export const testSignalingServer = async (url) => {
  const start = Date.now()
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2000) // 缩短超时时间提高响应速度
    
    const testUrl = url.replace('wss://', 'https://')
    const response = await fetch(testUrl, {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-store' // 避免缓存影响测试结果
    })
    
    clearTimeout(timeoutId)
    return { url, time: Date.now() - start, success: response.ok }
  } catch (e) {
    return { url, time: Infinity, success: false }
  }
}

// 默认信令服务器列表 - 中国用户优先尝试亚太服务器
const DEFAULT_SIGNALING_SERVERS = [
  ...GLOBAL_SIGNALING_SERVERS
]




// 默认STUN/TURN服务器列表 - 中国用户优先尝试亚太服务器
const DEFAULT_ICE_SERVERS = [
  ...ASIA_PACIFIC_STUN_TURN_SERVERS,
  ...GLOBAL_STUN_SERVERS
]


export const selectBestServers = async () => {
  // 利用新开发的服务器检测功能获取最佳服务器
  try {
    console.log('正在使用优化后的连通性检查选择最佳信令服务器...')
    const bestServer = await getOptimalServer(true) // 强制检查所有服务器
    
    if (bestServer) {
      console.log('已获取最佳信令服务器:', bestServer)
      const servers = [bestServer]
      
      // 作为备用，获取所有可用服务器
      const allResults = await checkAllServers()
      const availableServers = allResults
        .filter(server => server.available)
        .map(server => server.url)
        .filter(url => url !== bestServer) // 移除已选的最佳服务器
      
      // 将剩余可用服务器添加到列表中
      servers.push(...availableServers)
      
      // 如果没有足够的服务器，添加默认服务器
      if (servers.length < 3) {
        const remainingServers = GLOBAL_SIGNALING_SERVERS.filter(url => !servers.includes(url))
        servers.push(...remainingServers)
      }
      
      return {
        signalingServers: servers,
        iceServers: DEFAULT_ICE_SERVERS
      }
    }
  } catch (error) {
    console.warn('优化的服务器检测失败，回退到传统方法:', error)
  }
  
  // 如果优化方法失败，回退到原有方法
  // 分批测试函数
  const batchTest = async (servers, batchSize = 5) => {
    const results = []
    for (let i = 0; i < servers.length; i += batchSize) {
      const batch = servers.slice(i, i + batchSize)
      const batchResults = await Promise.all(batch.map(url => testSignalingServer(url)))
      results.push(...batchResults)
      
      // 如果已经找到足够快的服务器，可以提前结束测试
      const fastServers = results.filter(r => r.success && r.time < 300)
      if (fastServers.length >= 3) break
    }
    return results
  }
  
  // 优先测试亚太服务器
  const asiaResults = await batchTest(ASIA_PACIFIC_SIGNALING_SERVERS)
  let fastAsiaServers = asiaResults
    .filter(result => result.success && result.time < 500)
    .sort((a, b) => a.time - b.time)
    .map(result => result.url)
  
  // 如果亚太地区服务器不够，再测试全球服务器
  if (fastAsiaServers.length < 3) {
    const globalResults = await batchTest(GLOBAL_SIGNALING_SERVERS)
    const fastGlobalServers = globalResults
      .filter(result => result.success)
      .sort((a, b) => a.time - b.time)
      .map(result => result.url)
    
    fastAsiaServers = [...fastAsiaServers, ...fastGlobalServers]
  }
  
  // 如果没有成功的服务器，使用默认列表
  const bestSignalingServers = fastAsiaServers.length > 0 
    ? fastAsiaServers 
    : DEFAULT_SIGNALING_SERVERS
  
  console.log('已选择最佳信令服务器:', bestSignalingServers.slice(0, 3))
  
  return {
    signalingServers: bestSignalingServers,
    iceServers: DEFAULT_ICE_SERVERS 
  }
}
