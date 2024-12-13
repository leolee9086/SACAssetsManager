import { getApiUrl, handleApiError } from './utils/apiConfig';
import { fetchWithTimeout, getAuthHeaders } from './utils/fetchUtils';

/**
 * 发送SQL相关请求的通用方法
 * @private
 * @param {string} endpoint - API 端点
 * @param {Object} data - 请求数据
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: Object}>}
 */
const sendSQLRequest = async (endpoint, data, options = {}) => {
  try {
    const response = await fetchWithTimeout(getApiUrl(`/api/sql/${endpoint}`, options.host), {
      method: 'POST',
      headers: {
        ...getAuthHeaders({ token: options.token }),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (err) {
    return handleApiError(err, `SQL${endpoint}操作`);
  }
};

/**
 * 执行SQL查询
 * @param {Object} params - 查询参数
 * @param {string} params.stmt - SQL语句
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: Array<{
 *     [key: string]: string | number | boolean | null
 *   }>
 * }>}
 */
export const sql = (params, options = {}) => {
  const { stmt } = params;
  if (!stmt || typeof stmt !== 'string') {
    return Promise.resolve({
      code: -1,
      msg: 'SQL语句不能为空且必须是字符串',
      data: null
    });
  }

  // 简单的SQL注入检查
  const dangerousKeywords = [
    'DROP',
    'DELETE',
    'TRUNCATE',
    'UPDATE',
    'INSERT',
    'REPLACE',
    'CREATE',
    'ALTER',
    'RENAME'
  ];
  
  const upperStmt = stmt.toUpperCase();
  if (dangerousKeywords.some(keyword => upperStmt.includes(keyword))) {
    return Promise.resolve({
      code: -1,
      msg: '不支持的SQL操作，仅允许SELECT语句',
      data: null
    });
  }

  return sendSQLRequest('sql', { stmt }, options);
};

/**
 * 刷新事务队列
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
export const flushTransaction = (options = {}) => {
  return sendSQLRequest('flushTransaction', {}, options);
};

/**
 * 执行事务
 * @param {Object} params - 事务参数
 * @param {Array<string>} params.statements - SQL语句列表
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
export const transaction = (params, options = {}) => {
  const { statements } = params;
  if (!Array.isArray(statements) || statements.length === 0) {
    return Promise.resolve({
      code: -1,
      msg: 'SQL语句列表不能为空且必须是数组',
      data: null
    });
  }

  // 验证每条SQL语句
  for (const stmt of statements) {
    if (!stmt || typeof stmt !== 'string') {
      return Promise.resolve({
        code: -1,
        msg: '每条SQL语句都必须是非空字符串',
        data: null
      });
    }
  }

  return sendSQLRequest('transaction', { statements }, options);
};

// 使用示例：
/*
// 执行SQL查询
const results = await sql(
  "SELECT * FROM blocks WHERE content LIKE '%关键词%' LIMIT 100"
);

// 刷新事务队列
await flushTransaction();
*/ 