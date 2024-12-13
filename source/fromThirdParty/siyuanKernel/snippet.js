import { getApiUrl, handleApiError } from './utils/apiConfig';
import { fetchWithTimeout, getAuthHeaders } from './utils/fetchUtils';

/**
 * 发送代码片段相关请求的通用方法
 * @private
 * @param {string} endpoint - API 端点
 * @param {Object} data - 请求数据
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: Object}>}
 */
const sendSnippetRequest = async (endpoint, data, options = {}) => {
  try {
    const response = await fetchWithTimeout(getApiUrl(`/api/snippet/${endpoint}`, options.host), {
      method: 'POST',
      headers: {
        ...getAuthHeaders({ token: options.token }),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (err) {
    return handleApiError(err, `代码片段${endpoint}操作`);
  }
};

/**
 * 获取代码片段列表
 * @param {Object} params - 查询选项
 * @param {string} params.type - 片段类型(js/css/all)
 * @param {number} params.enabled - 启用状态(0:禁用,1:启用,2:全部)
 * @param {string} [params.keyword] - 搜索关键词
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     snippets: Array<{
 *       id: string,
 *       name: string,
 *       type: string,
 *       content: string,
 *       enabled: boolean
 *     }>
 *   }
 * }>}
 */
export const getSnippet = (params, options = {}) => {
  const { type, enabled, keyword } = params;

  // 参数验证
  if (!['js', 'css', 'all'].includes(type)) {
    return Promise.resolve({
      code: -1,
      msg: '无效的片段类型，必须是 js/css/all',
      data: null
    });
  }

  if (![0, 1, 2].includes(enabled)) {
    return Promise.resolve({
      code: -1,
      msg: '无效的启用状态，必须是 0/1/2',
      data: null
    });
  }

  return sendSnippetRequest('getSnippet', {
    type,
    enabled,
    keyword: keyword || ''
  }, options);
};

/**
 * 设置代码片段
 * @param {Object} params - 设置选项
 * @param {Array<{
 *   id?: string,
 *   name: string,
 *   type: string,
 *   content: string,
 *   enabled: boolean
 * }>} params.snippets - 代码片段列表
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const setSnippet = (params, options = {}) => {
  const { snippets } = params;

  // 参数验证
  if (!Array.isArray(snippets)) {
    return Promise.resolve({
      code: -1,
      msg: '代码片段列表必须是数组',
      data: null
    });
  }

  // 验证每个片段的必要字段
  for (const snippet of snippets) {
    if (!snippet.name || !snippet.type || !snippet.content) {
      return Promise.resolve({
        code: -1,
        msg: '代码片段缺少必要字段(name/type/content)',
        data: null
      });
    }

    if (!['js', 'css'].includes(snippet.type)) {
      return Promise.resolve({
        code: -1,
        msg: '无效的片段类型，必须是 js/css',
        data: null
      });
    }
  }

  return sendSnippetRequest('setSnippet', { snippets }, options);
};

/**
 * 删除代码片段
 * @param {Object} params - 删除选项
 * @param {string} params.id - 片段ID
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const removeSnippet = (params, options = {}) => {
  const { id } = params;
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '片段ID不能为空',
      data: null
    });
  }
  return sendSnippetRequest('removeSnippet', { id }, options);
};

// 使用示例：
/*
// 获取代码片段列表
const snippets = await getSnippet({
  type: 'js',
  enabled: 1,
  keyword: '搜索关键词'
});

// 设置代码片段
await setSnippet({
  snippets: [{
    name: '测试片段',
    type: 'js',
    content: 'console.log("test")',
    enabled: true
  }]
});

// 删除代码片段
await removeSnippet('20210808180117-6v0mkxr');
*/ 