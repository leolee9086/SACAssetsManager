/**
 * 缩略图服务
 * 提供图片缩略图生成和管理功能
 */

import fs from 'fs/promises';
import path from 'path';
import { 日志 } from '../../../../src/toolBox/base/useEcma/forLogs/useLogger.js';
import { getServiceConfig } from '../../config/services.js';
import { getPaths } from '../../config/paths.js';
import { publish } from '../../api/backendEvents.js';
import * as fsService from '../fs/index.js';

// 缩略图缓存
const memoryCache = new Map();
let cacheEnabled = true;

/**
 * 初始化缩略图服务
 * @returns {Promise<void>}
 */
export const init = async () => {
  const config = getServiceConfig('thumbnail');
  cacheEnabled = config.cacheStrategy === 'memory' || config.cacheStrategy === 'both';
  
  // 确保缩略图目录存在
  const paths = getPaths();
  try {
    await fs.mkdir(paths.thumbnailsDir, { recursive: true });
    日志.信息(`确保缩略图目录存在: ${paths.thumbnailsDir}`, 'Thumbnail');
  } catch (error) {
    日志.错误(`创建缩略图目录失败: ${error.message}`, 'Thumbnail');
  }
  
  日志.信息('缩略图服务已初始化', 'Thumbnail');
  
  // 发布初始化完成事件
  await publish('thumbnail:initialized', { timestamp: Date.now() });
};

/**
 * 关闭缩略图服务
 * @returns {Promise<void>}
 */
export const shutdown = async () => {
  // 清除内存缓存
  clearCache();
  
  日志.信息('缩略图服务已关闭', 'Thumbnail');
  
  // 发布关闭事件
  await publish('thumbnail:shutdown', { timestamp: Date.now() });
};

/**
 * 清除缩略图缓存
 * @param {string} [filePath] - 指定文件路径，不提供则清除所有缓存
 * @param {Object} [options] - 选项
 * @param {boolean} [options.memory=true] - 是否清除内存缓存
 * @param {boolean} [options.disk=false] - 是否清除磁盘缓存
 * @returns {Promise<void>}
 */
export const clearCache = async (filePath, options = {}) => {
  const clearMemory = options.memory !== false;
  const clearDisk = options.disk === true;
  
  // 清除内存缓存
  if (clearMemory) {
    if (filePath) {
      // 清除特定文件的所有缩略图缓存
      for (const [key, value] of memoryCache.entries()) {
        if (key.startsWith(`${filePath}:`)) {
          memoryCache.delete(key);
        }
      }
    } else {
      // 清除所有缓存
      memoryCache.clear();
    }
  }
  
  // 清除磁盘缓存
  if (clearDisk) {
    const paths = getPaths();
    
    if (filePath) {
      // 生成缩略图文件名哈希
      const fileHash = await generateFileHash(filePath);
      
      try {
        const thumbnailsDir = paths.thumbnailsDir;
        const files = await fs.readdir(thumbnailsDir);
        
        for (const file of files) {
          if (file.startsWith(fileHash)) {
            try {
              await fs.unlink(path.join(thumbnailsDir, file));
            } catch (error) {
              日志.错误(`删除缩略图文件失败: ${file} - ${error.message}`, 'Thumbnail');
            }
          }
        }
      } catch (error) {
        日志.错误(`清除磁盘缓存失败: ${error.message}`, 'Thumbnail');
      }
    } else {
      // 清除所有缩略图文件
      try {
        const thumbnailsDir = paths.thumbnailsDir;
        const files = await fs.readdir(thumbnailsDir);
        
        for (const file of files) {
          try {
            await fs.unlink(path.join(thumbnailsDir, file));
          } catch (error) {
            日志.错误(`删除缩略图文件失败: ${file} - ${error.message}`, 'Thumbnail');
          }
        }
      } catch (error) {
        日志.错误(`清除所有磁盘缓存失败: ${error.message}`, 'Thumbnail');
      }
    }
  }
};

/**
 * 获取缩略图缓存键
 * @param {string} filePath - 文件路径
 * @param {number} size - 缩略图尺寸
 * @returns {string} 缓存键
 */
const getCacheKey = (filePath, size) => {
  return `${filePath}:${size}`;
};

/**
 * 生成文件哈希
 * @param {string} filePath - 文件路径
 * @returns {Promise<string>} 文件哈希
 */
const generateFileHash = async (filePath) => {
  // 简单的哈希算法，实际应用中可能需要更复杂的算法
  const crypto = await import('crypto');
  const normalizedPath = path.normalize(filePath);
  
  return crypto.createHash('md5').update(normalizedPath).digest('hex');
};

/**
 * 获取缩略图文件路径
 * @param {string} filePath - 原始文件路径
 * @param {number} size - 缩略图尺寸
 * @returns {Promise<string>} 缩略图文件路径
 */
