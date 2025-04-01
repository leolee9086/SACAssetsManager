import { logger } from '../logger/loggerService.js';
import { watchDirectory } from './fsUtils.js';

/**
 * 文件系统监控服务
 * 负责监控文件系统变化并触发相应事件
 */

// 存储所有活动的监控器
const watchers = new Map();

/**
 * 开始监控目录
 * @param {string} dirPath - 目录路径
 * @param {Object} options - 监控选项
 * @param {Function} options.onChange - 变化回调函数
 * @param {Function} options.onError - 错误回调函数
 * @returns {Promise<void>}
 */
export async function startWatching(dirPath, options = {}) {
  const {
    onChange = () => {},
    onError = (error) => {
      logger.error(`监控目录出错: ${dirPath}`, error, 'FileSystem');
    }
  } = options;

  try {
    // 如果已经在监控，先停止
    if (watchers.has(dirPath)) {
      await stopWatching(dirPath);
    }

    // 开始监控
    const stopWatching = await watchDirectory(dirPath, (event) => {
      try {
        onChange(event);
      } catch (error) {
        onError(error);
      }
    });

    // 保存停止函数
    watchers.set(dirPath, stopWatching);
    logger.info(`开始监控目录: ${dirPath}`, 'FileSystem');
  } catch (error) {
    onError(error);
    throw error;
  }
}

/**
 * 停止监控目录
 * @param {string} dirPath - 目录路径
 * @returns {Promise<void>}
 */
export async function stopWatching(dirPath) {
  const stopWatching = watchers.get(dirPath);
  if (stopWatching) {
    stopWatching();
    watchers.delete(dirPath);
    logger.info(`停止监控目录: ${dirPath}`, 'FileSystem');
  }
}

/**
 * 停止所有监控
 * @returns {Promise<void>}
 */
export async function stopAllWatching() {
  for (const [dirPath, stopWatching] of watchers.entries()) {
    stopWatching();
    watchers.delete(dirPath);
    logger.info(`停止监控目录: ${dirPath}`, 'FileSystem');
  }
}

/**
 * 检查目录是否正在被监控
 * @param {string} dirPath - 目录路径
 * @returns {boolean} 是否正在监控
 */
export function isWatching(dirPath) {
  return watchers.has(dirPath);
}

/**
 * 获取所有正在监控的目录
 * @returns {Array<string>} 目录路径数组
 */
export function getWatchingDirectories() {
  return Array.from(watchers.keys());
} 