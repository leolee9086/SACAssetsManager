/**
 * @fileoverview Eagle 项目/素材管理模块
 * @module toolBox/useAge/forEagle/useEagleItem
 */

import { 发送请求 } from './useEagleRequest.js';

/**
 * 从URL添加项目
 * @param {Object} 参数
 * @param {string} 参数.url - 项目URL（必需，支持 http、https、base64）
 * @param {string} 参数.name - 项目名称（必需）
 * @param {string} [参数.website] - 来源网站URL
 * @param {string[]} [参数.tags] - 标签列表
 * @param {number} [参数.star] - 项目评分
 * @param {string} [参数.annotation] - 注释
 * @param {number} [参数.modificationTime] - 创建时间（用于排序）
 * @param {string} [参数.folderId] - 文件夹ID
 * @param {Object} [参数.headers] - 自定义HTTP头
 * @param {string} [参数.headers.referer] - 请求来源
 * @returns {Promise<{
 *   status: string,
 *   data: {
 *     id: string,           // 项目ID
 *     name: string,         // 项目名称
 *     size: number,         // 文件大小
 *     ext: string,          // 文件扩展名
 *     tags: string[],       // 标签列表
 *     url: string,          // 原始URL
 *     annotation: string,   // 注释
 *     modificationTime: number, // 修改时间
 *     height: number,       // 高度
 *     width: number,        // 宽度
 *     folderId: string      // 文件夹ID
 *   }
 * }>}
 * @throws {Error} 当请求失败时抛出错误
 */
export const 从URL添加项目 = async ({ 
    url, 
    name, 
    website, 
    tags = [], 
    star,
    annotation,
    modificationTime,
    folderId,
    headers
}) => {
    // 验证必需参数
    if (!url || typeof url !== 'string') {
        throw new Error('URL不能为空');
    }
    if (!name || typeof name !== 'string') {
        throw new Error('名称不能为空');
    }

    // 验证可选参数
    if (website && typeof website !== 'string') {
        throw new Error('网站URL必须是字符串');
    }
    if (tags && !Array.isArray(tags)) {
        throw new Error('标签必须是数组');
    }
    if (star !== undefined && (typeof star !== 'number' || star < 0 || star > 5)) {
        throw new Error('评分必须是0-5之间的数字');
    }
    if (annotation && typeof annotation !== 'string') {
        throw new Error('注释必须是字符串');
    }
    if (modificationTime && typeof modificationTime !== 'number') {
        throw new Error('修改时间必须是数字');
    }
    if (folderId && typeof folderId !== 'string') {
        throw new Error('文件夹ID必须是字符串');
    }
    if (headers && typeof headers !== 'object') {
        throw new Error('headers必须是对象');
    }

    try {
        return await 发送请求('/api/item/addFromURL', {
            method: 'POST',
            body: JSON.stringify({
                url,
                name,
                website,
                tags,
                star,
                annotation,
                modificationTime,
                folderId,
                headers
            })
        });
    } catch (error) {
        throw new Error(`从URL添加项目失败: ${error.message}`);
    }
};

/**
 * 从多个URL添加项目
 * @param {Object} 参数
 * @param {Array<{
 *   url: string,           // 必需，项目URL（支持 http、https、base64）
 *   name: string,          // 必需，项目名称
 *   website?: string,      // 可选，来源网站URL
 *   tags?: string[],       // 可选，标签列表
 *   annotation?: string,   // 可选，注释
 *   modificationTime?: number, // 可选，创建时间（用于排序）
 *   headers?: {           // 可选，自定义HTTP头
 *     referer?: string    // 可选，请求来源
 *   }
 * }>} 参数.items - 项目列表
 * @param {string} [参数.folderId] - 文件夹ID
 * @returns {Promise<{
 *   status: string,
 *   data: {
 *     succeeded: Array<string>,  // 成功的URL列表
 *     failed: Array<{
 *       url: string,
 *       error: string
 *     }>                         // 失败的URL列表
 *   }
 * }>}
 * @throws {Error} 当请求失败时抛出错误
 */
