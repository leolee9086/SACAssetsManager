import { getApiUrl, handleApiError } from './utils/apiConfig';
import { fetchWithTimeout, getAuthHeaders } from './utils/fetchUtils';

/**
 * 发送笔记本相关请求的通用方法
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
const sendNotebookRequest = async (endpoint, data, options = {}) => {
  try {
    const response = await fetchWithTimeout(getApiUrl(`/api/notebook/${endpoint}`, options.host), {
      method: 'POST',
      headers: {
        ...getAuthHeaders({ token: options.token }),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (err) {
    return handleApiError(err, `笔记本${endpoint}操作`);
  }
};

/**
 * 获取笔记本信息
 * @param {Object} params - 查询参数
 * @param {string} params.notebook - 笔记本ID
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     name: string,     // 笔记本名称
 *     id: string,       // 笔记本ID
 *     icon: string,     // 图标
 *     sort: number,     // 排序号
 *     closed: boolean,  // 是否关闭
 *     created: string,  // 创建时间
 *     updated: string   // 更新时间
 *   }
 * }>}
 */
export const getNotebookInfo = (params, options = {}) => {
  const { notebook } = params;
  if (!notebook) {
    return Promise.resolve({
      code: -1,
      msg: '笔记本ID不能为空',
      data: null
    });
  }
  return sendNotebookRequest('getNotebookInfo', { notebook }, options);
};

/**
 * 创建笔记本
 * @param {Object} params - 创建参数
 * @param {string} params.name - 笔记本名称
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     notebook: {
 *       id: string,    // 笔记本ID
 *       name: string,  // 笔记本名称
 *       icon: string,  // 图标
 *       sort: number   // 排序号
 *     }
 *   }
 * }>}
 */
export const createNotebook = (params, options = {}) => {
  const { name } = params;
  if (!name) {
    return Promise.resolve({
      code: -1,
      msg: '笔记本名称不能为空',
      data: null
    });
  }
  return sendNotebookRequest('createNotebook', { name }, options);
};

/**
 * 重命名笔记本
 * @param {Object} params - 重命名参数
 * @param {string} params.notebook - 笔记本ID
 * @param {string} params.name - 新名称
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const renameNotebook = (params, options = {}) => {
  const { notebook, name } = params;
  if (!notebook || !name) {
    return Promise.resolve({
      code: -1,
      msg: '笔记本ID和新名称不能为空',
      data: null
    });
  }
  return sendNotebookRequest('renameNotebook', { notebook, name }, options);
};

/**
 * 删除笔记本
 * @param {Object} params - 删除参数
 * @param {string} params.notebook - 笔记本ID
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const removeNotebook = (params, options = {}) => {
  const { notebook } = params;
  if (!notebook) {
    return Promise.resolve({
      code: -1,
      msg: '笔记本ID不能为空',
      data: null
    });
  }
  return sendNotebookRequest('removeNotebook', { notebook }, options);
};

/**
 * 获取笔记本列表
 * @param {Object} [params] - 查询参数
 * @param {boolean} [params.flashcard=false] - 是否获取闪卡笔记本
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     notebooks: Array<{
 *       id: string,       // 笔记本ID
 *       name: string,     // 笔记本名称
 *       icon: string,     // 图标
 *       sort: number,     // 排序号
 *       closed: boolean   // 是否关闭
 *     }>
 *   }
 * }>}
 */
export const lsNotebooks = (params = {}, options = {}) => {
  const { flashcard = false } = params;
  return sendNotebookRequest('lsNotebooks', { flashcard }, options);
};

/**
 * 打开/关闭笔记本
 * @param {Object} params - 操作参数
 * @param {string} params.notebook - 笔记本ID
 * @param {boolean} params.closed - 是否关闭
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const setNotebookConf = (params, options = {}) => {
  const { notebook, closed } = params;
  if (!notebook || typeof closed !== 'boolean') {
    return Promise.resolve({
      code: -1,
      msg: '参数不完整',
      data: null
    });
  }
  return sendNotebookRequest('setNotebookConf', { notebook, closed }, options);
};

/**
 * 更新笔记本图标
 * @param {Object} params - 更新参数
 * @param {string} params.notebook - 笔记本ID
 * @param {string} params.icon - 新图标
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const setNotebookIcon = (params, options = {}) => {
  const { notebook, icon } = params;
  if (!notebook || !icon) {
    return Promise.resolve({
      code: -1, 
      msg: '笔记本ID和图标不能为空',
      data: null
    });
  }
  return sendNotebookRequest('setNotebookIcon', { notebook, icon }, options);
};

/**
 * 更新笔记本排序
 * @param {Object} params - 排序参数
 * @param {string} params.notebook - 笔记本ID
 * @param {number} params.sort - 排序号
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const setNotebookSort = (params, options = {}) => {
  const { notebook, sort } = params;
  if (!notebook || typeof sort !== 'number') {
    return Promise.resolve({
      code: -1,
      msg: '参数不完整',
      data: null
    });
  }
  return sendNotebookRequest('setNotebookSort', { notebook, sort }, options);
}; 