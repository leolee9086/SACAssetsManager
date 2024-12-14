import { getApiUrl, handleApiError } from './utils/apiConfig.js';
import { fetchWithTimeout, getAuthHeaders } from './utils/fetchUtils.js';

/**
 * 发送资源相关请求的通用方法
 * @private
 * @param {string} endpoint - API端点名称
 * @param {Object|FormData} data - 请求数据
 * @param {Object} [options] - 可选配置
 * @param {boolean} [options.isFormData=false] - 是否为FormData格式
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<Object>} 返回API响应结果
 */
const sendAssetRequest = async (endpoint, data, options = {}) => {
  const { isFormData = false } = options;
  console.log(endpoint, data, options)
  try {
    const headers = getAuthHeaders({ 
      token: options.token,
      ...(isFormData ? {} : {
        additionalHeaders: { 'Content-Type': 'application/json' }
      })
    });

    if (isFormData && headers['Content-Type']) {
      delete headers['Content-Type'];
    }

    const body = isFormData ? data : JSON.stringify(data);
    const response = await fetchWithTimeout(getApiUrl(`/api/asset/${endpoint}`, options.host), {
      method: 'POST',
      headers,
      body
    });
    return await response.json();
  } catch (err) {
    return handleApiError(err, `资源${endpoint}操作`);
  }
};

/**
 * 上传资源文件
 * @param {File|Blob} file - 要上传的文件
 * @param {Object} [params] - 上传参数
 * @param {string} [params.assetsDirPath] - 资源保存目录路径,相对于工作空间的路径
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,     // 0表示成功,-1表示失败
 *   msg: string,      // 返回消息
 *   data: {
 *     succMap: {      // 上传成功的文件映射
 *       [key: string]: string  // key:原文件名,value:新文件路径
 *     },
 *     errFiles: string[]  // 上传失败的文件列表
 *   }
 * }>}
 */
export const uploadAsset = async (file, params = {}, options = {}) => {
  if (!file) {
    return {
      code: -1,
      msg: '文件不能为空',
      data: null
    };
  }

  const formData = new FormData();
  formData.append('file[]', file);
  if (params.assetsDirPath) {
    formData.append('assetsDirPath', params.assetsDirPath);
  }
  
  return sendAssetRequest('upload', formData, { ...options, isFormData: true });
};

/**
 * 删除资源文件
 * @param {string[]} paths - 要删除的资源文件路径列表（相对于工作空间的路径）
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,  // 0表示成功，-1表示失败
 *   msg: string,   // 返回消息
 *   data: {
 *     succMap: {   // 删除成功的文件映射
 *       [key: string]: boolean
 *     }
 *   }
 * }>}
 */
export const removeAsset = async (paths, options = {}) => {
  if (!Array.isArray(paths) || paths.length === 0) {
    return {
      code: -1,
      msg: '路径列表不能为空',
      data: null
    };
  }
  return sendAssetRequest('remove', { paths }, options);
};

/**
 * 获取资源文件信息
 * @param {string} path - 资源文件路径（相对于工作空间的路径）
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,  // 0表示成功，-1表示失败
 *   msg: string,   // 返回消息
 *   data: {
 *     name: string,     // 文件名
 *     path: string,     // 文件路径
 *     size: number,     // 文件大小（字节）
 *     updated: number,  // 最后更新时间戳（毫秒）
 *     type: string      // 文件MIME类型
 *   }
 * }>}
 */
export const getAssetInfo = async (path, options = {}) => {
  if (!path) {
    return {
      code: -1,
      msg: '文件路径不能为空',
      data: null
    };
  }
  return sendAssetRequest('getInfo', { path }, options);
};

/**
 * 上传资源到云端
 * @param {Object} params - 上传参数
 * @param {string} params.path - 本地资源路径
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,  // 0表示成功，-1表示失败
 *   msg: string,   // 返回消息
 *   data: {
 *     cloudPath: string  // 云端存储路径
 *   }
 * }>}
 */
export const uploadCloud = async (params, options = {}) => {
  return sendAssetRequest('uploadCloud', params, options);
};

/**
 * 插入本地资源
 * @param {Object} params - 插入参数
 * @param {string[]} params.assetPaths - 要插入的资源路径列表
 * @param {string} params.id - 文档ID
 * @param {boolean} [params.isUpload=true] - 是否上传资源
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,  // 0表示成功，-1表示失败
 *   msg: string,   // 返回消息
 *   data: {
 *     succMap: {   // 插入成功的文件映射
 *       [key: string]: string  // key:原路径,value:新路径
 *     }
 *   }
 * }>}
 */
export const insertLocalAssets = async (params, options = {}) => {
  return sendAssetRequest('insertLocalAssets', params, options);
};

/**
 * 解析资源路径
 * @param {string} path - 资源路径
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,  // 0表示成功，-1表示失败
 *   msg: string,   // 返回消息
 *   data: string   // 解析后的绝对路径
 * }>}
 */
export const resolveAssetPath = async (path, options = {}) => {
  return sendAssetRequest('resolveAssetPath', { path }, options);
};

/**
 * 设置文件注释
 * @param {Object} params - 注释参数
 * @param {string} params.path - 文件路径
 * @param {string} params.data - 注释内容
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,  // 0表示成功，-1表示失败
 *   msg: string    // 返回消息
 * }>}
 */
