/**
 * @fileoverview Eagle API 请求处理模块
 * @module toolBox/useAge/forEagle/useEagleRequest
 */

import { 基础请求, 检查应用运行状态 } from './useEagleBase.js';

/**
 * 发送请求到Eagle API
 * @param {string} 路径 - API路径
 * @param {Object} 选项 - 请求选项
 * @param {Object} [配置] - 配置选项
 * @returns {Promise<Object>} 响应数据
 * @throws {Error} 当Eagle未运行或请求失败时抛出错误
 */
export const 发送请求 = async (路径, 选项, 配置 = {}) => {
    // 检查Eagle是否运行
    if (!await 检查应用运行状态()) {
        throw new Error('Eagle应用未运行，请先启动Eagle');
    }

    return await 基础请求(路径, 选项);
};

// 导出英文版 API
export const request = 发送请求; 