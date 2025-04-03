/**
 * @fileoverview Eagle 应用信息模块
 * @module toolBox/useAge/forEagle/useEagleApplication
 */

import { 发送请求 } from './useEagleRequest.js';

/**
 * 获取应用信息
 * @param {Object} [配置] - 配置选项
 * @returns {Promise<{
 *   status: string,
 *   data: {
 *     version: string,           // 应用版本号
 *     prereleaseVersion: null,   // 预发布版本号
 *     buildVersion: string,      // 构建版本号
 *     execPath: string,          // 可执行文件路径
 *     platform: string           // 运行平台
 *   }
 * }>}
 */
export const 获取应用信息 = (配置 = {}) => {
    return 发送请求('/api/application/info', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    }, 配置);
};

// 导出英文版 API
export const getApplicationInfo = 获取应用信息; 