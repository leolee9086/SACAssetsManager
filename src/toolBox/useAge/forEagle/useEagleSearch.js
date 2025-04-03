/**
 * @fileoverview Eagle 搜索模块
 * @module toolBox/useAge/forEagle/useEagleSearch
 */

import { 发送请求 } from './useEagleRequest.js';

/**
 * 搜索项目
 * @param {Object} 参数
 * @param {string} 参数.keyword - 搜索关键词
 * @param {string[]} [参数.tags] - 标签过滤
 * @param {string[]} [参数.folders] - 文件夹过滤
 * @param {number} [参数.limit=50] - 返回数量限制
 * @param {number} [参数.offset=0] - 偏移量
 * @param {string} [参数.sortBy='createdAt'] - 排序字段
 * @param {boolean} [参数.sortDesc=true] - 是否降序排序
 * @returns {Promise<{
 *   status: string,
 *   data: {
 *     items: Array<{
 *       id: string,           // 项目ID
 *       name: string,         // 项目名称
 *       path: string,         // 文件路径
 *       size: number,         // 文件大小
 *       type: string,         // 文件类型
 *       tags: string[],       // 标签列表
 *       folderId: string,     // 所属文件夹ID
 *       createdAt: string,    // 创建时间
 *       updatedAt: string,    // 更新时间
 *       metadata: Object      // 元数据
 *     }>,
 *     total: number,          // 总数
 *     hasMore: boolean        // 是否有更多
 *   }
 * }>}
 * @throws {Error} 当请求失败时抛出错误
 */
export const 搜索项目 = async ({
    keyword,
    tags = [],
    folders = [],
    limit = 50,
    offset = 0,
    sortBy = 'createdAt',
    sortDesc = true
}) => {
    if (!keyword || typeof keyword !== 'string') {
        throw new Error('搜索关键词不能为空');
    }

    if (tags && !Array.isArray(tags)) {
        throw new Error('标签必须是数组');
    }

    if (folders && !Array.isArray(folders)) {
        throw new Error('文件夹必须是数组');
    }

    try {
        return await 发送请求('/api/items/search', {
            method: 'POST',
            body: JSON.stringify({
                keyword,
                tags,
                folders,
                limit,
                offset,
                sortBy,
                sortDesc
            })
        });
    } catch (error) {
        throw new Error(`搜索项目失败: ${error.message}`);
    }
};

/**
 * 获取搜索建议
 * @param {Object} 参数
 * @param {string} 参数.keyword - 搜索关键词
 * @param {number} [参数.limit=10] - 返回数量限制
 * @returns {Promise<{
 *   status: string,
 *   data: {
 *     suggestions: Array<{
 *       type: string,         // 建议类型
 *       value: string,        // 建议值
 *       count: number         // 使用次数
 *     }>
 *   }
 * }>}
 * @throws {Error} 当请求失败时抛出错误
 */
export const 获取搜索建议 = async ({ keyword, limit = 10 }) => {
    if (!keyword || typeof keyword !== 'string') {
        throw new Error('搜索关键词不能为空');
    }

    try {
        return await 发送请求('/api/search/suggestions', {
            method: 'GET',
            body: JSON.stringify({ keyword, limit })
        });
    } catch (error) {
        throw new Error(`获取搜索建议失败: ${error.message}`);
    }
};

/**
 * 获取热门搜索
 * @param {Object} 参数
 * @param {number} [参数.limit=10] - 返回数量限制
 * @returns {Promise<{
 *   status: string,
 *   data: {
 *     keywords: Array<{
 *       keyword: string,      // 关键词
 *       count: number         // 使用次数
 *     }>
 *   }
 * }>}
 * @throws {Error} 当请求失败时抛出错误
 */
export const 获取热门搜索 = async ({ limit = 10 } = {}) => {
    try {
        return await 发送请求('/api/search/hot', {
            method: 'GET',
            body: JSON.stringify({ limit })
        });
    } catch (error) {
        throw new Error(`获取热门搜索失败: ${error.message}`);
    }
};

// 导出英文版 API
export const searchItems = 搜索项目;
export const getSearchSuggestions = 获取搜索建议;
export const getHotSearches = 获取热门搜索; 