// 工具函数：标准化端点URL
function normalizeEndpoint(endpoint) {
  const baseURL = endpoint || 'https://api.siliconflow.cn/v1/'
  const shouldAppendPath = !baseURL.includes('chat/completions')
  const sanitizedURL = baseURL.replace(/\/$/, '')
  return shouldAppendPath ? `${sanitizedURL}/chat/completions` : baseURL
}

// 工具函数：标准化配置
function normalizeConfig(config = {}) {
  return {
    ...config,
    endpoint: normalizeEndpoint(config.endpoint),
    model: config.model || 'deepseek-ai/DeepSeek-R1',
    temperature: config.temperature ?? 0.7,
    max_tokens: config.max_tokens ?? 500,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    }
  }
}

export class AISSEProvider {
  constructor(config = {}) {
    this.config = normalizeConfig(config)
    this.abortController = new AbortController()
  }

  async *createChatCompletion(messages) {
    const msgId = `chatcmpl-${Date.now()}`
    let response
    let reader = null

    try {
      response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: this.config.headers,
        body: JSON.stringify({
          model: this.config.model,
          messages,
          temperature: this.config.temperature,
          max_tokens: this.config.max_tokens,
          stream: true
        }),
        signal: this.abortController.signal
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        
        // 处理分块数据
        while (buffer.includes('\n\n')) {
          const chunkEnd = buffer.indexOf('\n\n')
          const chunk = buffer.slice(0, chunkEnd)
          buffer = buffer.slice(chunkEnd + 2)

          if (chunk.startsWith('data: ')) {
            const eventData = this._parseSSEEvent(chunk)
            if (eventData) { // 只在有有效数据时yield
              yield this._formatToOpenAIEvent(eventData, msgId)
            }
          }
        }
      }
    } catch (e) {
      yield this._generateErrorEvent(e, msgId)
      throw e
    } finally {
      if (reader) {
        reader.releaseLock()
      }
    }
  }

  // 统一事件格式转换
  _formatToOpenAIEvent(data, msgId) {
    // 如果data为null，返回null
    if (!data) return null

    const baseEvent = {
      id: msgId,
      created: Math.floor(Date.now()/1000),
      model: this.config.model,
      system_fingerprint: 'ai_service_1'
    }

    // 添加DeepSeek响应格式适配
    if (data.choices?.[0]?.delta?.content) {
      return {
        ...baseEvent,
        object: 'chat.completion.chunk',
        choices: [{
          delta: { content: data.choices[0].delta.content },
          index: 0,
          finish_reason: data.choices[0].finish_reason
        }]
      }
    }
    // 适配不同供应商的响应格式
    if (data.delta) {
      // OpenAI兼容格式
      return {
        ...baseEvent,
        object: 'chat.completion.chunk',
        choices: [{
          delta: data.delta,
          index: 0,
          finish_reason: data.finish_reason
        }]
      }
    } else if (data.choices) {
      // 其他供应商格式适配
      return {
        ...baseEvent,
        ...data,
        choices: data.choices.map(choice => ({
          delta: choice.message ? { content: choice.message.content } : {},
          index: choice.index,
          finish_reason: choice.finish_reason
        }))
      }
    }
  }

  _parseSSEEvent(chunk) {
    try {
      const data = chunk.replace('data: ', '')
      // 处理流结束标记
      if (data === '[DONE]') {
        return null
      }
      return JSON.parse(data)
    } catch (e) {
      console.warn('SSE解析警告:', e, '原始数据:', chunk)
      return null
    }
  }

  _generateErrorEvent(error, msgId) {
    return {
      id: msgId,
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now()/1000),
      model: this.config.model,
      system_fingerprint: 'ai_service_1',
      error: {
        code: 500,
        message: error.message,
        type: 'server_error'
      },
      choices: []
    }
  }

  abort() {
    this.abortController.abort()
  }
}

// 工厂函数
export function createAISSEProvider(config) {
  return new AISSEProvider(config)
}
