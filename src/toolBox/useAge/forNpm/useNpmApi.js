/**
 * @fileoverview npm API基础模块
 * @module toolBox/useAge/forNpm/useNpmApi
 */

// npm API 配置
const API_CONFIG = {
    DEFAULT_REGISTRY: 'https://registry.npmjs.org',
    DEFAULT_TIMEOUT: 5000,
    DEFAULT_LIMIT: 10
};

/**
 * 带超时的 fetch 请求
 * @private
 * @param {string} url - 请求URL
 * @param {Object} [选项] - fetch配置选项
 * @param {number} [超时时间=API_CONFIG.DEFAULT_TIMEOUT] - 超时时间(ms)
 * @returns {Promise<Object>} 请求结果
 */
const 带超时请求 = async (url, 选项 = {}, 超时时间 = API_CONFIG.DEFAULT_TIMEOUT) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 超时时间);
    
    try {
        const response = await fetch(url, {
            ...选项,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
};

/**
 * 获取包信息
 * @param {string} 包名 - 包名称
 * @param {Object} [选项] - 可选配置
 * @param {string} [选项.registry] - npm registry地址
 * @returns {Promise<Object>} 包信息
 */
export const 获取包信息 = async (包名, 选项 = {}) => {
    const registry = 选项.registry || API_CONFIG.DEFAULT_REGISTRY;
    try {
        return await 带超时请求(`${registry}/${包名}`);
    } catch (error) {
        throw new Error(`获取包信息失败: ${error.message}`);
    }
};

/**
 * 获取包的所有版本
 * @param {string} 包名 - 包名称
 * @param {Object} [选项] - 可选配置
 * @param {string} [选项.registry] - npm registry地址
 * @returns {Promise<string[]>} 版本列表
 */
export const 获取包版本列表 = async (包名, 选项 = {}) => {
    try {
        const info = await 获取包信息(包名, 选项);
        return Object.keys(info.versions || {});
    } catch (error) {
        throw new Error(`获取包版本失败: ${error.message}`);
    }
};

/**
 * 搜索包
 * @param {string} 关键词 - 搜索关键词
 * @param {Object} [选项] - 可选配置
 * @param {string} [选项.registry] - npm registry地址
 * @param {number} [选项.limit=10] - 返回结果数量限制
 * @returns {Promise<Object[]>} 搜索结果
 */
export const 搜索包 = async (关键词, 选项 = {}) => {
    const registry = 选项.registry || API_CONFIG.DEFAULT_REGISTRY;
    const limit = 选项.limit || API_CONFIG.DEFAULT_LIMIT;
    
    try {
        const data = await 带超时请求(
            `${registry}/-/v1/search?text=${encodeURIComponent(关键词)}&size=${limit}`
        );
        return data.objects;
    } catch (error) {
        throw new Error(`搜索包失败: ${error.message}`);
    }
};

// 导出英文版API
export const getPackageInfo = 获取包信息;
export const getPackageVersions = 获取包版本列表;
export const searchPackages = 搜索包; 