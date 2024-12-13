import { getApiUrl, handleApiError } from './utils/apiConfig';
import { fetchWithTimeout, getAuthHeaders } from './utils/fetchUtils';

/**
 * 与 ChatGPT 对话
 * @param {string} msg - 发送给 ChatGPT 的消息
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,  // 0表示成功，其他值表示失败
 *   msg: string,   // 返回消息
 *   data: {
 *     reply: string  // ChatGPT 的回复内容
 *   }
 * }>}
 */
export const chatGPT = async (msg, options = {}) => {
  try {
    const response = await fetchWithTimeout(getApiUrl('/api/ai/chatGPT', options.host), {
      method: 'POST',
      headers: getAuthHeaders({ token: options.token }),
      body: JSON.stringify({ msg })
    });
    return await response.json();
  } catch (err) {
    return handleApiError(err, 'ChatGPT 对话');
  }
};

/**
 * 针对特定内容块执行 ChatGPT 操作
 * @param {string[]} ids - 内容块 ID 数组
 * @param {string} action - 操作类型（如：总结、翻译等）
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,  // 0表示成功，其他值表示失败
 *   msg: string,   // 返回消息
 *   data: {
 *     results: Array<{
 *       id: string,     // 内容块ID
 *       content: string // 处理后的内容
 *     }>
 *   }
 * }>}
 */
export const chatGPTWithAction = async (ids, action, options = {}) => {
  try {
    const response = await fetchWithTimeout(getApiUrl('/api/ai/chatGPTWithAction', options.host), {
      method: 'POST',
      headers: getAuthHeaders({ token: options.token }),
      body: JSON.stringify({ 
        ids,
        action 
      })
    });
    return await response.json();
  } catch (err) {
    return handleApiError(err, 'ChatGPT 操作执行');
  }
};
