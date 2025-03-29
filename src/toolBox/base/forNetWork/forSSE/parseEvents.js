/**
 * @fileoverview SSE事件解析工具
 * @description 解析Server-Sent Events数据格式
 */

/**
 * 解析SSE事件数据
 * @param {string} chunk - 要解析的SSE事件块
 * @returns {Object|null} 解析后的JSON数据或null（如果数据为[DONE]或无效）
 */
export function 解析SSE事件(chunk) {
  if (typeof chunk !== 'string') return null;
  try {
    // 移除"data: "前缀
    const data = chunk.replace('data: ', '').trim();
    
    // 检查是否是结束标记
    if (data === '[DONE]') return null;
    
    // 尝试解析JSON
    return JSON.parse(data);
  } catch (e) {
    console.warn('SSE解析警告:', e, '原始数据:', chunk);
    return null;
  }
}

/**
 * 批量解析多个SSE事件
 * @param {Array<string>} chunks - 要解析的SSE事件块数组
 * @returns {Array<Object>} 解析后的数据对象数组
 */
export function 批量解析SSE事件(chunks) {
  return chunks
    .map(解析SSE事件)
    .filter(Boolean); // 过滤掉null值
}

// 英文别名
export const parseSSEEvent = 解析SSE事件;
export const parseSSEEvents = 批量解析SSE事件;

// 支持默认导出
export default 解析SSE事件;
