/**
 * 网络连接检查工具集
 * @module NetworkChecker
 */

/**
 * WebSocket连接检查
 * @param {Object} options - 配置选项
 * @param {string} options.url - 要检查的WebSocket地址
 * @param {number} [options.timeout=3000] - 超时时间(毫秒)
 * @returns {Promise<{url: string, available: boolean, latency: number}>} 检查结果
 */
export const checkServerConnection = ({ url, timeout = 3000 }) => {
  return new Promise((resolve) => {
    const socket = new WebSocket(url);
    const startTime = Date.now();
    let timeoutId = setTimeout(() => {
      socket.close();
      resolve({ url, available: false, latency: Infinity });
    }, timeout);

    socket.onopen = () => {
      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;
      socket.close();
      resolve({ url, available: true, latency });
    };

    socket.onerror = () => {
      clearTimeout(timeoutId);
      resolve({ url, available: false, latency: Infinity });
    };
  });
}

/**
 * HTTP连接可达性测试
 * @param {Object} options - 配置选项
 * @param {string} options.url - 要测试的HTTP地址
 * @param {number} [options.timeout=5000] - 超时时间(毫秒)
 * @returns {Promise<{
 *   url: string,
 *   available: boolean,
 *   latency: number,
 *   status: number,
 *   headers: Object,
 *   contentType: string|null,
 *   server: string|null,
 *   redirects: boolean,
 *   size: number,
 *   error?: string,
 *   message?: string
 * }>} 测试结果
 */
export const testUrlReachability = async ({ url, timeout = 5000 }) => {
  try {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: { 'Cache-Control': 'no-cache' }
    });
    
    clearTimeout(timeoutId);
    const latency = Date.now() - startTime;
    const headers = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    return {
      url,
      available: response.ok,
      latency: response.ok ? latency : Infinity,
      status: response.status,
      headers,
      contentType: headers['content-type'] || null,
      server: headers.server || null,
      redirects: response.redirected,
      size: parseInt(headers['content-length']) || 0
    };
  } catch (error) {
    return {
      url,
      available: false,
      latency: Infinity,
      status: 0,
      error: error.name,
      message: error.message
    };
  }
}

/**
 * 混合检查方法(同时检查WebSocket和HTTP连接)
 * @param {Object} options - 配置选项
 * @param {string} options.wsUrl - WebSocket地址
 * @param {string} options.httpUrl - HTTP地址
 * @returns {Promise<{
 *   ws: Object,
 *   http: Object,
 *   allAvailable: boolean
 * }>} 混合检查结果
 */
export const checkHybridConnection = async ({ wsUrl, httpUrl }) => {
  const [wsResult, httpResult] = await Promise.all([
    checkServerConnection(wsUrl),
    testUrlReachability(httpUrl)
  ]);
  return {
    ws: wsResult,
    http: httpResult,
    allAvailable: wsResult.available && httpResult.available
  };
}

/**
 * 批量检查服务器状态
 * @param {Object} options - 配置选项
 * @param {string[]} options.servers - 要检查的服务器地址列表
 * @param {number} [options.timeout=3000] - 每个检查的超时时间(毫秒)
 * @returns {Promise<Array<{url: string, available: boolean, latency: number}>>} 已排序的检查结果列表
 */
export const checkAllServers = async ({ servers, timeout = 3000 }) => {
  const results = await Promise.all(servers.map(url => 
    checkServerConnection({ url, timeout })
  ))
  return results.sort((a, b) => {
    if (a.available && !b.available) return -1
    if (!a.available && b.available) return 1
    return a.latency - b.latency
  })
}