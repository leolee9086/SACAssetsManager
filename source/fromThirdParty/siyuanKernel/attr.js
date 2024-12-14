import { getApiUrl, handleApiError } from './utils/apiConfig.js';
import { fetchWithTimeout, getAuthHeaders } from './utils/fetchUtils.js';

/**
 * 发送属性相关请求的通用方法
 * @private
 * @param {string} endpoint - API端点名称
 * @param {Object} data - 请求数据
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<Object>} 返回API响应结果
 */
const sendAttrRequest = async (endpoint, data, options = {}) => {
  try {
    const response = await fetchWithTimeout(getApiUrl(`/api/attr/${endpoint}`, options.host), {
      method: 'POST',
      headers: getAuthHeaders({ token: options.token }),
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (err) {
    return handleApiError(err, `属性${endpoint}操作`);
  }
};

/**
 * 获取书签标签列表
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: string[]  // 书签标签列表
 * }>}
 */
export const getBookmarkLabels = (options = {}) => {
  return sendAttrRequest('getBookmarkLabels', {}, options);
};

/**
 * 批量获取块属性
 * @param {string[]} ids - 块ID列表
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {[key: string]: {[key: string]: string}}  // 块ID到属性的映射
 * }>}
 */
export const batchGetBlockAttrs = (ids, options = {}) => {
  if (!Array.isArray(ids) || ids.length === 0) {
    return Promise.resolve({
      code: -1,
      msg: '块ID列表不能为空',
      data: null
    });
  }
  return sendAttrRequest('batchGetBlockAttrs', { ids }, options);
};

/**
 * 获取单个块的属性
 * @param {string} id - 块ID
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {[key: string]: string}  // 块的属性键值对
 * }>}
 */
export const getBlockAttrs = (id, options = {}) => {
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '块ID不能为空',
      data: null
    });
  }
  return sendAttrRequest('getBlockAttrs', { id }, options);
};

/**
 * 设置块属性
 * @param {string} id - 块ID
 * @param {Object} attrs - 要设置的属性键值对
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: null
 * }>}
 */
export const setBlockAttrs = (id, attrs, options = {}) => {
  if (!id || !attrs || Object.keys(attrs).length === 0) {
    return Promise.resolve({
      code: -1,
      msg: '块ID和属性不能为空',
      data: null
    });
  }
  return sendAttrRequest('setBlockAttrs', { id, attrs }, options);
};

/**
 * 批量设置块属性
 * @param {Array<{id: string, attrs: Object}>} blockAttrs - 块属性设置列表
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: null
 * }>}
 */
export const batchSetBlockAttrs = (blockAttrs, options = {}) => {
  if (!Array.isArray(blockAttrs) || blockAttrs.length === 0) {
    return Promise.resolve({
      code: -1,
      msg: '块属性列表不能为空',
      data: null
    });
  }
  return sendAttrRequest('batchSetBlockAttrs', { blockAttrs }, options);
};

/**
 * 重置块属性
 * @param {string} id - 块ID
 * @param {Object} attrs - 要重置的属性键值对
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: null
 * }>}
 */
export const resetBlockAttrs = (id, attrs, options = {}) => {
  if (!id || !attrs || Object.keys(attrs).length === 0) {
    return Promise.resolve({
      code: -1,
      msg: '块ID和属性不能为空',
      data: null
    });
  }
  return sendAttrRequest('resetBlockAttrs', { id, attrs }, options);
}; 