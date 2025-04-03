/**
 * @fileoverview Eagle 文件夹更新模块
 * @module toolBox/useAge/forEagle/useEagleFolderUpdate
 */

import { 发送请求 } from './useEagleRequest.js';

/**
 * 验证更新参数
 * @param {Object} 数据 - 更新数据
 * @returns {boolean} 是否有效
 */
const 验证更新参数 = (数据) => {
    const { folderId, newName, newDescription, newColor, token } = 数据;
    
    // 验证文件夹ID
    if (typeof folderId !== 'string' || folderId.trim().length === 0) {
        return false;
    }
    
    // 验证新名称（如果提供）
    if (newName !== undefined) {
        if (typeof newName !== 'string' || newName.trim().length === 0) {
            return false;
        }
        if (newName.length > 255) {
            return false;
        }
    }
    
    // 验证新描述（如果提供）
    if (newDescription !== undefined) {
        if (typeof newDescription !== 'string') {
            return false;
        }
        if (newDescription.length > 1000) {
            return false;
        }
    }
    
    // 验证新颜色（如果提供）
    if (newColor !== undefined) {
        if (typeof newColor !== 'string') {
            return false;
        }
        // 验证颜色值是否在允许的列表中
        const 允许的颜色 = ['red', 'orange', 'green', 'yellow', 'aqua', 'blue', 'purple', 'pink'];
        if (!允许的颜色.includes(newColor)) {
            return false;
        }
    }
    
    // 验证token（如果提供）
    if (token !== undefined && (typeof token !== 'string' || token.trim().length === 0)) {
        return false;
    }
    
    return true;
};

/**
 * 重命名文件夹
 * @param {Object} 参数
 * @param {string} 参数.folderId - 文件夹ID
 * @param {string} 参数.newName - 新文件夹名称
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
 *     isExpand: boolean,        // 是否展开
 *     size: number,             // 文件夹大小
 *     vstype: string,          // 视图类型
 *     styles: {                 // 样式信息
 *       depth: number,         // 深度
 *       first: boolean,        // 是否第一个
 *       last: boolean         // 是否最后一个
 *     },
 *     isVisible: boolean,      // 是否可见
 *     $$hashKey: string,       // 哈希键
 *     newFolderName: string,   // 新文件夹名称
 *     editable: boolean,       // 是否可编辑
 *     pinyin: string         // 拼音
 *   }
 * }>}
 * @throws {Error} 当参数无效或请求失败时抛出错误
 */
export const 重命名文件夹 = async ({ folderId, newName }) => {
    if (!folderId || typeof folderId !== 'string') {
        throw new Error('文件夹ID不能为空且必须是字符串');
    }
    if (!newName || typeof newName !== 'string') {
        throw new Error('新文件夹名称不能为空且必须是字符串');
    }
    const 名称 = newName.trim();
    if (名称.length === 0) {
        throw new Error('新文件夹名称不能为空白字符');
    }
    if (名称.length > 255) {
        throw new Error('新文件夹名称不能超过255个字符');
    }

    try {
        return await 发送请求('/api/folder/rename', {
            method: 'POST',
            body: JSON.stringify({
                folderId: folderId.trim(),
                newName: 名称
            })
        });
    } catch (error) {
        if (error.message.includes('Eagle应用未运行')) {
            throw error;
        }
        throw new Error(`重命名文件夹失败: ${error.message}`);
    }
};

/**
 * 更新文件夹
 * @param {Object} 数据 - 更新数据
 * @param {string} 数据.folderId - 文件夹ID
 * @param {string} [数据.newName] - 新文件夹名称
 * @param {string} [数据.newDescription] - 新描述
 * @param {('red'|'orange'|'green'|'yellow'|'aqua'|'blue'|'purple'|'pink')} [数据.newColor] - 新颜色
 * @param {string} [数据.token] - API令牌
 * @param {Object} [配置] - 配置选项
 * @returns {Promise<{
 *   status: string,
 *   data: {
 *     id: string,                 // 文件夹ID
 *     name: string,               // 文件夹名称
 *     description: string,        // 文件夹描述
 *     images: Array,              // 图片列表
 *     folders: Array,             // 子文件夹列表
 *     modificationTime: number,   // 修改时间
 *     imagesMappings: Object,     // 图片映射
 *     tags: string[],            // 标签列表
 *     children: Array,           // 子文件夹
 *     isExpand: boolean,        // 是否展开
 *     size: number,             // 文件夹大小
 *     vstype: string,          // 视图类型
 *     styles: {                 // 样式信息
 *       depth: number,         // 深度
 *       first: boolean,        // 是否第一个
 *       last: boolean         // 是否最后一个
 *     },
 *     isVisible: boolean,      // 是否可见
 *     $$hashKey: string,       // 哈希键
 *     editable: boolean       // 是否可编辑
 *   }
 * }>}
 * @throws {Error} 当参数无效或请求失败时抛出错误
 */
export const 更新文件夹 = async (数据, 配置 = {}) => {
    if (!验证更新参数(数据)) {
        throw new Error('无效的更新参数：文件夹ID不能为空，新名称（如果提供）不能为空且长度不能超过255个字符，新描述（如果提供）长度不能超过1000个字符，新颜色必须是允许的颜色值之一，token（如果提供）必须是非空字符串');
    }

    const { 
        folderId, 
        newName, 
        newDescription, 
        newColor, 
        token 
    } = 数据;
    
    const 请求数据 = {
        folderId: folderId.trim(),
        token: token?.trim()
    };

    if (newName) 请求数据.newName = newName.trim();
    if (newDescription) 请求数据.newDescription = newDescription.trim();
    if (newColor) 请求数据.newColor = newColor;
    
    try {
        return await 发送请求('/api/folder/update', {
            method: 'POST',
            body: JSON.stringify(请求数据)
        }, 配置);
    } catch (error) {
        if (error.message.includes('Eagle应用未运行')) {
            throw error;
        }
        throw new Error(`更新文件夹失败: ${error.message}`);
    }
};

// 导出英文版 API
export const renameFolder = 重命名文件夹;
export const updateFolder = 更新文件夹; 