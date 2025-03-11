// 流处理通用工具
export function 分割缓冲区(buffer, 分隔符 = '\n\n') {
    const 块数组 = []
    let index
    while ((index = buffer.indexOf(分隔符)) >= 0) {
      块数组.push(buffer.slice(0, index))
      buffer = buffer.slice(index + 分隔符.length)
    }
    return [块数组, buffer]
  }
  
  export function 解析SSE事件(chunk) {
    try {
      const data = chunk.replace('data: ', '')
      if (data.trim() === '[DONE]') return null
      return JSON.parse(data)
    } catch (e) {
      console.warn('SSE解析警告:', e, '原始数据:', chunk)
      return null
    }
  }