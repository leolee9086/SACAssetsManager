/**
 * @fileoverview 数组相关工具函数
 */

/**
 * 将值转换为数组
 * @param {*} value 需要转换的值
 * @returns {Array} 转换后的数组
 */
export const toArray = (value) => {
    if (value === undefined || value === null) return [];
    return Array.isArray(value) ? value : [value];
}; 