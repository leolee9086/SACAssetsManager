/**
 * MIME类型用途映射工具
 */

/**
 * MIME类型与用途的映射表
 */
import { getMimeUsageTable } from './useMimeUsageTable';

// 修改MIME用途映射为从新模块获取
const MIME用途映射 = getMimeUsageTable();

/**
 * 获取MIME类型的常见用途
 * @param {string} mime类型 - MIME类型
 * @returns {string[]} 常见用途
 */
export const 获取MIME用途 = (mime类型) => {
  if (!mime类型) return [];
  return MIME用途映射[mime类型] || ['数据存储', '文件传输'];
};

/**
 * 根据用途查找相关的MIME类型
 * @param {string} 用途 - 要查找的用途
 * @returns {string[]} 相关的MIME类型列表
 */
export const 根据用途查找MIME = (用途) => {
  if (!用途) return [];
  
  const 结果 = [];
  for (const [mime类型, 用途列表] of Object.entries(MIME用途映射)) {
    if (用途列表.some(项 => 项.includes(用途))) {
      结果.push(mime类型);
    }
  }
  
  return 结果;
};

/**
 * 获取所有支持的用途类别
 * @returns {string[]} 用途类别列表
 */
export const 获取所有用途类别 = () => {
  const 用途集合 = new Set();
  
  Object.values(MIME用途映射).forEach(用途列表 => {
    用途列表.forEach(用途 => 用途集合.add(用途));
  });
  
  return [...用途集合].sort();
};

/**
 * 获取特定类别的所有MIME类型
 * @param {string} 类别 - MIME类型的主类别(如text, image, audio等)
 * @returns {string[]} MIME类型列表
 */
export const 获取类别MIME类型 = (类别) => {
  if (!类别) return [];
  
  return Object.keys(MIME用途映射).filter(mime类型 => 
    mime类型.startsWith(`${类别}/`)
  );
};

/**
 * 判断MIME类型是否适合特定场景
 * @param {string} mime类型 - MIME类型
 * @param {string} 场景 - 使用场景
 * @returns {boolean} 是否适合
 */
export const 是否适合场景 = (mime类型, 场景) => {
  const 场景映射 = {
    '网页': ['text/html', 'text/css', 'text/javascript', 'image/jpeg', 'image/png', 'image/svg+xml', 'image/gif', 'image/webp'],
    '文档': ['application/pdf', 'text/plain', 'text/markdown', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    '多媒体': ['image/jpeg', 'image/png', 'audio/mpeg', 'audio/wav', 'video/mp4', 'video/webm'],
    '数据': ['application/json', 'text/csv', 'application/xml', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    '开发': ['text/html', 'text/css', 'text/javascript', 'application/json', 'application/xml', 'text/plain', 'application/x-httpd-php', 'application/x-sh']
  };
  
  return 场景映射[场景]?.includes(mime类型) || false;
};

export default {
  获取MIME用途,
  根据用途查找MIME,
  获取所有用途类别,
  获取类别MIME类型,
  是否适合场景
};