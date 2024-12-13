import { getApiUrl, handleApiError } from './utils/apiConfig';
import { fetchWithTimeout, getAuthHeaders } from './utils/fetchUtils';

/**
 * 发送存储相关请求的通用方法
 * @private
 * @param {string} endpoint - API 端点
 * @param {Object} data - 请求数据
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: Object}>}
 */
const sendStorageRequest = async (endpoint, data, options = {}) => {
  try {
    const response = await fetchWithTimeout(getApiUrl(`/api/storage/${endpoint}`, options.host), {
      method: 'POST',
      headers: {
        ...getAuthHeaders({ token: options.token }),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (err) {
    return handleApiError(err, `存储${endpoint}操作`);
  }
};

/**
 * 获取本地存储
 * @param {Object} params - 查询选项
 * @param {string} params.key - 存储键名
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     key: string,
 *     val: string
 *   }
 * }>}
 */
export const getLocalStorage = (params, options = {}) => {
  const { key } = params;

  if (!key) {
    return Promise.resolve({
      code: -1,
      msg: '存储键名不能为空',
      data: null
    });
  }

  return sendStorageRequest('getLocalStorage', { key }, options);
};

/**
 * 设置本地存储
 * @param {Object} params - 设置选项
 * @param {string} params.key - 存储键名
 * @param {string} params.val - 存储值
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     closeTimeout: number
 *   }
 * }>}
 */
export const setLocalStorage = (params, options = {}) => {
  const { key, val } = params;

  if (!key) {
    return Promise.resolve({
      code: -1,
      msg: '存储键名不能为空',
      data: null
    });
  }

  if (typeof val !== 'string') {
    return Promise.resolve({
      code: -1,
      msg: '存储值必须是字符串',
      data: null
    });
  }

  return sendStorageRequest('setLocalStorage', { key, val }, options);
};

/**
 * 删除本地存储
 * @param {Object} params - 删除选项
 * @param {string} params.key - 存储键名
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     closeTimeout: number
 *   }
 * }>}
 */
export const removeLocalStorage = (params, options = {}) => {
  const { key } = params;

  if (!key) {
    return Promise.resolve({
      code: -1,
      msg: '存储键名不能为空',
      data: null
    });
  }

  return sendStorageRequest('removeLocalStorage', { key }, options);
};

/**
 * 获取本地存储键列表
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: Array<string>
 * }>}
 */
export const getLocalStorageKeys = (options = {}) => {
  return sendStorageRequest('getLocalStorageKeys', {}, options);
};

/**
 * 清空本地存储
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const clearLocalStorage = (options = {}) => {
  return sendStorageRequest('clearLocalStorage', {}, options);
};

/**
 * 批量设置本地存储
 * @param {Object} params - 设置选项
 * @param {Object} params.data - 键值对数据
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const batchSetLocalStorage = (params, options = {}) => {
  const { data } = params;
  
  if (!data || typeof data !== 'object') {
    return Promise.resolve({
      code: -1,
      msg: '数据必须是对象',
      data: null
    });
  }

  // 验证所有值是否为字符串
  for (const val of Object.values(data)) {
    if (typeof val !== 'string') {
      return Promise.resolve({
        code: -1,
        msg: '所有值必须是字符串',
        data: null
      });
    }
  }

  return sendStorageRequest('batchSetLocalStorage', { data }, options);
};

// 使用示例：
/*
// 获取存储值
const item = await getLocalStorage({
  key: 'settings'
});

// 设置存储值
await setLocalStorage({
  key: 'settings',
  val: JSON.stringify({theme: 'dark'})
});

// 删除存储值
await removeLocalStorage({
  key: 'settings'
});

// 获取所有键名
const keys = await getLocalStorageKeys();
*/ 