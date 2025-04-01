/**
 * 缩略图服务
 * 提供缩略图生成、获取和管理功能
 */

import { 日志 } from '../../../../src/toolBox/base/useEcma/forLogs/useLogger.js';
import path from 'path';
import fs from 'fs';
import { imageExtensions } from '../../processors/thumbnail/utils/lists.js';
import { getFileStat, ensureDir } from '../fs/fsService.js';

/**
 * 缩略图配置
 * @type {Object}
 */
const thumbnailConfig = {
    // 缩略图缓存目录
    cacheDir: '',
    // 默认缩略图大小
    defaultSize: 200,
    // 缩略图质量 (1-100)
    quality: 80,
    // 是否保持原始比例
    keepAspectRatio: true
};

/**
 * 初始化缩略图服务
 * @param {Object} 配置 - 缩略图配置
 * @returns {Promise<boolean>} 初始化是否成功
 */
export const 初始化缩略图服务 = async (配置 = {}) => {
    try {
        // 合并配置
        Object.assign(thumbnailConfig, 配置);
        
        // 确保缓存目录存在
        if (!thumbnailConfig.cacheDir) {
            thumbnailConfig.cacheDir = path.join(
                window.siyuanConfig.system.workspaceDir,
                'data/plugins/SACAssetsManager/thumbnails'
            );
        }
        
        await ensureDir(thumbnailConfig.cacheDir);
        日志.信息(`缩略图服务初始化成功，缓存目录: ${thumbnailConfig.cacheDir}`, 'Thumbnail');
        return true;
    } catch (error) {
        日志.错误(`缩略图服务初始化失败: ${error.message}`, 'Thumbnail');
        return false;
    }
};

/**
 * 生成文件缩略图路径
 * @param {string} 文件路径 - 原始文件路径
 * @param {number} 尺寸 - 缩略图尺寸
 * @returns {string} 缩略图路径
 */
export const 生成缩略图路径 = (文件路径, 尺寸 = thumbnailConfig.defaultSize) => {
    // 规范化文件路径并创建哈希
    const 规范化路径 = 文件路径.replace(/\\/g, '/');
    const 文件名 = path.basename(规范化路径);
    const 扩展名 = path.extname(文件名).toLowerCase();
    
    // 创建路径哈希（简化版，实际可能需要更复杂的哈希算法）
    const 哈希 = Buffer.from(规范化路径).toString('base64')
        .replace(/[\/\+\=]/g, '_')
        .substring(0, 40);
    
    return path.join(
        thumbnailConfig.cacheDir,
        `${哈希}_${尺寸}${扩展名}`
    );
};

/**
 * 检查文件是否支持生成缩略图
 * @param {string} 文件路径 - 文件路径
 * @returns {boolean} 是否支持
 */
export const 是否支持缩略图 = (文件路径) => {
    const 扩展名 = path.extname(文件路径).toLowerCase().substring(1);
    return imageExtensions.includes(扩展名);
};

/**
 * 获取缩略图
 * @param {string} 文件路径 - 原始文件路径
 * @param {number} 尺寸 - 缩略图尺寸
 * @param {Object} 选项 - 附加选项
 * @returns {Promise<string>} 缩略图路径
 */
export const 获取缩略图 = async (文件路径, 尺寸 = thumbnailConfig.defaultSize, 选项 = {}) => {
    try {
        // 检查文件是否存在且支持缩略图
        const 文件状态 = await getFileStat(文件路径);
        if (!文件状态 || 文件状态.type !== 'file') {
            throw new Error('文件不存在或不是常规文件');
        }
        
        if (!是否支持缩略图(文件路径)) {
            throw new Error('文件类型不支持生成缩略图');
        }
        
        // 生成缩略图缓存路径
        const 缩略图路径 = 生成缩略图路径(文件路径, 尺寸);
        
        // 检查缩略图是否已存在且有效
        const 缩略图存在 = fs.existsSync(缩略图路径);
        
        // 如果请求强制刷新或缩略图不存在，则生成新缩略图
        if (选项.forceRefresh || !缩略图存在) {
            // 请注意，这里实际实现需要调用图像处理库
            // 例如: await 生成缩略图(文件路径, 缩略图路径, 尺寸);
            
            // 临时占位，表示生成了缩略图
            if (!缩略图存在) {
                日志.信息(`需要生成缩略图: ${path.basename(文件路径)}`, 'Thumbnail');
            }
        }
        
        return 缩略图路径;
    } catch (error) {
        日志.错误(`获取缩略图失败: ${error.message}`, 'Thumbnail');
        throw error;
    }
};

/**
 * 批量获取缩略图
 * @param {Array<string>} 文件路径列表 - 文件路径数组
 * @param {number} 尺寸 - 缩略图尺寸
 * @returns {Promise<Object>} 缩略图路径映射
 */
export const 批量获取缩略图 = async (文件路径列表, 尺寸 = thumbnailConfig.defaultSize) => {
    const 结果 = {};
    
    for (const 文件路径 of 文件路径列表) {
        try {
            结果[文件路径] = await 获取缩略图(文件路径, 尺寸);
        } catch (error) {
            日志.警告(`文件 ${文件路径} 缩略图生成失败: ${error.message}`, 'Thumbnail');
            结果[文件路径] = null;
        }
    }
    
    return 结果;
};

/**
 * 清理过期缩略图
 * @param {number} 天数 - 过期天数
 * @returns {Promise<number>} 清理的文件数量
 */
export const 清理过期缩略图 = async (天数 = 30) => {
    try {
        const 过期时间 = new Date();
        过期时间.setDate(过期时间.getDate() - 天数);
        
        const 缓存文件 = await fs.promises.readdir(thumbnailConfig.cacheDir);
        let 清理计数 = 0;
        
        for (const 文件名 of 缓存文件) {
            try {
                const 文件路径 = path.join(thumbnailConfig.cacheDir, 文件名);
                const 状态 = await fs.promises.stat(文件路径);
                
                if (状态.mtime < 过期时间) {
                    await fs.promises.unlink(文件路径);
                    清理计数++;
                }
            } catch (e) {
                // 忽略单个文件的错误
                日志.警告(`清理缩略图失败: ${文件名}`, 'Thumbnail');
            }
        }
        
        日志.信息(`清理了 ${清理计数} 个过期缩略图`, 'Thumbnail');
        return 清理计数;
    } catch (error) {
        日志.错误(`清理过期缩略图失败: ${error.message}`, 'Thumbnail');
        throw error;
    }
}; 