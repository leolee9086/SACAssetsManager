import { getApiUrl, handleApiError } from './utils/apiConfig';
import { fetchWithTimeout, getAuthHeaders } from './utils/fetchUtils';

/**
 * 发送大纲相关请求的通用方法
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
const sendOutlineRequest = async (endpoint, data, options = {}) => {
  try {
    const response = await fetchWithTimeout(getApiUrl(`/api/outline/${endpoint}`, options.host), {
      method: 'POST',
      headers: {
        ...getAuthHeaders({ token: options.token }),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (err) {
    return handleApiError(err, `大纲${endpoint}操作`);
  }
};

/**
 * 获取文档大纲
 * @param {Object} params - 查询选项
 * @param {string} params.id - 文档ID
 * @param {boolean} [params.preview=false] - 是否预览模式
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: Array<{
 *     id: string,        // 标题块ID
 *     parentID: string,  // 父标题块ID
 *     root: {           // 根文档信息
 *       id: string,      // 文档ID
 *       box: string,     // 笔记本ID
 *       path: string,    // 文档路径
 *       hPath: string    // 人类可读路径
 *     },
 *     content: string,   // 标题内容
 *     type: string,      // 块类型
 *     subType: string,   // 子类型
 *     depth: number,     // 层级深度
 *     children: Array    // 子标题
 *   }>
 * }>}
 */
export const getDocOutline = (params, options = {}) => {
  const { id, preview = false } = params;
  
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '文档ID不能为空',
      data: null
    });
  }

  return sendOutlineRequest('getDocOutline', {
    id,
    preview
  }, options);
};

// 使用示例：
/*
// 获取文档大纲
const outline = await getDocOutline({
  id: '20210808180117-6v0mkxr',
  notebook: '20210808180117-6v0mkxr',
  headingLevel: 3
});
*/ 