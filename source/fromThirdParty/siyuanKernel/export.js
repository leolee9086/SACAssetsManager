import { getApiUrl, handleApiError } from './utils/apiConfig';
import { fetchWithTimeout, getAuthHeaders } from './utils/fetchUtils';

/**
 * 发送导出相关请求的通用方法
 * @private
 * @param {string} endpoint - API 端点
 * @param {Object} data - 请求数据
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: Object}>}
 */
const sendExportRequest = async (endpoint, data, options = {}) => {
  try {
    const response = await fetchWithTimeout(getApiUrl(`/api/export/${endpoint}`, options.host), {
      method: 'POST',
      headers: {
        ...getAuthHeaders({ token: options.token }),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (err) {
    return handleApiError(err, `导出${endpoint}操作`);
  }
};

/**
 * 导出模板
 * @param {Object} params - 导出选项
 * @param {string} params.id - 文档ID
 * @param {string} params.name - 模板名称
 * @param {string} [params.title] - 标题
 * @param {string} [params.icon] - 图标
 * @param {Object} [options] - API可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const exportTemplate = (params, options = {}) => {
  const { id, name, title, icon } = params;
  if (!id || !name) {
    return Promise.resolve({
      code: -1,
      msg: '文档ID和模板名称不能为空',
      data: null
    });
  }
  return sendExportRequest('exportTemplate', { id, name, title, icon }, options);
};

/**
 * 导出为Markdown
 * @param {Object} params - 导出选项
 * @param {string} params.id - 文档ID
 * @param {string} [params.path] - 保存路径
 * @param {Object} [options] - API可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: {name: string, content: string}}>}
 */
export const exportMarkdown = (params, options = {}) => {
  const { id, path } = params;
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '文档ID不能为空',
      data: null
    });
  }
  return sendExportRequest('exportMd', { id, path }, options);
};

/**
 * 导出为PDF
 * @param {Object} params - 导出选项
 * @param {string} params.id - 文档ID
 * @param {string} [params.path] - 保存路径
 * @param {boolean} [params.removeAssets=false] - 是否移除资源文件
 * @param {string} [params.pageSize='A4'] - 页面大小
 * @param {Object} [options] - API可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: {pdf: string}}>}
 */
export const exportPDF = (params, options = {}) => {
  const { id, path, removeAssets = false, pageSize = 'A4' } = params;
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '文档ID不能为空',
      data: null
    });
  }
  return sendExportRequest('exportPDF', { id, path, removeAssets, pageSize }, options);
};

/**
 * 导出为Word文档
 * @param {Object} params - 导出选项
 * @param {string} params.id - 文档ID
 * @param {string} [params.path] - 保存路径
 * @param {boolean} [params.removeAssets=false] - 是否移除资源文件
 * @param {Object} [options] - API可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: {docx: string}}>}
 */
export const exportDocx = (params, options = {}) => {
  const { id, path, removeAssets = false } = params;
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '文档ID不能为空',
      data: null
    });
  }
  return sendExportRequest('exportDocx', { id, path, removeAssets }, options);
};

/**
 * 导出数据
 * @param {Object} [params] - 导出选项
 * @param {string} [params.path] - 保存路径
 * @param {Object} [options] - API可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: {path: string}}>}
 */
export const exportData = (params = {}, options = {}) => {
  return sendExportRequest('exportData', params, options);
};

/**
 * 导出笔记本为Markdown
 * @param {Object} params - 导出选项
 * @param {string} params.id - 笔记本ID
 * @param {string} [params.path] - 保存路径
 * @param {Object} [options] - API可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: Object}>}
 */
export const exportNotebookMd = (params, options = {}) => {
  const { id, path } = params;
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '笔记本ID不能为空',
      data: null
    });
  }
  return sendExportRequest('exportNotebookMd', { id, path }, options);
};

/**
 * 导出为HTML
 * @param {Object} params - 导出选项
 * @param {string} params.id - 文档ID
 * @param {string} [params.path] - 保存路径
 * @param {boolean} [params.removeAssets=false] - 是否移除资源文件
 * @param {Object} [options] - API可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: Object}>}
 */
export const exportHTML = (params, options = {}) => {
  const { id, path, removeAssets = false } = params;
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '文档ID不能为空',
      data: null
    });
  }
  return sendExportRequest('exportHTML', { id, path, removeAssets }, options);
};

/**
 * 导出多个文档为Markdown
 * @param {Object} params - 导出选项
 * @param {string[]} params.ids - 文档ID列表
 * @param {string} [params.path] - 保存路径
 * @param {Object} [options] - API可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: Object}>}
 */
export const exportMds = (params, options = {}) => {
  const { ids, path } = params;
  if (!ids?.length) {
    return Promise.resolve({
      code: -1,
      msg: '文档ID列表不能为空',
      data: null
    });
  }
  return sendExportRequest('exportMds', { ids, path }, options);
};

/**
 * 导出为思源格式
 * @param {Object} params - 导出选项
 * @param {string} params.id - 文档ID
 * @param {string} [params.path] - 保存路径
 * @param {Object} [options] - API可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: Object}>}
 */
export const exportSY = (params, options = {}) => {
  const { id, path } = params;
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '文档ID不能为空',
      data: null
    });
  }
  return sendExportRequest('exportSY', { id, path }, options);
};

/**
 * 导出笔记本为思源格式
 * @param {Object} params - 导出选项
 * @param {string} params.id - 笔记本ID
 * @param {string} [params.path] - 保存路径
 * @param {Object} [options] - API可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: Object}>}
 */
export const exportNotebookSY = (params, options = {}) => {
  const { id, path } = params;
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '笔记本ID不能为空',
      data: null
    });
  }
  return sendExportRequest('exportNotebookSY', { id, path }, options);
};

/**
 * 导出预览HTML
 * @param {Object} params - 导出选项
 * @param {string} params.id - 文档ID
 * @param {string} [params.path] - 保存路径
 * @param {Object} [options] - API可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: Object}>}
 */
export const exportPreviewHTML = (params, options = {}) => {
  const { id, path } = params;
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '文档ID不能为空',
      data: null
    });
  }
  return sendExportRequest('exportPreviewHTML', { id, path }, options);
};

/**
 * 导出为其他格式
 * @param {Object} params - 导出选项
 * @param {string} params.id - 文档ID
 * @param {string} [params.path] - 保存路径
 * @param {Object} [options] - API可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: Object}>}
 */
export const exportReStructuredText = (params, options = {}) => {
  const { id, path } = params;
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '文档ID不能为空',
      data: null
    });
  }
  return sendExportRequest('exportReStructuredText', { id, path }, options);
};

export const exportAsciiDoc = (params, options = {}) => {
  const { id, path } = params;
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '文档ID不能为空',
      data: null
    });
  }
  return sendExportRequest('exportAsciiDoc', { id, path }, options);
};

export const exportTextile = (params, options = {}) => {
  const { id, path } = params;
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '文档ID不能为空',
      data: null
    });
  }
  return sendExportRequest('exportTextile', { id, path }, options);
};

export const exportOPML = (params, options = {}) => {
  const { id, path } = params;
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '文档ID不能为空',
      data: null
    });
  }
  return sendExportRequest('exportOPML', { id, path }, options);
}; 