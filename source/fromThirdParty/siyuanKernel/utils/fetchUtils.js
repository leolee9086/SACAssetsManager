const TIMEOUT = 30000;

export const fetchWithTimeout = async (url, options) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeout);
    return response;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
};

/**
 * 获取请求头，包含认证信息
 * @param {Object} [options] - 配置选项
 * @param {string} [options.token] - 认证令牌，如果不传则从 localStorage 获取
 * @param {Object} [options.additionalHeaders] - 额外的请求头
 * @returns {Object} 包含认证信息的请求头对象
 */
export const getAuthHeaders = (options = {}) => {
  const { token = localStorage.getItem('token'), additionalHeaders = {} } = options;
  
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Token ${token}` : '',
    ...additionalHeaders
  };
}; 