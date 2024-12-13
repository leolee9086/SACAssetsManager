import { getApiUrl, handleApiError } from './utils/apiConfig';
import { fetchWithTimeout, getAuthHeaders } from './utils/fetchUtils';

/**
 * 发送模板相关请求的通用方法
 * @private
 * @param {string} endpoint - API 端点
 * @param {Object} data - 请求数据
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: Object}>}
 */
const sendTemplateRequest = async (endpoint, data, options = {}) => {
  try {
    const response = await fetchWithTimeout(getApiUrl(`/api/template/${endpoint}`, options.host), {
      method: 'POST',
      headers: {
        ...getAuthHeaders({ token: options.token }),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (err) {
    return handleApiError(err, `模板${endpoint}操作`);
  }
};

/**
 * 渲染Sprig模板
 * @param {Object} params - 渲染选项
 * @param {string} params.template - 模板内容
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: string
 * }>}
 */
export const renderSprig = (params, options = {}) => {
  const { template } = params;
  
  if (!template) {
    return Promise.resolve({
      code: -1,
      msg: '模板内容不能为空',
      data: null
    });
  }

  return sendTemplateRequest('renderSprig', { template }, options);
};

/**
 * 将文档保存为模板
 * @param {Object} params - 保存选项
 * @param {string} params.id - 文档ID
 * @param {string} params.name - 模板名称
 * @param {boolean} [params.overwrite=false] - 是否覆盖已有模板
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: null
 * }>}
 */
export const docSaveAsTemplate = (params, options = {}) => {
  const { id, name, overwrite = false } = params;

  if (!id || !/^[\w\-]+$/.test(id)) {
    return Promise.resolve({
      code: -1,
      msg: '无效的文档ID',
      data: null
    });
  }

  if (!name) {
    return Promise.resolve({
      code: -1,
      msg: '模板名称不能为空',
      data: null
    });
  }

  return sendTemplateRequest('docSaveAsTemplate', {
    id,
    name,
    overwrite
  }, options);
};

/**
 * 渲染模板
 * @param {Object} params - 渲染选项
 * @param {string} params.path - 模板路径
 * @param {string} params.id - 文档ID
 * @param {boolean} [params.preview=false] - 是否预览
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     path: string,
 *     content: string
 *   }
 * }>}
 */
export const renderTemplate = (params, options = {}) => {
  const { path, id, preview = false } = params;

  if (!path) {
    return Promise.resolve({
      code: -1,
      msg: '模板路径不能为空',
      data: null
    });
  }

  if (!id || !/^[\w\-]+$/.test(id)) {
    return Promise.resolve({
      code: -1,
      msg: '无效的文档ID',
      data: null
    });
  }

  return sendTemplateRequest('renderTemplate', {
    path,
    id,
    preview
  }, options);
};

/**
 * 渲染模板
 * @param {Object} params - 渲染选项
 * @param {string} params.path - 模板路径
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     content: string
 *   }
 * }>}
 */
export const render = (params, options = {}) => {
  const { path } = params;

  if (!path) {
    return Promise.resolve({
      code: -1,
      msg: '模板路径不能为空',
      data: null
    });
  }

  return sendTemplateRequest('render', { path }, options);
};

/**
 * 搜索模板
 * @param {Object} params - 搜索选项
 * @param {string} params.k - 搜索关键字
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: Array<{
 *     path: string,
 *     name: string,
 *     content: string
 *   }>
 * }>}
 */
export const searchTemplate = (params, options = {}) => {
  const { k } = params;

  if (!k) {
    return Promise.resolve({
      code: -1,
      msg: '搜索关键字不能为空',
      data: []
    });
  }

  return sendTemplateRequest('searchTemplate', { k }, options);
};

/**
 * 删除模板
 * @param {Object} params - 删除选项
 * @param {string} params.path - 模板路径
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const removeTemplate = (params, options = {}) => {
  const { path } = params;

  if (!path) {
    return Promise.resolve({
      code: -1,
      msg: '模板路径不能为空',
      data: null
    });
  }

  return sendTemplateRequest('removeTemplate', { path }, options);
};

// 使用示例：
/*
// 渲染Sprig模板
const rendered = await renderSprig({
  template: '{{ .title }}'
});

// 保存为模板
await docSaveAsTemplate({
  id: '20210808180117-6v0mkxr',
  name: '日记模板',
  overwrite: true
});

// 渲染模板
const content = await renderTemplate({
  path: '/templates/diary.md',
  id: '20210808180117-6v0mkxr',
  preview: true
});
*/ 