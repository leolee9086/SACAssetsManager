/**
 * @fileoverview 文件路径处理工具函数
 * 提供文件路径操作的通用功能
 */

/**
 * 获取文件名（不含路径）
 * @param {string} 文件路径 - 完整的文件路径
 * @returns {string} 不含路径的文件名
 */
export function 获取文件名(文件路径) {
  if (!文件路径) return '';
  
  // 处理不同操作系统的路径分隔符
  const 标准化路径 = 文件路径.replace(/\\/g, '/');
  
  // 获取路径最后一部分
  return 标准化路径.split('/').pop() || '';
}

/**
 * 获取文件扩展名
 * @param {string} 文件路径 - 完整的文件路径
 * @param {boolean} [转大写=false] - 是否将扩展名转为大写
 * @returns {string} 文件扩展名（不含点）
 */
export function 获取文件扩展名(文件路径, 转大写 = false) {
  if (!文件路径) return '';
  
  const 扩展名 = 获取文件名(文件路径).split('.').pop() || '';
  
  return 转大写 ? 扩展名.toUpperCase() : 扩展名;
}

/**
 * 获取不含扩展名的文件名
 * @param {string} 文件路径 - 完整的文件路径
 * @returns {string} 不含扩展名的文件名
 */
export function 获取无扩展名文件名(文件路径) {
  if (!文件路径) return '';
  
  const 文件名 = 获取文件名(文件路径);
  const 最后点位置 = 文件名.lastIndexOf('.');
  
  // 如果没有找到点，或者点在首位（如隐藏文件 .gitignore），则返回完整文件名
  if (最后点位置 <= 0) return 文件名;
  
  return 文件名.substring(0, 最后点位置);
}

/**
 * 获取文件目录路径
 * @param {string} 文件路径 - 完整的文件路径
 * @returns {string} 文件所在的目录路径
 */
export function 获取文件目录(文件路径) {
  if (!文件路径) return '';
  
  // 处理不同操作系统的路径分隔符
  const 标准化路径 = 文件路径.replace(/\\/g, '/');
  const 最后分隔符位置 = 标准化路径.lastIndexOf('/');
  
  // 如果没有找到分隔符，则返回空字符串
  if (最后分隔符位置 < 0) return '';
  
  return 标准化路径.substring(0, 最后分隔符位置);
}

/**
 * 获取文件的多个格式
 * @param {Array} 文件列表 - 文件对象数组，每个对象包含path属性
 * @returns {string} 格式描述，单一格式显示该格式，多种格式显示"多种"
 */
export function 获取文件格式描述(文件列表) {
  if (!文件列表 || 文件列表.length === 0) return '';
  
  // 提取所有文件的扩展名并转为大写
  const 格式集合 = new Set(文件列表.map(文件 => 
    获取文件扩展名(文件.path || '', true)
  ));
  
  // 如果所有文件都是同一种格式，返回该格式；否则返回"多种"
  return 格式集合.size === 1 ? Array.from(格式集合)[0] : '多种';
}

/**
 * 生成文件列表的描述标签
 * @param {Array} 文件列表 - 文件对象数组，每个对象包含path属性
 * @param {number} [最大显示数=3] - 直接显示的最大文件数
 * @returns {string} 文件列表描述
 */
export function 生成文件列表描述(文件列表, 最大显示数 = 3) {
  if (!文件列表 || 文件列表.length === 0) return '';
  
  if (文件列表.length <= 最大显示数) {
    return 文件列表.map(文件 => 获取文件名(文件.path || '')).join(', ');
  }
  
  return `${获取文件名(文件列表[0].path || '')} 等 ${文件列表.length} 个文件`;
}

/**
 * 组合路径片段
 * @param {...string} 路径片段 - 多个路径片段
 * @returns {string} 组合后的路径
 */
export function 组合路径(...路径片段) {
  if (路径片段.length === 0) return '';
  
  // 过滤空路径片段
  const 有效片段 = 路径片段.filter(片段 => 片段);
  if (有效片段.length === 0) return '';
  
  // 标准化所有路径片段
  const 标准化片段 = 有效片段.map(片段 => 片段.replace(/\\/g, '/'));
  
  // 移除中间片段的开头和结尾的斜杠
  for (let i = 1; i < 标准化片段.length; i++) {
    标准化片段[i] = 标准化片段[i].replace(/^\/+/, '');
  }
  for (let i = 0; i < 标准化片段.length - 1; i++) {
    标准化片段[i] = 标准化片段[i].replace(/\/+$/, '');
  }
  
  // 使用斜杠连接所有片段
  return 标准化片段.join('/');
}

/**
 * 标准化文件路径
 * @param {string} 文件路径 - 需要标准化的路径
 * @returns {string} 标准化后的路径
 */
export function 标准化路径(文件路径) {
  if (!文件路径) return '';
  
  // 替换所有反斜杠为正斜杠
  let 结果 = 文件路径.replace(/\\/g, '/');
  
  // 替换多个连续的斜杠为单个斜杠
  结果 = 结果.replace(/\/+/g, '/');
  
  return 结果;
}

// 添加英文别名以提高兼容性
export const getFileName = 获取文件名;
export const getFileExtension = 获取文件扩展名;
export const getBaseName = 获取无扩展名文件名;
export const getDirName = 获取文件目录;
export const getFileFormats = 获取文件格式描述;
export const generateFileListLabel = 生成文件列表描述;
export const joinPath = 组合路径;
export const normalizePath = 标准化路径;

// 默认导出
export default {
  获取文件名,
  获取文件扩展名,
  获取无扩展名文件名,
  获取文件目录,
  获取文件格式描述,
  生成文件列表描述,
  组合路径,
  标准化路径,
  getFileName,
  getFileExtension,
  getBaseName,
  getDirName,
  getFileFormats,
  generateFileListLabel,
  joinPath,
  normalizePath
}; 