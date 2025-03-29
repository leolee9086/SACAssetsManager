/**
 * @fileoverview SSE流验证工具
 * @description 验证一个对象是否是有效的可读流
 */

/**
 * 检查对象是否是有效的可读流
 * @param {any} 响应 - 要检查的响应对象
 * @returns {boolean} 如果响应是有效的可读流则返回true
 */
export function 是有效流(响应) {
  return 响应 &&
    typeof 响应[Symbol.asyncIterator] === 'function' &&
    typeof 响应.next === 'function';
}

// 英文别名
export const validateStream = 是有效流;

// 支持默认导出
export default 是有效流;