export const 从多个URL添加项目 = async ({ items, folderId }) => {
    // 验证项目列表
    if (!Array.isArray(items) || items.length === 0) {
        throw new Error('项目列表不能为空');
    }

    // 验证每个项目的必需参数
    for (const item of items) {
        if (!item.url || typeof item.url !== 'string') {
            throw new Error('项目URL不能为空且必须是字符串');
        }
        if (!item.name || typeof item.name !== 'string') {
            throw new Error('项目名称不能为空且必须是字符串');
        }

        // 验证可选参数
        if (item.website && typeof item.website !== 'string') {
            throw new Error('网站URL必须是字符串');
        }
        if (item.tags && !Array.isArray(item.tags)) {
            throw new Error('标签必须是数组');
        }
        if (item.annotation && typeof item.annotation !== 'string') {
            throw new Error('注释必须是字符串');
        }
        if (item.modificationTime && typeof item.modificationTime !== 'number') {
            throw new Error('修改时间必须是数字');
        }
        if (item.headers && typeof item.headers !== 'object') {
            throw new Error('headers必须是对象');
        }
    }

    // 验证文件夹ID
    if (folderId && typeof folderId !== 'string') {
        throw new Error('文件夹ID必须是字符串');
    }

    try {
        return await 发送请求('/api/item/addFromURLs', {
            method: 'POST',
            body: JSON.stringify({
                items: items.map(item => ({
                    url: item.url,
                    name: item.name,
                    website: item.website,
                    tags: item.tags,
                    annotation: item.annotation,
                    modificationTime: item.modificationTime,
                    headers: item.headers
                })),
                folderId
            })
        });
    } catch (error) {
        throw new Error(`从多个URL添加项目失败: ${error.message}`);
    }
};

/**
 * 从本地路径添加项目
 * @param {Object} 参数
 * @param {string} 参数.path - 本地文件路径（必需）
 * @param {string} 参数.name - 项目名称（必需）
 * @param {string} [参数.website] - 来源网站URL
 * @param {string[]} [参数.tags] - 标签列表
 * @param {string} [参数.annotation] - 注释
 * @param {string} [参数.folderId] - 文件夹ID
 * @returns {Promise<{
 *   status: string,
 *   data: {
 *     id: string,
 *     name: string,
 *     size: number,
 *     ext: string,
 *     tags: string[],
 *     path: string,
 *     website: string,
 *     annotation: string,
 *     modificationTime: number,
 *     folderId: string
 *   }
 * }>}
 * @throws {Error} 当请求失败时抛出错误
 */
export const 从本地路径添加项目 = async ({ 
    path, 
    name,
    website,
    tags = [], 
    annotation,
    folderId 
}) => {
    // 验证必需参数
    if (!path || typeof path !== 'string') {
        throw new Error('路径不能为空');
    }
    if (!name || typeof name !== 'string') {
        throw new Error('名称不能为空');
    }

    // 验证可选参数
    if (website && typeof website !== 'string') {
        throw new Error('网站URL必须是字符串');
    }
    if (tags && !Array.isArray(tags)) {
        throw new Error('标签必须是数组');
    }
    if (annotation && typeof annotation !== 'string') {
        throw new Error('注释必须是字符串');
    }
    if (folderId && typeof folderId !== 'string') {
        throw new Error('文件夹ID必须是字符串');
    }

    try {
        return await 发送请求('/api/item/addFromPath', {
            method: 'POST',
            body: JSON.stringify({
                path,
                name,
                website,
                tags,
                annotation,
                folderId
            })
        });
    } catch (error) {
        throw new Error(`从本地路径添加项目失败: ${error.message}`);
    }
};

