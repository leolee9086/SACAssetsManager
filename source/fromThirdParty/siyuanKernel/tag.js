import { getApiUrl, handleApiError } from './utils/apiConfig';
import { fetchWithTimeout, getAuthHeaders } from './utils/fetchUtils';

/**
 * 发送标签相关请求的通用方法
 * @private
 * @param {string} endpoint - API 端点
 * @param {Object} data - 请求数据
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: Object}>}
 */
const sendTagRequest = async (endpoint, data, options = {}) => {
  try {
    const response = await fetchWithTimeout(getApiUrl(`/api/tag/${endpoint}`, options.host), {
      method: 'POST',
      headers: {
        ...getAuthHeaders({ token: options.token }),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (err) {
    return handleApiError(err, `标签${endpoint}操作`);
  }
};

/**
 * 获取标签列表
 * @param {Object} [params] - 查询选项
 * @param {number} [params.sort] - 排序方式(0:按名称升序,1:按名称降序,2:按引用数升序,3:按引用数降序)
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: Array<{
 *     label: string,
 *     count: number
 *   }>
 * }>}
 */
export const getTag = (params = {}, options = {}) => {
  const { sort } = params;

  if (sort !== undefined && ![0, 1, 2, 3].includes(sort)) {
    return Promise.resolve({
      code: -1,
      msg: '无效的排序方式，必须是 0/1/2/3',
      data: null
    });
  }

  return sendTagRequest('getTag', { sort }, options);
};

/**
 * 重命名标签
 * @param {Object} params - 重命名选项
 * @param {string} params.oldLabel - 原标签名
 * @param {string} params.newLabel - 新标签名
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     closeTimeout?: number
 *   }
 * }>}
 */
export const renameTag = (params, options = {}) => {
  const { oldLabel, newLabel } = params;

  if (!oldLabel || !newLabel) {
    return Promise.resolve({
      code: -1,
      msg: '原标签名和新标签名不能为空',
      data: {
        closeTimeout: 5000
      }
    });
  }

  if (oldLabel === newLabel) {
    return Promise.resolve({
      code: -1,
      msg: '新标签名不能与原标签名相同',
      data: {
        closeTimeout: 5000
      }
    });
  }

  return sendTagRequest('renameTag', { oldLabel, newLabel }, options);
};

/**
 * 删除标签
 * @param {Object} params - 删除选项
 * @param {string} params.label - 标签名
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     closeTimeout?: number
 *   }
 * }>}
 */
export const removeTag = (params, options = {}) => {
  const { label } = params;

  if (!label) {
    return Promise.resolve({
      code: -1,
      msg: '标签名不能为空',
      data: {
        closeTimeout: 5000
      }
    });
  }

  return sendTagRequest('removeTag', { label }, options);
};

/**
 * 搜索标签
 * @param {Object} params - 搜索选项
 * @param {string} params.k - 搜索关键字
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: Array<{
 *     label: string,
 *     count: number
 *   }>
 * }>}
 */
export const searchTag = (params, options = {}) => {
  const { k } = params;

  if (!k) {
    return Promise.resolve({
      code: -1,
      msg: '搜索关键字不能为空',
      data: []
    });
  }

  return sendTagRequest('searchTag', { k }, options);
};

// 使用示例：
/*
// 获取标签列表
const tags = await getTag({
  sort: 0 // 排序方式
});

// 重命名标签
await renameTag({
  oldLabel: '旧标签',
  newLabel: '新标签'
});

// 删除标签
await removeTag({
  label: '要删除的标签'
});
*/ 