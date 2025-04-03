/**
 * @fileoverview Eagle 文件夹创建模块
 * @module toolBox/useAge/forEagle/useEagleFolderCreate
 */

import { 发送请求 } from './useEagleRequest.js';

/**
 * 验证文件夹创建参数
 * @param {Object} 数据 - 文件夹数据
 * @returns {string|null} 错误信息，如果验证通过则返回null
 */
const 验证文件夹参数 = (数据) => {
    const { folderName, parent, token } = 数据;
    
    // 验证文件夹名称
    if (!folderName || typeof folderName !== 'string') {
        return '文件夹名称不能为空且必须是字符串';
    }
    
    const 名称 = folderName.trim();
    if (名称.length === 0) {
        return '文件夹名称不能为空白字符';
    }
    
    // 验证文件夹名称长度
    if (名称.length > 255) {
        return '文件夹名称不能超过255个字符';
    }
    
    // 验证父文件夹ID（如果提供）
    if (parent !== undefined) {
        if (typeof parent !== 'string') {
            return '父文件夹ID必须是字符串';
        }
        const 父ID = parent.trim();
        if (父ID.length === 0) {
            return '父文件夹ID不能为空白字符';
        }
        // 验证父文件夹ID格式（假设是8位字母数字组合）
        if (!/^[A-Z0-9]{8}$/.test(父ID)) {
            return '父文件夹ID格式无效';
        }
    }
    
    // 验证token（如果提供）
    if (token !== undefined && (typeof token !== 'string' || token.trim().length === 0)) {
        return 'token必须是非空字符串';
    }
    
    return null;
};

/**
 * 创建文件夹
 * @param {Object} 数据 - 文件夹数据
 * @param {string} 数据.folderName - 文件夹名称
 * @param {string} [数据.parent] - 父文件夹ID
 * @param {string} [数据.token] - API令牌
 * @param {Object} [配置] - 配置选项
 * @returns {Promise<{
 *   status: string,
 *   data: {
 *     id: string,                 // 文件夹ID
 *     name: string,               // 文件夹名称
 *     images: Array,              // 图片列表
 *     folders: Array,             // 子文件夹列表
 *     modificationTime: number,   // 修改时间
 *     imagesMappings: Object,     // 图片映射
 *     tags: string[],            // 标签列表
 *     children: Array,           // 子文件夹
 *     isExpand: boolean         // 是否展开
 *   }
 * }>}
 * @throws {Error} 当参数无效或请求失败时抛出错误
 */
export const 创建文件夹 = async (数据, 配置 = {}) => {
    const 错误信息 = 验证文件夹参数(数据);
    if (错误信息) {
        throw new Error(错误信息);
    }

    const { folderName, parent, token } = 数据;
    
    try {
        return await 发送请求('/api/folder/create', {
            method: 'POST',
            body: JSON.stringify({
                folderName: folderName.trim(),
                ...(parent && { parent: parent.trim() }),
                ...(token && { token: token.trim() })
            })
        }, 配置);
    } catch (error) {
        if (error.message.includes('Eagle应用未运行')) {
            throw error;
        }
        throw new Error(`创建文件夹失败: ${error.message}`);
    }
};

// 导出英文版 API
export const createFolder = 创建文件夹; 