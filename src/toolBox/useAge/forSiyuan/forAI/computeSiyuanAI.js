/**
 * 思源笔记AI配置计算工具
 * 本文件提供用于计算和处理思源AI配置的共享函数
 */

// 常量定义
export const API_CONSTANTS = {
  CONTENT_TYPE: 'Content-Type',
  CONTENT_TYPE_JSON: 'application/json',
  AUTHORIZATION: 'Authorization',
  BEARER_PREFIX: 'Bearer ',
  USER_AGENT: 'User-Agent',
  CHAT_COMPLETIONS_PATH: '/chat/completions',
  DEFAULT_TIMEOUT: 30000
};

/**
 * 合并对象，避免创建新对象的性能开销
 * 
 * @param {Object} baseObj - 基础对象
 * @param {Object} extendObj - 扩展对象
 * @returns {Object} 合并后的对象
 */
export const computeMergedObject = (baseObj, extendObj) => {
  // 如果扩展对象为空，直接返回基础对象
  if (!extendObj || Object.keys(extendObj).length === 0) {
    return baseObj;
  }
  
  return { ...baseObj, ...extendObj };
};

/**
 * 计算配置对象的唯一缓存键
 * 
 * @param {Object} options - 配置选项
 * @returns {string} 缓存键
 */
export const computeCacheKey = (options) => {
  if (!options || Object.keys(options).length === 0) {
    return 'default';
  }
  return JSON.stringify(options);
};

/**
 * 创建API配置对象
 * 
 * @param {Object} config - 源配置对象
 * @param {Object} options - 额外选项
 * @returns {Object} API配置对象
 */
export const createApiConfig = (config, options = {}) => {
  const modelValue = config.apiModel || config.model || 'gpt-3.5-turbo';
  
  return {
    model: modelValue, // 为API请求提供model字段
    apiModel: modelValue, // 保持与思源配置一致
    endpoint: options.customEndpoint || `${config.apiBaseURL}${API_CONSTANTS.CHAT_COMPLETIONS_PATH}`,
    headers: {
      [API_CONSTANTS.CONTENT_TYPE]: API_CONSTANTS.CONTENT_TYPE_JSON,
      [API_CONSTANTS.AUTHORIZATION]: `${API_CONSTANTS.BEARER_PREFIX}${config.apiKey}`,
      [API_CONSTANTS.USER_AGENT]: config.apiUserAgent || navigator.userAgent
    },
    temperature: config.apiTemperature,
    timeout: config.apiTimeout || API_CONSTANTS.DEFAULT_TIMEOUT,
    maxTokens: config.apiMaxTokens,
    maxContexts: config.apiMaxContexts,
    provider: config.apiProvider,
    proxy: config.apiProxy
  };
};

/**
 * 使用自定义API凭证创建配置选项
 * 
 * @param {Object} config - 基础配置
 * @param {string} apiKey - API密钥
 * @param {string} baseURL - API基础URL
 * @param {Object} additionalOptions - 额外选项
 * @returns {Object} 新的选项对象
 */
export const createCredentialOptions = (config, apiKey, baseURL, additionalOptions = {}) => {
  const newOptions = { ...additionalOptions };
  
  // 高效构建新的headers
  if (apiKey) {
    newOptions.headers = {
      ...config.apiConfig.headers,
      [API_CONSTANTS.AUTHORIZATION]: `${API_CONSTANTS.BEARER_PREFIX}${apiKey}`
    };
  }
  
  // 高效设置endpoint
  if (baseURL) {
    newOptions.endpoint = `${baseURL}${API_CONSTANTS.CHAT_COMPLETIONS_PATH}`;
  }
  
  return newOptions;
}; 