import { getApiUrl, handleApiError } from './utils/apiConfig';
import { fetchWithTimeout, getAuthHeaders } from './utils/fetchUtils';

/**
 * 发送广播相关请求的通用方法
 * @private
 * @param {string} endpoint - API 端点
 * @param {Object} data - 请求数据
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: Object}>}
 */
const sendBroadcastRequest = async (endpoint, data, options = {}) => {
  try {
    const response = await fetchWithTimeout(getApiUrl(`/api/broadcast/${endpoint}`, options.host), {
      method: 'POST',
      headers: {
        ...getAuthHeaders({ token: options.token }),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (err) {
    return handleApiError(err, `广播${endpoint}操作`);
  }
};

/**
 * 创建WebSocket广播连接
 * @param {string} channel - 频道名称
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {WebSocket} WebSocket连接实例
 */
export const createBroadcastConnection = (channel, options = {}) => {
  if (!channel) {
    throw new Error('频道名称不能为空');
  }
  const wsUrl = getApiUrl(`/ws/broadcast?channel=${channel}`, options.host).replace('http', 'ws');
  const ws = new WebSocket(wsUrl);
  
  ws.onclose = (event) => {
    console.log(`频道 [${channel}] 连接关闭, 状态码: ${event.code}, 原因: ${event.reason}`);
  };
  
  ws.onerror = (error) => {
    console.error(`频道 [${channel}] 连接错误:`, error);
  };
  
  return ws;
};

/**
 * 发送消息到广播频道
 * @param {Object} params - 发送选项
 * @param {string} params.channel - 频道名称
 * @param {string} params.message - 消息内容
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     channel: {
 *       name: string,
 *       count: number
 *     }
 *   }
 * }>}
 */
export const postMessage = (params, options = {}) => {
  const { channel, message } = params;
  if (!channel || !message) {
    return Promise.resolve({
      code: -1,
      msg: '频道名称和消息内容不能为空',
      data: null
    });
  }
  return sendBroadcastRequest('postMessage', { channel, message }, options);
};

/**
 * 获取频道信息
 * @param {string} name - 频道名称
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     channel: {
 *       name: string,
 *       count: number
 *     }
 *   }
 * }>}
 */
export const getChannelInfo = (name, options = {}) => {
  if (!name) {
    return Promise.resolve({
      code: -1,
      msg: '频道名称不能为空',
      data: null
    });
  }
  return sendBroadcastRequest('getChannelInfo', { name }, options);
};

/**
 * 获取所有频道列表
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     channels: Array<{
 *       name: string,
 *       count: number
 *     }>
 *   }
 * }>}
 */
export const getChannels = (options = {}) => {
  return sendBroadcastRequest('getChannels', {}, options);
};

// 使用示例：
/*
// 创建WebSocket连接
const ws = createBroadcastConnection('test-channel');
ws.onmessage = (event) => {
  console.log('收到消息:', event.data);
};

// 发送消息
await postMessage({
  channel: 'test-channel',
  message: 'Hello World!'
});

// 获取频道信息
const channelInfo = await getChannelInfo('test-channel');

// 获取所有频道
const channels = await getChannels();
*/ 