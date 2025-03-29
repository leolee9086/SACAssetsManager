/**
 * 拼音工具
 * 封装第三方拼音模块，提供汉字转拼音功能
 */

// 引入外部拼音依赖
import pinyin from "../../../../static/pinyin.js";

/**
 * 获取文本的全拼表示
 * @param {string} 文本 - 要转换的文本
 * @returns {string} 全拼
 */
export const 获取全拼 = (文本) => {
  if (!文本) return '';
  return pinyin.getFullChars(文本);
};

/**
 * 获取文本的首字母表示
 * @param {string} 文本 - 要转换的文本
 * @returns {string} 拼音首字母
 */
export const 获取拼音首字母 = (文本) => {
  if (!文本) return '';
  return pinyin.getCamelChars(文本);
};

/**
 * 获取文本的拼音数组（全拼和首字母）
 * @param {string} 文本 - 要转换的文本
 * @returns {string[]} 包含原文、全拼、首字母的数组
 */
export const 获取文本拼音数组 = (文本) => {
  if (!文本) return [''];
  
  return [
    文本,
    获取全拼(文本),
    获取拼音首字母(文本)
  ];
};

/**
 * 获取拼音工具实例
 * 返回原始pinyin对象，供特殊场景使用
 * @returns {Object} 拼音工具对象
 */
export const 获取拼音工具 = () => {
  return pinyin;
};

// 英文API
export const getFullPinyin = 获取全拼;
export const getPinyinInitials = 获取拼音首字母;
export const getTextPinyinArray = 获取文本拼音数组;
export const getPinyinUtil = 获取拼音工具;

// 默认导出
export default {
  获取全拼,
  获取拼音首字母,
  获取文本拼音数组,
  获取拼音工具,
  getFullPinyin,
  getPinyinInitials,
  getTextPinyinArray,
  getPinyinUtil
}; 