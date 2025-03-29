/**
 * @fileoverview 字符串搜索工具函数
 * 提供字符串搜索和匹配的通用功能
 */

/**
 * 构建搜索文字组
 * 获取文本的所有可能搜索形式（原文、拼音、首字母）
 * @param {string} 文本 - 要处理的文本
 * @param {Object} 拼音工具 - 用于汉字转拼音的工具对象
 * @returns {string[]} 返回包含原文、全拼、首字母的数组
 */
export function 构建搜索文字组(文本, 拼音工具) {
  if (!文本) return [''];
  
  const 结果 = [文本.toLowerCase()];
  
  // 如果提供了拼音工具，则添加拼音和首字母形式
  if (拼音工具 && typeof 拼音工具.getFullChars === 'function') {
    结果.push(拼音工具.getFullChars(文本).toLowerCase());
    
    if (typeof 拼音工具.getCamelChars === 'function') {
      结果.push(拼音工具.getCamelChars(文本).toLowerCase());
    }
  }
  
  return 结果;
}

/**
 * 以关键词匹配对象
 * 检查对象的指定字段是否匹配搜索查询
 * @param {string} 查询关键词 - 搜索查询
 * @param {Object} 对象 - 要搜索的对象
 * @param {string[]} [搜索字段=['label', 'description']] - 要搜索的字段名数组
 * @param {Object} [拼音工具=null] - 用于汉字转拼音的工具对象
 * @returns {boolean} 是否匹配
 */
export function 以关键词匹配对象(查询关键词, 对象, 搜索字段 = ['label', 'description'], 拼音工具 = null) {
  if (!查询关键词) return true;
  
  return 搜索字段.some(字段 => {
    if (!对象[字段]) return false;
    
    const 可搜索文本组 = 构建搜索文字组(对象[字段], 拼音工具);
    return 可搜索文本组.some(文本 => 文本.includes(查询关键词.toLowerCase()));
  });
}

/**
 * 模糊搜索文本
 * 使用简单的模糊匹配算法搜索文本
 * @param {string} 查询关键词 - 搜索查询
 * @param {string} 文本 - 要搜索的文本
 * @returns {boolean} 是否匹配
 */
export function 模糊搜索文本(查询关键词, 文本) {
  if (!查询关键词 || !文本) return false;
  
  const 查询 = 查询关键词.toLowerCase();
  const 目标 = 文本.toLowerCase();
  
  let 查询索引 = 0;
  let 目标索引 = 0;
  
  // 尝试在目标文本中按顺序找到查询的每个字符
  while (查询索引 < 查询.length && 目标索引 < 目标.length) {
    if (查询[查询索引] === 目标[目标索引]) {
      查询索引++;
    }
    目标索引++;
  }
  
  // 如果所有查询字符都找到了，则返回true
  return 查询索引 === 查询.length;
}

/**
 * 计算两个字符串的相似度（使用Levenshtein距离）
 * @param {string} 字符串A - 第一个字符串
 * @param {string} 字符串B - 第二个字符串
 * @returns {number} 相似度（0到1之间，1表示完全相同）
 */
export function 计算字符串相似度(字符串A, 字符串B) {
  if (!字符串A && !字符串B) return 1; // 都为空时认为完全相同
  if (!字符串A || !字符串B) return 0; // 有一个为空时认为完全不同
  
  // 计算Levenshtein距离
  const 矩阵 = Array(字符串B.length + 1).fill(null).map(() => Array(字符串A.length + 1).fill(null));
  
  // 初始化第一行和第一列
  for (let i = 0; i <= 字符串A.length; i++) {
    矩阵[0][i] = i;
  }
  for (let j = 0; j <= 字符串B.length; j++) {
    矩阵[j][0] = j;
  }
  
  // 填充矩阵
  for (let j = 1; j <= 字符串B.length; j++) {
    for (let i = 1; i <= 字符串A.length; i++) {
      const 替换成本 = 字符串A[i - 1] === 字符串B[j - 1] ? 0 : 1;
      矩阵[j][i] = Math.min(
        矩阵[j][i - 1] + 1, // 删除
        矩阵[j - 1][i] + 1, // 插入
        矩阵[j - 1][i - 1] + 替换成本 // 替换
      );
    }
  }
  
  // 计算最大可能的编辑距离
  const 最大距离 = Math.max(字符串A.length, 字符串B.length);
  
  // 计算相似度（1减去归一化的编辑距离）
  return 最大距离 ? 1 - 矩阵[字符串B.length][字符串A.length] / 最大距离 : 1;
}

/**
 * 高亮文本中的搜索词
 * @param {string} 文本 - 原始文本
 * @param {string} 搜索词 - 要高亮的搜索词
 * @param {string} [前缀='<mark>'] - 高亮部分的前缀
 * @param {string} [后缀='</mark>'] - 高亮部分的后缀
 * @returns {string} 包含高亮标记的文本
 */
export function 高亮搜索词(文本, 搜索词, 前缀 = '<mark>', 后缀 = '</mark>') {
  if (!文本 || !搜索词) return 文本 || '';
  
  // 转义正则表达式特殊字符
  const 转义搜索词 = 搜索词.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const 正则 = new RegExp(`(${转义搜索词})`, 'gi');
  
  return 文本.replace(正则, `${前缀}$1${后缀}`);
}

// 添加英文别名以提高兼容性
export const buildSearchableTextArray = 构建搜索文字组;
export const matchObjectWithKeyword = 以关键词匹配对象;
export const fuzzySearchText = 模糊搜索文本;
export const calculateStringSimilarity = 计算字符串相似度;
export const highlightSearchTerm = 高亮搜索词;

// 默认导出
export default {
  构建搜索文字组,
  以关键词匹配对象,
  模糊搜索文本,
  计算字符串相似度,
  高亮搜索词,
  buildSearchableTextArray,
  matchObjectWithKeyword,
  fuzzySearchText,
  calculateStringSimilarity,
  highlightSearchTerm
}; 