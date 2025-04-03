/**
 * @fileoverview AnyTXT API 基础模块
 * @module toolBox/useAge/forAnytext/useAnytextApi
 */

import { listLocalDisks } from "../../../../source/data/diskInfo.js";

// API 配置
const API_CONFIG = {
    DEFAULT_HOST: 'localhost',
    DEFAULT_LIMIT: 300,
    MAX_TIMESTAMP: 2147483647,
    ENDPOINTS: {
        SEARCH: 'ATRpcServer.Searcher.V1.GetResult',
        CHECK: 'ATRpcServer.Searcher.V1.Search'
    }
};

/**
 * 构建搜索参数
 * @private
 * @param {string} search - 搜索关键词
 * @param {Object} options - 搜索选项
 * @returns {Object} 搜索参数
 */
const 构建搜索参数 = (search, options) => ({
    pattern: search,
    filterDir: options.filterDir || '',
    filterExt: '*',
    lastModifyBegin: 0,
    lastModifyEnd: API_CONFIG.MAX_TIMESTAMP,
    limit: options.limit || API_CONFIG.DEFAULT_LIMIT,
    offset: 0,
    order: 0
});

/**
 * 发送 API 请求
 * @private
 * @param {number} port - 端口号
 * @param {string} host - 主机地址
 * @param {string} method - 方法名
 * @param {Object} params - 请求参数
 * @returns {Promise<Object>} API 响应
 */
const 发送API请求 = async (port, host, method, params) => {
    const response = await fetch(`http://${host}:${port}`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            id: Date.now(),
            jsonrpc: "2.0",
            method,
            params: { input: params }
        })
    });
    if (!response.ok) {
        throw new Error('API请求失败');
    }
    const data = await response.json();
    if (data.error) {
        throw new Error(data.error.message || 'API响应包含错误');
    }
    return data;
};

/**
 * 搜索文件
 * @param {string} search - 搜索关键词
 * @param {number} port - 端口号
 * @param {Object} options - 搜索选项
 * @returns {Promise<Object>} 搜索结果
 */
export const 搜索文件 = async (search, port, options = {
    host: API_CONFIG.DEFAULT_HOST,
    filterDir: null
}) => {
    try {
        let allResults = [];

        if (options.filterDir) {
            allResults = await 在目录中搜索(search, port, options);
        } else {
            allResults = await 搜索所有驱动器(search, port, options);
        }
        console.log('搜索结果:', allResults);
        return allResults;
    } catch (error) {
        console.error('搜索失败:', error);
        throw error;
    }
};

/**
 * 搜索所有驱动器
 * @private
 * @param {string} search - 搜索关键词
 * @param {number} port - 端口号
 * @param {Object} options - 搜索选项
 * @returns {Promise<Array>} 搜索结果
 */
async function 搜索所有驱动器(search, port, options) {
    const drives = await listLocalDisks();
    const results = [];
    
    for (const drive of drives) {
        try {
            const driveResults = await 在目录中搜索(search, port, { 
                ...options, 
                filterDir: `${drive.name}` 
            });
            results.push(...driveResults);
        } catch(e) {
            console.warn(`搜索驱动器 ${drive.name} 失败:`, e);
        }
    }
    return results;
}

/**
 * 在指定目录中搜索
 * @private
 * @param {string} search - 搜索关键词
 * @param {number} port - 端口号
 * @param {Object} options - 搜索选项
 * @returns {Promise<Array>} 搜索结果
 */
async function 在目录中搜索(search, port, options) {
    const params = 构建搜索参数(search, options);
    const data = await 发送API请求(
        port, 
        options.host || API_CONFIG.DEFAULT_HOST,
        API_CONFIG.ENDPOINTS.SEARCH, 
        params
    );   
    return 转换搜索结果(data.result.data.output);
}

/**
 * 转换搜索结果
 * @private
 * @param {Object} output - API 输出结果
 * @returns {Array} 转换后的结果
 */
function 转换搜索结果(output) {
    if (!output || !output.field || !output.files) {
        return [];
    }
    const fields = output.field;
    return output.files.map(file => {
        const fileObj = {};
        fields.forEach((field, index) => {
            fileObj[field] = file[index];
        });

        const path = fileObj.file.replace(/\\/g, '/');
        return {
            id: `localEntrie_${path}`,
            name: path.split('/').pop(),
            path: path,
            size: fileObj.size,
            mtimeMs: new Date(fileObj.lastModify * 1000).getTime(),
            ctimeMs: null,
            type: 'file',
            fid: fileObj.fid
        };
    });
}

/**
 * 检查 API 可用性
 * @param {number} port - 端口号
 * @param {string} host - 主机地址
 * @returns {Promise<boolean>} API 是否可用
 */
export const 检查API可用性 = async (port, host = API_CONFIG.DEFAULT_HOST) => {
    try {
        const params = 构建搜索参数('', { filterDir: '' });
        await 发送API请求(port, host, API_CONFIG.ENDPOINTS.CHECK, params);
        return true;
    } catch (error) {
        console.error('API检查失败:', error);
        return false;
    }
};

/**
 * 通过 AnyTXT 搜索文件
 * @param {string} search - 搜索关键词
 * @param {number} port - 端口号
 * @param {Object} options - 搜索选项
 * @returns {Promise<Object>} 搜索结果
 */
export const 通过AnyTXT搜索 = async (search, port, options = {}) => {
    try {
        let result = await 搜索文件(search, port, options);
        if (result) {
            return {
                fileList: result,
                enabled: true
            };
        }
    } catch (e) {
        return { enabled: false };
    }
};

// 导出英文版 API
export const searchFiles = 搜索文件;
export const checkApiAvailability = 检查API可用性;
export const searchByAnytxt = 通过AnyTXT搜索; 