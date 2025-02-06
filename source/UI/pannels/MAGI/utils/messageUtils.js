import { 解析SSE事件, 是有效流 } from './sseUtils.js'

// 时间格式化
export const 格式化时间戳 = (时间戳) => {
  if (!时间戳) return ''
  const 日期 = new Date(时间戳)
  return 日期.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 安全转义HTML字符
const 转义HTML = (文本) => {
  const 映射表 = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return 文本.replace(/[&<>"']/g, 字符 => 映射表[字符])
}

// 反转义HTML字符
const 反转义HTML = (文本) => {
  const 映射表 = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#039;': "'"
  }
  return 文本.replace(/&amp;|&lt;|&gt;|&quot;|&#039;/g, 实体 => 映射表[实体])
}

// Think内容解析
export const 解析思考内容 = (内容) => {
  if (!内容 || typeof 内容 !== 'string') {
    return { 思考内容: '', 普通内容: '', 有思考: false }
  }

  // 先转义内容中的HTML，但保留think标签
  const 安全内容 = 内容.replace(/<think>(.*?)<\/think>/g, (匹配, 组1) => {
    return `<think>${转义HTML(组1)}</think>`
  })
  
  const 解析器 = new DOMParser()
  const 文档 = 解析器.parseFromString(`<div>${安全内容}</div>`, 'text/html')
  const 思考元素 = 文档.querySelector('think')

  if (思考元素) {
    // 获取think标签内的内容并反转义
    const 思考内容 = 反转义HTML(思考元素.textContent.trim())
    // 移除think标签后的剩余内容并反转义
    思考元素.remove()
    const 普通内容 = 反转义HTML(文档.body.textContent.trim())

    return {
      思考内容,
      普通内容,
      有思考: true
    }
  }

  // 处理未闭合的think标签情况
  if (内容.includes('<think>') && !内容.includes('</think>')) {
    return {
      思考内容: '',
      普通内容: 转义HTML(内容),
      有思考: false
    }
  }

  return {
    思考内容: '',
    普通内容: 转义HTML(内容),
    有思考: false
  }
}

// DOM 相关工具函数
export const 更新元素高度 = (元素, 是否展开) => {
  if (!元素) return
  
  if (是否展开) {
    元素.style.maxHeight = `${元素.scrollHeight}px`
  } else {
    元素.style.maxHeight = '0px'
  }
}

/**
 * 处理 SSE 流式消息
 * @param {ReadableStream} response SSE响应流
 * @param {Object} options 配置选项
 * @returns {Promise<{content: string, success: boolean}>}
 */
export const 处理流式消息 = async (response, options = {}) => {
    const {
        onStart,
        onProgress,
        onChunk,
        onError,
        onComplete,
        初始消息 = {
            id: Symbol('sseMsg'),
            type: 'sse_stream',
            content: '',
            status: 'pending',
            timestamp: Date.now(),
            meta: { progress: 0 },
            _lastFull: ''
        }
    } = options

    if (!是有效流(response)) return { content: '', success: false }

    try {
        let hasContent = false
        let finalContent = ''
        let receivedChunks = 0
        let lastFullContent = ''
        const pendingMsg = { ...初始消息 }

        onStart?.(pendingMsg)

        for await (const event of response) {
            const { 类型: type, 数据: data } = 解析SSE事件(event)

            // 检查是否是结束信号
            if (type === 'done' || data.是完整) {
                pendingMsg.status = 'success'
                pendingMsg.meta.progress = 100
                onChunk?.(pendingMsg)
                onComplete?.(pendingMsg)
                return { content: pendingMsg.content, success: true }
            }

            // 首包验证
            receivedChunks++
            if (receivedChunks === 1) {
                const isValidFirstChunk = (
                    (type === 'init' && (data.进度 !== undefined || data.内容)) ||
                    (type === 'chunk' && (data.内容 || data.进度 !== undefined))
                )

                if (!isValidFirstChunk) {
                    onError?.({
                        type: 'first_chunk_invalid',
                        message: `首包格式异常 [${type}]`,
                        data: { type, data, event }
                    })
                    return { content: '', success: false }
                }

                if (data.进度 !== undefined) {
                    pendingMsg.meta.progress = data.进度
                    onProgress?.(data.进度)
                }
            }

            // 处理内容
            if (data.内容?.trim() && !hasContent) {
                hasContent = true
                pendingMsg.status = 'loading'
                pendingMsg.content = data.内容
                onChunk?.(pendingMsg)
            }

            // 更新内容
            if (hasContent) {
                if (data.模式 === 'delta') {
                    const newContent = data.内容.replace(pendingMsg.content, '')
                    pendingMsg.content += newContent
                } else if (data.模式 === 'full') {
                    const diffStartIndex = 查找差异索引(lastFullContent, data.内容)
                    const newContent = data.内容.slice(diffStartIndex)
                    pendingMsg.content += newContent
                    lastFullContent = data.内容
                }
                
                pendingMsg.meta.progress = data.进度
                pendingMsg.status = 'loading'
                pendingMsg.timestamp = Date.now()
                finalContent = pendingMsg.content
                
                onChunk?.(pendingMsg)
            }

            // 更新内容后立即触发回调
            if (hasContent && data.内容) {
                onChunk?.(pendingMsg)
            }
        }

        // 流正常结束
        if (hasContent) {
            pendingMsg.status = 'success'
            pendingMsg.meta.progress = 100
            pendingMsg.timestamp = Date.now()
            onChunk?.(pendingMsg)
            onComplete?.(pendingMsg)
            return { content: finalContent, success: true }
        }

        return { content: '', success: false }
    } catch (error) {
        onError?.({
            type: 'stream_processing_error',
            message: error.message,
            error
        })
        return { content: '', success: false }
    }
}

/**
 * 创建消息对象
 * @param {string} type 消息类型
 * @param {string} content 消息内容
 * @param {Object} extra 额外属性
 * @returns {Object} 消息对象
 */
export const 创建消息 = (type, content, extra = {}) => ({
    type,
    content,
    status: extra.status || 'default',
    timestamp: Date.now(),
    meta: extra.meta || {},
    ...extra
})
