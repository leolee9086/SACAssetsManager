/**
 * 思源笔记本地AI配置获取工具
 * 本文件提供用于获取思源的本地AI配置的函数
 */

import {
  API_CONSTANTS,
  computeMergedObject,
  computeCacheKey,
  createApiConfig,
  createCredentialOptions
} from './computeSiyuanAI.js';

// 缓存配置结果
let configCache = null;
let lastWindowConfig = null;

/**
 * 从思源笔记的全局对象获取AI配置
 * 
 * @param {Object} options - 可选配置选项
 * @returns {Object} 完整的思源OpenAI配置对象
 */
export const getLocalSiyuanAIConfig = (options = {}) => {
    try {
        // 检查window.siyuan是否存在
        if (!window?.siyuan?.config?.ai?.openAI) {
            console.error('无法获取思源本地AI配置: window.siyuan.config.ai.openAI不存在');
            return createDefaultConfig();
        }
        
        const currentConfig = window.siyuan.config;
        
        // 检查配置是否已更改
        if (configCache && lastWindowConfig === currentConfig && !options.force) {
            return configCache;
        }
        
        const siyuanConfig = currentConfig.ai.openAI;
        const targetLang = currentConfig.lang || 'zh_CN';
        
        // 检查必要的配置字段
        if (!siyuanConfig) {
            console.error('思源AI配置不完整: siyuanConfig为空');
            return createDefaultConfig();
        }
        
        // 使用共享函数创建API配置，确保安全调用
        const apiConfig = createSafeApiConfig(siyuanConfig, options);
    
        // 创建并缓存结果
        configCache = {
            apiConfig,
            targetLang,
            rawConfig: siyuanConfig
        };
        
        // 保存配置引用以便后续比较
        lastWindowConfig = currentConfig;
        
        return configCache;
    } catch (error) {
        console.error('获取思源本地AI配置发生错误:', error);
        return createDefaultConfig();
    }
};

/**
 * 创建默认配置对象，用于错误情况
 * 
 * @private
 * @returns {Object} 默认配置对象
 */
const createDefaultConfig = () => {
    // 创建简化的API配置对象
    const defaultApiConfig = {
        apiKey: '',
        model: 'gpt-3.5-turbo',
        endpoint: 'https://api.openai.com/v1/chat/completions',
        apiBaseURL: 'https://api.openai.com/v1',
        temperature: 1.0,
        timeout: 30,
        maxTokens: 1024,
        maxContexts: 1,
        provider: 'OpenAI',
        proxy: '',
        version: '',
        userAgent: navigator.userAgent,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ',
            'User-Agent': navigator.userAgent
        }
    };
    
    return {
        apiConfig: defaultApiConfig,
        targetLang: window?.siyuan?.config?.lang || 'zh_CN',
        rawConfig: {
            apiKey: '',
            model: 'gpt-3.5-turbo',
            apiBaseURL: 'https://api.openai.com/v1',
            apiTemperature: 1.0,
            apiTimeout: 30,
            apiMaxTokens: 0,
            apiMaxContexts: 1,
            apiProvider: 'OpenAI',
            apiProxy: '',
            apiVersion: '',
            apiUserAgent: navigator.userAgent
        }
    };
};

/**
 * 安全地创建API配置对象，处理可能的null或undefined值
 * 
 * @private
 * @param {Object} config - 源配置对象
 * @param {Object} options - 额外选项
 * @returns {Object} 安全的API配置对象
 */
