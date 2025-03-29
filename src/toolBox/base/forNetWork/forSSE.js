/**
 * @fileoverview SSE分割缓冲区工具
 * @description 用于分割和处理SSE流数据
 */

/**
 * 流处理通用工具 - 分割缓冲区为块
 * @param {string} buffer - 数据缓冲区
 * @param {string} 分隔符 - 分隔符，默认为两个换行
 * @returns {Array} 包含两个元素：[处理后的块数组, 剩余缓冲区]
 */
export function 分割缓冲区(buffer, 分隔符 = '\n\n') {
  const 块数组 = []
  let index
  while ((index = buffer.indexOf(分隔符)) >= 0) {
    块数组.push(buffer.slice(0, index))
    buffer = buffer.slice(index + 分隔符.length)
  }
  return [块数组, buffer]
}

// 英文别名
export const splitBuffer = 分割缓冲区;

// 支持默认导出
export default 分割缓冲区;
