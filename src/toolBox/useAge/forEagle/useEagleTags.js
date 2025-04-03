/**
 * @fileoverview Eagle 标签管理模块
 * @module toolBox/useAge/forEagle/useEagleTags
 */

/**
 * 根据路径获取 Eagle 标签列表
 * @param {string} eaglePath - Eagle 素材库路径
 * @param {number} port - HTTP 服务端口号
 * @returns {Promise<Array>} 标签列表
 */
export const 获取标签列表 = async (eaglePath, port) => {
    try {
        const res = await fetch(`http://localhost:${port}/eagle-tags?path=${eaglePath}`);
        const json = await res.json();
        return json;
    } catch (error) {
        console.error('获取Eagle标签列表失败:', error);
        throw error;
    }
};

/**
 * 根据本地路径获取 Eagle 素材库路径
 * @param {string} localPath - 本地文件路径
 * @param {number} port - HTTP 服务端口号
 * @returns {Promise<string>} Eagle 素材库路径
 */
export const 获取素材库路径 = async (localPath, port) => {
    try {
        const res = await fetch(`http://localhost:${port}/eagle-path?path=${localPath}`);
        const json = await res.json();
        return json.finded;
    } catch (error) {
        console.error('获取Eagle素材库路径失败:', error);
        throw error;
    }
};

// 导出英文版 API
export const getTags = 获取标签列表;
export const getLibraryPath = 获取素材库路径; 