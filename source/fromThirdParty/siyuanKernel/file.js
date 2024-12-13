import { getApiUrl, handleApiError } from './utils/apiConfig';
import { fetchWithTimeout, getAuthHeaders } from './utils/fetchUtils';

/**
 * 发送文件相关请求的通用方法
 * @private
 * @param {string} endpoint - API 端点
 * @param {Object} data - 请求数据
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: Object}>}
 */
const sendFileRequest = async (endpoint, data, options = {}) => {
  try {
    const response = await fetchWithTimeout(getApiUrl(`/api/file/${endpoint}`, options.host), {
      method: 'POST',
      headers: {
        ...getAuthHeaders({ token: options.token }),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (err) {
    return handleApiError(err, `文件${endpoint}操作`);
  }
};

/**
 * 获取唯一文件名
 * @param {string} path - 文件路径
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: string}>}
 */
export const getUniqueFilename = (path, options = {}) => {
  if (!path) {
    return Promise.resolve({
      code: -1,
      msg: '文件路径不能为空',
      data: null
    });
  }
  return sendFileRequest('getUniqueFilename', { path }, options);
};

/**
 * 全局复制文件
 * @param {Object} params - 复制选项
 * @param {string[]} params.srcs - 源文件路径列表
 * @param {string} params.destDir - 目标目录路径
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const globalCopyFiles = (params, options = {}) => {
  return sendFileRequest('globalCopyFiles', params, options);
};

/**
 * 复制单个文件
 * @param {Object} options - 复制选项
 * @param {string} options.src - 源文件路径
 * @param {string} options.dest - 目标文件路径
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const copyFile = (options) => {
  return sendFileRequest('copyFile', options);
};

/**
 * 获取文件内容
 * @param {string} path - 文件路径
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<ArrayBuffer>} 文件内容
 */
export const getFile = async (path, options = {}) => {
  const response = await fetch(getApiUrl('/api/file/getFile', options.host), {
    method: 'POST',
    headers: {
      ...getAuthHeaders({ token: options.token }),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ path })
  });
  return await response.arrayBuffer();
};

/**
 * 读取目录内容
 * @param {string} path - 目录路径
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: Array}>}
 */
export const readDir = (path, options = {}) => {
  return sendFileRequest('readDir', { path }, options);
};

/**
 * 重命名文件
 * @param {Object} params - 重命名选项
 * @param {string} params.path - 原文件路径
 * @param {string} params.newPath - 新文件路径
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const renameFile = (params, options = {}) => {
  return sendFileRequest('renameFile', params, options);
};

/**
 * 删除文件
 * @param {string} path - 文件路径
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const removeFile = (path, options = {}) => {
  return sendFileRequest('removeFile', { path }, options);
};

/**
 * 上传文件
 * @param {Object} params - 上传选项
 * @param {string} params.path - 文件路径
 * @param {File|Blob} params.file - 文件对象
 * @param {boolean} [params.isDir=false] - 是否为目录
 * @param {number} [params.modTime] - 修改时间戳(毫秒)
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const putFile = async (params, options = {}) => {
  const formData = new FormData();
  formData.append('path', params.path);
  formData.append('isDir', params.isDir || false);
  if (params.file) {
    formData.append('file', params.file);
  }
  if (params.modTime) {
    formData.append('modTime', params.modTime);
  }

  try {
    const response = await fetchWithTimeout(getApiUrl('/api/file/putFile', options.host), {
      method: 'POST',
      headers: {
        ...getAuthHeaders({ token: options.token })
      },
      body: formData
    });
    return await response.json();
  } catch (err) {
    return handleApiError(err, '文件上传');
  }
};

// 使用示例：
/*
// 获取唯一文件名
const uniqueName = await getUniqueFilename('/data/test.md');

// 复制文件
await globalCopyFiles({
  srcs: ['/data/1.md', '/data/2.md'],
  destDir: '/target'
});

// 读取目录
const files = await readDir('/data');

// 上传文件
await putFile({
  path: '/data/test.txt',
  file: new File(['content'], 'test.txt'),
  modTime: Date.now()
});
*/ 