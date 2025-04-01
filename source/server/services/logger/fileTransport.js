import { promises as fs } from 'fs';
import path from 'path';

/**
 * 文件传输模块
 * 负责日志文件的轮转和清理
 */

/**
 * 轮转日志文件
 * @param {string} filePath - 日志文件路径
 * @param {number} maxFiles - 最大保留文件数
 */
export async function rotateLogFile(filePath, maxFiles) {
  try {
    const dir = path.dirname(filePath);
    const ext = path.extname(filePath);
    const baseName = path.basename(filePath, ext);
    
    // 获取当前日期
    const date = new Date().toISOString().split('T')[0];
    
    // 重命名当前文件
    const newPath = path.join(dir, `${baseName}-${date}${ext}`);
    await fs.rename(filePath, newPath);
    
    // 清理旧文件
    await cleanOldFiles(dir, baseName, ext, maxFiles);
  } catch (error) {
    console.error('轮转日志文件失败:', error);
  }
}

/**
 * 清理旧日志文件
 * @param {string} dir - 目录路径
 * @param {string} baseName - 基础文件名
 * @param {string} ext - 文件扩展名
 * @param {number} maxFiles - 最大保留文件数
 */
async function cleanOldFiles(dir, baseName, ext, maxFiles) {
  try {
    // 读取目录内容
    const files = await fs.readdir(dir);
    
    // 过滤日志文件
    const logFiles = files
      .filter(file => file.startsWith(baseName) && file.endsWith(ext))
      .map(file => ({
        name: file,
        path: path.join(dir, file),
        time: fs.stat(path.join(dir, file)).then(stat => stat.mtime)
      }));
    
    // 等待所有文件状态获取完成
    const filesWithTime = await Promise.all(logFiles);
    
    // 按修改时间排序
    filesWithTime.sort((a, b) => b.time - a.time);
    
    // 删除多余的文件
    for (let i = maxFiles; i < filesWithTime.length; i++) {
      await fs.unlink(filesWithTime[i].path);
    }
  } catch (error) {
    console.error('清理旧日志文件失败:', error);
  }
}

/**
 * 压缩日志文件
 * @param {string} filePath - 日志文件路径
 * @returns {Promise<string>} 压缩后的文件路径
 */
export async function compressLogFile(filePath) {
  try {
    const dir = path.dirname(filePath);
    const ext = path.extname(filePath);
    const baseName = path.basename(filePath, ext);
    
    // 创建压缩文件路径
    const zipPath = path.join(dir, `${baseName}.zip`);
    
    // 读取文件内容
    const content = await fs.readFile(filePath, 'utf8');
    
    // 压缩内容
    const compressed = await compressContent(content);
    
    // 写入压缩文件
    await fs.writeFile(zipPath, compressed);
    
    return zipPath;
  } catch (error) {
    console.error('压缩日志文件失败:', error);
    throw error;
  }
}

/**
 * 压缩内容
 * @param {string} content - 要压缩的内容
 * @returns {Promise<Buffer>} 压缩后的内容
 */
async function compressContent(content) {
  // 这里可以使用任何压缩算法，比如 gzip
  // 为了简单起见，这里使用简单的 Base64 编码
  return Buffer.from(content).toString('base64');
}

/**
 * 解压日志文件
 * @param {string} zipPath - 压缩文件路径
 * @returns {Promise<string>} 解压后的文件路径
 */
export async function decompressLogFile(zipPath) {
  try {
    const dir = path.dirname(zipPath);
    const baseName = path.basename(zipPath, '.zip');
    
    // 创建解压文件路径
    const filePath = path.join(dir, `${baseName}.log`);
    
    // 读取压缩内容
    const compressed = await fs.readFile(zipPath);
    
    // 解压内容
    const content = await decompressContent(compressed);
    
    // 写入解压文件
    await fs.writeFile(filePath, content);
    
    return filePath;
  } catch (error) {
    console.error('解压日志文件失败:', error);
    throw error;
  }
}

/**
 * 解压内容
 * @param {Buffer} compressed - 压缩的内容
 * @returns {Promise<string>} 解压后的内容
 */
async function decompressContent(compressed) {
  // 这里使用与压缩相对应的解压算法
  // 为了简单起见，这里使用 Base64 解码
  return Buffer.from(compressed.toString(), 'base64').toString('utf8');
} 