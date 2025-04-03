/**
 * 思源笔记远程AI配置获取工具
 * 本文件提供用于获取思源的远程AI配置的函数
 */

import { kernelApi } from "../../../../../source/asyncModules.js";
import {
  API_CONSTANTS,
  computeMergedObject,
  computeCacheKey,
  createApiConfig,
  createCredentialOptions
} from './computeSiyuanAI.js';

// 远程配置缓存
let remoteConfigCache = null;
let lastFetchTime = 0;
const CACHE_TTL = 60000; // 1分钟缓存过期时间

/**
 * 从思源笔记的API获取远程AI配置
 * 
 * @param {Object} options - 可选配置项
 * @param {boolean} options.force - 强制刷新缓存
 * @param {string} options.customEndpoint - 自定义API端点
 * @returns {Promise<Object>} 完整的思源OpenAI配置对象
 */
export const getRemoteSiyuanAIConfig = async (options = {}) => {
    const currentTime = Date.now();
    
    // 检查缓存是否有效
    if (
        !options.force && 
        remoteConfigCache && 
        (currentTime - lastFetchTime) < CACHE_TTL
    ) {
        return remoteConfigCache;
    }
    
    try {
        // 从远程获取配置
        const configData = await kernelApi.getConf({});
        const aiConfig = configData.ai.openAI;
        const targetLang = configData.lang;
        
        // 使用共享函数创建API配置
        const apiConfig = createApiConfig(aiConfig, options);
        
        // 更新缓存
        remoteConfigCache = {
            apiConfig,
            targetLang,
            rawConfig: aiConfig
        };
        
        lastFetchTime = currentTime;
        
        return remoteConfigCache;
    } catch (error) {
        console.error('获取远程思源AI配置失败:', error);
        throw new Error(`获取远程思源AI配置失败: ${error.message}`);
    }
};

// 自定义配置的结果缓存
const customConfigCache = new Map();

/**
 * 计算混合配置，继承远程思源配置但添加自定义选项
 * 
 * @param {Object} customOptions - 自定义选项覆盖默认配置
 * @returns {Promise<Object>} 混合后的配置
 */
export const computeRemoteConfigWithCustomOptions = async (customOptions = {}) => {
    // 使用缓存避免重复计算
    const cacheKey = computeCacheKey(customOptions);
    if (customConfigCache.has(cacheKey)) {
        return customConfigCache.get(cacheKey);
    }
    
    const baseConfig = await getRemoteSiyuanAIConfig();
    
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
 * 计算使用自定义模型的远程配置
 * 
 * @param {string} model - 要使用的模型名称
 * @param {Object} additionalOptions - 其他可选配置项
 * @returns {Promise<Object>} 更新模型后的配置
 */
export const computeRemoteConfigWithModel = async (model, additionalOptions = {}) => {
    // 如果没有提供模型名称，直接返回带附加选项的配置
    if (!model) {
        return computeRemoteConfigWithCustomOptions(additionalOptions);
    }
    
    return computeRemoteConfigWithCustomOptions({ 
        ...additionalOptions, 
        model 
    });
};

/**
 * 计算使用自定义API凭证的远程配置
 * 
 * @param {string} apiKey - API密钥
 * @param {string} baseURL - 可选的API基础URL
 * @param {Object} additionalOptions - 其他可选配置项
 * @returns {Promise<Object>} 更新API凭证后的配置
 */
export const computeRemoteConfigWithAPICredentials = async (apiKey, baseURL, additionalOptions = {}) => {
    // 如果没有提供关键参数，直接使用附加选项计算
    if (!apiKey && !baseURL) {
        return computeRemoteConfigWithCustomOptions(additionalOptions);
    }
    
    const config = await getRemoteSiyuanAIConfig();
    // 使用共享函数创建凭证选项
    const newOptions = createCredentialOptions(config, apiKey, baseURL, additionalOptions);
    
    return computeRemoteConfigWithCustomOptions(newOptions);
};

/**
 * 计算使用自定义目标语言的远程配置
 * 
 * @param {string} targetLang - 目标语言
 * @param {Object} additionalOptions - 其他可选配置项
 * @returns {Promise<Object>} 更新目标语言后的配置
 */
export const computeRemoteConfigWithTargetLang = async (targetLang, additionalOptions = {}) => {
    // 如果没有提供目标语言，直接返回带附加选项的配置
    if (!targetLang) {
        return computeRemoteConfigWithCustomOptions(additionalOptions);
    }
    
    return computeRemoteConfigWithCustomOptions({ 
        ...additionalOptions, 
        targetLang 
    });
};

/**
 * 清除远程配置缓存
 * 
 * @returns {void}
 */
export const clearRemoteConfigCache = () => {
    remoteConfigCache = null;
    lastFetchTime = 0;
    customConfigCache.clear();
}; 