import { getApiUrl, handleApiError } from './utils/apiConfig';
import { fetchWithTimeout, getAuthHeaders } from './utils/fetchUtils';

/**
 * 发送导入相关请求的通用方法
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
const sendImportRequest = async (endpoint, data, options = {}) => {
  try {
    const response = await fetchWithTimeout(getApiUrl(`/api/import/${endpoint}`, options.host), {
      method: 'POST',
      headers: {
        ...getAuthHeaders({ token: options.token }),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (err) {
    return handleApiError(err, `导入${endpoint}操作`);
  }
};

/**
 * 导入 .sy.zip 文件
 * @param {Object} params - 导入选项
 * @param {File} params.file - .sy.zip 文件
 * @param {string} params.notebook - 笔记本ID
 * @param {string} params.toPath - 导入路径
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     succMap: Object<string, string>,  // 成功导入的文件映射
 *     errMap: Object<string, string>    // 导入失败的文件映射
 *   }
 * }>}
 */
export const importSY = async (params, options = {}) => {
  const { file, notebook, toPath } = params;
  if (!file || !notebook || !toPath) {
    return Promise.resolve({
      code: -1,
      msg: '文件、笔记本ID和导入路径不能为空',
      data: null
    });
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('notebook', notebook);
  formData.append('toPath', toPath);

  try {
    const response = await fetchWithTimeout(getApiUrl('/api/import/importSY', options.host), {
      method: 'POST',
      headers: getAuthHeaders({ token: options.token }),
      body: formData
    });
    return await response.json();
  } catch (err) {
    return handleApiError(err, '导入.sy.zip文件');
  }
};

/**
 * 导入数据
 * @param {Object} params - 导入选项
 * @param {File} params.file - 数据文件
 * @param {string} [params.type='local'] - 导入类型(local|cloud)
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     succMap: Object<string, string>,  // 成功导入的文件映射
 *     errMap: Object<string, string>    // 导入失败的文件映射
 *   }
 * }>}
 */
export const importData = async (params, options = {}) => {
  const { file, type = 'local' } = params;
  if (!file) {
    return Promise.resolve({
      code: -1,
      msg: '文件不能为空',
      data: null
    });
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);

  try {
    const response = await fetchWithTimeout(getApiUrl('/api/import/importData', options.host), {
      method: 'POST',
      headers: getAuthHeaders({ token: options.token }),
      body: formData
    });
    return await response.json();
  } catch (err) {
    return handleApiError(err, '导入数据');
  }
};

/**
 * 导入标准Markdown
 * @param {Object} params - 导入选项
 * @param {string} params.notebook - 笔记本ID
 * @param {string} params.localPath - 本地路径
 * @param {string} params.toPath - 导入路径
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     succMap: Object<string, string>,  // 成功导入的文件映射
 *     errMap: Object<string, string>    // 导入失败的文件映射
 *   }
 * }>}
 */
export const importStdMd = (params, options = {}) => {
  const { notebook, localPath, toPath } = params;
  if (!notebook || !localPath || !toPath) {
    return Promise.resolve({
      code: -1,
      msg: '笔记本ID、本地路径和导入路径不能为空',
      data: null
    });
  }
  return sendImportRequest('importStdMd', params, options);
};

/**
 * 导入Markdown文件
 * @param {Object} params - 导入选项
 * @param {File} params.file - Markdown文件
 * @param {string} params.notebook - 笔记本ID
 * @param {string} params.toPath - 导入路径
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     succMap: Object<string, string>,  // 成功导入的文件映射
 *     errMap: Object<string, string>    // 导入失败的文件映射
 *   }
 * }>}
 */
export const importMd = (params, options = {}) => {
  const { file, notebook, toPath } = params;
  if (!file || !notebook || !toPath) {
    return Promise.resolve({
      code: -1,
      msg: '文件、笔记本ID和导入路径不能为空',
      data: null
    });
  }
  
  const formData = new FormData();
  formData.append('file', file);
  formData.append('notebook', notebook);
  formData.append('toPath', toPath);
  
  return sendImportRequest('importMd', formData, options);
};

/**
 * 导入Pandoc文档
 * @param {Object} params - 导入选项
 * @param {File} params.file - Pandoc支持的文档文件
 * @param {string} params.notebook - 笔记本ID
 * @param {string} params.toPath - 导入路径
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     succMap: Object<string, string>,  // 成功导入的文件映射
 *     errMap: Object<string, string>    // 导入失败的文件映射
 *   }
 * }>}
 */
export const importPandoc = (params, options = {}) => {
  const { file, notebook, toPath } = params;
  if (!file || !notebook || !toPath) {
    return Promise.resolve({
      code: -1,
      msg: '文件、笔记本ID和导入路径不能为空',
      data: null
    });
  }
  
  const formData = new FormData();
  formData.append('file', file);
  formData.append('notebook', notebook);
  formData.append('toPath', toPath);
  
  return sendImportRequest('importPandoc', formData, options);
};

// 使用示例：
/*
// 导入.sy.zip文件
const syImport = await importSY({
  file: new File(['content'], 'test.sy.zip'),
  notebook: '20210808180117-6v0mkxr',
  toPath: '/test'
});

// 导入数据
const dataImport = await importData(
  new File(['content'], 'data.zip')
);

// 导入标准Markdown
const mdImport = await importStdMd({
  notebook: '20210808180117-6v0mkxr',
  localPath: '/path/to/markdown',
  toPath: '/test'
});
*/ 