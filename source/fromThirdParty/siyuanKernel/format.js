import { getApiUrl, handleApiError } from './utils/apiConfig';
import { fetchWithTimeout, getAuthHeaders } from './utils/fetchUtils';

/**
 * 发送格式化相关请求的通用方法
 * @private
 * @param {string} endpoint - API 端点
 * @param {Object} data - 请求数据
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: Object}>}
 */
const sendFormatRequest = async (endpoint, data, options = {}) => {
  try {
    const response = await fetchWithTimeout(getApiUrl(`/api/format/${endpoint}`, options.host), {
      method: 'POST',
      headers: {
        ...getAuthHeaders({ token: options.token }),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (err) {
    return handleApiError(err, `格式化${endpoint}操作`);
  }
};

/**
 * 网络资源转换为本地资源
 * @param {Object} params - 转换选项
 * @param {string} params.id - 块ID
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: {closeTimeout: number}}>}
 */
export const netAssets2LocalAssets = (params, options = {}) => {
  const { id } = params;
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '块ID不能为空',
      data: null
    });
  }
  return sendFormatRequest('netAssets2LocalAssets', params, options);
};

/**
 * 网络图片转换为本地资源
 * @param {Object} params - 转换选项
 * @param {string} params.id - 块ID
 * @param {string} [params.url] - 图片URL
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: {closeTimeout: number}}>}
 */
export const netImg2LocalAssets = (params, options = {}) => {
  const { id } = params;
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '块ID不能为空',
      data: null
    });
  }
  return sendFormatRequest('netImg2LocalAssets', params, options);
};

/**
 * 自动空格
 * @param {string} id - 块ID
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: {closeTimeout: number}}>}
 */
export const autoSpace = (id, options = {}) => {
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '块ID不能为空',
      data: null
    });
  }
  return sendFormatRequest('autoSpace', { id }, options);
};

// 使用示例：
/*
// 网络资源转本地
await netAssets2LocalAssets({
  id: '20210808180117-6v0mkxr'
});

// 网络图片转本地
await netImg2LocalAssets({
  id: '20210808180117-6v0mkxr',
  url: 'https://example.com/image.png'
});

// 自动空格
await autoSpace('20210808180117-6v0mkxr');
*/ 