import { getApiUrl, handleApiError } from './utils/apiConfig';
import { fetchWithTimeout, getAuthHeaders } from './utils/fetchUtils';

/**
 * 发送搜索相关请求的通用方法
 * @private
 * @param {string} endpoint - API 端点
 * @param {Object} data - 请求数据
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: Object}>}
 */
const sendSearchRequest = async (endpoint, data, options = {}) => {
  try {
    const response = await fetchWithTimeout(getApiUrl(`/api/search/${endpoint}`, options.host), {
      method: 'POST',
      headers: {
        ...getAuthHeaders({ token: options.token }),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (err) {
    return handleApiError(err, `搜索${endpoint}操作`);
  }
};

/**
 * 全文搜索块
 * @param {Object} params - 搜索选项
 * @param {string} params.query - 查询字符串
 * @param {number} [params.page=1] - 页码
 * @param {number} [params.pageSize=32] - 每页数量
 * @param {string[]} [params.paths] - 路径过滤
 * @param {string[]} [params.boxes] - 笔记本过滤
 * @param {Object} [params.types] - 类型过滤
 * @param {number} [params.method=0] - 搜索方法(0:关键字,1:查询语法,2:SQL,3:正则表达式)
 * @param {number} [params.orderBy=0] - 排序方式(0:按块类型,1:创建时间升序,2:创建时间降序,3:更新时间升序,4:更新时间降序,5:内容顺序,6:相关度升序,7:相关度降序)
 * @param {number} [params.groupBy=0] - 分组方式(0:不分组,1:按文档分组)
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     blocks: Array<Object>,
 *     matchedBlockCount: number,
 *     matchedRootCount: number,
 *     pageCount: number,
 *     docMode: boolean
 *   }
 * }>}
 */
export const fullTextSearchBlock = (params, options = {}) => {
  const {
    query,
    page = 1,
    pageSize = 32,
    paths = [],
    boxes = [],
    types = {},
    method = 0,
    orderBy = 0,
    groupBy = 0
  } = params;

  if (!query) {
    return Promise.resolve({
      code: -1,
      msg: '搜索关键词不能为空',
      data: null
    });
  }

  return sendSearchRequest('fullTextSearchBlock', {
    query,
    page: Math.max(1, page),
    pageSize: Math.max(1, pageSize),
    paths,
    boxes,
    types,
    method,
    orderBy,
    groupBy
  }, options);
};

/**
 * 搜索引用块
 * @param {Object} params - 搜索选项
 * @param {string} params.id - 块ID
 * @param {string} params.rootID - 根块ID
 * @param {string} params.k - 关键词
 * @param {number} params.beforeLen - 前文长度
 * @param {boolean} [params.isSquareBrackets=false] - 是否方括号引用
 * @param {boolean} [params.isDatabase=false] - 是否数据库引用
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     blocks: Array<Object>,
 *     newDoc: boolean,
 *     k: string,
 *     reqId: string
 *   }
 * }>}
 */
export const searchRefBlock = (params, options = {}) => {
  const {
    id,
    rootID,
    k,
    beforeLen,
    isSquareBrackets = false,
    isDatabase = false
  } = params;

  if (!id || !rootID) {
    return Promise.resolve({
      code: -1,
      msg: '块ID和根块ID不能为空',
      data: null
    });
  }

  return sendSearchRequest('searchRefBlock', {
    id,
    rootID,
    k,
    beforeLen,
    isSquareBrackets,
    isDatabase,
    reqId: Date.now().toString()
  }, options);
};

/**
 * 获取搜索历史
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: Array<{
 *     id: string,
 *     query: string,
 *     created: string
 *   }>
 * }>}
 */
export const getSearchHistory = (options = {}) => {
  return sendSearchRequest('getSearchHistory', {}, options);
};

/**
 * 清除搜索历史
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const clearSearchHistory = (options = {}) => {
  return sendSearchRequest('clearSearchHistory', {}, options);
};

/**
 * 获取搜索建议
 * @param {Object} params - 查询参数
 * @param {string} params.query - 查询字符串
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: Array<string>
 * }>}
 */
export const getSearchSuggestions = (params, options = {}) => {
  const { query } = params;
  if (!query) {
    return Promise.resolve({
      code: -1,
      msg: '查询字符串不能为空',
      data: null
    });
  }
  return sendSearchRequest('getSearchSuggestions', { query }, options);
};

// 使用示例：
/*
// 全文搜索块
const searchResults = await fullTextSearchBlock({
  query: '搜索关键词',
  page: 1,
  pageSize: 20,
  paths: ['/path/to/search'],
  boxes: ['box1', 'box2'],
  types: { text: true, image: false },
  method: 0,
  orderBy: 0,
  groupBy: 0
}); 
*/