/**
 * 从多个本地路径添加项目
 * @param {Object} 参数
 * @param {Array<{
 *   path: string,          // 必需，本地文件路径
 *   name: string,          // 必需，项目名称
 *   website?: string,      // 可选，来源网站URL
 *   tags?: string[],       // 可选，标签列表
 *   annotation?: string    // 可选，注释
 * }>} 参数.items - 项目列表
 * @param {string} [参数.folderId] - 文件夹ID
 * @returns {Promise<{
 *   status: string,
 *   data: {
 *     succeeded: Array<string>,  // 成功的路径列表
 *     failed: Array<{
 *       path: string,
 *       error: string
 *     }>                         // 失败的路径列表
 *   }
 * }>}
 * @throws {Error} 当请求失败时抛出错误
 */
export const 从多个本地路径添加项目 = async ({ items, folderId }) => {
    // 验证项目列表
    if (!Array.isArray(items) || items.length === 0) {
        throw new Error('项目列表不能为空');
    }

    // 验证每个项目的必需参数
    for (const item of items) {
        if (!item.path || typeof item.path !== 'string') {
            throw new Error('项目路径不能为空且必须是字符串');
        }
        if (!item.name || typeof item.name !== 'string') {
            throw new Error('项目名称不能为空且必须是字符串');
        }

        // 验证可选参数
        if (item.website && typeof item.website !== 'string') {
            throw new Error('网站URL必须是字符串');
        }
        if (item.tags && !Array.isArray(item.tags)) {
            throw new Error('标签必须是数组');
        }
        if (item.annotation && typeof item.annotation !== 'string') {
            throw new Error('注释必须是字符串');
        }
    }

    // 验证文件夹ID
    if (folderId && typeof folderId !== 'string') {
        throw new Error('文件夹ID必须是字符串');
    }

    try {
        return await 发送请求('/api/item/addFromPaths', {
            method: 'POST',
            body: JSON.stringify({
                items: items.map(item => ({
                    path: item.path,
                    name: item.name,
                    website: item.website,
                    tags: item.tags,
                    annotation: item.annotation
                })),
                folderId
            })
        });
    } catch (error) {
        throw new Error(`从多个本地路径添加项目失败: ${error.message}`);
    }
};

/**
 * 添加书签
 * @param {Object} 参数
 * @param {string} 参数.url - 书签URL（必需，支持 http、https、base64）
 * @param {string} 参数.name - 书签名称（必需）
 * @param {string} [参数.base64] - 书签缩略图（base64格式）
 * @param {string[]} [参数.tags] - 标签列表
 * @param {number} [参数.modificationTime] - 创建时间（用于排序）
 * @param {string} [参数.folderId] - 文件夹ID
 * @returns {Promise<{
 *   status: string,
 *   data: {
 *     id: string,
 *     name: string,
 *     url: string,
 *     tags: string[],
 *     modificationTime: number,
 *     folderId: string
 *   }
 * }>}
 * @throws {Error} 当请求失败时抛出错误
 */
export const 添加书签 = async ({ 
    url, 
    name, 
    base64,
    tags = [], 
    modificationTime,
    folderId 
}) => {
    // 验证必需参数
    if (!url || typeof url !== 'string') {
        throw new Error('URL不能为空且必须是字符串');
    }
    if (!name || typeof name !== 'string') {
        throw new Error('名称不能为空且必须是字符串');
    }

    // 验证可选参数
    if (base64 && typeof base64 !== 'string') {
        throw new Error('缩略图必须是base64字符串');
    }
    if (tags && !Array.isArray(tags)) {
        throw new Error('标签必须是数组');
    }
    if (modificationTime && typeof modificationTime !== 'number') {
        throw new Error('创建时间必须是数字');
    }
    if (folderId && typeof folderId !== 'string') {
        throw new Error('文件夹ID必须是字符串');
    }

    try {
        return await 发送请求('/api/item/addBookmark', {
            method: 'POST',
            body: JSON.stringify({
                url,
                name,
                base64,
                tags,
                modificationTime,
                folderId
            })
        });
    } catch (error) {
        throw new Error(`添加书签失败: ${error.message}`);
    }
};

