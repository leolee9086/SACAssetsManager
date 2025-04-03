/**
 * 思源笔记AI配置工具统一入口
 * 本文件提供统一的接口来获取思源的AI配置（本地或远程）
 */

import { API_CONSTANTS } from './computeSiyuanAI.js';
import {
  getLocalSiyuanAIConfig,
  computeConfigWithCustomOptions as computeLocalConfigWithCustomOptions,
  computeConfigWithModel as computeLocalConfigWithModel,
  computeConfigWithAPICredentials as computeLocalConfigWithAPICredentials,
  computeConfigWithTargetLang as computeLocalConfigWithTargetLang,
  clearLocalConfigCache
} from './fromLocalSiyuanAI.js';

import {
  getRemoteSiyuanAIConfig,
  computeRemoteConfigWithCustomOptions,
  computeRemoteConfigWithModel,
  computeRemoteConfigWithAPICredentials,
  computeRemoteConfigWithTargetLang,
  clearRemoteConfigCache
} from './fromRemoteSiyuanAI.js';

// 常量定义
const SOURCE_TYPE = {
  LOCAL: 'local',
  REMOTE: 'remote'
};

/**
 * 统一获取思源AI配置的接口
 * 
 * @param {Object} options - 配置选项
 * @param {string} options.source - 配置来源，'local'或'remote'
 * @param {boolean} options.force - 强制刷新缓存
 * @param {string} options.customEndpoint - 自定义API端点
 * @returns {Promise<Object>|Object} 思源OpenAI配置对象
 */
export const getSiyuanAIConfig = async (options = {}) => {
  const source = options.source || SOURCE_TYPE.LOCAL;
  
  if (source === SOURCE_TYPE.REMOTE) {
    return getRemoteSiyuanAIConfig(options);
  } else {
    return getLocalSiyuanAIConfig(options);
  }
};

/**
 * 统一计算自定义配置的接口
 * 
 * @param {Object} customOptions - 自定义选项
 * @param {Object} options - 配置选项
 * @param {string} options.source - 配置来源，'local'或'remote'
 * @returns {Promise<Object>|Object} 更新后的配置
 */
export const computeConfigWithCustomOptions = async (customOptions = {}, options = {}) => {
  const source = options.source || SOURCE_TYPE.LOCAL;
  
  if (source === SOURCE_TYPE.REMOTE) {
    return computeRemoteConfigWithCustomOptions(customOptions);
  } else {
    return computeLocalConfigWithCustomOptions(customOptions);
  }
};

/**
 * 统一计算自定义模型配置的接口
 * 
 * @param {string} model - 模型名称
 * @param {Object} additionalOptions - 额外选项
 * @param {Object} options - 配置选项
 * @param {string} options.source - 配置来源，'local'或'remote'
 * @returns {Promise<Object>|Object} 更新后的配置
 */
export const computeConfigWithModel = async (model, additionalOptions = {}, options = {}) => {
  const source = options.source || SOURCE_TYPE.LOCAL;
  
  if (source === SOURCE_TYPE.REMOTE) {
    return computeRemoteConfigWithModel(model, additionalOptions);
  } else {
    return computeLocalConfigWithModel(model, additionalOptions);
  }
};

/**
 * 统一计算自定义API凭证配置的接口
 * 
 * @param {string} apiKey - API密钥
 * @param {string} baseURL - API基础URL
 * @param {Object} additionalOptions - 额外选项
 * @param {Object} options - 配置选项
 * @param {string} options.source - 配置来源，'local'或'remote'
 * @returns {Promise<Object>|Object} 更新后的配置
 */
export const computeConfigWithAPICredentials = async (apiKey, baseURL, additionalOptions = {}, options = {}) => {
  const source = options.source || SOURCE_TYPE.LOCAL;
  
  if (source === SOURCE_TYPE.REMOTE) {
    return computeRemoteConfigWithAPICredentials(apiKey, baseURL, additionalOptions);
  } else {
    return computeLocalConfigWithAPICredentials(apiKey, baseURL, additionalOptions);
  }
};

/**
 * 统一计算自定义目标语言配置的接口
 * 
 * @param {string} targetLang - 目标语言
 * @param {Object} additionalOptions - 额外选项
 * @param {Object} options - 配置选项
 * @param {string} options.source - 配置来源，'local'或'remote'
 * @returns {Promise<Object>|Object} 更新后的配置
 */
