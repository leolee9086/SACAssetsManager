import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../logger/loggerService.js';

/**
 * 读取目录内容
 * @param {string} dirPath - 目录路径
 * @param {Object} [options] - 选项
 * @param {boolean} [options.recursive=false] - 是否递归读取
 * @param {Array<string>} [options.exclude] - 排除的文件/目录
 * @param {Array<string>} [options.include] - 包含的文件类型
 * @returns {Promise<Array<Object>>} 目录内容数组
 */
export async function readDirectory(dirPath, options = {}) {
  const {
    recursive = false,
    exclude = [],
    include = []
  } = options;

  const contents = [];
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    
    // 检查是否排除
    if (exclude.some(pattern => 
      entry.name.includes(pattern) || 
      fullPath.includes(pattern)
    )) {
      continue;
    }

    const item = {
      name: entry.name,
      path: fullPath,
      isDirectory: entry.isDirectory(),
      isFile: entry.isFile(),
      isSymbolicLink: entry.isSymbolicLink()
    };

    // 获取文件信息
    if (entry.isFile()) {
      const stats = await fs.stat(fullPath);
      item.size = stats.size;
      item.createdAt = stats.birthtime;
      item.modifiedAt = stats.mtime;
      item.accessedAt = stats.atime;
      item.mode = stats.mode;
    }

    contents.push(item);

    // 递归读取子目录
    if (recursive && entry.isDirectory()) {
      const subContents = await readDirectory(fullPath, options);
      contents.push(...subContents);
    }
  }

  return contents;
}

/**
 * 获取文件信息
 * @param {string} filePath - 文件路径
 * @returns {Promise<Object>} 文件信息对象
 */
export async function getFileInfo(filePath) {
  const stats = await fs.stat(filePath);
  return {
    path: filePath,
    name: path.basename(filePath),
    size: stats.size,
    isDirectory: stats.isDirectory(),
    isFile: stats.isFile(),
    isSymbolicLink: stats.isSymbolicLink(),
    createdAt: stats.birthtime,
    modifiedAt: stats.mtime,
    accessedAt: stats.atime,
    mode: stats.mode,
    uid: stats.uid,
    gid: stats.gid
  };
}

/**
 * 创建目录
 * @param {string} dirPath - 目录路径
 * @param {Object} [options] - 选项
 * @param {boolean} [options.recursive=false] - 是否递归创建
 * @returns {Promise<void>}
 */
export async function createDirectory(dirPath, options = {}) {
  const { recursive = false } = options;
  
  try {
    await fs.mkdir(dirPath, { recursive });
  } catch (error) {
    if (error.code === 'EEXIST' && recursive) {
      // 目录已存在，忽略错误
      return;
    }
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
export async function deleteFile(path, options = {}) {
  const { recursive = false } = options;
  
  try {
    const stats = await fs.stat(path);
    if (stats.isDirectory()) {
      if (recursive) {
        const contents = await fs.readdir(path);
        await Promise.all(
          contents.map(item => 
            deleteFile(path.join(path, item), { recursive: true })
          )
        );
      }
      await fs.rmdir(path);
    } else {
      await fs.unlink(path);
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      // 文件不存在，忽略错误
      return;
    }
    throw error;
  }
}

/**
 * 移动文件或目录
 * @param {string} source - 源路径
 * @param {string} target - 目标路径
 * @returns {Promise<void>}
 */
export async function moveFile(source, target) {
  try {
    await fs.rename(source, target);
  } catch (error) {
    if (error.code === 'EXDEV') {
      // 跨设备移动，使用复制后删除
      await copyFile(source, target);
      await deleteFile(source);
    } else {
      throw error;
    }
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
export async function copyFile(source, target, options = {}) {
  const { recursive = false } = options;
  
  try {
    const stats = await fs.stat(source);
    if (stats.isDirectory()) {
      await createDirectory(target, { recursive: true });
      const contents = await fs.readdir(source);
      await Promise.all(
        contents.map(item => 
          copyFile(
            path.join(source, item),
            path.join(target, item),
            { recursive: true }
          )
        )
      );
    } else {
      await createDirectory(path.dirname(target), { recursive: true });
      await fs.copyFile(source, target);
    }
  } catch (error) {
    throw error;
  }
}

/**
 * 监控目录变化
 * @param {string} dirPath - 目录路径
 * @param {Function} callback - 变化回调函数
 * @returns {Promise<Function>} 停止监控的函数
 */
export async function watchDirectory(dirPath, callback) {
  const watcher = fs.watch(dirPath, { recursive: true }, (eventType, filename) => {
    const fullPath = path.join(dirPath, filename);
    callback({
      type: eventType,
      path: fullPath,
      filename
    });
  });

  return () => {
    watcher.close();
  };
} 