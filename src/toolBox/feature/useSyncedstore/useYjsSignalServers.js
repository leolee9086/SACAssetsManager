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
 