/**
 * @fileoverview Eagle 库管理模块
 * @module toolBox/useAge/forEagle/useEagleLibrary
 */

import { 发送请求 } from './useEagleRequest.js';

/**
 * 获取库信息
 * @returns {Promise<{
 *   status: string,
 *   data: {
 *     folders: Array<{              // 文件夹列表
 *       id: string,                 // 文件夹ID
 *       name: string,               // 文件夹名称
 *       description: string,        // 文件夹描述
 *       children: Array,            // 子文件夹
 *       modificationTime: number,   // 修改时间
 *       tags: string[],            // 标签列表
 *       iconColor?: string,        // 图标颜色
 *       icon?: string,            // 图标
 *       password: string,         // 密码（如果有）
 *       passwordTips: string,     // 密码提示（如果有）
 *       coverId?: string,        // 封面图ID
 *       orderBy?: string,        // 排序方式
 *       sortIncrease?: boolean   // 是否升序
 *     }>,
 *     smartFolders: Array<{       // 智能文件夹列表
 *       id: string,               // 文件夹ID
 *       icon: string,             // 图标
 *       name: string,             // 文件夹名称
 *       description: string,      // 文件夹描述
 *       modificationTime: number, // 修改时间
 *       conditions: Array<{       // 条件列表
 *         match: string,          // 匹配方式
 *         rules: Array<{         // 规则列表
 *           method: string,      // 方法
 *           property: string,    // 属性
 *           value: any          // 值
 *         }>
 *       }>,
 *       orderBy?: string,       // 排序方式
 *       sortIncrease?: boolean  // 是否升序
 *     }>,
 *     quickAccess: Array<{      // 快速访问列表
 *       type: string,           // 类型
 *       id: string             // ID
 *     }>,
 *     tagsGroups: Array<{      // 标签组列表
 *       id: string,            // 标签组ID
 *       name: string,          // 标签组名称
 *       tags: string[],        // 标签列表
 *       color?: string        // 颜色
 *     }>,
 *     modificationTime: number,    // 修改时间
 *     applicationVersion: string   // 应用版本
 *   }
 * }>}
 * @throws {Error} 当请求失败时抛出错误
 */
export const 获取库信息 = async () => {
    try {
        return await 发送请求('/api/library/info', {
            method: 'GET'
        });
    } catch (error) {
        throw new Error(`获取库信息失败: ${error.message}`);
    }
};

/**
 * 获取库历史记录
 * @returns {Promise<{
 *   status: string,
 *   data: string[]     // 最近打开的库路径列表
 * }>}
 * @throws {Error} 当请求失败时抛出错误
 */
export const 获取库历史记录 = async () => {
    try {
        return await 发送请求('/api/library/history', {
            method: 'GET'
        });
    } catch (error) {
        throw new Error(`获取库历史记录失败: ${error.message}`);
    }
};

/**
 * 切换库
 * @param {Object} 参数
 * @param {string} 参数.libraryPath - 库文件路径
 * @returns {Promise<{
 *   status: string
 * }>}
 * @throws {Error} 当请求失败时抛出错误
 */
export const 切换库 = async ({ libraryPath }) => {
    if (!libraryPath || typeof libraryPath !== 'string') {
        throw new Error('库路径不能为空且必须是字符串');
    }

    try {
        return await 发送请求('/api/library/switch', {
            method: 'POST',
            body: JSON.stringify({ libraryPath })
        });
    } catch (error) {
        throw new Error(`切换库失败: ${error.message}`);
    }
};

/**
 * 获取库图标
 * @param {Object} 参数
 * @param {string} 参数.libraryPath - 库文件路径
 * @returns {Promise<string>} 图标数据（Base64）
 * @throws {Error} 当请求失败时抛出错误
 */
export const 获取库图标 = async ({ libraryPath }) => {
    if (!libraryPath || typeof libraryPath !== 'string') {
        throw new Error('库路径不能为空且必须是字符串');
    }

    try {
        const encodedPath = encodeURIComponent(libraryPath);
        return await 发送请求(`/api/library/icon?libraryPath=${encodedPath}`, {
            method: 'GET'
        });
    } catch (error) {
        throw new Error(`获取库图标失败: ${error.message}`);
    }
};

// 导出英文版 API
export const getLibraryInfo = 获取库信息;
export const getLibraryHistory = 获取库历史记录;
export const switchLibrary = 切换库;
export const getLibraryIcon = 获取库图标; 