import { getApiUrl, handleApiError } from './utils/apiConfig';
import { fetchWithTimeout, getAuthHeaders } from './utils/fetchUtils';

/**
 * 发送剪贴板相关请求的通用方法
 * @private
 * @param {string} endpoint - API 端点
 * @param {Object} data - 请求数据
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: Object}>}
 */
const sendClipboardRequest = async (endpoint, data, options = {}) => {
  try {
    const response = await fetchWithTimeout(getApiUrl(`/api/clipboard/${endpoint}`, options.host), {
      method: 'POST',
      headers: {
        ...getAuthHeaders({ token: options.token }),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (err) {
    return handleApiError(err, `剪贴板${endpoint}操作`);
  }
};

/**
 * 获取剪贴板内容
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     text: string,
 *     html: string
 *   }
 * }>}
 */
export const getClipboard = (options = {}) => {
  return sendClipboardRequest('getClipboard', {}, options);
};

/**
 * 设置剪贴板内容
 * @param {Object} params - 剪贴板内容
 * @param {string} [params.text] - 纯文本内容
 * @param {string} [params.html] - HTML内容
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const setClipboard = (params, options = {}) => {
  if (!params?.text && !params?.html) {
    return Promise.resolve({
      code: -1,
      msg: '剪贴板内容不能为空',
      data: null
    });
  }
  return sendClipboardRequest('setClipboard', params, options);
};

/**
 * 读取剪贴板中的文件路径
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: string[]
 * }>}
 */
export const readFilePaths = (options = {}) => {
  return sendClipboardRequest('readFilePaths', {}, options);
};

/**
 * 添加块到剪贴板
 * @param {Object} params - 选项
 * @param {string} params.id - 块ID
 * @param {string} [params.format='text/html'] - 格式：'text/html' | 'text/plain'
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const addBlockToClipboard = (params, options = {}) => {
  const { id, format = 'text/html' } = params;
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '块ID不能为空',
      data: null
    });
  }
  if (format !== 'text/html' && format !== 'text/plain') {
    return Promise.resolve({
      code: -1,
      msg: '无效的格式',
      data: null
    });
  }
  return sendClipboardRequest('addBlockToClipboard', { id, format }, options);
};

// 使用示例：
/*
// 获取剪贴板内容
const clipboard = await getClipboard();
console.log('剪贴板文本:', clipboard.data.text);
console.log('剪贴板HTML:', clipboard.data.html);

// 设置剪贴板内容
await setClipboard({
  text: '纯文本内容',
  html: '<b>HTML内容</b>'
});

// 添加块到剪贴板
await addBlockToClipboard('20210808180117-6v0mkxr', 'text/html');
*/ 