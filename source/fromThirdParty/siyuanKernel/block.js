import { getApiUrl, handleApiError } from './utils/apiConfig';
import { fetchWithTimeout, getAuthHeaders } from './utils/fetchUtils';

/**
 * 发送块相关请求的通用方法
 * @private
 * @param {string} endpoint - API 端点
 * @param {Object} data - 请求数据
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: Object}>}
 */
const sendBlockRequest = async (endpoint, data, options = {}) => {
  try {
    const response = await fetchWithTimeout(getApiUrl(`/api/block/${endpoint}`, options.host), {
      method: 'POST',
      headers: {
        ...getAuthHeaders({ token: options.token }),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (err) {
    return handleApiError(err, `块${endpoint}操作`);
  }
};

/**
 * 获取块树信息
 * @param {string[]} ids - 块ID列表
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: Array}>}
 */
export const getBlockTreeInfos = (ids, options = {}) => {
  return sendBlockRequest('getBlockTreeInfos', { ids }, options);
};

/**
 * 获取块的同级ID
 * @param {string} id - 块ID
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     parent: string,
 *     previous: string,
 *     next: string
 *   }
 * }>}
 */
export const getBlockSiblingID = (id, options = {}) => {
  return sendBlockRequest('getBlockSiblingID', { id }, options);
};

/**
 * 获取块信息
 * @param {string} id - 块ID
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     box: string,
 *     path: string,
 *     rootID: string,
 *     rootTitle: string,
 *     rootChildID: string,
 *     rootIcon: string
 *   }
 * }>}
 */
export const getBlockInfo = (id, options = {}) => {
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '块ID不能为空',
      data: null
    });
  }
  return sendBlockRequest('getBlockInfo', { id }, options);
};

/**
 * 获取块DOM
 * @param {string} id - 块ID
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     id: string,
 *     dom: string
 *   }
 * }>}
 */
export const getBlockDOM = (id, options = {}) => {
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '块ID不能为空',
      data: null
    });
  }
  return sendBlockRequest('getBlockDOM', { id }, options);
};

/**
 * 获取块Markdown源码
 * @param {string} id - 块ID
 * @param {string} [mode='md'] - 导出模式：'md'(标记符) 或 'textmark'(文本标记)
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     id: string,
 *     kramdown: string
 *   }
 * }>}
 */
export const getBlockKramdown = (id, mode = 'md', options = {}) => {
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '块ID不能为空',
      data: null
    });
  }
  if (mode !== 'md' && mode !== 'textmark') {
    return Promise.resolve({
      code: -1,
      msg: '无效的导出模式',
      data: null
    });
  }
  return sendBlockRequest('getBlockKramdown', { id, mode }, options);
};

/**
 * 获取子块
 * @param {string} id - 块ID
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: Array}>}
 */
export const getChildBlocks = (id, options = {}) => {
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '块ID不能为空',
      data: null
    });
  }
  return sendBlockRequest('getChildBlocks', { id }, options);
};

/**
 * 获取引用文本
 * @param {string} id - 块ID
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: string}>}
 */
export const getRefText = (id, options = {}) => {
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '块ID不能为空',
      data: null
    });
  }
  return sendBlockRequest('getRefText', { id }, options);
};

/**
 * 获取块面包屑
 * @param {Object} params - 选项
 * @param {string} params.id - 块ID
 * @param {string[]} [params.excludeTypes] - 排除的类型
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: Array}>}
 */
export const getBlockBreadcrumb = (params, options = {}) => {
  if (!params?.id) {
    return Promise.resolve({
      code: -1,
      msg: '块ID不能为空',
      data: null
    });
  }
  return sendBlockRequest('getBlockBreadcrumb', params, options);
};

/**
 * 获取块索引
 * @param {string} id - 块ID
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: number}>}
 */
export const getBlockIndex = (id, options = {}) => {
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '块ID不能为空',
      data: null
    });
  }
  return sendBlockRequest('getBlockIndex', { id }, options);
};

/**
 * 获取块树统计信息
 * @param {string} id - 块ID
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     rootID: string,
 *     count: number,
 *     size: number,
 *     hSize: string
 *   }
 * }>}
 */
export const getTreeStat = (id, options = {}) => {
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '块ID不能为空',
      data: null
    });
  }
  return sendBlockRequest('getTreeStat', { id }, options);
};

/**
 * 获取块字数统计
 * @param {string[]} ids - 块ID列表
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {[key: string]: number}
 * }>}
 */
export const getBlocksWordCount = (ids, options = {}) => {
  if (!Array.isArray(ids) || ids.length === 0) {
    return Promise.resolve({
      code: -1,
      msg: '块ID列表不能为空',
      data: null
    });
  }
  return sendBlockRequest('getBlocksWordCount', { ids }, options);
};

/**
 * 获取内容字数统计
 * @param {string} content - 要统计的内容
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: number
 * }>}
 */
export const getContentWordCount = (content, options = {}) => {
  if (!content) {
    return Promise.resolve({
      code: -1,
      msg: '内容不能为空',
      data: 0
    });
  }
  return sendBlockRequest('getContentWordCount', { content }, options);
};

/**
 * 获取最近更新的块列表
 * @param {Object} [params] - 查询选项
 * @param {number} [params.count=32] - 返回数量
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: Array
 * }>}
 */
export const getRecentUpdatedBlocks = (params = {}, options = {}) => {
  return sendBlockRequest('getRecentUpdatedBlocks', { 
    count: params.count || 32 
  }, options);
};

/**
 * 获取文档信息
 * @param {string} id - 文档ID
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     id: string,
 *     rootID: string,
 *     name: string,
 *     path: string,
 *     box: string,
 *     icon: string,
 *     created: string,
 *     updated: string
 *   }
 * }>}
 */
export const getDocInfo = (id, options = {}) => {
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '文档ID不能为空',
      data: null
    });
  }
  return sendBlockRequest('getDocInfo', { id }, options);
};

/**
 * 检查块是否存在
 * @param {string} id - 块ID
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: boolean
 * }>}
 */
export const checkBlockExist = (id, options = {}) => {
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '块ID不能为空',
      data: false
    });
  }
  return sendBlockRequest('checkBlockExist', { id }, options);
};

/**
 * 获取块的内联属性列表
 * @param {string[]} ids - 块ID列表
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {[key: string]: Object}
 * }>}
 */
export const getBlocksIAL = (ids, options = {}) => {
  if (!Array.isArray(ids) || ids.length === 0) {
    return Promise.resolve({
      code: -1,
      msg: '块ID列表不能为空',
      data: null
    });
  }
  return sendBlockRequest('getBlocksIAL', { ids }, options);
};

// 使用示例：
/*
// 获取块信息
const blockInfo = await getBlockInfo('20210808180117-6v0mkxr');

// 获取块DOM
const blockDOM = await getBlockDOM('20210808180117-6v0mkxr');

// 获取块Markdown源码
const blockKramdown = await getBlockKramdown('20210808180117-6v0mkxr', 'textmark');

// 获取子块
const children = await getChildBlocks('20210808180117-6v0mkxr');
*/ 