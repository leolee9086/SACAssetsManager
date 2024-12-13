import { getApiUrl, handleApiError } from './utils/apiConfig';
import { fetchWithTimeout, getAuthHeaders } from './utils/fetchUtils';

/**
 * 发送通知相关请求的通用方法
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
const sendNotificationRequest = async (endpoint, data, options = {}) => {
  try {
    const response = await fetchWithTimeout(getApiUrl(`/api/notification/${endpoint}`, options.host), {
      method: 'POST',
      headers: {
        ...getAuthHeaders({ token: options.token }),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (err) {
    return handleApiError(err, `通知${endpoint}操作`);
  }
};

/**
 * 推送普通消息
 * @param {Object} params - 消息选项
 * @param {string} params.msg - 消息内容
 * @param {number} [params.timeout=7000] - 超时时间(毫秒)
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     id: string  // 消息ID
 *   }
 * }>}
 */
export const pushMsg = (params, options = {}) => {
  const { msg, timeout = 7000 } = params;
  
  // 参考官方实现进行消息内容验证
  const trimmedMsg = msg?.trim();
  if (!trimmedMsg) {
    return Promise.resolve({
      code: -1,
      msg: 'msg can\'t be empty',
      data: null
    });
  }

  return sendNotificationRequest('pushMsg', {
    msg: trimmedMsg,
    timeout: Math.max(1000, timeout)
  }, options);
};

/**
 * 推送错误消息
 * @param {Object} params - 消息选项
 * @param {string} params.msg - 错误消息内容
 * @param {number} [params.timeout=7000] - 超时时间(毫秒)
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     id: string  // 消息ID
 *   }
 * }>}
 */
export const pushErrMsg = (params, options = {}) => {
  const { msg, timeout = 7000 } = params;
  
  if (!msg) {
    return Promise.resolve({
      code: -1,
      msg: '错误消息不能为空',
      data: null
    });
  }

  return sendNotificationRequest('pushErrMsg', {
    msg,
    timeout: Math.max(1000, timeout)
  }, options);
};

/**
 * 推送进度条消息
 * @param {Object} params - 消息选项
 * @param {string} params.msg - 消息内容
 * @param {number} [params.timeout=7000] - 超时时间(毫秒)
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     id: string  // 消息ID
 *   }
 * }>}
 */
export const pushProgress = (params, options = {}) => {
  const { msg, timeout = 7000 } = params;
  
  if (!msg) {
    return Promise.resolve({
      code: -1,
      msg: '消息内容不能为空',
      data: null
    });
  }

  return sendNotificationRequest('pushProgress', {
    msg,
    timeout: Math.max(1000, timeout)
  }, options);
};

/**
 * 更新进度条消息
 * @param {Object} params - 更新选项
 * @param {string} params.id - 消息ID
 * @param {string} params.msg - 新消息内容
 * @param {number} [params.timeout=7000] - 新的超时时间(毫秒)
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const updateProgress = (params, options = {}) => {
  const { id, msg, timeout = 7000 } = params;
  
  if (!id || !msg) {
    return Promise.resolve({
      code: -1,
      msg: '消息ID和内容不能为空',
      data: null
    });
  }

  return sendNotificationRequest('updateProgress', {
    id,
    msg,
    timeout: Math.max(1000, timeout)
  }, options);
};

// 使用示例：
/*
// 推送普通消息
const msgResult = await pushMsg({
  msg: '操作成功',
  timeout: 5000
});

// 推送错误消息
const errResult = await pushErrMsg({
  msg: '操作失败',
  timeout: 10000
});
*/ 