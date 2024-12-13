import { getApiUrl, handleApiError } from './utils/apiConfig';
import { fetchWithTimeout, getAuthHeaders } from './utils/fetchUtils';

/**
 * 发送收集箱相关请求的通用方法
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
const sendInboxRequest = async (endpoint, data, options = {}) => {
  try {
    const response = await fetchWithTimeout(getApiUrl(`/api/inbox/${endpoint}`, options.host), {
      method: 'POST',
      headers: {
        ...getAuthHeaders({ token: options.token }),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (err) {
    return handleApiError(err, `收集箱${endpoint}操作`);
  }
};

/**
 * 获取收集箱条目列表
 * @param {Object} params - 查询选项
 * @param {number} params.page - 页码
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     shorthands: Array<{
 *       id: string,        // 条目ID
 *       shorthand: string, // 条目内容
 *       created: string    // 创建时间
 *     }>,
 *     pageCount: number    // 总页数
 *   }
 * }>}
 */
export const getShorthands = (params, options = {}) => {
  const { page } = params;
  if (!page || page < 1) {
    return Promise.resolve({
      code: -1,
      msg: '页码必须大于0',
      data: null
    });
  }
  return sendInboxRequest('getShorthands', { page }, options);
};

/**
 * 获取收集箱条目详情
 * @param {Object} params - 查询选项
 * @param {string} params.id - 条目ID
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     id: string,        // 条目ID
 *     shorthand: string, // 条目内容
 *     created: string    // 创建时间
 *   }
 * }>}
 */
export const getShorthand = (params, options = {}) => {
  const { id } = params;
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '条目ID不能为空',
      data: null
    });
  }
  return sendInboxRequest('getShorthand', { id }, options);
};

/**
 * 删除收集箱条目
 * @param {Object} params - 删除选项
 * @param {string[]} params.ids - 条目ID列表
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: null
 * }>}
 */
export const removeShorthands = (params, options = {}) => {
  const { ids } = params;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return Promise.resolve({
      code: -1,
      msg: '条目ID列表不能为空',
      data: null
    });
  }
  return sendInboxRequest('removeShorthands', { ids }, options);
};

/**
 * 批量添加收集箱条目
 * @param {Object} params - 添加选项
 * @param {Array<{shorthand: string}>} params.shorthands - 条目列表
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     succMap: Object<string, string>,  // 成功添加的条目映射
 *     errMap: Object<string, string>    // 添加失败的条目映射
 *   }
 * }>}
 */
export const addShorthands = (params, options = {}) => {
  const { shorthands } = params;
  if (!shorthands || !Array.isArray(shorthands) || shorthands.length === 0) {
    return Promise.resolve({
      code: -1,
      msg: '条目列表不能为空',
      data: null
    });
  }
  return sendInboxRequest('addShorthands', { shorthands }, options);
};

/**
 * 将收集箱条目转换为文档
 * @param {Object} params - 转换选项
 * @param {string} params.id - 条目ID
 * @param {string} params.notebook - 目标笔记本ID
 * @param {string} params.path - 目标路径
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     id: string,      // 新建文档ID
 *     hPath: string    // 新建文档路径
 *   }
 * }>}
 */
export const shorthand2Doc = (params, options = {}) => {
  const { id, notebook, path } = params;
  if (!id || !notebook || !path) {
    return Promise.resolve({
      code: -1,
      msg: '条目ID、笔记本ID和路径不能为空',
      data: null
    });
  }
  return sendInboxRequest('shorthand2Doc', params, options);
};

// 使用示例：
/*
// 获取收集箱列表
const list = await getShorthands({
  page: 1
});

// 获取条目详情
const detail = await getShorthand({
  id: '20210808180117-abcdef'
});

// 删除条目
await removeShorthands({
  ids: ['20210808180117-abcdef', '20210808180117-ghijkl']
});

// 批量添加收集箱条目
const addResult = await addShorthands({
  shorthands: [
    { shorthand: '测试条目1' },
    { shorthand: '测试条目2' }
  ]
});

// 将收集箱条目转换为文档
const docResult = await shorthand2Doc({
  id: '20210808180117-abcdef',
  notebook: '20210808180117-notebook',
  path: '/test'
});
*/ 