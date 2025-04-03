/**
 * @fileoverview Eagle 资源库管理模块
 * @module toolBox/useAge/forEagle/useEagleLibrary
 */

import { 发送请求 } from './useEagleRequest.js';

/**
 * 获取资源库信息
 * @param {Object} 参数 - 请求参数
 * @param {string} 参数.token - API token
 * @param {Object} [配置] - 配置选项
 * @returns {Promise<{
 *   status: string,
 *   data: {
 *     folders: Array<{
 *       id: string,
 *       name: string,
 *       description: string,
 *       children: Array<{
 *         id: string,
 *         name: string,
 *         description: string,
 *         children: Array,
 *         modificationTime: number,
 *         tags: string[],
 *         iconColor?: string,
 *         icon?: string,
 *         password: string,
 *         passwordTips: string,
 *         coverId?: string,
 *         orderBy?: string,
 *         sortIncrease?: boolean
 *       }>,
 *       modificationTime: number,
 *       tags: string[],
 *       iconColor?: string,
 *       icon?: string,
 *       password: string,
 *       passwordTips: string,
 *       coverId?: string,
 *       orderBy?: string,
 *       sortIncrease?: boolean
 *     }>,
 *     smartFolders: Array<{
 *       id: string,
 *       icon: string,
 *       name: string,
 *       description: string,
 *       modificationTime: number,
 *       conditions: Array<{
 *         match: string,
 *         rules: Array<{
 *           method: string,
 *           property: string,
 *           value: any
 *         }>
 *       }>,
 *       orderBy?: string,
 *       sortIncrease?: boolean
 *     }>,
 *     quickAccess: Array<{
 *       type: string,
 *       id: string
 *     }>,
 *     tagsGroups: Array<{
 *       id: string,
 *       name: string,
 *       tags: string[],
 *       color?: string
 *     }>,
 *     modificationTime: number,
 *     applicationVersion: string
 *   }
 * }>} 返回资源库信息
 */
export const 获取资源库信息 = async (参数, 配置 = {}) => {
    return 发送请求(`/api/library/info?token=${参数.token}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    }, 配置);
};

/**
 * 获取资源库历史记录
 * @param {Object} 参数 - 请求参数
 * @param {string} 参数.token - API token
 * @param {Object} [配置] - 配置选项
 * @returns {Promise<{
 *   status: string,
 *   data: string[] // 资源库路径列表
 * }>} 返回资源库历史记录
 */
export const 获取资源库历史记录 = async (参数, 配置 = {}) => {
    return 发送请求(`/api/library/history?token=${参数.token}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    }, 配置);
};

/**
 * 切换资源库
 * @param {Object} 参数 - 请求参数
 * @param {string} 参数.libraryPath - 资源库路径
 * @param {string} 参数.token - API token
 * @param {Object} [配置] - 配置选项
 * @returns {Promise<{status: string}>} 返回切换结果
 */
export const 切换资源库 = async (参数, 配置 = {}) => {
    return 发送请求('/api/library/switch', {
        method: 'POST',
        body: JSON.stringify({
            libraryPath: 参数.libraryPath,
            token: 参数.token
        }),
        headers: {
            'Content-Type': 'application/json'
        }
    }, 配置);
};

// 导出英文版 API
export const getLibraryInfo = 获取资源库信息;
export const getLibraryHistory = 获取资源库历史记录;
export const switchLibrary = 切换资源库; 