const getThumbnailPath = async (filePath, size) => {
  const paths = getPaths();
  const fileHash = await generateFileHash(filePath);
  const extension = path.extname(filePath).toLowerCase();
  
  return path.join(paths.thumbnailsDir, `${fileHash}_${size}${extension}`);
};

/**
 * 生成缩略图
 * @param {string} filePath - 文件路径
 * @param {Object} [options] - 选项
 * @param {number} [options.size=200] - 缩略图尺寸
 * @param {number} [options.quality=80] - 图片质量
 * @param {boolean} [options.force=false] - 是否强制重新生成
 * @returns {Promise<Buffer>} 缩略图数据
 */
export const generateThumbnail = async (filePath, options = {}) => {
  const config = getServiceConfig('thumbnail');
  const size = options.size || config.defaultSize || 200;
  const quality = options.quality || config.quality || 80;
  const force = options.force === true;
  
  const normalizedPath = path.normalize(filePath);
  const cacheKey = getCacheKey(normalizedPath, size);
  
  // 检查内存缓存
  if (cacheEnabled && !force && memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey);
  }
  
  // 检查磁盘缓存
  const thumbnailPath = await getThumbnailPath(normalizedPath, size);
  
  if (!force) {
    try {
      const thumbnailStat = await fsService.stat(thumbnailPath);
      const originalStat = await fsService.stat(normalizedPath);
      
      // 如果缩略图比原始文件新，使用缩略图
      if (thumbnailStat.mtime > originalStat.mtime) {
        const thumbnailData = await fs.readFile(thumbnailPath);
        
        // 更新内存缓存
        if (cacheEnabled) {
          memoryCache.set(cacheKey, thumbnailData);
        }
        
        return thumbnailData;
      }
    } catch (error) {
      // 缩略图不存在或无法访问，继续生成
    }
  }
  
  // 获取文件扩展名
  const ext = path.extname(normalizedPath).toLowerCase().substring(1);
  
  // 检查文件类型是否支持
  const supportedImageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
  if (!supportedImageTypes.includes(ext)) {
    throw new Error(`不支持的图片类型: ${ext}`);
  }
  
  try {
    // 导入图片处理库
    const { default: sharp } = await import('sharp');
    
    // 读取文件
    const imageBuffer = await fs.readFile(normalizedPath);
    
    // 处理SVG特殊情况
    if (ext === 'svg') {
      // SVG不需要缩放，直接返回
      if (cacheEnabled) {
        memoryCache.set(cacheKey, imageBuffer);
      }
      return imageBuffer;
    }
    
    // 处理GIF特殊情况
    if (ext === 'gif') {
      // GIF需要特殊处理，这里简化处理
      // 实际项目中可能需要更复杂的逻辑
      return imageBuffer;
    }
    
    // 生成缩略图
    let sharpInstance = sharp(imageBuffer);
    
    // 调整尺寸
    if (config.keepAspectRatio) {
      sharpInstance = sharpInstance.resize(size, size, {
        fit: 'inside',
        withoutEnlargement: true
      });
    } else {
      sharpInstance = sharpInstance.resize(size, size, {
        fit: 'cover'
      });
    }
    
    // 设置输出格式和质量
    let format = ext;
    if (format === 'jpg') format = 'jpeg';
    
    sharpInstance = sharpInstance.toFormat(format, {
      quality
    });
    
    // 生成缩略图数据
    const thumbnailData = await sharpInstance.toBuffer();
    
    // 保存到磁盘缓存
    if (config.cacheStrategy === 'disk' || config.cacheStrategy === 'both') {
      try {
        await fs.writeFile(thumbnailPath, thumbnailData);
      } catch (error) {
        日志.错误(`保存缩略图到磁盘失败: ${thumbnailPath} - ${error.message}`, 'Thumbnail');
      }
    }
    
    // 更新内存缓存
    if (cacheEnabled) {
      memoryCache.set(cacheKey, thumbnailData);
    }
    
    return thumbnailData;
  } catch (error) {
    日志.错误(`生成缩略图失败: ${normalizedPath} - ${error.message}`, 'Thumbnail');
    throw error;
  }
};

/**
 * 获取图片缩略图
 * @param {string} filePath - 文件路径
 * @param {Object} [options] - 选项
 * @param {number} [options.size=200] - 缩略图尺寸
 * @param {boolean} [options.force=false] - 是否强制重新生成
 * @returns {Promise<Buffer>} 缩略图数据
 */
export const getThumbnail = async (filePath, options = {}) => {
  try {
    // 检查文件是否存在
    await fsService.stat(filePath);
    
    // 生成缩略图
    return await generateThumbnail(filePath, options);
  } catch (error) {
    日志.错误(`获取缩略图失败: ${filePath} - ${error.message}`, 'Thumbnail');
    throw error;
  }
};

/**
 * 导出缩略图服务
 */
export default {
  init,
  shutdown,
  getThumbnail,
  generateThumbnail,
  clearCache
}; 