/**
 * @fileoverview Eagle 标签管理模块
 * @module toolBox/useAge/forEagle/useEagleTags
 */

import { 发送请求 } from './useEagleRequest.js';

/**
 * 获取标签列表
 * @returns {Promise<{
 *   status: string,
 *   data: Array<{
 *     id: string,           // 标签ID
 *     name: string,         // 标签名称
 *     color?: string,       // 标签颜色
 *     count: number,        // 使用次数
 *     createdAt: string,    // 创建时间
 *     updatedAt: string     // 更新时间
 *   }>
 * }>}
 * @throws {Error} 当请求失败时抛出错误
 */
export const 获取标签列表 = async () => {
    try {
        return await 发送请求('/api/tags/list', {
            method: 'GET'
        });
    } catch (error) {
        throw new Error(`获取标签列表失败: ${error.message}`);
    }
};

/**
 * 创建标签
 * @param {Object} 参数
 * @param {string} 参数.name - 标签名称
 * @param {string} [参数.color] - 标签颜色（十六进制）
 * @returns {Promise<{
 *   status: string,
 *   data: {
 *     id: string,           // 标签ID
 *     name: string,         // 标签名称
 *     color?: string,       // 标签颜色
 *     createdAt: string,    // 创建时间
 *     updatedAt: string     // 更新时间
 *   }
 * }>}
 * @throws {Error} 当请求失败时抛出错误
 */
export const 创建标签 = async ({ name, color }) => {
    if (!name || typeof name !== 'string') {
        throw new Error('标签名称不能为空');
    }

    if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
        throw new Error('无效的颜色格式，请使用十六进制颜色代码');
    }

    try {
        return await 发送请求('/api/tags/create', {
            method: 'POST',
            body: JSON.stringify({ name, color })
        });
    } catch (error) {
        throw new Error(`创建标签失败: ${error.message}`);
    }
};

/**
 * 更新标签
 * @param {Object} 参数
 * @param {string} 参数.tagId - 标签ID
 * @param {string} [参数.name] - 新标签名称
 * @param {string} [参数.color] - 新标签颜色（十六进制）
 * @returns {Promise<{
 *   status: string,
 *   data: {
 *     id: string,           // 标签ID
 *     name: string,         // 标签名称
 *     color?: string,       // 标签颜色
 *     updatedAt: string     // 更新时间
 *   }
 * }>}
 * @throws {Error} 当请求失败时抛出错误
 */
export const 更新标签 = async ({ tagId, name, color }) => {
    if (!tagId || typeof tagId !== 'string') {
        throw new Error('无效的标签ID');
    }

    if (name && typeof name !== 'string') {
        throw new Error('标签名称必须是字符串');
    }

    if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
        throw new Error('无效的颜色格式，请使用十六进制颜色代码');
    }

    try {
        return await 发送请求('/api/tags/update', {
            method: 'POST',
            body: JSON.stringify({ tagId, name, color })
        });
    } catch (error) {
        throw new Error(`更新标签失败: ${error.message}`);
    }
};

/**
 * 删除标签
 * @param {Object} 参数
 * @param {string} 参数.tagId - 标签ID
 * @returns {Promise<{
 *   status: string,
 *   data: {
 *     success: boolean      // 是否成功
 *   }
 * }>}
 * @throws {Error} 当请求失败时抛出错误
 */
export const 删除标签 = async ({ tagId }) => {
    if (!tagId || typeof tagId !== 'string') {
        throw new Error('无效的标签ID');
    }

    try {
        return await 发送请求('/api/tags/delete', {
            method: 'POST',
            body: JSON.stringify({ tagId })
        });
    } catch (error) {
        throw new Error(`删除标签失败: ${error.message}`);
    }
};

// 导出英文版 API
export const getTagsList = 获取标签列表;
export const createTag = 创建标签;
export const updateTag = 更新标签;
export const deleteTag = 删除标签; 