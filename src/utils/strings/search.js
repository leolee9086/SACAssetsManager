/**
 * @fileoverview 兼容层 - 字符串搜索
 * 此文件作为兼容层保持API兼容性
 * @deprecated 请直接从src/toolBox/base/useEcma/forString/forSearch.js导入函数
 */

// 从useDeps中导入拼音工具，符合依赖管理规范
import { 获取拼音工具 } from "../../../src/toolBox/base/useDeps/pinyinTools.js";
const pinyin = 获取拼音工具();

// 为旧代码保留兼容性
export { pinyin as $pinyin };

import {
    构建搜索文字组 as 原始构建搜索文字组,
    以关键词匹配对象 as 原始以关键词匹配对象
} from "../../../src/toolBox/base/useEcma/forString/forSearch.js";

/**
* 获取文本的所有可能搜索形式（原文、拼音、首字母）
* @param {string} text - 要处理的文本
* @returns {string[]} 返回包含原文、全拼、首字母的数组
*/
export const 构建搜索文字组 = (text) => {
    return 原始构建搜索文字组(text, pinyin);
};

/**
 * 检查文本是否匹配搜索查询
 * @param {string} query - 搜索查询
 * @param {Object} item - 要搜索的项目
 * @param {string[]} searchFields - 要搜索的字段名数组
 * @returns {boolean} 是否匹配
 */
export const 以关键词匹配对象 = (query, item, searchFields = ['label', 'description']) => {
    return 原始以关键词匹配对象(query, item, searchFields, pinyin);
};