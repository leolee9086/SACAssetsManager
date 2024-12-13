import { getApiUrl, handleApiError } from './utils/apiConfig';
import { fetchWithTimeout, getAuthHeaders } from './utils/fetchUtils';

/**
 * 发送引用相关请求的通用方法
 * @private
 * @param {string} endpoint - API 端点
 * @param {Object} data - 请求数据
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: Object}>}
 */
const sendRefRequest = async (endpoint, data, options = {}) => {
  try {
    const response = await fetchWithTimeout(getApiUrl(`/api/ref/${endpoint}`, options.host), {
      method: 'POST',
      headers: {
        ...getAuthHeaders({ token: options.token }),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (err) {
    return handleApiError(err, `引用${endpoint}操作`);
  }
};

/**
 * 刷新反向链接
 * @param {Object} params - 查询参数
 * @param {string} params.id - 块ID
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const refreshBacklink = (params, options = {}) => {
  const { id } = params;
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '块ID不能为空',
      data: null
    });
  }
  return sendRefRequest('refreshBacklink', { id }, options);
};

/**
 * 获取反向链接文档
 * @param {Object} params - 查询选项
 * @param {string} params.defID - 定义块ID
 * @param {string} params.refTreeID - 引用树ID
 * @param {string} params.keyword - 关键词
 * @param {boolean} [params.containChildren] - 是否包含子块
 * @param {boolean} [params.highlight=true] - 是否高亮
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     backlinks: Array<Object>  // 反向链接列表
 *   }
 * }>}
 */
export const getBacklinkDoc = (params, options = {}) => {
  const {
    defID,
    refTreeID,
    keyword,
    containChildren = false,
    highlight = true
  } = params;

  if (!defID || !refTreeID) {
    return Promise.resolve({
      code: -1,
      msg: '定义块ID和引用树ID不能为空',
      data: null
    });
  }

  return sendRefRequest('getBacklinkDoc', {
    defID,
    refTreeID,
    keyword,
    containChildren,
    highlight
  }, options);
};

/**
 * 获取提及文档
 * @param {Object} params - 查询选项
 * @param {string} params.defID - 定义块ID
 * @param {string} params.refTreeID - 引用树ID
 * @param {string} params.keyword - 关键词
 * @param {boolean} [params.containChildren] - 是否包含子块
 * @param {boolean} [params.highlight=true] - 是否高亮
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     backmentions: Array<Object>  // 提及列表
 *   }
 * }>}
 */
export const getBackmentionDoc = (params, options = {}) => {
  return sendRefRequest('getBackmentionDoc', params, options);
};

/**
 * 获取反向链接和提及(新版)
 * @param {Object} params - 查询选项
 * @param {string} params.id - 块ID
 * @param {string} [params.k=''] - 反向链接关键词
 * @param {string} [params.mk=''] - 提及关键词
 * @param {string} [params.sort='3'] - 排序方式(默认按更新时间降序)
 * @param {string} [params.mSort='3'] - 提及排序方式(默认按更新时间降序)
 * @param {boolean} [params.containChildren=false] - 是否包含子块
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     backlinks: Array<Object>,      // 反向链接列表
 *     linkRefsCount: number,         // 链接引用数
 *     backmentions: Array<Object>,   // 提及列表
 *     mentionsCount: number,         // 提及数
 *     k: string,                     // 反向链接关键词
 *     mk: string,                    // 提及关键词
 *     box: string                    // 笔记本ID
 *   }
 * }>}
 */
export const getBacklink2 = (params, options = {}) => {
  const {
    id,
    k = '',
    mk = '',
    sort = '3',
    mSort = '3',
    containChildren = false
  } = params;

  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '块ID不能为空',
      data: null
    });
  }

  return sendRefRequest('getBacklink2', {
    id,
    k,
    mk,
    sort,
    mSort,
    containChildren
  }, options);
};

/**
 * 获取引用块内容
 * @param {Object} params - 查询选项
 * @param {string} params.id - 块ID
 * @param {string} [params.beforeLen=512] - 前文长度
 * @param {string} [params.afterLen=512] - 后文长度
 * @param {boolean} [params.k=false] - 是否启用关键字
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     dom: string,    // 块内容
 *     box: string,    // 笔记本ID
 *     path: string,   // 文档路径
 *     rootID: string  // 根文档ID
 *   }
 * }>}
 */
export const getRefText = (params, options = {}) => {
  const { id, beforeLen = 512, afterLen = 512, k = false } = params;
  
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '块ID不能为空',
      data: null
    });
  }

  return sendRefRequest('getRefText', {
    id,
    beforeLen,
    afterLen,
    k
  }, options);
};

/**
 * 获取引用计数
 * @param {Object} options - 查询选项
 * @param {string} options.id - 块ID
 * @param {boolean} [options.containChildren=false] - 是否包含子块
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     refCount: number,
 *     refIDs: string[],
 *     defCount: number,
 *     defIDs: string[],
 *     backlinks: Array<Object>,
 *     backmentions: Array<Object>
 *   }
 * }>}
 */
export const getRefCount = (options) => {
  const { id, containChildren = false } = options;

  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '块ID不能为空',
      data: null
    });
  }

  return sendRefRequest('getRefCount', {
    id,
    containChildren
  });
};

/**
 * 获取引用标注
 * @param {Object} options - 查询选项
 * @param {string} options.id - 块ID
 * @param {string} options.defID - 定义块ID
 * @param {string} options.refText - 引用文本
 * @param {string} [options.type='"] - 引用类型
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     id: string,
 *     refText: string,
 *     type: string
 *   }
 * }>}
 */
export const getRefIDsByFileAnnotationID = (options) => {
  const { id, defID, refText, type = '"' } = options;

  if (!id || !defID || !refText) {
    return Promise.resolve({
      code: -1,
      msg: '参数不完整',
      data: null
    });
  }

  return sendRefRequest('getRefIDsByFileAnnotationID', {
    id,
    defID,
    refText,
    type
  });
};

// 使用示例：
/*
// 刷新反向链接
await refreshBacklink('20210808180117-6v0mkxr');

// 获取反向链接文档
const backlinks = await getBacklinkDoc({
  defID: '20210808180117-6v0mkxr',
  refTreeID: '20210808180117-abcdef',
  keyword: '关键词',
  containChildren: true,
  highlight: true
});

// 获取提及文档
const mentions = await getBackmentionDoc({
  defID: '20210808180117-6v0mkxr',
  refTreeID: '20210808180117-abcdef',
  keyword: '关键词'
});

// 获取反向链接和提及
const refs = await getBacklink2({
  id: '20210808180117-6v0mkxr',
  k: '反向链接关键词',
  mk: '提及关键词',
  sort: '3',
  mSort: '3',
  containChildren: true
});
*/ 