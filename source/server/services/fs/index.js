/**
 * 文件系统服务
 * 提供统一的文件系统操作接口
 */

import fs from 'fs/promises';
import path from 'path';
import { 日志 } from '../../../../src/toolBox/base/useEcma/forLogs/useLogger.js';
import { getServiceConfig } from '../../config/services.js';
import { publish } from '../../api/backendEvents.js';

/**
 * @typedef {import('../../types/fs.js').FileInfo} FileInfo
 * @typedef {import('../../types/fs.js').FileStat} FileStat
 * @typedef {import('../../types/fs.js').DirectoryTreeNode} DirectoryTreeNode
 * @typedef {import('../../types/fs.js').FileOperationOptions} FileOperationOptions
 */

// 文件缓存
const statCache = new Map();
let cacheEnabled = true;

/**
 * 初始化文件系统服务
 * @returns {Promise<void>}
 */
export const init = async () => {
  const config = getServiceConfig('fs');
  cacheEnabled = config.enableCache;
  
  日志.信息('文件系统服务已初始化', 'FS');
  
  // 发布初始化完成事件
  await publish('fs:initialized', { timestamp: Date.now() });
};

/**
 * 关闭文件系统服务
 * @returns {Promise<void>}
 */
export const shutdown = async () => {
  // 清除缓存
  clearCache();
  
  日志.信息('文件系统服务已关闭', 'FS');
  
  // 发布关闭事件
  await publish('fs:shutdown', { timestamp: Date.now() });
};

/**
 * 清除文件缓存
 * @param {string} [filePath] - 指定文件路径，不提供则清除所有缓存
 */
export const clearCache = (filePath) => {
  if (filePath) {
    statCache.delete(filePath);
  } else {
    statCache.clear();
  }
};

/**
 * 获取文件状态
 * @param {string} filePath - 文件路径
 * @param {Object} [options] - 选项
 * @param {boolean} [options.force=false] - 是否强制刷新缓存
 * @returns {Promise<FileStat>} 文件状态
 */
export const stat = async (filePath, options = {}) => {
  const normalizedPath = path.normalize(filePath);
  const cacheKey = normalizedPath;
  
  // 如果缓存启用且缓存中存在且不强制刷新，则返回缓存
  if (cacheEnabled && statCache.has(cacheKey) && !options.force) {
    return statCache.get(cacheKey);
  }
  
  try {
    const stats = await fs.stat(normalizedPath);
    const result = {
      type: stats.isDirectory() ? 'dir' : 'file',
      size: stats.size,
      birthtime: stats.birthtime,
      mtime: stats.mtime,
      atime: stats.atime,
      ctime: stats.ctime
    };
    
    // 更新缓存
    if (cacheEnabled) {
      statCache.set(cacheKey, result);
    }
    
    return result;
  } catch (error) {
    日志.错误(`获取文件状态失败: ${normalizedPath} - ${error.message}`, 'FS');
    throw error;
  }
};

/**
 * 获取文件信息
 * @param {string} filePath - 文件路径
 * @param {Object} [options] - 选项
 * @param {boolean} [options.force=false] - 是否强制刷新缓存
 * @returns {Promise<FileInfo>} 文件信息
 */
export const getFileInfo = async (filePath, options = {}) => {
  const normalizedPath = path.normalize(filePath);
  
  try {
    const fileStat = await stat(normalizedPath, options);
    const parsedPath = path.parse(normalizedPath);
    
    return {
      path: normalizedPath,
      name: parsedPath.base,
      ext: parsedPath.ext.toLowerCase().substring(1), // 去掉点号
      stat: fileStat,
      isDirectory: fileStat.type === 'dir',
      mimeType: fileStat.type === 'file' ? getMimeType(parsedPath.ext) : null
    };
  } catch (error) {
    日志.错误(`获取文件信息失败: ${normalizedPath} - ${error.message}`, 'FS');
    throw error;
  }
};

/**
 * 读取目录内容
 * @param {string} dirPath - 目录路径
 * @param {Object} [options] - 选项
 * @param {boolean} [options.withFileTypes=false] - 是否包含文件类型信息
 * @param {string[]} [options.filter] - 文件过滤器(扩展名列表)
 * @returns {Promise<string[]|FileInfo[]>} 目录内容
 */
export const readdir = async (dirPath, options = {}) => {
  const normalizedPath = path.normalize(dirPath);
  
  try {
    const entries = await fs.readdir(normalizedPath);
    
    // 如果不需要文件类型信息，直接返回文件名列表
    if (!options.withFileTypes) {
      // 如果有过滤器，过滤文件
      if (options.filter && Array.isArray(options.filter)) {
        return entries.filter(entry => {
          const ext = path.extname(entry).toLowerCase().substring(1);
          return options.filter.includes(ext);
        });
      }
      return entries;
    }
    
    // 否则获取每个文件的详细信息
    const results = await Promise.all(
      entries.map(async entry => {
        const entryPath = path.join(normalizedPath, entry);
        try {
          return await getFileInfo(entryPath);
        } catch (error) {
          // 如果获取某个文件信息失败，跳过该文件
          日志.警告(`获取文件信息失败: ${entryPath} - ${error.message}`, 'FS');
          return null;
        }
      })
    );
    
    // 过滤掉null值和根据扩展名过滤
    return results.filter(info => {
      if (!info) return false;
      
      if (options.filter && Array.isArray(options.filter)) {
        return info.isDirectory || options.filter.includes(info.ext);
      }
      
      return true;
    });
  } catch (error) {
    日志.错误(`读取目录失败: ${normalizedPath} - ${error.message}`, 'FS');
    throw error;
  }
};

