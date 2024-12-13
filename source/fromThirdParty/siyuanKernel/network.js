import { getApiUrl, handleApiError } from './utils/apiConfig';
import { fetchWithTimeout, getAuthHeaders } from './utils/fetchUtils';

/**
 * 发送网络相关请求的通用方法
 * @private
 * @param {string} endpoint - API 端点
 * @param {Object} data - 请求数据
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,  // 0表示成功，其他值表示失败
 *   msg: string,   // 返回消息
 *   data: Object   // 返回数据
 * }>}
 */
const sendNetworkRequest = async (endpoint, data, options = {}) => {
  try {
    const response = await fetchWithTimeout(getApiUrl(`/api/network/${endpoint}`, options.host), {
      method: 'POST',
      headers: {
        ...getAuthHeaders({ token: options.token }),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (err) {
    return handleApiError(err, `网络${endpoint}操作`);
  }
};

/**
 * 代理转发请求
 * @param {Object} params - 转发选项
 * @param {string} params.url - 目标URL
 * @param {string} [params.method='POST'] - 请求方法
 * @param {number} [params.timeout=7000] - 超时时间(毫秒)
 * @param {Array<Object>} params.headers - 请求头
 * @param {string} [params.contentType='application/json'] - 内容类型
 * @param {string} [params.payloadEncoding='json'] - 负载编码(json/base64/base64-url/base32/hex/text)
 * @param {string} params.payload - 请求负载
 * @param {string} [params.responseEncoding='text'] - 响应编码(text/base64/base64-url/base32/hex)
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     url: string,           // 请求URL
 *     status: number,        // HTTP状态码
 *     contentType: string,   // 响应内容类型
 *     body: string,          // 响应内容
 *     bodyEncoding: string,  // 响应编码方式
 *     headers: Object,       // 响应头
 *     elapsed: number        // 请求耗时(毫秒)
 *   }
 * }>}
 */
export const forwardProxy = (params, options = {}) => {
  const {
    url,
    method = 'POST',
    timeout = 7000,
    headers = [],
    contentType = 'application/json',
    payloadEncoding = 'json',
    responseEncoding = 'text',
    payload
  } = params;

  if (!url) {
    return Promise.resolve({
      code: -1,
      msg: '目标URL不能为空',
      data: null
    });
  }

  // 验证URL格式
  try {
    new URL(url);
  } catch (e) {
    return Promise.resolve({
      code: -1,
      msg: '无效的URL格式',
      data: null
    });
  }

  // 验证编码类型
  const validEncodings = ['json', 'base64', 'base64-url', 'base32', 'hex', 'text'];
  if (!validEncodings.includes(payloadEncoding)) {
    return Promise.resolve({
      code: -2,
      msg: '不支持的负载编码类型',
      data: null
    });
  }

  if (!validEncodings.includes(responseEncoding)) {
    return Promise.resolve({
      code: -2,
      msg: '不支持的响应编码类型',
      data: null
    });
  }

  return sendNetworkRequest('forwardProxy', {
    url,
    method: method.toUpperCase(),
    timeout: Math.max(1000, timeout),
    headers,
    contentType,
    payloadEncoding,
    payload,
    responseEncoding
  }, options);
};

/**
 * 回显请求信息
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     Context: {
 *       Params: Array,           // 请求参数
 *       HandlerNames: string[],  // 处理器名称
 *       FullPath: string,        // 完整路径
 *       ClientIP: string,        // 客户端IP
 *       RemoteIP: string,        // 远程IP
 *       ContentType: string,     // 内容类型
 *       IsWebsocket: boolean,    // 是否WebSocket
 *       RawData: string         // 原始数据
 *     },
 *     Request: Object,          // 请求信息
 *     URL: Object,             // URL信息
 *     User: Object            // 用户信息
 *   }
 * }>}
 */
export const echo = (options = {}) => {
  return sendNetworkRequest('echo', {}, options);
};

// 使用示例：
/*
// 代理转发请求
const proxyResult = await forwardProxy({
  url: 'https://example.com/api',
  method: 'POST',
  timeout: 5000,
  headers: [
    { 'Authorization': 'Bearer token123' }
  ],
  contentType: 'application/json',
  payload: JSON.stringify({ key: 'value' }),
  responseEncoding: 'text'
});

// 回显请求信息
const echoResult = await echo();
*/ 