export const computeConfigWithTargetLang = async (targetLang, additionalOptions = {}, options = {}) => {
  const source = options.source || SOURCE_TYPE.LOCAL;
  
  if (source === SOURCE_TYPE.REMOTE) {
    return computeRemoteConfigWithTargetLang(targetLang, additionalOptions);
  } else {
    return computeLocalConfigWithTargetLang(targetLang, additionalOptions);
  }
};

/**
 * 清除配置缓存
 * 
 * @param {Object} options - 配置选项
 * @param {string} options.source - 配置来源，'local'或'remote'或'all'
 * @returns {void}
 */
export const clearConfigCache = (options = {}) => {
  const source = options.source || 'all';
  
  if (source === SOURCE_TYPE.REMOTE || source === 'all') {
    clearRemoteConfigCache();
  }
  
  if (source === SOURCE_TYPE.LOCAL || source === 'all') {
    clearLocalConfigCache();
  }
};

/**
 * 获取格式化后的OpenAI兼容配置
 * 用于替代直接使用window.siyuan.config.ai.openAI的场景
 * 
 * @param {Object} options - 配置选项
 * @param {string} options.source - 配置来源，'local'或'remote'
 * @param {boolean} options.force - 强制刷新缓存
 * @returns {Promise<Object>} 格式化后的OpenAI兼容配置
 */
export const getOpenAICompatConfig = async (options = {}) => {
  try {
    const config = await getSiyuanAIConfig(options);
    
    // 确保apiConfig存在
    if (!config || !config.apiConfig) {
      // 如果无法获取有效配置，返回默认安全配置
      const defaultConfig = window?.siyuan?.config?.ai?.openAI || {};
      const defaultApiKey = defaultConfig.apiKey || '';
      const defaultBaseURL = defaultConfig.apiBaseURL || 'https://api.openai.com/v1';
      const defaultModel = defaultConfig.apiModel || defaultConfig.model || 'gpt-3.5-turbo';
      
      return {
        apiKey: defaultApiKey,
        apiModel: defaultModel, // 提供apiModel字段
        model: defaultModel, // 同时提供model字段以兼容现代API
        apiBaseURL: defaultBaseURL,
        apiMaxTokens: defaultConfig.apiMaxTokens || 0,
        apiTimeout: defaultConfig.apiTimeout || 30,
        apiTemperature: defaultConfig.apiTemperature || 1.0,
        apiMaxContexts: defaultConfig.apiMaxContexts || 1,
        apiProvider: defaultConfig.apiProvider || 'OpenAI',
        apiProxy: defaultConfig.apiProxy || '',
        apiVersion: defaultConfig.apiVersion || '',
        apiUserAgent: defaultConfig.apiUserAgent || navigator.userAgent,
        // 额外兼容字段
        endpoint: `${defaultBaseURL.endsWith('/v1') ? defaultBaseURL : `${defaultBaseURL}/v1`}/chat/completions`,
        temperature: defaultConfig.apiTemperature || 1.0,
        max_tokens: defaultConfig.apiMaxTokens || 1024,
        target_lang: window?.siyuan?.config?.lang || 'zh_CN',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${defaultApiKey}`,
          'User-Agent': defaultConfig.apiUserAgent || navigator.userAgent
        },
        stream: true
      };
    }
    
    // 直接从简化的apiConfig中提取字段，不需要再访问credentials等嵌套字段
    const apiConfig = config.apiConfig;
    const apiKey = apiConfig.apiKey || '';
    // 确保同时有model和apiModel字段
    const modelValue = apiConfig.apiModel || apiConfig.model || '';
    const endpoint = apiConfig.endpoint || '';
    const apiBaseURL = apiConfig.apiBaseURL || '';
    const temperature = apiConfig.temperature ?? 1.0;
    const timeout = apiConfig.timeout ?? 30;
    const maxTokens = apiConfig.maxTokens ?? 0;
    const maxContexts = apiConfig.maxContexts ?? 1;
    const provider = apiConfig.provider || 'OpenAI';
    const proxy = apiConfig.proxy || '';
    const version = apiConfig.version || '';
    const userAgent = apiConfig.userAgent || navigator.userAgent;
    const headers = apiConfig.headers || {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'User-Agent': userAgent
    };
    const targetLang = config.targetLang || window?.siyuan?.config?.lang || 'zh_CN';
    
    return {
      apiKey,
      apiModel: modelValue, // 提供apiModel字段
      model: modelValue, // 同时提供model字段以兼容现代API
      apiBaseURL,
      apiMaxTokens: maxTokens,
      apiTimeout: timeout,
      apiTemperature: temperature,
      apiMaxContexts: maxContexts,
      apiProvider: provider,
      apiProxy: proxy,
      apiVersion: version,
      apiUserAgent: userAgent,
      // 额外兼容字段
      endpoint,
      temperature,
      max_tokens: maxTokens > 0 ? maxTokens : 1024,
      target_lang: targetLang,
      headers,
      stream: true
    };
  } catch (error) {
    console.error('获取OpenAI兼容配置失败:', error);
    
    // 发生错误时返回安全的默认配置
    const defaultConfig = window?.siyuan?.config?.ai?.openAI || {};
    const defaultApiKey = defaultConfig.apiKey || '';
    const defaultBaseURL = defaultConfig.apiBaseURL || 'https://api.openai.com/v1';
    const defaultModel = defaultConfig.apiModel || defaultConfig.model || 'gpt-3.5-turbo';
    
    return {
      apiKey: defaultApiKey,
      apiModel: defaultModel, // 提供apiModel字段
      model: defaultModel, // 同时提供model字段以兼容现代API
      apiBaseURL: defaultBaseURL,
      apiMaxTokens: defaultConfig.apiMaxTokens || 0,
      apiTimeout: defaultConfig.apiTimeout || 30,
      apiTemperature: defaultConfig.apiTemperature || 1.0,
      apiMaxContexts: defaultConfig.apiMaxContexts || 1,
      apiProvider: defaultConfig.apiProvider || 'OpenAI',
      apiProxy: defaultConfig.apiProxy || '',
      apiVersion: defaultConfig.apiVersion || '',
      apiUserAgent: defaultConfig.apiUserAgent || navigator.userAgent,
      // 额外兼容字段
      endpoint: `${defaultBaseURL.endsWith('/v1') ? defaultBaseURL : `${defaultBaseURL}/v1`}/chat/completions`,
      temperature: defaultConfig.apiTemperature || 1.0,
      max_tokens: defaultConfig.apiMaxTokens > 0 ? defaultConfig.apiMaxTokens : 1024,
      target_lang: window?.siyuan?.config?.lang || 'zh_CN',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${defaultApiKey}`,
        'User-Agent': defaultConfig.apiUserAgent || navigator.userAgent
      },
      stream: true
    };
  }
};