/**
 * 获取项目信息
 * @param {Object} 参数
 * @param {string} 参数.id - 项目ID
 * @returns {Promise<{
 *   status: string,
 *   data: {
 *     id: string,           // 项目ID
 *     name: string,         // 项目名称
 *     size: number,         // 文件大小
 *     ext: string,          // 文件扩展名
 *     tags: string[],       // 标签列表
 *     folders: string[],    // 所属文件夹ID列表
 *     isDeleted: boolean,   // 是否已删除
 *     url?: string,         // 项目URL（如果有）
 *     path?: string,        // 本地路径（如果有）
 *     annotation: string,   // 注释
 *     modificationTime: number, // 修改时间
 *     width?: number,       // 宽度（如果是图片）
 *     height?: number,      // 高度（如果是图片）
 *     noThumbnail: boolean, // 是否无缩略图
 *     lastModified: number, // 最后修改时间
 *     palettes?: Array<{    // 调色板（如果有）
 *       color: [number, number, number], // RGB颜色值
 *       ratio: number,      // 颜色占比
 *       $$hashKey?: string  // Angular内部使用
 *     }>
 *   }
 * }>}
 * @throws {Error} 当请求失败时抛出错误
 */
export const 获取项目信息 = async ({ id }) => {
    if (!id || typeof id !== 'string') {
        throw new Error('项目ID不能为空且必须是字符串');
    }

    try {
        // 使用URL查询参数而不是请求体
        return await 发送请求(`/api/item/info?id=${encodeURIComponent(id)}`, {
            method: 'GET'
        });
    } catch (error) {
        throw new Error(`获取项目信息失败: ${error.message}`);
    }
};

/**
 * 获取项目缩略图
 * @param {Object} 参数
 * @param {string} 参数.id - 项目ID
 * @returns {Promise<{
 *   status: string,
 *   data: string      // 缩略图的本地路径
 * }>}
 * @throws {Error} 当请求失败时抛出错误
 */
export const 获取项目缩略图 = async ({ id }) => {
    if (!id || typeof id !== 'string') {
        throw new Error('项目ID不能为空且必须是字符串');
    }

    try {
        // 使用URL查询参数而不是请求体
        return await 发送请求(`/api/item/thumbnail?id=${encodeURIComponent(id)}`, {
            method: 'GET'
        });
    } catch (error) {
        throw new Error(`获取项目缩略图失败: ${error.message}`);
    }
};

/**
 * 获取项目列表
 * @param {Object} 参数
 * @param {number} [参数.limit=200] - 返回数量限制，默认200
 * @param {number} [参数.offset=0] - 偏移量，从0开始
 * @param {string} [参数.orderBy] - 排序方式（CREATEDATE、FILESIZE、NAME、RESOLUTION，前面加-表示降序，如-FILESIZE）
 * @param {string} [参数.keyword] - 关键词过滤
 * @param {string} [参数.ext] - 文件类型过滤（如：jpg、png）
 * @param {string[]} [参数.tags] - 标签过滤
 * @param {string[]} [参数.folders] - 文件夹ID过滤
 * @returns {Promise<{
 *   status: string,
 *   data: Array<{
 *     id: string,           // 项目ID
 *     name: string,         // 项目名称
 *     size: number,         // 文件大小
 *     ext: string,          // 文件扩展名
 *     tags: string[],       // 标签列表
 *     folders: string[],    // 所属文件夹ID列表
 *     isDeleted: boolean,   // 是否已删除
 *     url?: string,         // 项目URL（如果有）
 *     annotation: string,   // 注释
 *     modificationTime: number, // 修改时间
 *     height?: number,      // 高度（如果是图片）
 *     width?: number,       // 宽度（如果是图片）
 *     lastModified: number, // 最后修改时间
 *     palettes?: Array<{    // 调色板（如果有）
 *       color: [number, number, number], // RGB颜色值
 *       ratio: number       // 颜色占比
 *     }>
 *   }>
 * }>}
 * @throws {Error} 当请求失败时抛出错误
 */
