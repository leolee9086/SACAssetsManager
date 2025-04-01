/**
 * 文件系统服务
 * 提供统一的文件系统操作接口
 */

import { statWithCatch } from '../../processors/fs/stat.js';
import { 日志 } from '../../../../src/toolBox/base/useEcma/forLogs/useLogger.js';
const path = require('path');
const fs = require('fs');

/**
 * 获取文件状态
 * @param {string} filePath - 文件路径
 * @returns {Promise<Object>} 文件状态对象
 */
export const getFileStat = async (filePath) => {
    try {
        return await statWithCatch(filePath);
    } catch (error) {
        日志.错误(`获取文件状态失败: ${filePath}`, 'FSService');
        throw error;
    }
};

/**
 * 读取文件内容
 * @param {string} filePath - 文件路径
 * @param {Object} options - 读取选项
 * @returns {Promise<Buffer|string>} 文件内容
 */
export const readFile = async (filePath, options = {}) => {
    try {
        return await fs.promises.readFile(filePath, options);
    } catch (error) {
        日志.错误(`读取文件失败: ${filePath}`, 'FSService');
        throw error;
    }
};

/**
 * 写入文件内容
 * @param {string} filePath - 文件路径
 * @param {Buffer|string} data - 要写入的数据
 * @param {Object} options - 写入选项
 * @returns {Promise<void>}
 */
export const writeFile = async (filePath, data, options = {}) => {
    try {
        const dirname = path.dirname(filePath);
        await ensureDir(dirname);
        await fs.promises.writeFile(filePath, data, options);
    } catch (error) {
        日志.错误(`写入文件失败: ${filePath}`, 'FSService');
        throw error;
    }
};

/**
 * 确保目录存在
 * @param {string} dirPath - 目录路径
 * @returns {Promise<void>}
 */
export const ensureDir = async (dirPath) => {
    try {
        if (!fs.existsSync(dirPath)) {
            await fs.promises.mkdir(dirPath, { recursive: true });
        }
    } catch (error) {
        日志.错误(`创建目录失败: ${dirPath}`, 'FSService');
        throw error;
    }
};

/**
 * 删除文件
 * @param {string} filePath - 文件路径
 * @returns {Promise<void>}
 */
export const removeFile = async (filePath) => {
    try {
        if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
        }
    } catch (error) {
        日志.错误(`删除文件失败: ${filePath}`, 'FSService');
        throw error;
    }
};

/**
 * 获取目录内容
 * @param {string} dirPath - 目录路径
 * @returns {Promise<string[]>} 目录内容文件名列表
 */
export const readDir = async (dirPath) => {
    try {
        return await fs.promises.readdir(dirPath);
    } catch (error) {
        日志.错误(`读取目录失败: ${dirPath}`, 'FSService');
        throw error;
    }
};

/**
 * 重命名文件或目录
 * @param {string} oldPath - 旧路径
 * @param {string} newPath - 新路径
 * @returns {Promise<void>}
 */
export const rename = async (oldPath, newPath) => {
    try {
        await fs.promises.rename(oldPath, newPath);
    } catch (error) {
        日志.错误(`重命名失败: ${oldPath} -> ${newPath}`, 'FSService');
        throw error;
    }
};

/**
 * 复制文件
 * @param {string} src - 源文件路径
 * @param {string} dest - 目标文件路径
 * @returns {Promise<void>}
 */
export const copyFile = async (src, dest) => {
    try {
        await ensureDir(path.dirname(dest));
        await fs.promises.copyFile(src, dest);
    } catch (error) {
        日志.错误(`复制文件失败: ${src} -> ${dest}`, 'FSService');
        throw error;
    }
}; 