/**
 * 读取文件内容
 * @param {string} filePath - 文件路径
 * @param {Object} [options] - 选项
 * @param {string} [options.encoding='utf8'] - 编码
 * @returns {Promise<string|Buffer>} 文件内容
 */
export const readFile = async (filePath, options = {}) => {
  const normalizedPath = path.normalize(filePath);
  const encoding = options.encoding || 'utf8';
  
  try {
    return await fs.readFile(normalizedPath, { encoding });
  } catch (error) {
    日志.错误(`读取文件失败: ${normalizedPath} - ${error.message}`, 'FS');
    throw error;
  }
};

/**
 * 写入文件
 * @param {string} filePath - 文件路径
 * @param {string|Buffer} data - 文件内容
 * @param {Object} [options] - 选项
 * @param {string} [options.encoding='utf8'] - 编码
 * @param {boolean} [options.overwrite=true] - 是否覆盖已存在的文件
 * @returns {Promise<void>}
 */
export const writeFile = async (filePath, data, options = {}) => {
  const normalizedPath = path.normalize(filePath);
  const encoding = options.encoding || 'utf8';
  const overwrite = options.overwrite !== false;
  
  try {
    // 检查文件是否存在
    if (!overwrite) {
      try {
        await fs.access(normalizedPath);
        // 文件存在且不允许覆盖
        throw new Error(`文件已存在: ${normalizedPath}`);
      } catch (accessError) {
        // 文件不存在，可以继续
        if (accessError.code !== 'ENOENT') {
          throw accessError;
        }
      }
    }
    
    // 确保父目录存在
    const dirname = path.dirname(normalizedPath);
    await fs.mkdir(dirname, { recursive: true });
    
    // 写入文件
    await fs.writeFile(normalizedPath, data, { encoding });
    
    // 清除缓存
    clearCache(normalizedPath);
    
    // 发布文件变更事件
    await publish('fs:fileChanged', { 
      path: normalizedPath, 
      action: 'write',
      timestamp: Date.now()
    });
  } catch (error) {
    日志.错误(`写入文件失败: ${normalizedPath} - ${error.message}`, 'FS');
    throw error;
  }
};

/**
 * 删除文件或目录
 * @param {string} targetPath - 目标路径
 * @param {Object} [options] - 选项
 * @param {boolean} [options.recursive=true] - 是否递归删除目录
 * @returns {Promise<void>}
 */
export const remove = async (targetPath, options = {}) => {
  const normalizedPath = path.normalize(targetPath);
  const recursive = options.recursive !== false;
  
  try {
    const fileStat = await stat(normalizedPath);
    
    if (fileStat.type === 'dir') {
      if (recursive) {
        await fs.rm(normalizedPath, { recursive: true, force: true });
      } else {
        await fs.rmdir(normalizedPath);
      }
    } else {
      await fs.unlink(normalizedPath);
    }
    
    // 清除缓存
    clearCache(normalizedPath);
    
    // 发布文件变更事件
    await publish('fs:fileChanged', { 
      path: normalizedPath, 
      action: 'remove',
      timestamp: Date.now()
    });
  } catch (error) {
    日志.错误(`删除文件失败: ${normalizedPath} - ${error.message}`, 'FS');
    throw error;
  }
};

/**
 * 获取MIME类型
 * @param {string} ext - 文件扩展名
 * @returns {string} MIME类型
 */
const getMimeType = (ext) => {
  const mimeTypes = {
    // 图片
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    
    // 文档
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    
    // 文本
    'txt': 'text/plain',
    'html': 'text/html',
    'css': 'text/css',
    'js': 'text/javascript',
    'json': 'application/json',
    'xml': 'application/xml',
    'md': 'text/markdown',
    
    // 音频
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'flac': 'audio/flac',
    
    // 视频
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'avi': 'video/x-msvideo',
    'mov': 'video/quicktime',
    
    // 压缩文件
    'zip': 'application/zip',
    'rar': 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
    'tar': 'application/x-tar',
    'gz': 'application/gzip'
  };
  
  const extension = ext.toLowerCase().replace(/^\./, '');
  return mimeTypes[extension] || 'application/octet-stream';
};

/**
 * 导出文件系统服务
 */
export default {
  init,
  shutdown,
  stat,
  getFileInfo,
  readdir,
  readFile,
  writeFile,
  remove,
  clearCache
}; 