export const setFileAnnotation = async (params, options = {}) => {
  return sendAssetRequest('setFileAnnotation', params, options);
};

/**
 * 获取文件注释
 * @param {string} id - 文件ID
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,  // 0表示成功，-1表示失败
 *   msg: string,   // 返回消息
 *   data: {
 *     data: string // 注释内容
 *   }
 * }>}
 */
export const getFileAnnotation = async (id, options = {}) => {
  return sendAssetRequest('getFileAnnotation', { id }, options);
};

/**
 * 获取未使用的资源列表
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,  // 0表示成功，-1表示失败
 *   msg: string,   // 返回消息
 *   data: {
 *     unusedAssets: Array<{
 *       path: string,      // 资源路径
 *       updated: number,   // 最后更新时间戳（毫秒）
 *       size: number       // 文件大小（字节）
 *     }>
 *   }
 * }>}
 */
export const getUnusedAssets = async (options = {}) => {
  return sendAssetRequest('getUnusedAssets', {}, options);
};

/**
 * 获取丢失的资源列表
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,  // 0表示成功，-1表示失败
 *   msg: string,   // 返回消息
 *   data: {
 *     missingAssets: Array<{
 *       path: string,      // 引用路径
 *       docPath: string,   // 引用该资源的文档路径
 *       docTitle: string   // 引用该资源的文档标题
 *     }>
 *   }
 * }>}
 */
export const getMissingAssets = async (options = {}) => {
  return sendAssetRequest('getMissingAssets', {}, options);
};

/**
 * 删除未使用的资源
 * @param {string} path - 资源路径
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,  // 0表示成功，-1表示失败
 *   msg: string,   // 返回消息
 *   data: {
 *     path: string // 被删除的资源路径
 *   }
 * }>}
 */
export const removeUnusedAsset = async (path, options = {}) => {
  return sendAssetRequest('removeUnusedAsset', { path }, options);
};

/**
 * 批量删除未使用的资源
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,  // 0表示成功，-1表示失败
 *   msg: string,   // 返回消息
 *   data: {
 *     paths: string[] // 被删除的资源路径列表
 *   }
 * }>}
 */
export const removeUnusedAssets = async (options = {}) => {
  return sendAssetRequest('removeUnusedAssets', {}, options);
};

/**
 * 获取文档中的图片资源
 * @param {string} id - 文档ID
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,  // 0表示成功，-1表示失败
 *   msg: string,   // 返回消息
 *   data: string[] // 文档中的图片资源路径列表
 * }>}
 */
export const getDocImageAssets = async (id, options = {}) => {
  return sendAssetRequest('getDocImageAssets', { id }, options);
};

/**
 * 重命名资源
 * @param {Object} params - 重命名参数
 * @param {string} params.oldPath - 原资源路径
 * @param {string} params.newName - 新资源名称
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,  // 0表示成功，-1表示失败
 *   msg: string,   // 返回消息
 *   data: {
 *     newPath: string // 新的资源路径
 *   }
 * }>}
 */
export const renameAsset = async (params, options = {}) => {
  return sendAssetRequest('renameAsset', params, options);
};

/**
 * 获取图片OCR文本
 * @param {string} path - 图片路径
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,  // 0表示成功,-1表示失败
 *   msg: string,   // 返回消息
 *   data: {
 *     text: string  // OCR识别的文本内容
 *   }
 * }>}
 */
export const getImageOCRText = async (path, options = {}) => {
  return sendAssetRequest('getImageOCRText', { path }, options);
};

/**
 * 设置图片OCR文本
 * @param {Object} params - OCR参数
 * @param {string} params.path - 图片路径
 * @param {string} params.text - OCR文本内容
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,  // 0表示成功,-1表示失败
 *   msg: string,   // 返回消息
 *   data: null
 * }>}
 */
export const setImageOCRText = async (params, options = {}) => {
  return sendAssetRequest('setImageOCRText', params, options);
};

/**
 * 执行OCR
 * @param {Object} params - OCR参数
 * @param {string} params.path - 要执行OCR的图片路径
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,  // 0表示成功,-1表示失败
 *   msg: string,   // 返回消息
 *   data: {
 *     text: string  // OCR识别的文本内容
 *   }
 * }>}
 */
export const ocr = async (params, options = {}) => {
  return sendAssetRequest('ocr', params, options);
};

/**
 * 重建资源内容索引
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,  // 0表示成功,-1表示失败
 *   msg: string,   // 返回消息
 *   data: null
 * }>}
 */
export const fullReindexAssetContent = async (options = {}) => {
  return sendAssetRequest('fullReindexAssetContent', {}, options);
};

/**
 * 获取资源统计信息
 * @param {string} path - 资源路径
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,  // 0表示成功,-1表示失败
 *   msg: string,   // 返回消息
 *   data: {
 *     size: number,      // 文件大小(字节)
 *     hSize: string,     // 人类可读的文件大小
 *     created: number,   // 创建时间戳(毫秒)
 *     hCreated: string,  // 人类可读的创建时间
 *     updated: number,   // 更新时间戳(毫秒)
 *     hUpdated: string   // 人类可读的更新时间
 *   }
 * }>}
 */
export const statAsset = async (path, options = {}) => {
  return sendAssetRequest('statAsset', { path }, options);
}; 