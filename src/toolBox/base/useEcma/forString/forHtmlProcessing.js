/**
 * @fileoverview HTML字符串处理工具函数
 * 提供HTML转义和反转义的通用功能
 */

/**
 * HTML特殊字符与转义字符的映射表
 * @type {Object}
 */
const HTML转义映射表 = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;'
};

/**
 * HTML转义字符与特殊字符的映射表(反向映射)
 * @type {Object}
 */
const HTML反转义映射表 = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#039;': "'"
};

/**
 * 转义HTML特殊字符
 * 将特殊字符转换为对应的HTML实体，防止XSS攻击
 * @param {string} 文本 - 需要转义的字符串
 * @returns {string} 转义后的字符串
 */
export function 转义HTML(文本) {
  if (!文本 || typeof 文本 !== 'string') return '';
  
  return 文本.replace(/[&<>"']/g, 字符 => HTML转义映射表[字符] || 字符);
}

/**
 * 转义HTML属性值
 * 专门针对HTML属性值的转义处理
 * @param {string} 文本 - 需要转义的属性值
 * @returns {string} 转义后的属性值
 */
export function 转义HTML属性(文本) {
  if (!文本) return '';
  
  return 转义HTML(文本);
}

/**
 * 反转义HTML实体
 * 将HTML实体转换回对应的特殊字符
 * @param {string} 文本 - 包含HTML实体的字符串
 * @returns {string} 反转义后的字符串
 */
export function 反转义HTML(文本) {
  if (!文本 || typeof 文本 !== 'string') return '';
  
  return 文本.replace(/&amp;|&lt;|&gt;|&quot;|&#039;/g, 实体 => HTML反转义映射表[实体] || 实体);
}

/**
 * 清理文本内容
 * 移除首尾空白字符并将连续空白字符替换为单个空格
 * @param {string} 文本 - 需要清理的文本
 * @returns {string} 清理后的文本
 */
export function 清理文本(文本) {
  if (!文本) return '';
  
  return 文本.trim().replace(/\s+/g, ' ');
}

/**
 * 移除HTML标签
 * 去除字符串中的所有HTML标签，只保留文本内容
 * @param {string} 文本 - 包含HTML标签的字符串
 * @returns {string} 仅包含文本的字符串
 */
export function 移除HTML标签(文本) {
  if (!文本) return '';
  
  return 文本.replace(/<[^>]*>/g, '');
}

/**
 * 将文本转换为HTML段落
 * 将文本中的换行符转换为HTML段落标签
 * @param {string} 文本 - 需要转换的文本
 * @param {boolean} [转义=true] - 是否对文本内容进行HTML转义
 * @returns {string} 转换后的HTML段落
 */
export function 文本转HTML段落(文本, 转义 = true) {
  if (!文本) return '';
  
  const 处理后文本 = 转义 ? 转义HTML(文本) : 文本;
  return 处理后文本
    .split(/\r?\n/)
    .map(行 => 行.trim())
    .filter(行 => 行)
    .map(行 => `<p>${行}</p>`)
    .join('');
}

/**
 * 安全地转义HTML，但保留指定的HTML标签
 * @param {string} 文本 - 需要转义的文本
 * @param {Array<string>} 保留标签 - 要保留的HTML标签名数组
 * @returns {string} 部分转义后的文本
 */
export function 部分转义HTML(文本, 保留标签 = []) {
  if (!文本 || typeof 文本 !== 'string') return '';
  if (!保留标签.length) return 转义HTML(文本);
  
  // 构建保留标签的正则表达式
  const 标签列表 = 保留标签.join('|');
  const 标签正则 = new RegExp(`<(\/?(${标签列表})(?:\\s[^>]*)?)>`, 'g');
  
  // 临时替换保留标签为特殊标记
  const 占位符前缀 = `__HTML_TAG_${Date.now()}_`;
  let 替换计数 = 0;
  const 标签映射 = {};
  
  const 替换后文本 = 文本.replace(标签正则, (匹配, 内容) => {
    const 占位符 = `${占位符前缀}${替换计数++}__`;
    标签映射[占位符] = 匹配;
    return 占位符;
  });
  
  // 转义中间文本
  const 转义后文本 = 转义HTML(替换后文本);
  
  // 还原保留的标签
  return 转义后文本.replace(new RegExp(`${占位符前缀}\\d+__`, 'g'), 占位符 => {
    return 标签映射[占位符] || 占位符;
  });
}

/**
 * 将纯文本转换为HTML，保留换行符和空格
 * @param {string} 文本 - 要转换的纯文本
 * @returns {string} 转换后的HTML
 */
export function 文本转HTML(文本) {
  if (!文本 || typeof 文本 !== 'string') return '';
  
  return 转义HTML(文本)
    .replace(/\n/g, '<br>')
    .replace(/  /g, '&nbsp;&nbsp;')
    .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
}

// 添加英文别名以提高兼容性
export const escapeHTML = 转义HTML;
export const escapeHTMLAttr = 转义HTML属性;
export const unescapeHTML = 反转义HTML;
export const sanitizeText = 清理文本;
export const stripHTMLTags = 移除HTML标签;
export const textToParagraphs = 文本转HTML段落;
export const partialEscapeHTML = 部分转义HTML;
export const textToHTML = 文本转HTML;

// 默认导出
export default {
  转义HTML,
  转义HTML属性,
  反转义HTML,
  清理文本,
  移除HTML标签,
  文本转HTML段落,
  escapeHTML,
  escapeHTMLAttr,
  unescapeHTML,
  sanitizeText,
  stripHTMLTags,
  textToParagraphs,
  partialEscapeHTML,
  textToHTML
}; 