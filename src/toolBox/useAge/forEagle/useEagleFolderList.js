/**
 * @fileoverview Eagle 文件夹列表获取模块
 * @module toolBox/useAge/forEagle/useEagleFolderList
 */

import { 发送请求 } from './useEagleRequest.js';

/**
 * 验证列表参数
 * @param {Object} 数据 - 列表数据
 * @returns {boolean} 是否有效
 */
const 验证列表参数 = (数据) => {
    const { token } = 数据;
    
    // 验证token（如果提供）
    if (token !== undefined && (typeof token !== 'string' || token.trim().length === 0)) {
        return false;
    }
    
    return true;
};

/**
 * 构建查询字符串
 * @param {Object} 参数 - 查询参数
 * @returns {string} 查询字符串
 */
const 构建查询字符串 = (参数) => {
    const { token } = 参数;
    if (!token) return '';
    
    return `?token=${encodeURIComponent(token.trim())}`;
};

/**
 * 获取文件夹列表
 * @param {Object} 数据 - 列表数据
 * @param {string} [数据.token] - API令牌
 * @param {Object} [配置] - 配置选项
 * @returns {Promise<{
 *   status: string,
 *   data: Array<{
 *     id: string,                 // 文件夹ID
 *     name: string,               // 文件夹名称
 *     description: string,        // 文件夹描述
 *     children: Array,            // 子文件夹列表
 *     modificationTime: number,   // 修改时间
 *     tags: string[],            // 标签列表
 *     imageCount: number,        // 当前文件夹图片数量
 *     descendantImageCount: number, // 包含子文件夹的图片总数
 *     pinyin: string,           // 拼音
 *     extendTags: string[]      // 扩展标签
 *   }>
 * }>}
 * @throws {Error} 当参数无效或请求失败时抛出错误
 */
export const 获取文件夹列表 = async (数据, 配置 = {}) => {
    if (!验证列表参数(数据)) {
        throw new Error('无效的列表参数：token（如果提供）必须是非空字符串');
    }

    const { token } = 数据;
    
    try {
        return await 发送请求('/api/folder/list', {
            method: 'GET',
            ...(token && { body: JSON.stringify({ token: token.trim() }) })
        }, 配置);
    } catch (error) {
        if (error.message.includes('Eagle应用未运行')) {
            throw error;
        }
        throw new Error(`获取文件夹列表失败: ${error.message}`);
    }
};

/**
 * 获取最近使用的文件夹列表
 * @param {Object} 数据 - 列表数据
 * @param {string} [数据.token] - API令牌
 * @param {Object} [配置] - 配置选项
 * @returns {Promise<{
 *   status: string,
 *   data: Array<{
 *     id: string,                 // 文件夹ID
 *     name: string,               // 文件夹名称
 *     description: string,        // 文件夹描述
 *     children: Array,            // 子文件夹列表
 *     modificationTime: number,   // 修改时间
 *     tags: string[],            // 标签列表
 *     password: string,          // 密码
 *     passwordTips: string,      // 密码提示
 *     images: Array,             // 图片列表
 *     isExpand: boolean,         // 是否展开
 *     newFolderName: string,     // 新文件夹名称
 *     imagesMappings: Object,    // 图片映射
 *     imageCount: number,        // 当前文件夹图片数量
 *     descendantImageCount: number, // 包含子文件夹的图片总数
 *     pinyin: string,           // 拼音
 *     extendTags: string[]      // 扩展标签
 *   }>
 * }>}
 * @throws {Error} 当参数无效或请求失败时抛出错误
 */
export const 获取最近使用的文件夹列表 = async (数据, 配置 = {}) => {
    if (!验证列表参数(数据)) {
        throw new Error('无效的列表参数：token（如果提供）必须是非空字符串');
    }

    const { token } = 数据;
    
    try {
        return await 发送请求('/api/folder/listRecent', {
            method: 'GET',
            ...(token && { body: JSON.stringify({ token: token.trim() }) })
        }, 配置);
    } catch (error) {
        if (error.message.includes('Eagle应用未运行')) {
            throw error;
        }
        throw new Error(`获取最近使用的文件夹列表失败: ${error.message}`);
    }
};

// 导出英文版 API
export const getFolderList = 获取文件夹列表;
export const getRecentFolders = 获取最近使用的文件夹列表; 