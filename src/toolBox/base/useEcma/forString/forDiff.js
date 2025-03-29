/**
 * 字符串差异比较工具
 * 提供用于比较字符串差异的功能函数
 */

/**
 * 查找字符串差异的起始索引
 * @param {string} 前文本 - 之前的文本
 * @param {string} 当前文本 - 当前的文本
 * @returns {number} 差异起始位置的索引
 */
export function 查找差异索引(前文本, 当前文本) {
  if (!前文本 || !当前文本) return 0;
  
  const 最小长度 = Math.min(前文本.length, 当前文本.length);
  for (let i = 0; i < 最小长度; i++) {
    if (前文本[i] !== 当前文本[i]) return i;
  }
  return 最小长度;
}

/**
 * 提取两个字符串的差异部分
 * @param {string} 前文本 - 之前的文本
 * @param {string} 当前文本 - 当前的文本
 * @returns {string} 差异部分
 */
export function 提取差异内容(前文本, 当前文本) {
  const 差异索引 = 查找差异索引(前文本, 当前文本);
  
  // 如果当前文本短于或等于前文本，可能是删除了内容
  if (当前文本.length <= 前文本.length) return '';
  
  // 否则提取新增的部分
  return 当前文本.slice(差异索引);
}

/**
 * 计算两个字符串的相似度 (0-1之间的值)
 * @param {string} 文本A - 第一个字符串
 * @param {string} 文本B - 第二个字符串
 * @returns {number} 相似度值，范围0-1，1表示完全相同
 */
export function 计算字符串相似度(文本A, 文本B) {
  if (!文本A || !文本B) return 0;
  if (文本A === 文本B) return 1;

  // 使用Levenshtein距离计算相似度
  const 距离 = 计算编辑距离(文本A, 文本B);
  const 最大长度 = Math.max(文本A.length, 文本B.length);
  
  // 将距离转换为相似度 (1 - 归一化距离)
  return 1 - 距离 / 最大长度;
}

/**
 * 辅助函数：计算两个字符串的编辑距离
 * @private
 */
function 计算编辑距离(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];

  // 初始化矩阵
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // 填充矩阵
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // 删除
        matrix[i][j - 1] + 1,      // 插入
        matrix[i - 1][j - 1] + cost // 替换
      );
    }
  }

  return matrix[b.length][a.length];
}

/**
 * 查找两个字符串的最长公共子序列
 * @param {string} 文本A - 第一个字符串
 * @param {string} 文本B - 第二个字符串
 * @returns {string} 最长公共子序列
 */
export function 最长公共子序列(文本A, 文本B) {
  if (!文本A || !文本B) return '';
  
  // 创建LCS表
  const lcsTable = Array(文本A.length + 1)
    .fill(0)
    .map(() => Array(文本B.length + 1).fill(0));
  
  // 构建LCS表
  for (let i = 1; i <= 文本A.length; i++) {
    for (let j = 1; j <= 文本B.length; j++) {
      if (文本A[i - 1] === 文本B[j - 1]) {
        lcsTable[i][j] = lcsTable[i - 1][j - 1] + 1;
      } else {
        lcsTable[i][j] = Math.max(lcsTable[i - 1][j], lcsTable[i][j - 1]);
      }
    }
  }
  
  // 从表中提取最长公共子序列
  let i = 文本A.length, j = 文本B.length;
  let lcs = '';
  
  while (i > 0 && j > 0) {
    if (文本A[i - 1] === 文本B[j - 1]) {
      lcs = 文本A[i - 1] + lcs;
      i--;
      j--;
    } else if (lcsTable[i - 1][j] > lcsTable[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  
  return lcs;
}

// 为保持兼容性提供英文命名的别名
export const findDiffIndex = 查找差异索引;
export const extractDiff = 提取差异内容;
export const calculateStringSimilarity = 计算字符串相似度;
export const longestCommonSubsequence = 最长公共子序列;

// 支持默认导出常用功能
export default {
  查找差异索引,
  提取差异内容,
  计算字符串相似度,
  最长公共子序列,
  findDiffIndex,
  extractDiff,
  calculateStringSimilarity,
  longestCommonSubsequence
}; 