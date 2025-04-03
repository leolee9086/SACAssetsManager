/**
 * @fileoverview Eagle文件夹管理模块
 * @module toolBox/useAge/forEagle/useEagleFolder
 */

import { 发送API请求, API_CONFIG } from './useEagleApi.js';

/**
 * 转换Eagle文件夹结果
 * @private
 * @param {Array} 文件夹列表 - Eagle返回的文件夹列表
 * @returns {Array} 转换后的文件夹列表
 */
const 转换文件夹结果 = (文件夹列表) => {
    if (!Array.isArray(文件夹列表)) {
        return [];
    }
    return 文件夹列表.map(文件夹 => ({
        id: 文件夹.id,
        name: 文件夹.name,
        description: 文件夹.description,
        children: 文件夹.children ? 转换文件夹结果(文件夹.children) : [],
        modificationTime: 文件夹.modificationTime,
        createTime: 文件夹.createTime
    }));
};

/**
 * 获取文件夹列表
 * @param {Object} [选项] - 请求选项
 * @returns {Promise<Array>} 文件夹列表
 */
export const 获取文件夹列表 = async (选项 = {}) => {
    try {
        const 数据 = await 发送API请求(API_CONFIG.ENDPOINTS.FOLDERS, {}, 选项);
        return 转换文件夹结果(数据);
    } catch (error) {
        console.error('获取文件夹列表失败:', error);
        throw error;
    }
};

// 导出英文版API
export const getFolders = 获取文件夹列表; 