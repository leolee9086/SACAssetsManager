import { getApiUrl, handleApiError } from './utils/apiConfig';
import { fetchWithTimeout, getAuthHeaders } from './utils/fetchUtils';

/**
 * 发送图谱相关请求的通用方法
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
const sendGraphRequest = async (endpoint, data, options = {}) => {
  try {
    const response = await fetchWithTimeout(getApiUrl(`/api/graph/${endpoint}`, options.host), {
      method: 'POST',
      headers: {
        ...getAuthHeaders({ token: options.token }),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (err) {
    return handleApiError(err, `图谱${endpoint}操作`);
  }
};

/**
 * 重置全局图谱配置
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,  // 0表示成功，其他值表示失败
 *   msg: string,   // 返回消息
 *   data: null     // 无返回数据
 * }>}
 */
export const resetGraph = (options = {}) => {
  return sendGraphRequest('resetGraph', {}, options);
};

/**
 * 重置局部图谱配置
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,  // 0表示成功，其他值表示失败
 *   msg: string,   // 返回消息
 *   data: null     // 无返回数据
 * }>}
 */
export const resetLocalGraph = (options = {}) => {
  return sendGraphRequest('resetLocalGraph', {}, options);
};

/**
 * 获取全局图谱数据
 * @param {Object} params - 查询选项
 * @param {string} [params.k=''] - 搜索关键词
 * @param {Object} params.conf - 图谱配置
 * @param {string} [params.reqId] - 请求ID，用于追踪请求
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,  // 0表示成功，其他值表示失败
 *   msg: string,   // 返回消息
 *   data: {
 *     nodes: Array<{
 *       id: string,      // 节点ID
 *       box: string,     // 笔记本ID
 *       path: string,    // 文档路径
 *       size: number,    // 节点大小
 *       title: string,   // 节点标题
 *       type: string     // 节点类型
 *     }>,
 *     links: Array<{
 *       source: string,  // 源节点ID
 *       target: string,  // 目标节点ID
 *       value: number    // 连接权重
 *     }>
 *   }
 * }>}
 */
export const getGraph = (params, options = {}) => {
  const { k = '', conf, reqId } = params;
  if (!conf) {
    return Promise.resolve({
      code: -1,
      msg: '图谱配置不能为空',
      data: null
    });
  }
  return sendGraphRequest('getGraph', { k, conf, reqId }, options);
};

/**
 * 获取局部图谱数据
 * @param {Object} params - 查询选项
 * @param {string} params.id - 文档ID
 * @param {string} [params.k=''] - 搜索关键词
 * @param {Object} params.conf - 图谱配置
 * @param {string} [params.reqId] - 请求ID，用于追踪请求
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,  // 0表示成功，其他值表示失败
 *   msg: string,   // 返回消息
 *   data: {
 *     nodes: Array<{
 *       id: string,      // 节点ID
 *       box: string,     // 笔记本ID
 *       path: string,    // 文档路径
 *       size: number,    // 节点大小
 *       title: string,   // 节点标题
 *       type: string     // 节点类型
 *     }>,
 *     links: Array<{
 *       source: string,  // 源节点ID
 *       target: string,  // 目标节点ID
 *       value: number    // 连接权重
 *     }>
 *   }
 * }>}
 */
export const getLocalGraph = (params, options = {}) => {
  const { id, k = '', conf, reqId } = params;
  if (!id || !conf) {
    return Promise.resolve({
      code: -1,
      msg: '文档ID和图谱配置不能为空',
      data: null
    });
  }
  return sendGraphRequest('getLocalGraph', { id, k, conf, reqId }, options);
};

// 使用示例：
/*
// 重置全局图谱配置
await resetGraph();

// 重置局部图谱配置
await resetLocalGraph();

// 获取全局图谱数据
const globalGraph = await getGraph({
  k: '搜索关键词',
  conf: {
    // 图谱配置项
  },
  reqId: 'request-123'
});

// 获取局部图谱数据
const localGraph = await getLocalGraph({
  id: '20210808180117-6v0mkxr',
  k: '搜索关键词',
  conf: {
    // 图谱配置项
  },
  reqId: 'request-123'
});
*/ 