export const 获取项目列表 = async ({ 
    limit = 200, 
    offset = 0,
    orderBy,
    keyword,
    ext,
    tags,
    folders
} = {}) => {
    // 构建查询参数
    const params = new URLSearchParams();
    
    // 添加基础参数
    params.append('limit', limit);
    params.append('offset', offset);

    // 添加可选参数
    if (orderBy) {
        if (typeof orderBy !== 'string') {
            throw new Error('排序方式必须是字符串');
        }
        params.append('orderBy', orderBy);
    }

    if (keyword) {
        if (typeof keyword !== 'string') {
            throw new Error('关键词必须是字符串');
        }
        params.append('keyword', keyword);
    }

    if (ext) {
        if (typeof ext !== 'string') {
            throw new Error('文件类型必须是字符串');
        }
        params.append('ext', ext);
    }

    if (tags) {
        if (!Array.isArray(tags)) {
            throw new Error('标签必须是数组');
        }
        params.append('tags', tags.join(','));
    }

    if (folders) {
        if (!Array.isArray(folders)) {
            throw new Error('文件夹ID必须是数组');
        }
        params.append('folders', folders.join(','));
    }

    try {
        return await 发送请求(`/api/item/list?${params.toString()}`, {
            method: 'GET'
        });
    } catch (error) {
        throw new Error(`获取项目列表失败: ${error.message}`);
    }
};

/**
 * 移动项目到回收站
 * @param {Object} 参数
 * @param {string[]} 参数.itemIds - 项目ID列表
 * @returns {Promise<{
 *   status: string
 * }>}
 * @throws {Error} 当请求失败时抛出错误
 */
export const 移动到回收站 = async ({ itemIds }) => {
    // 验证项目ID列表
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
        throw new Error('项目ID列表不能为空');
    }

    // 验证每个项目ID
    for (const id of itemIds) {
        if (!id || typeof id !== 'string') {
            throw new Error('项目ID必须是非空字符串');
        }
    }

    try {
        return await 发送请求('/api/item/moveToTrash', {
            method: 'POST',
            body: JSON.stringify({ itemIds })
        });
    } catch (error) {
        throw new Error(`移动到回收站失败: ${error.message}`);
    }
};

/**
 * 刷新项目调色板
 * @param {Object} 参数
 * @param {string} 参数.id - 项目ID
 * @returns {Promise<{
 *   status: string
 * }>}
 * @throws {Error} 当请求失败时抛出错误
 */
export const 刷新调色板 = async ({ id }) => {
    if (!id || typeof id !== 'string') {
        throw new Error('项目ID不能为空且必须是字符串');
    }

    try {
        return await 发送请求('/api/item/refreshPalette', {
            method: 'POST',
            body: JSON.stringify({ id })
        });
    } catch (error) {
        throw new Error(`刷新调色板失败: ${error.message}`);
    }
};

/**
 * 刷新项目缩略图
 * 当原始文件发生变化时，可以调用此函数重新生成缩略图。
 * 同时会重新进行颜色分析。
 * @param {Object} 参数
 * @param {string} 参数.id - 项目ID
 * @returns {Promise<{
 *   status: string
 * }>}
 * @throws {Error} 当请求失败时抛出错误
 */
export const 刷新缩略图 = async ({ id }) => {
    if (!id || typeof id !== 'string') {
        throw new Error('项目ID不能为空且必须是字符串');
    }

    try {
        return await 发送请求('/api/item/refreshThumbnail', {
            method: 'POST',
            body: JSON.stringify({ id })
        });
    } catch (error) {
        throw new Error(`刷新缩略图失败: ${error.message}`);
    }
};

