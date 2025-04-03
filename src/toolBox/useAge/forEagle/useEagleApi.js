/**
 * @fileoverview Eagle API基础模块
 * @module toolBox/useAge/forEagle/useEagleApi
 */

// Eagle API 配置
export const API_CONFIG = {
    DEFAULT_HOST: 'localhost',
    DEFAULT_PORT: 41595,
    DEFAULT_LIMIT: 100,
    ENDPOINTS: {
        ITEMS: '/api/item/list',
        FOLDERS: '/api/folder/list',
        LIBRARIES: '/api/library/list',
        SEARCH: '/api/item/search'
    }
};

/**
 * 构建搜索参数
 * @param {string} 查询 - 搜索关键词
 * @param {Object} [选项] - 搜索选项
 * @param {number} [选项.limit] - 结果数量限制
 * @param {number} [选项.offset] - 结果偏移量
 * @param {string} [选项.orderBy] - 排序字段
 * @param {string} [选项.orderDirection] - 排序方向
 * @param {string} [选项.folderId] - 文件夹ID
 * @returns {Object} 搜索参数
 */
export const 构建搜索参数 = (查询, 选项 = {}) => ({
    keyword: 查询,
    limit: 选项.limit || API_CONFIG.DEFAULT_LIMIT,
    offset: 选项.offset || 0,
    orderBy: 选项.orderBy || 'modificationTime',
    orderDirection: 选项.orderDirection || 'desc',
    folderId: 选项.folderId || ''
});

/**
 * 发送API请求
 * @param {string} 端点 - API端点
 * @param {Object} 参数 - 请求参数
 * @param {Object} [选项] - 请求选项
 * @param {string} [选项.host] - API主机地址
 * @param {number} [选项.port] - API端口
 * @returns {Promise<Object>} 请求结果
 */
export const 发送API请求 = async (端点, 参数 = {}, 选项 = {}) => {
    const { host = API_CONFIG.DEFAULT_HOST, port = API_CONFIG.DEFAULT_PORT } = 选项;
    const url = `http://${host}:${port}${端点}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(参数)
    });

    if (!response.ok) {
        throw new Error('Eagle API请求失败');
    }

    const data = await response.json();
    if (data.status !== 'success') {
        throw new Error(data.message || 'Eagle API响应包含错误');
    }

    return data.data;
};

/**
 * 检查API可用性
 * @param {Object} [选项] - 请求选项
 * @returns {Promise<boolean>} API是否可用
 */
export const 检查API可用性 = async (选项 = {}) => {
    try {
        await 发送API请求(API_CONFIG.ENDPOINTS.LIBRARIES, {}, 选项);
        return true;
    } catch (error) {
        console.error('Eagle API检查失败:', error);
        return false;
    }
};

// 导出英文版API
export const buildSearchParams = 构建搜索参数;
export const makeApiRequest = 发送API请求;
export const checkApiAvailability = 检查API可用性; 