/**
 * 获取AI翻译配置
 * 用于统一处理翻译场景的配置
 * 
 * @param {string} targetLang - 目标语言，不传则使用思源配置的语言
 * @param {Object} options - 配置选项
 * @returns {Promise<Object>} 翻译配置对象
 */
export const getTranslationConfig = async (targetLang, options = {}) => {
  try {
    const config = await getSiyuanAIConfig(options);
    if (!config || !config.apiConfig) {
      // 返回默认翻译配置
      return {
        模型: 'gpt-3.5-turbo',
        API地址: 'https://api.openai.com/v1/chat/completions',
        请求头: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ',
          'User-Agent': navigator.userAgent
        },
        目标语言: targetLang || window?.siyuan?.config?.lang || 'zh_CN'
      };
    }
    
    const finalLang = targetLang || config.targetLang || window?.siyuan?.config?.lang || 'zh_CN';
    
    // 直接从简化后的apiConfig中获取数据
    return {
      模型: config.apiConfig.model || 'gpt-3.5-turbo',
      API地址: config.apiConfig.endpoint || 'https://api.openai.com/v1/chat/completions',
      请求头: config.apiConfig.headers || {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiConfig.apiKey || ''}`,
        'User-Agent': config.apiConfig.userAgent || navigator.userAgent
      },
      目标语言: finalLang
    };
  } catch (error) {
    console.error('获取翻译配置失败:', error);
    
    // 返回默认翻译配置
    return {
      模型: 'gpt-3.5-turbo',
      API地址: 'https://api.openai.com/v1/chat/completions',
      请求头: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ',
        'User-Agent': navigator.userAgent
      },
      目标语言: targetLang || window?.siyuan?.config?.lang || 'zh_CN'
    };
  }
};

// 导出常量和源类型
export { API_CONSTANTS, SOURCE_TYPE }; 