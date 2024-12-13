import { getApiUrl, handleApiError } from './utils/apiConfig';
import { fetchWithTimeout, getAuthHeaders } from './utils/fetchUtils';

/**
 * 发送书签相关请求的通用方法
 * @private
 * @param {string} endpoint - API 端点
 * @param {Object} data - 请求数据
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: Object}>}
 */
const sendBookmarkRequest = async (endpoint, data, options = {}) => {
  try {
    const response = await fetchWithTimeout(getApiUrl(`/api/bookmark/${endpoint}`, options.host), {
      method: 'POST',
      headers: {
        ...getAuthHeaders({ token: options.token }),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (err) {
    return handleApiError(err, `书签${endpoint}操作`);
  }
};

/**
 * 获取书签列表
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: Array<{
 *     id: string,
 *     title: string,
 *     url: string,
 *     icon: string,
 *     created: string,
 *     updated: string
 *   }>
 * }>}
 */
export const getBookmarks = (options = {}) => {
  return sendBookmarkRequest('getBookmark', {}, options);
};

/**
 * 删除书签
 * @param {string} bookmark - 书签名称
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {closeTimeout?: number}
 * }>}
 */
export const removeBookmark = (bookmark, options = {}) => {
  if (!bookmark) {
    return Promise.resolve({
      code: -1,
      msg: '书签名称不能为空',
      data: { closeTimeout: 5000 }
    });
  }
  return sendBookmarkRequest('removeBookmark', { bookmark }, options);
};

/**
 * 重命名书签
 * @param {Object} params - 重命名选项
 * @param {string} params.oldBookmark - 原书签名称
 * @param {string} params.newBookmark - 新书签名称
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {closeTimeout?: number}
 * }>}
 */
export const renameBookmark = (params, options = {}) => {
  const { oldBookmark, newBookmark } = params;
  if (!oldBookmark || !newBookmark) {
    return Promise.resolve({
      code: -1,
      msg: '原书签名称和新书签名称不能为空',
      data: { closeTimeout: 5000 }
    });
  }
  return sendBookmarkRequest('renameBookmark', { oldBookmark, newBookmark }, options);
};

/**
 * 添加书签
 * @param {Object} params - 书签选项
 * @param {string} params.bookmark - 书签名称
 * @param {string} params.url - 书签URL
 * @param {string} [params.icon] - 书签图标
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {closeTimeout?: number}
 * }>}
 */
export const addBookmark = (params, options = {}) => {
  const { bookmark, url, icon } = params;
  if (!bookmark || !url) {
    return Promise.resolve({
      code: -1,
      msg: '书签名称和URL不能为空',
      data: { closeTimeout: 5000 }
    });
  }
  return sendBookmarkRequest('addBookmark', { bookmark, url, icon }, options);
}; 