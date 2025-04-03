/**
 * @fileoverview Eagle 应用信息模块
 * @module toolBox/useAge/forEagle/useEagleApplication
 */

import { 基础请求 } from './useEagleBase.js';

/**
 * 最小支持版本
 * @type {string}
 */
const 最小支持版本 = '1.11.0';

/**
 * 最小支持构建版本
 * @type {string}
 */
const 最小支持构建版本 = '20200612';

/**
 * 检查版本兼容性
 * @param {string} 版本 - 版本号
 * @param {string} 构建版本 - 构建版本号
 * @returns {boolean} 是否兼容
 */
const 检查版本兼容性 = (版本, 构建版本) => {
    const [主版本, 次版本, 修订版本] = 版本.split('.').map(Number);
    const [最小主版本, 最小次版本, 最小修订版本] = 最小支持版本.split('.').map(Number);
    
    // 检查主版本
    if (主版本 > 最小主版本) return true;
    if (主版本 < 最小主版本) return false;
    
    // 检查次版本
    if (次版本 > 最小次版本) return true;
    if (次版本 < 最小次版本) return false;
    
    // 检查修订版本
    if (修订版本 >= 最小修订版本) return true;
    
    // 如果版本号相同，检查构建版本
    return 构建版本 >= 最小支持构建版本;
};

/**
 * 验证应用信息参数
 * @param {Object} 数据 - 应用信息数据
 * @returns {boolean} 是否有效
 */
const 验证应用信息参数 = (数据) => {
    const { token } = 数据;
    
    // 验证token（如果提供）
    if (token !== undefined && (typeof token !== 'string' || token.trim().length === 0)) {
        return false;
    }
    
    return true;
};

/**
 * 获取应用信息
 * @param {Object} [数据] - 应用信息数据
 * @param {string} [数据.token] - API令牌
 * @param {Object} [配置] - 配置选项
 * @returns {Promise<{
 *   status: string,
 *   data: {
 *     version: string,           // 版本号
 *     prereleaseVersion: string|null, // 预发布版本号
 *     buildVersion: string,      // 构建版本号
 *     execPath: string,         // 可执行文件路径
 *     platform: string          // 平台信息
 *   }
 * }>}
 * @throws {Error} 当请求失败或版本不兼容时抛出错误
 */
export const 获取应用信息 = async (数据 = {}, 配置 = {}) => {
    if (!验证应用信息参数(数据)) {
        throw new Error('无效的应用信息参数：token（如果提供）必须是非空字符串');
    }

    const { token } = 数据;
    
    try {
        const 响应 = await 基础请求('/api/application/info', {
            method: 'GET',
            ...(token && { body: JSON.stringify({ token: token.trim() }) })
        });
        
        const { version, buildVersion } = 响应.data;
        
        // 检查版本兼容性
        if (!检查版本兼容性(version, buildVersion)) {
            throw new Error(`Eagle版本不兼容，需要${最小支持版本}或更高版本`);
        }
        
        return 响应;
    } catch (error) {
        if (error.message.includes('Eagle应用未运行')) {
            throw error;
        }
        throw new Error(`获取应用信息失败: ${error.message}`);
    }
};

/**
 * 检查应用是否运行
 * @returns {Promise<boolean>} 是否运行
 */
export const 检查应用运行状态 = async () => {
    try {
        await 获取应用信息();
        return true;
    } catch {
        return false;
    }
};

// 导出英文版 API
export const getApplicationInfo = 获取应用信息;
export const checkApplicationStatus = 检查应用运行状态; 