const createSafeApiConfig = (config, options = {}) => {
    try {
        // 获取API密钥和模型，优先使用apiModel，兼容model
        const apiKey = config.apiKey || '';
        const model = config.apiModel || config.model || 'gpt-3.5-turbo';
        
        // 正确处理API基础URL
        const apiBaseURL = config.apiBaseURL || 'https://api.openai.com/v1';
        
        // 构建完整端点，考虑自定义端点或基础URL的格式
        let endpoint = options.customEndpoint;
        if (!endpoint) {
            // 检查apiBaseURL是否已包含/v1路径
            if (apiBaseURL.endsWith('/v1')) {
                endpoint = `${apiBaseURL}/chat/completions`;
            } else {
                endpoint = `${apiBaseURL}${apiBaseURL.endsWith('/') ? '' : '/'}chat/completions`;
            }
        }
        
        // 返回简化的配置对象，与思源笔记的实际配置结构更接近
        return {
            apiKey: apiKey,
            model: model,
            endpoint: endpoint,
            apiBaseURL: apiBaseURL,
            temperature: config.apiTemperature ?? 1.0,
            timeout: config.apiTimeout ?? 30,
            maxTokens: (config.apiMaxTokens && config.apiMaxTokens > 0) ? config.apiMaxTokens : 1024,
            maxContexts: config.apiMaxContexts ?? 1,
            provider: config.apiProvider || 'OpenAI',
            proxy: config.apiProxy || '',
            version: config.apiVersion || '',
            userAgent: config.apiUserAgent || navigator.userAgent,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'User-Agent': config.apiUserAgent || navigator.userAgent
            }
        };
    } catch (error) {
        console.error('创建API配置时发生错误:', error);
        // 返回基本的安全配置
        return {
            apiKey: '',
            model: 'gpt-3.5-turbo',
            endpoint: 'https://api.openai.com/v1/chat/completions',
            apiBaseURL: 'https://api.openai.com/v1',
            temperature: 1.0,
            timeout: 30,
            maxTokens: 1024,
            maxContexts: 1,
            provider: 'OpenAI',
            proxy: '',
            version: '',
            userAgent: navigator.userAgent,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ',
                'User-Agent': navigator.userAgent
            }
        };
    }
};

// 自定义配置的结果缓存
const customConfigCache = new Map();

/**
 * 计算混合配置，继承思源配置但添加自定义选项
 * 
 * @param {Object} customOptions - 自定义选项覆盖默认配置
 * @returns {Object} 混合后的配置
 */
export const computeConfigWithCustomOptions = (customOptions = {}) => {
    // 使用缓存避免重复计算
    const cacheKey = computeCacheKey(customOptions);
    if (customConfigCache.has(cacheKey)) {
        return customConfigCache.get(cacheKey);
    }
    
    const baseConfig = getLocalSiyuanAIConfig();
    
    // 高效合并apiConfig与自定义选项
    const newApiConfig = computeMergedObject(baseConfig.apiConfig, customOptions);
    
    // 确定targetLang
    const newTargetLang = customOptions.targetLang || baseConfig.targetLang;
    
    const result = {
        apiConfig: newApiConfig,
        targetLang: newTargetLang,
        rawConfig: baseConfig.rawConfig
    };
    
    // 缓存结果
    customConfigCache.set(cacheKey, result);
    
    return result;
};

/**
 * 计算使用自定义模型的配置
 * 
 * @param {string} model - 要使用的模型名称
 * @param {Object} additionalOptions - 其他可选配置项
 * @returns {Object} 更新模型后的配置
 */
export const computeConfigWithModel = (model, additionalOptions = {}) => {
    // 如果没有提供模型名称，直接返回带附加选项的配置
    if (!model) {
        return computeConfigWithCustomOptions(additionalOptions);
    }
    
    return computeConfigWithCustomOptions({ 
        ...additionalOptions, 
        model 
    });
};

/**
 * 计算使用自定义API凭证的配置
 * 
 * @param {string} apiKey - API密钥
 * @param {string} baseURL - 可选的API基础URL
 * @param {Object} additionalOptions - 其他可选配置项
 * @returns {Object} 更新API凭证后的配置
 */
export const computeConfigWithAPICredentials = (apiKey, baseURL, additionalOptions = {}) => {
    // 如果没有提供关键参数，直接使用附加选项计算
    if (!apiKey && !baseURL) {
        return computeConfigWithCustomOptions(additionalOptions);
    }
    
    const config = getLocalSiyuanAIConfig();
    // 使用共享函数创建凭证选项
    const newOptions = createCredentialOptions(config, apiKey, baseURL, additionalOptions);
    
    return computeConfigWithCustomOptions(newOptions);
};

/**
 * 计算使用自定义目标语言的配置
 * 
 * @param {string} targetLang - 目标语言
 * @param {Object} additionalOptions - 其他可选配置项
 * @returns {Object} 更新目标语言后的配置
 */
export const computeConfigWithTargetLang = (targetLang, additionalOptions = {}) => {
    // 如果没有提供目标语言，直接返回带附加选项的配置
    if (!targetLang) {
        return computeConfigWithCustomOptions(additionalOptions);
    }
    
    return computeConfigWithCustomOptions({ 
        ...additionalOptions, 
        targetLang 
    });
};

/**
 * 清除本地配置缓存
 * 
 * @returns {void}
 */
export const clearLocalConfigCache = () => {
    configCache = null;
    lastWindowConfig = null;
    customConfigCache.clear();
}; 