/**
 * @fileoverview Eagle搜索模块
 * @module toolBox/useAge/forEagle/useEagleSearch
 */

import { 发送API请求, 构建搜索参数, API_CONFIG } from './useEagleApi.js';

/**
 * 转换Eagle搜索结果
 * @private
 * @param {Array} 项目列表 - Eagle返回的项目列表
 * @returns {Array} 转换后的结果列表
 */
const 转换搜索结果 = (项目列表) => {
    if (!Array.isArray(项目列表)) {
        return [];
    }

    return 项目列表.map(项目 => ({
        id: `eagleItem_${项目.id}`,
        name: 项目.name,
        path: 项目.url || 项目.path,
        size: 项目.size || 0,
        mtimeMs: new Date(项目.modificationTime).getTime(),
        ctimeMs: new Date(项目.createTime).getTime(),
        type: 'file',
        metadata: {
            tags: 项目.tags,
            annotation: 项目.annotation,
            folderId: 项目.folderId,
            thumbnail: 项目.thumbnail
        }
    }));
};

/**
 * 执行搜索
 * @param {string} 搜索词 - 搜索关键词
 * @param {Object} [选项] - 搜索选项
 * @returns {Promise<Array>} 搜索结果
 */
export const 执行搜索 = async (搜索词, 选项 = {}) => {
    try {
        const 参数 = 构建搜索参数(搜索词, 选项);
        const 数据 = await 发送API请求(API_CONFIG.ENDPOINTS.SEARCH, 参数, 选项);
        return 转换搜索结果(数据.items);
    } catch (error) {
        console.error('搜索失败:', error);
        throw error;
    }
};

/**
 * Eagle搜索入口
 * @param {string} 搜索词 - 搜索关键词
 * @param {Object} [选项] - 搜索选项
 * @returns {Promise<Object>} 搜索结果
 */
export const 搜索Eagle = async (搜索词, 选项 = {}) => {
    try {
        const 结果 = await 执行搜索(搜索词, 选项);
        return {
            fileList: 结果,
            enabled: true
        };
    } catch (e) {
        console.error('Eagle搜索失败:', e);
        return { enabled: false };
    }
};

// 导出英文版API
export const performSearch = 执行搜索;
export const searchByEagle = 搜索Eagle; 