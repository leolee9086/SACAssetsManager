/**
 * 日志服务
 * 提供统一的日志记录功能
 */

import { promises as fs } from 'fs';
import path from 'path';
import { configManager } from '../../config/configManager.js';
import { formatLogEntry } from './logFormatter.js';
import { rotateLogFile } from './fileTransport.js';

// 获取配置
const config = configManager.get('logger');

// 日志级别映射
const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

// 日志文件路径
const logFilePath = path.join(config.filePath, `app-${new Date().toISOString().split('T')[0]}.log`);

/**
 * 确保日志目录存在
 */
async function ensureLogDir() {
  try {
    await fs.mkdir(config.filePath, { recursive: true });
  } catch (error) {
    console.error(`创建日志目录失败: ${config.filePath}`, error);
  }
}

/**
 * 写入日志到文件
 * @param {string} entry - 格式化的日志条目
 */
async function writeToFile(entry) {
  try {
    await ensureLogDir();
    await fs.appendFile(logFilePath, entry + '\n', 'utf8');
    
    // 检查是否需要轮转日志文件
    const stats = await fs.stat(logFilePath);
    if (stats.size >= config.maxSize) {
      await rotateLogFile(logFilePath, config.maxFiles);
    }
  } catch (error) {
    console.error(`写入日志失败: ${logFilePath}`, error);
  }
}

/**
 * 记录日志
 * @param {string} level - 日志级别
 * @param {string} message - 日志消息
 * @param {Error|string} [error] - 错误对象或错误消息
 * @param {string} [category='General'] - 日志分类
 * @param {Object} [metadata] - 额外元数据
 */
async function log(level, message, error, category = 'General', metadata = {}) {
  // 检查日志级别
  if (LOG_LEVELS[level] < LOG_LEVELS[config.level]) {
    return;
  }

  // 获取调用者信息
  const caller = getCallerInfo();
  
  // 格式化日志条目
  const entry = formatLogEntry({
    timestamp: new Date(),
    level,
    message,
    error,
    category,
    metadata,
    caller
  });

  // 控制台输出
  if (config.console) {
    console.log(entry);
  }

  // 文件输出
  if (config.file) {
    await writeToFile(entry);
  }
}

/**
 * 获取调用者信息
 * @returns {Object} 调用者信息
 */
function getCallerInfo() {
  const stack = new Error().stack;
  const callerLine = stack.split('\n')[3];
  const match = callerLine.match(/at (.+?) \((.+?):(\d+):(\d+)\)/);
  
  if (match) {
    return {
      function: match[1],
      file: path.basename(match[2]),
      line: parseInt(match[3]),
      column: parseInt(match[4])
    };
  }
  
  return null;
}

/**
 * 记录调试日志
 * @param {string} message - 日志消息
 * @param {string} [category='General'] - 日志分类
 * @param {Object} [metadata] - 额外元数据
 */
export function debug(message, category, metadata) {
  log('debug', message, null, category, metadata);
}

/**
 * 记录信息日志
 * @param {string} message - 日志消息
 * @param {string} [category='General'] - 日志分类
 * @param {Object} [metadata] - 额外元数据
 */
export function info(message, category, metadata) {
  log('info', message, null, category, metadata);
}

/**
 * 记录警告日志
 * @param {string} message - 日志消息
 * @param {string} [category='General'] - 日志分类
 * @param {Object} [metadata] - 额外元数据
 */
export function warn(message, category, metadata) {
  log('warn', message, null, category, metadata);
}

/**
 * 记录错误日志
 * @param {string} message - 日志消息
 * @param {Error|string} [error] - 错误对象或错误消息
 * @param {string} [category='General'] - 日志分类
 * @param {Object} [metadata] - 额外元数据
 */
export function error(message, error, category, metadata) {
  log('error', message, error, category, metadata);
}

/**
 * 开始性能分析
 * @param {string} label - 分析标签
 * @returns {Function} 结束分析的函数
 */
export function startProfiling(label) {
  const start = Date.now();
  
  return () => {
    const duration = Date.now() - start;
    info(`${label} 完成，耗时: ${duration}ms`, 'Performance');
  };
}

/**
 * 查询日志
 * @param {Object} options - 查询选项
 * @param {string} [options.level] - 日志级别过滤
 * @param {string} [options.category] - 分类过滤
 * @param {string} [options.startDate] - 开始日期
 * @param {string} [options.endDate] - 结束日期
 * @param {string} [options.search] - 搜索关键字
 * @param {number} [options.limit=100] - 返回数量限制
 * @returns {Promise<Array>} 日志条目数组
 */
export async function query(options = {}) {
  const {
    level,
    category,
    startDate,
    endDate,
    search,
    limit = 100
  } = options;

  try {
    // 读取日志文件
    const content = await fs.readFile(logFilePath, 'utf8');
    const entries = content.split('\n').filter(Boolean);

    // 过滤日志条目
    return entries
      .map(entry => JSON.parse(entry))
      .filter(entry => {
        if (level && entry.level !== level) return false;
        if (category && entry.category !== category) return false;
        if (startDate && new Date(entry.timestamp) < new Date(startDate)) return false;
        if (endDate && new Date(entry.timestamp) > new Date(endDate)) return false;
        if (search && !entry.message.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      })
      .slice(0, limit);
  } catch (error) {
    console.error('查询日志失败:', error);
    return [];
  }
} 