/**
 * 更新项目信息
 * 可以用于：
 * 1. 添加外部OCR工具的文本输出作为标签或注释，用于后续搜索
 * 2. 添加外部对象检测工具的分析结果作为标签，用于后续搜索
 * @param {Object} 参数
 * @param {string} 参数.id - 项目ID（必需）
 * @param {string[]} [参数.tags] - 标签列表
 * @param {string} [参数.annotation] - 注释
 * @param {string} [参数.url] - 来源URL
 * @param {number} [参数.star] - 评分（0-5）
 * @returns {Promise<{
 *   status: string,
 *   data: {
 *     id: string,           // 项目ID
 *     name: string,         // 项目名称
 *     size: number,         // 文件大小
 *     ext: string,          // 文件扩展名
 *     tags: string[],       // 标签列表
 *     folders: string[],    // 所属文件夹ID列表
 *     isDeleted: boolean,   // 是否已删除
 *     url: string,          // 来源URL
 *     annotation: string,   // 注释
 *     modificationTime: number, // 修改时间
 *     width?: number,       // 宽度（如果是图片）
 *     height?: number,      // 高度（如果是图片）
 *     noThumbnail: boolean, // 是否无缩略图
 *     lastModified: number, // 最后修改时间
 *     palettes?: Array<{    // 调色板（如果有）
 *       color: [number, number, number], // RGB颜色值
 *       ratio: number,      // 颜色占比
 *       $$hashKey?: string  // Angular内部使用
 *     }>,
 *     star?: number        // 评分（0-5）
 *   }
 * }>}
 * @throws {Error} 当请求失败时抛出错误
 */
export const 更新项目信息 = async ({ 
    id, 
    tags, 
    annotation, 
    url,
    star 
}) => {
    // 验证必需参数
    if (!id || typeof id !== 'string') {
        throw new Error('项目ID不能为空且必须是字符串');
    }

    // 验证可选参数
    if (tags && !Array.isArray(tags)) {
        throw new Error('标签必须是数组');
    }
    if (annotation && typeof annotation !== 'string') {
        throw new Error('注释必须是字符串');
    }
    if (url && typeof url !== 'string') {
        throw new Error('URL必须是字符串');
    }
    if (star !== undefined && (typeof star !== 'number' || star < 0 || star > 5)) {
        throw new Error('评分必须是0-5之间的数字');
    }

    try {
        return await 发送请求('/api/item/update', {
            method: 'POST',
            body: JSON.stringify({
                id,
                tags,
                annotation,
                url,
                star
            })
        });
    } catch (error) {
        throw new Error(`更新项目信息失败: ${error.message}`);
    }
};

// 为了向后兼容，添加单个项目移动的函数
/**
 * 移动单个项目到回收站
 * @param {Object} 参数
 * @param {string} 参数.id - 项目ID
 * @returns {Promise<{
 *   status: string
 * }>}
 * @throws {Error} 当请求失败时抛出错误
 * @deprecated 请使用支持批量操作的 移动到回收站 函数
 */
export const 移动单个项目到回收站 = async ({ id }) => {
    if (!id || typeof id !== 'string') {
        throw new Error('项目ID不能为空且必须是字符串');
    }

    return 移动到回收站({ itemIds: [id] });
};

// 导出英文版 API
export const addItemFromURL = 从URL添加项目;
export const addItemsFromURLs = 从多个URL添加项目;
export const addItemFromPath = 从本地路径添加项目;
export const addItemsFromPaths = 从多个本地路径添加项目;
export const addBookmark = 添加书签;
export const getItemInfo = 获取项目信息;
export const getItemThumbnail = 获取项目缩略图;
export const getItemsList = 获取项目列表;
export const moveItemToTrash = 移动单个项目到回收站;
export const moveItemsToTrash = 移动到回收站;
export const refreshItemPalette = 刷新调色板;
export const refreshItemThumbnail = 刷新缩略图;
export const updateItemInfo = 更新项目信息; 