/**
 * @fileoverview 文件大小处理工具函数
 * 提供文件大小格式化和转换的功能
 */

// 文件大小单位常量
/**
 * 文件大小单位 - 字节
 * @constant {number}
 */
export const 单位_字节 = 0;

/**
 * 文件大小单位 - 千字节 (KB)
 * @constant {number}
 */
export const 单位_KB = 1;

/**
 * 文件大小单位 - 兆字节 (MB)
 * @constant {number}
 */
export const 单位_MB = 2;

/**
 * 文件大小单位 - 吉字节 (GB)
 * @constant {number}
 */
export const 单位_GB = 3;

/**
 * 文件大小单位 - 太字节 (TB)
 * @constant {number}
 */
export const 单位_TB = 4;

/**
 * 文件大小单位 - 拍字节 (PB)
 * @constant {number}
 */
export const 单位_PB = 5;

/**
 * 文件大小单位数组
 * @constant {string[]}
 */
export const 文件大小单位 = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

/**
 * 格式化文件大小
 * 将字节数转换为更易读的格式
 * @param {number} 字节数 - 文件大小（字节）
 * @param {number} [小数位数=1] - 保留的小数位数
 * @param {string} [未知大小文本='未知大小'] - 当字节数无效时显示的文本
 * @returns {string} 格式化后的文件大小
 */
export function 格式化文件大小(字节数, 小数位数 = 1, 未知大小文本 = '未知大小') {
  if (字节数 === undefined || 字节数 === null || isNaN(字节数)) {
    return 未知大小文本;
  }
  
  let 大小 = Math.abs(字节数);
  let 单位索引 = 0;
  
  // 逐步转换到合适的单位
  while (大小 >= 1024 && 单位索引 < 文件大小单位.length - 1) {
    大小 /= 1024;
    单位索引++;
  }
  
  // 四舍五入到指定小数位
  大小 = Number(大小.toFixed(小数位数));
  
  return `${大小} ${文件大小单位[单位索引]}`;
}

/**
 * 计算目录大小
 * 递归计算目录及其子目录的总大小
 * @param {string} 目录路径 - 目录的完整路径
 * @param {Function} 文件系统API - 提供文件系统访问的API
 * @returns {Promise<number>} 目录总大小（字节）
 */
export async function 计算目录大小(目录路径, 文件系统API) {
  if (!文件系统API) {
    throw new Error('必须提供文件系统API');
  }
  
  // 检查目录是否存在
  if (!(await 文件系统API.exists(目录路径))) {
    throw new Error(`目录不存在: ${目录路径}`);
  }
  
  let 总大小 = 0;
  
  try {
    // 获取目录内容
    const 目录内容 = await 文件系统API.readDir(目录路径);
    
    // 递归计算每个子项的大小
    for (const 项目 of 目录内容) {
      const 完整路径 = `${目录路径}/${项目.name}`;
      
      if (项目.isDirectory) {
        // 递归处理子目录
        总大小 += await 计算目录大小(完整路径, 文件系统API);
      } else {
        // 累加文件大小
        总大小 += 项目.size || 0;
      }
    }
  } catch (错误) {
    console.error(`计算目录大小失败: ${目录路径}`, 错误);
    throw 错误;
  }
  
  return 总大小;
}

/**
 * 转换大小到字节
 * 将带单位的文件大小转换为字节数
 * @param {string} 大小文本 - 带单位的大小文本，如 "5MB"
 * @returns {number} 字节数
 */
export function 转换大小到字节(大小文本) {
  if (!大小文本 || typeof 大小文本 !== 'string') {
    return 0;
  }
  
  // 匹配数字和单位
  const 匹配结果 = 大小文本.match(/^(\d+(?:\.\d+)?)\s*([KMGTP]?B)$/i);
  if (!匹配结果) {
    return 0;
  }
  
  const 数值 = parseFloat(匹配结果[1]);
  const 单位 = 匹配结果[2].toUpperCase();
  
  // 查找单位索引
  const 单位索引 = 文件大小单位.indexOf(单位);
  if (单位索引 < 0) {
    return 0;
  }
  
  // 计算字节数
  return 数值 * Math.pow(1024, 单位索引);
}

/**
 * 将文件大小转换到指定单位
 * @param {number} 字节数 - 文件大小（字节）
 * @param {number} 目标单位 - 目标单位索引，使用单位常量
 * @param {number} [小数位数=2] - 保留的小数位数
 * @returns {number} 转换后的数值
 */
export function 转换到指定单位(字节数, 目标单位, 小数位数 = 2) {
  if (字节数 === undefined || 字节数 === null || isNaN(字节数) || 
      目标单位 < 0 || 目标单位 >= 文件大小单位.length) {
    return 0;
  }
  
  // 计算转换后的值
  const 转换后的值 = 字节数 / Math.pow(1024, 目标单位);
  
  // 四舍五入到指定小数位
  return Number(转换后的值.toFixed(小数位数));
}

// 添加英文别名以提高兼容性
export const formatFileSize = 格式化文件大小;
export const calculateDirectorySize = 计算目录大小;
export const convertSizeToBytes = 转换大小到字节;
export const convertToUnit = 转换到指定单位;
export const UNIT_BYTES = 单位_字节;
export const UNIT_KB = 单位_KB;
export const UNIT_MB = 单位_MB;
export const UNIT_GB = 单位_GB;
export const UNIT_TB = 单位_TB;
export const UNIT_PB = 单位_PB;
export const FILE_SIZE_UNITS = 文件大小单位;

// 默认导出
export default {
  格式化文件大小,
  计算目录大小,
  转换大小到字节,
  转换到指定单位,
  单位_字节,
  单位_KB,
  单位_MB,
  单位_GB,
  单位_TB,
  单位_PB,
  文件大小单位,
  formatFileSize,
  calculateDirectorySize,
  convertSizeToBytes,
  convertToUnit,
  UNIT_BYTES,
  UNIT_KB,
  UNIT_MB,
  UNIT_GB,
  UNIT_TB,
  UNIT_PB,
  FILE_SIZE_UNITS
}; 