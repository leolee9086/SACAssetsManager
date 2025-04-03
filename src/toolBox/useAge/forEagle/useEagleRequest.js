/**
 * @fileoverview Eagle API 基础请求模块
 * @module toolBox/useAge/forEagle/useEagleRequest
 */

/**
 * 默认配置选项
 * @type {Object}
 */
const 默认配置 = {
    基础URL: 'http://localhost:41595',
    超时时间: 30000
};

/**
 * 发送 API 请求的通用方法
 * @param {string} 端点 - API 端点
 * @param {Object} [选项] - 请求选项
 * @param {Object} [配置] - 配置选项
 * @param {string} [配置.基础URL] - 基础 URL
 * @param {number} [配置.超时时间] - 超时时间(ms)
 * @returns {Promise<any>} API 响应
 */
export const 发送请求 = async (端点, 选项 = {}, 配置 = {}) => {
    const 基础URL = 配置.基础URL || 默认配置.基础URL;
    const url = `${基础URL}${端点}`;
    
    const 默认选项 = {
        headers: {
            'Content-Type': 'application/json'
        },
        timeout: 配置.超时时间 || 默认配置.超时时间
    };

    try {
        const response = await fetch(url, { 
            ...默认选项, 
            ...选项 
        });
        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status}`);
        }
        return await response.json();
    } catch (err) {
        console.error('Eagle API请求失败:', err);
        throw err;
    }
};

// 导出英文版 API
export const request = 发送请求; 