/**
 * 思源笔记AI配置适配器
 * 本文件提供兼容旧代码的适配器函数，用于平滑过渡到新的配置模块
 */

import { getOpenAICompatConfig, getTranslationConfig } from './useSiyuanAI.js';

// 缓存配置，避免频繁异步调用
let cachedConfig = null;
let lastUpdateTime = 0;
const CACHE_TTL = 30000; // 30秒缓存期

/**
 * 同步获取思源AI配置的API兼容层
 * 用于替代直接使用window.siyuan.config.ai.openAI的场景
 * 
 * @returns {Object} 与window.siyuan.config.ai.openAI兼容的配置对象
 */
export const forLegacySiyuanConfig = () => {
  // 先检查window.siyuan是否存在
  if (!window?.siyuan?.config?.ai?.openAI) {
    console.error('无法获取思源AI配置: window.siyuan.config.ai.openAI不存在');
    // 返回安全的默认配置
    return {
      apiKey: '',
      apiModel: 'gpt-3.5-turbo',
      model: 'gpt-3.5-turbo', // 添加model字段作为备份
      apiBaseURL: 'https://api.openai.com/v1',
      apiMaxTokens: 0,
      apiTimeout: 30,
      apiTemperature: 1.0,
      apiMaxContexts: 1,
      apiProvider: 'OpenAI',
      apiProxy: '',
      apiVersion: '',
      apiUserAgent: navigator.userAgent,
      endpoint: 'https://api.openai.com/v1/chat/completions',
      temperature: 1.0,
      max_tokens: 0,
      stream: true,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ',
        'User-Agent': navigator.userAgent
      }
    };
  }
  
  // 如果没有缓存或缓存已过期，则异步更新缓存
  const currentTime = Date.now();
  if (!cachedConfig || currentTime - lastUpdateTime > CACHE_TTL) {
    try {
      // 异步更新缓存，但先返回当前window中的配置或缓存
      getOpenAICompatConfig().then(config => {
        if (config) {
          cachedConfig = config;
          lastUpdateTime = Date.now();
        }
      }).catch(err => {
        console.error('更新思源AI配置缓存失败:', err);
      });
    } catch (error) {
      console.error('获取思源AI配置发生错误:', error);
    }
  }
  
  // 优先返回缓存，如果没有缓存则返回window中的配置
  if (cachedConfig) {
    return cachedConfig;
  }
  
  // 获取原始配置
  const siyuanConfig = window.siyuan.config.ai.openAI;
  
  // 构建完整端点 - 仅在未指定endpoint时处理
  let endpoint = siyuanConfig.endpoint;
  if (!endpoint) {
    // 检查是否已包含/v1路径
    const baseURL = siyuanConfig.apiBaseURL || 'https://api.openai.com/v1';
    if (baseURL.endsWith('/v1')) {
      endpoint = `${baseURL}/chat/completions`;
    } else {
      endpoint = `${baseURL}${baseURL.endsWith('/') ? '' : '/'}chat/completions`;
    }
  }
  
  // 构建兼容的配置对象 - 保留思源原始配置
  return {
    // 主要字段 - 使用原始字段名，同时提供model映射以兼容需要model字段的API
    apiKey: siyuanConfig.apiKey,
    apiModel: siyuanConfig.apiModel,
    model: siyuanConfig.apiModel, // 为现代API添加model字段映射
    apiBaseURL: siyuanConfig.apiBaseURL,
    apiMaxTokens: siyuanConfig.apiMaxTokens,
    apiTimeout: siyuanConfig.apiTimeout,
    apiTemperature: siyuanConfig.apiTemperature,
    apiMaxContexts: siyuanConfig.apiMaxContexts,
    apiProvider: siyuanConfig.apiProvider,
    apiProxy: siyuanConfig.apiProxy,
    apiVersion: siyuanConfig.apiVersion,
    apiUserAgent: siyuanConfig.apiUserAgent,
    
    // 额外兼容字段 - 这些字段可能需要额外处理
    endpoint: endpoint,
    temperature: siyuanConfig.apiTemperature, // 直接映射为temperature
    max_tokens: siyuanConfig.apiMaxTokens > 0 ? siyuanConfig.apiMaxTokens : 1024, // 确保max_tokens大于0
    stream: true, // 始终为true，因为这是我们期望的行为
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${siyuanConfig.apiKey || ''}`, // 添加默认空字符串避免undefined
      'User-Agent': siyuanConfig.apiUserAgent || navigator.userAgent // 提供备用值
    }
  };
};

/**
 * 强制刷新缓存并获取最新配置
 * 
 * @param {Object} options - 配置选项
 * @returns {Promise<Object>} 最新的配置对象
 */
export const forForceSiyuanConfig = async (options = {}) => {
  const config = await getOpenAICompatConfig({ ...options, force: true });
  cachedConfig = config;
  lastUpdateTime = Date.now();
  return config;
};

/**
 * 为翻译功能提供配置
 * 
 * @param {string} targetLang - 目标语言
 * @returns {Object} 翻译配置
 */
export const forTranslation = async (targetLang) => {
  return getTranslationConfig(targetLang);
};

/**
 * 使用思源配置创建翻译配置对象
 * 用于aiI18n.js中的翻译函数
 * 
 * @param {string} targetLang - 目标语言，不传则使用思源配置的语言
 * @returns {Object} 翻译配置对象
 */
export const forTranslationConfig = (targetLang) => {
  try {
    const config = forLegacySiyuanConfig();
    
    // 直接使用思源配置中的字段，不添加默认值
    // 安全地访问配置属性 - 只在必要时添加保护
    const model = config.apiModel || config.model; // 优先使用apiModel，兼容model
    
    // 构建API地址 - 优先使用endpoint，否则构造
    let apiURL;
    if (config.endpoint) {
      apiURL = config.endpoint;
    } else if (config.apiBaseURL) {
      // 检查apiBaseURL是否已包含/v1路径
      const baseURL = config.apiBaseURL;
      if (baseURL.endsWith('/v1')) {
        apiURL = `${baseURL}/chat/completions`;
      } else {
        apiURL = `${baseURL}${baseURL.endsWith('/') ? '' : '/v1'}/chat/completions`;
      }
    } else {
      // 极端情况，提供兜底值
      apiURL = 'https://api.openai.com/v1/chat/completions';
    }
    
    // 只为必要字段添加兜底处理
    const apiKey = config.apiKey || ''; // 防止undefined导致的'Bearer undefined'
    const userAgent = config.apiUserAgent || navigator.userAgent; // 防止undefined
    const finalLang = targetLang || window?.siyuan?.config?.lang || 'zh_CN';
    
    return {
      模型: model,
      API地址: apiURL,
      请求头: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'User-Agent': userAgent
      },
      目标语言: finalLang
    };
  } catch (error) {
    console.error('创建翻译配置时发生错误:', error);
    // 返回安全的默认配置
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

export default {
  forLegacySiyuanConfig,
  forForceSiyuanConfig,
  forTranslation,
  forTranslationConfig
}; 