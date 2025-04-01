/**
 * 文件系统服务
 * 提供文件系统操作的核心功能
 */

import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../logger/loggerService.js';
import { configManager } from '../../config/configManager.js';
import { 
  readDirectory,
  getFileInfo,
  createDirectory,
  deleteFile,
  moveFile,
  copyFile,
  watchDirectory
} from './fsUtils.js';

/**
 * 获取配置
 * @returns {Object} 配置对象
 */
const config = configManager.get('fs');

/**
 * 读取目录内容
 * @param {string} dirPath - 目录路径
 * @param {Object} [options] - 选项
 * @param {boolean} [options.recursive=false] - 是否递归读取
 * @param {Array<string>} [options.exclude] - 排除的文件/目录
 * @param {Array<string>} [options.include] - 包含的文件类型
 * @returns {Promise<Array<Object>>} 目录内容数组
 */
export async function readDir(dirPath, options = {}) {
  try {
    const contents = await readDirectory(dirPath, options);
    logger.debug(`读取目录: ${dirPath}`, 'FileSystem');
    return contents;
  } catch (error) {
    logger.error(`读取目录失败: ${dirPath}`, error, 'FileSystem');
    throw error;
  }
}

/**
 * 获取文件信息
 * @param {string} filePath - 文件路径
 * @returns {Promise<Object>} 文件信息对象
 */
export async function getFileDetails(filePath) {
  try {
    const info = await getFileInfo(filePath);
    logger.debug(`获取文件信息: ${filePath}`, 'FileSystem');
    return info;
  } catch (error) {
    logger.error(`获取文件信息失败: ${filePath}`, error, 'FileSystem');
    throw error;
  }
}

/**
 * 创建目录
 * @param {string} dirPath - 目录路径
 * @param {Object} [options] - 选项
 * @param {boolean} [options.recursive=false] - 是否递归创建
 * @returns {Promise<void>}
 */
export async function createDir(dirPath, options = {}) {
  try {
    await createDirectory(dirPath, options);
    logger.info(`创建目录: ${dirPath}`, 'FileSystem');
  } catch (error) {
    logger.error(`创建目录失败: ${dirPath}`, error, 'FileSystem');
    throw error;
  }
}

/**
 * 删除文件或目录
 * @param {string} path - 文件或目录路径
 * @param {Object} [options] - 选项
 * @param {boolean} [options.recursive=false] - 是否递归删除
 * @returns {Promise<void>}
 */
export async function deletePath(path, options = {}) {
  try {
    await deleteFile(path, options);
    logger.info(`删除路径: ${path}`, 'FileSystem');
  } catch (error) {
    logger.error(`删除路径失败: ${path}`, error, 'FileSystem');
    throw error;
  }
}

/**
 * 移动文件或目录
 * @param {string} source - 源路径
 * @param {string} target - 目标路径
 * @returns {Promise<void>}
 */
export async function movePath(source, target) {
  try {
    await moveFile(source, target);
    logger.info(`移动路径: ${source} -> ${target}`, 'FileSystem');
  } catch (error) {
    logger.error(`移动路径失败: ${source} -> ${target}`, error, 'FileSystem');
    throw error;
  }
}

/**
 * 复制文件或目录
 * @param {string} source - 源路径
 * @param {string} target - 目标路径
 * @param {Object} [options] - 选项
 * @param {boolean} [options.recursive=false] - 是否递归复制
 * @returns {Promise<void>}
 */
export async function copyPath(source, target, options = {}) {
  try {
    await copyFile(source, target, options);
    logger.info(`复制路径: ${source} -> ${target}`, 'FileSystem');
  } catch (error) {
    logger.error(`复制路径失败: ${source} -> ${target}`, error, 'FileSystem');
    throw error;
  }
}

/**
 * 监控目录变化
 * @param {string} dirPath - 目录路径
 * @param {Function} callback - 变化回调函数
 * @returns {Promise<Function>} 停止监控的函数
 */
export async function watchDir(dirPath, callback) {
  try {
    const stopWatching = await watchDirectory(dirPath, callback);
    logger.info(`开始监控目录: ${dirPath}`, 'FileSystem');
    return stopWatching;
  } catch (error) {
    logger.error(`监控目录失败: ${dirPath}`, error, 'FileSystem');
    throw error;
  }
}

/**
 * 检查路径是否存在
 * @param {string} path - 路径
 * @returns {Promise<boolean>} 是否存在
 */
export async function exists(path) {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * 获取文件扩展名
 * @param {string} filename - 文件名
 * @returns {string} 扩展名
 */
export function getExtension(filename) {
  return path.extname(filename).toLowerCase();
}

/**
 * 获取文件MIME类型
 * @param {string} filename - 文件名
 * @returns {string} MIME类型
 */
export function getMimeType(filename) {
  const ext = getExtension(filename);
  return config.mimeTypes[ext] || 'application/octet-stream';
}

/**
 * 检查是否为支持的图片格式
 * @param {string} filename - 文件名
 * @returns {boolean} 是否支持
 */
export function isSupportedImage(filename) {
  const ext = getExtension(filename);
  return config.supportedImageFormats.includes(ext);
}

/**
 * 检查是否为支持的文档格式
 * @param {string} filename - 文件名
 * @returns {boolean} 是否支持
 */
export function isSupportedDocument(filename) {
  const ext = getExtension(filename);
  return config.supportedDocumentFormats.includes(ext);
} 