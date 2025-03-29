/**
 * @fileoverview 字符串转换和格式化工具函数
 * 提供字符串转换、格式化的通用功能
 */

/**
 * 将字符串首字母大写
 * @param {string} 字符串 - 需要处理的字符串
 * @returns {string} 首字母大写的字符串
 */
export function 首字母大写(字符串) {
  if (!字符串) return '';
  
  return 字符串.charAt(0).toUpperCase() + 字符串.slice(1);
}

/**
 * 将字符串转换为驼峰命名
 * @param {string} 字符串 - 需要转换的字符串
 * @param {boolean} [小驼峰=true] - 是否使用小驼峰(首字母小写)
 * @returns {string} 驼峰命名的字符串
 */
export function 转换为驼峰命名(字符串, 小驼峰 = true) {
  if (!字符串) return '';
  
  // 将非字母数字字符替换为空格，然后按空格分割
  const 单词数组 = 字符串
    .replace(/[^\w\s\u4e00-\u9fa5]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  
  if (单词数组.length === 0) return '';
  
  // 小驼峰：第一个单词首字母小写，其余单词首字母大写
  // 大驼峰：所有单词首字母大写
  let 结果 = 小驼峰 
    ? 单词数组[0].toLowerCase()
    : 首字母大写(单词数组[0].toLowerCase());
  
  // 处理剩余单词
  for (let i = 1; i < 单词数组.length; i++) {
    结果 += 首字母大写(单词数组[i].toLowerCase());
  }
  
  return 结果;
}

/**
 * 将字符串转换为下划线命名
 * @param {string} 字符串 - 需要转换的字符串
 * @returns {string} 下划线命名的字符串
 */
export function 转换为下划线命名(字符串) {
  if (!字符串) return '';
  
  // 处理驼峰命名转下划线
  const 处理驼峰 = 字符串
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase();
  
  // 将非字母数字字符替换为下划线，合并连续下划线
  return 处理驼峰
    .replace(/[^\w\u4e00-\u9fa5]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, ''); // 移除首尾下划线
}

/**
 * 将字符串转换为中划线命名
 * @param {string} 字符串 - 需要转换的字符串
 * @returns {string} 中划线命名的字符串
 */
export function 转换为中划线命名(字符串) {
  if (!字符串) return '';
  
  // 将下划线转换为中划线
  return 转换为下划线命名(字符串).replace(/_/g, '-');
}

/**
 * 将数字格式化为带千分位的字符串
 * @param {number} 数字 - 需要格式化的数字
 * @param {number} [小数位数=0] - 保留的小数位数
 * @param {boolean} [四舍五入=true] - 是否采用四舍五入
 * @returns {string} 格式化后的字符串
 */
export function 格式化数字(数字, 小数位数 = 0, 四舍五入 = true) {
  if (数字 === undefined || 数字 === null || isNaN(数字)) {
    return '';
  }
  
  // 处理小数位数
  let 处理后数字;
  if (四舍五入) {
    处理后数字 = Number(数字).toFixed(小数位数);
  } else {
    // 截断小数位数而不四舍五入
    const 乘数 = Math.pow(10, 小数位数);
    处理后数字 = (Math.floor(数字 * 乘数) / 乘数).toFixed(小数位数);
  }
  
  // 添加千分位分隔符
  const 整数部分 = 处理后数字.split('.')[0];
  const 小数部分 = 处理后数字.split('.')[1] || '';
  
  const 千分位整数 = 整数部分.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  return 小数部分 ? `${千分位整数}.${小数部分}` : 千分位整数;
}

/**
 * 裁剪字符串到指定长度并添加省略号
 * @param {string} 字符串 - 需要裁剪的字符串
 * @param {number} 最大长度 - 最大保留的字符数
 * @param {string} [省略号='...'] - 省略号字符串
 * @returns {string} 裁剪后的字符串
 */
export function 裁剪字符串(字符串, 最大长度, 省略号 = '...') {
  if (!字符串) return '';
  if (字符串.length <= 最大长度) return 字符串;
  
  return 字符串.substring(0, 最大长度) + 省略号;
}

/**
 * 替换字符串中的所有匹配项
 * @param {string} 字符串 - 原始字符串
 * @param {string|RegExp} 搜索值 - 要替换的值或正则表达式
 * @param {string|Function} 替换值 - 替换为的值或函数
 * @returns {string} 替换后的字符串
 */
export function 替换所有(字符串, 搜索值, 替换值) {
  if (!字符串) return '';
  
  if (typeof 搜索值 === 'string') {
    // 转义特殊字符
    const 转义搜索值 = 搜索值.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    return 字符串.replace(new RegExp(转义搜索值, 'g'), 替换值);
  }
  
  // 如果已经是正则表达式，确保它是全局的
  const 正则 = new RegExp(搜索值.source, 搜索值.flags.includes('g') ? 搜索值.flags : 搜索值.flags + 'g');
  return 字符串.replace(正则, 替换值);
}

/**
 * 计算字符串的字节长度（UTF-8编码）
 * @param {string} 字符串 - 需要计算的字符串
 * @returns {number} 字节长度
 */
export function 计算字节长度(字符串) {
  if (!字符串) return 0;
  
  let 字节长度 = 0;
  for (let i = 0; i < 字符串.length; i++) {
    const 字符 = 字符串.charCodeAt(i);
    if (字符 <= 0x007f) {
      字节长度 += 1;
    } else if (字符 <= 0x07ff) {
      字节长度 += 2;
    } else if (字符 <= 0xffff) {
      字节长度 += 3;
    } else {
      字节长度 += 4;
    }
  }
  
  return 字节长度;
}

/**
 * 生成指定长度的随机字符串
 * @param {number} 长度 - 字符串长度
 * @param {string} [字符集='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'] - 可用字符集
 * @returns {string} 随机字符串
 */
export function 生成随机字符串(长度, 字符集 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
  if (长度 <= 0) return '';
  
  let 结果 = '';
  const 字符集长度 = 字符集.length;
  
  for (let i = 0; i < 长度; i++) {
    const 随机索引 = Math.floor(Math.random() * 字符集长度);
    结果 += 字符集.charAt(随机索引);
  }
  
  return 结果;
}

// 添加英文别名以提高兼容性
export const capitalize = 首字母大写;
export const toCamelCase = 转换为驼峰命名;
export const toSnakeCase = 转换为下划线命名;
export const toKebabCase = 转换为中划线命名;
export const formatNumber = 格式化数字;
export const truncate = 裁剪字符串;
export const replaceAll = 替换所有;
export const byteLength = 计算字节长度;
export const randomString = 生成随机字符串;

// 默认导出
export default {
  首字母大写,
  转换为驼峰命名,
  转换为下划线命名,
  转换为中划线命名,
  格式化数字,
  裁剪字符串,
  替换所有,
  计算字节长度,
  生成随机字符串,
  capitalize,
  toCamelCase,
  toSnakeCase,
  toKebabCase,
  formatNumber,
  truncate,
  replaceAll,
  byteLength,
  randomString
}; 