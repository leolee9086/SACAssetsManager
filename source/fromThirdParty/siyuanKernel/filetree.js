import { getApiUrl, handleApiError } from './utils/apiConfig';
import { fetchWithTimeout, getAuthHeaders } from './utils/fetchUtils';

/**
 * 发送文件树相关请求的通用方法
 * @private
 * @param {string} endpoint - API 端点
 * @param {Object} data - 请求数据
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: Object}>}
 */
const sendFiletreeRequest = async (endpoint, data, options = {}) => {
  try {
    const response = await fetchWithTimeout(getApiUrl(`/api/filetree/${endpoint}`, options.host), {
      method: 'POST',
      headers: {
        ...getAuthHeaders({ token: options.token }),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (err) {
    return handleApiError(err, `文件树${endpoint}操作`);
  }
};

/**
 * 列出文档树
 * @param {Object} params - 列表选项
 * @param {string} params.notebook - 笔记本ID
 * @param {string} params.path - 路径
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: {tree: Array}}>}
 */
export const listDocTree = (params, options = {}) => {
  return sendFiletreeRequest('listDocTree', params, options);
};

/**
 * 创建文档
 * @param {Object} params - 创建选项
 * @param {string} params.notebook - 笔记本ID
 * @param {string} params.path - 路径
 * @param {string} params.title - 标题
 * @param {string} [params.md] - Markdown内容
 * @param {string[]} [params.sorts] - 排序
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: {id: string}}>}
 */
export const createDoc = (params, options = {}) => {
  const { notebook, path, title, md, sorts } = params;
  if (!notebook || !path || !title) {
    return Promise.resolve({
      code: -1,
      msg: '笔记本ID、路径和标题不能为空',
      data: null
    });
  }
  return sendFiletreeRequest('createDoc', { notebook, path, title, md, sorts }, options);
};

/**
 * 创建每日笔记
 * @param {Object} params - 创建选项
 * @param {string} params.notebook - 笔记本ID
 * @param {string} [params.app] - 应用标识
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: {id: string}}>}
 */
export const createDailyNote = (params, options = {}) => {
  const { notebook, app } = params;
  if (!notebook) {
    return Promise.resolve({
      code: -1,
      msg: '笔记本ID不能为空',
      data: null
    });
  }
  return sendFiletreeRequest('createDailyNote', { notebook, app }, options);
};

/**
 * 重命名文档
 * @param {Object} params - 重命名选项
 * @param {string} params.notebook - 笔记本ID
 * @param {string} params.path - 文档路径
 * @param {string} params.title - 新标题
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const renameDoc = (params, options = {}) => {
  return sendFiletreeRequest('renameDoc', params, options);
};

/**
 * 通过ID重命名文档
 * @param {Object} params - 重命名选项
 * @param {string} params.id - 文档ID
 * @param {string} params.title - 新标题
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const renameDocByID = (params, options = {}) => {
  return sendFiletreeRequest('renameDocByID', params, options);
};

/**
 * 移动文档
 * @param {Object} params - 移动选项
 * @param {string[]} params.fromPaths - 源文件路径列表
 * @param {string} params.toNotebook - 目标笔记本ID
 * @param {string} params.toPath - 目标路径
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const moveDocs = (params, options = {}) => {
  return sendFiletreeRequest('moveDocs', params, options);
};

/**
 * 删除文档
 * @param {Object} params - 删除选项
 * @param {string} params.notebook - 笔记本ID
 * @param {string} params.path - 文档路径
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const removeDoc = (params, options = {}) => {
  return sendFiletreeRequest('removeDoc', params, options);
};

/**
 * 获取文档创建保存路径
 * @param {Object} params - 选项
 * @param {string} params.notebook - 笔记本ID
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: {box: string, path: string}}>}
 */
export const getDocCreateSavePath = (params, options = {}) => {
  return sendFiletreeRequest('getDocCreateSavePath', params, options);
};

/**
 * 搜索文档
 * @param {Object} params - 搜索选项
 * @param {string} params.k - 搜索关键字
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: Array}>}
 */
export const searchDocs = (params, options = {}) => {
  return sendFiletreeRequest('searchDocs', params, options);
};

/**
 * 根据路径列出文档
 * @param {Object} params - 列表选项
 * @param {string} params.path - 路径
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: Array}>}
 */
export const listDocsByPath = (params, options = {}) => {
  return sendFiletreeRequest('listDocsByPath', params, options);
};

/**
 * 获取文档内容
 * @param {Object} params - 获取选项
 * @param {string} params.id - 文档ID
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: Object}>}
 */
export const getDoc = (params, options = {}) => {
  return sendFiletreeRequest('getDoc', params, options);
};

/**
 * 获取引用创建保存路径
 * @param {Object} params - 选项
 * @param {string} params.notebook - 笔记本ID
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: {box: string, path: string}}>}
 */
export const getRefCreateSavePath = (params, options = {}) => {
  return sendFiletreeRequest('getRefCreateSavePath', params, options);
};

/**
 * 更改排序
 * @param {Object} params - 排序选项
 * @param {string} params.notebook - 笔记本ID
 * @param {string} params.path - 路径
 * @param {string[]} params.sorts - 排序列表
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const changeSort = (params, options = {}) => {
  return sendFiletreeRequest('changeSort', params, options);
};

/**
 * 使用Markdown创建文档
 * @param {Object} params - 创建选项
 * @param {string} params.notebook - 笔记本ID
 * @param {string} params.path - 路径
 * @param {string} params.markdown - Markdown内容
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: {id: string}}>}
 */
export const createDocWithMd = (params, options = {}) => {
  return sendFiletreeRequest('createDocWithMd', params, options);
};

/**
 * 将文档转换为标题
 * @param {Object} params - 转换选项
 * @param {string} params.id - 文档ID
 * @param {string} params.targetID - 目标文档ID
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const doc2Heading = (params, options = {}) => {
  return sendFiletreeRequest('doc2Heading', params, options);
};

/**
 * 将标题转换为文档
 * @param {Object} params - 转换选项
 * @param {string} params.id - 标题块ID
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const heading2Doc = (params, options = {}) => {
  return sendFiletreeRequest('heading2Doc', params, options);
};

/**
 * 将列表项转换为文档
 * @param {Object} params - 转换选项
 * @param {string} params.id - 列表项块ID
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const li2Doc = (params, options = {}) => {
  return sendFiletreeRequest('li2Doc', params, options);
};

/**
 * 刷新文件树
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const refreshFiletree = (options = {}) => {
  return sendFiletreeRequest('refreshFiletree', {}, options);
};

// 使用示例：
/*
// 列出文档树
const tree = await listDocTree({
  notebook: '20210808180117-6v0mkxr',
  path: '/'
});

// 创建文档
const doc = await createDoc({
  notebook: '20210808180117-6v0mkxr',
  path: '/test',
  title: '测试文档',
  md: '# 测试内容'
});

// 创建每日笔记
const daily = await createDailyNote({
  notebook: '20210808180117-6v0mkxr'
});

// 移动文档
await moveDocs({
  fromPaths: ['/doc1.sy', '/doc2.sy'],
  toNotebook: '20210808180117-6v0mkxr',
  toPath: '/target'
});
*/ 