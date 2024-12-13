import { getApiUrl, handleApiError } from './utils/apiConfig';
import { fetchWithTimeout, getAuthHeaders } from './utils/fetchUtils';

// 账户相关 API 封装

/**
 * 用户登录
 * @param {string} userName - 用户名
 * @param {string} password - 用户密码
 * @param {string} [captcha=''] - 验证码（可选）
 * @param {number} [cloudRegion=0] - 云服务器区域，默认为0
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,     // 0表示成功，-1表示失败
 *   msg: string,      // 返回消息
 *   data: {
 *     token: string,  // 登录成功后的认证令牌
 *     username: string // 用户名
 *   }
 * }>}
 */
export const login = async (userName, password, captcha = '', cloudRegion = 0, options = {}) => {
  try {
    const response = await fetchWithTimeout(getApiUrl('/api/account/login', options.host), {
      method: 'POST', 
      headers: getAuthHeaders({ token: options.token }),
      body: JSON.stringify({
        userName,
        userPassword: password,
        captcha,
        cloudRegion
      })
    });
    
    const result = await response.json();
    
    if(result.code === 0 && result.data.token) {
      localStorage.setItem('token', result.data.token);
    }
    
    return result;
  } catch (err) {
    return handleApiError(err, '登录');
  }
};

/**
 * 注销当前登录用户
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,  // 0表示成功，-1表示失败
 *   msg: string,   // 返回消息
 *   data: null     // 无返回数据
 * }>}
 */
export const logout = async (options = {}) => {
  try {
    const response = await fetch(getApiUrl('/api/account/logout', options.host), {
      method: 'POST',
      headers: getAuthHeaders({ token: options.token })
    });
    return await response.json();
  } catch (err) {
    return handleApiError(err, '注销');
  }
};

/**
 * 获取当前用户账户信息
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,     // 0表示成功，-1表示失败
 *   msg: string,      // 返回消息
 *   data: {
 *     userName: string,           // 用户名
 *     userPassword: string,       // 密码（已加密）
 *     activated: boolean,         // 是否已激活
 *     subscriptionStatus: string, // 订阅状态
 *     subscriptionPlan: string,   // 订阅计划
 *     subscriptionExpireTime: number // 订阅过期时间戳
 *   }
 * }>}
 */
export const getAccountInfo = async (options = {}) => {
  try {
    const response = await fetch(getApiUrl('/api/account/info', options.host), {
      method: 'GET',
      headers: getAuthHeaders({ token: options.token })
    });
    return await response.json();
  } catch (err) {
    return handleApiError(err, '获取账户信息');
  }
};

/**
 * 更新账户信息
 * @param {Object} accountInfo - 要更新的账户信息
 * @param {string} [accountInfo.userName] - 用户名
 * @param {string} [accountInfo.userPassword] - 用户密码
 * @param {boolean} [accountInfo.activated] - 是否已激活
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,  // 0表示成功，-1表示失败
 *   msg: string,   // 返回消息
 *   data: null     // 无返回数据
 * }>}
 */
export const updateAccountInfo = async (accountInfo, options = {}) => {
  try {
    const response = await fetch(getApiUrl('/api/account/update', options.host), {
      method: 'POST',
      headers: getAuthHeaders({ token: options.token }),
      body: JSON.stringify(accountInfo)
    });
    return await response.json();
  } catch (err) {
    return handleApiError(err, '更新账户信息');
  }
};

/**
 * 刷新认证令牌
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,  // 0表示成功，-1表示失败
 *   msg: string,   // 返回消息
 *   data: {
 *     token: string  // 新的认证令牌
 *   }
 * }>}
 */
export const refreshToken = async (options = {}) => {
  try {
    const response = await fetchWithTimeout(getApiUrl('/api/account/refreshToken', options.host), {
      method: 'POST',
      headers: getAuthHeaders({ token: options.token })
    });
    const result = await response.json();
    
    if(result.code === 0 && result.data.token) {
      localStorage.setItem('token', result.data.token); 
    }
    
    return result;
  } catch (err) {
    return handleApiError(err, '刷新令牌');
  }
};

/**
 * 检查激活码有效性
 * @param {string} activationCode - 激活码
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,  // 0表示有效，-1表示无效
 *   msg: string,   // 返回消息，包含激活码状态说明
 *   data: null     // 无返回数据
 * }>}
 */
export const checkActivationCode = async (activationCode, options = {}) => {
  try {
    const response = await fetchWithTimeout(getApiUrl('/api/account/checkActivationcode', options.host), {
      method: 'POST',
      headers: getAuthHeaders({ token: options.token }),
      body: JSON.stringify({ data: activationCode })
    });
    return await response.json();
  } catch (err) {
    return handleApiError(err, '检查激活码');
  }
};

/**
 * 使用激活码激活账户
 * @param {string} activationCode - 激活码
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,  // 0表示成功，-1表示失败
 *   msg: string,   // 返回消息
 *   data: null     // 无返回数据
 * }>}
 */
export const useActivationCode = async (activationCode, options = {}) => {
  try {
    const response = await fetchWithTimeout(getApiUrl('/api/account/useActivationcode', options.host), {
      method: 'POST',
      headers: getAuthHeaders({ token: options.token }),
      body: JSON.stringify({ data: activationCode })
    });
    return await response.json();
  } catch (err) {
    return handleApiError(err, '使用激活码');
  }
};

/**
 * 注销账户
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,  // 0表示成功，-1表示失败
 *   msg: string,   // 返回消息
 *   data: null     // 无返回数据
 * }>}
 */
export const deactivateAccount = async (options = {}) => {
  try {
    const response = await fetchWithTimeout(getApiUrl('/api/account/deactivate', options.host), {
      method: 'POST',
      headers: getAuthHeaders({ token: options.token })
    });
    return await response.json();
  } catch (err) {
    return handleApiError(err, '注销账户');
  }
};

/**
 * 开始免费试用
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,  // 0表示成功，-1表示失败
 *   msg: string,   // 返回消息
 *   data: null     // 无返回数据
 * }>}
 */
export const startFreeTrial = async (options = {}) => {
  try {
    const response = await fetchWithTimeout(getApiUrl('/api/account/startFreeTrial', options.host), {
      method: 'POST',
      headers: getAuthHeaders({ token: options.token })
    });
    return await response.json();
  } catch (err) {
    return handleApiError(err, '开始免费试用');
  }
};
