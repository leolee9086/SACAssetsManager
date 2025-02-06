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
    max_tokens: config.max_tokens ?? 4096,
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
    this._hasSeenReasoningContent = false
  }

  async *createChatCompletion(messages) {
    this._hasSeenReasoningContent = false
    const msgId = `chatcmpl-${Date.now()}`
    let response
    let reader = null
    const CHUNK_DELIMITER = '\n\n'
    const TEXT_DECODER = new TextDecoder()
    
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
        const errorBody = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorBody.slice(0, 200)}`)
      }

      reader = response.body.getReader()
      let buffer = ''
      let pendingYield = Promise.resolve()

      do {
        const { done, value } = await reader.read()
        if (done) break

        buffer += TEXT_DECODER.decode(value, { stream: true })
        
        // 高效分割处理块
        let chunks
        [chunks, buffer] = this._splitBuffer(buffer, CHUNK_DELIMITER)

        // 批量处理避免频繁yield
        const events = []
        for (const chunk of chunks) {
          if (chunk.startsWith('data: ')) {
            const event = this._processChunk(chunk, msgId)
            event && events.push(event)
          }
        }

        // 批量yield并添加调度间隙
        if (events.length) {
          await pendingYield
          for (const event of events) {
            yield event
            pendingYield = new Promise(resolve => 
              setTimeout(resolve, this.config.chunkInterval || 0)
            )
          }
        }
      } while (true)

      // 处理最终残留数据
      if (buffer) {
        const event = this._processChunk(buffer, msgId)
        event && (yield event)
      }

    } catch (e) {
      yield this._generateErrorEvent(e, msgId)
      throw e
    } finally {
      reader?.releaseLock()
    }
  }

  _splitBuffer(buffer, delimiter) {
    const chunks = []
    let index
    while ((index = buffer.indexOf(delimiter)) >= 0) {
      chunks.push(buffer.slice(0, index))
      buffer = buffer.slice(index + delimiter.length)
    }
    return [chunks, buffer]
  }

  _processChunk(chunk, msgId) {
    const eventData = this._parseSSEEvent(chunk)
    return eventData ? this._formatToOpenAIEvent(eventData, msgId) : null
  }

  _parseSSEEvent(chunk) {
    try {
      const data = chunk.replace('data: ', '')
      // 更好地处理[DONE]信号
      if (data.trim() === '[DONE]') {
        return null
      }
      return JSON.parse(data)
    } catch (e) {
      console.warn('SSE解析警告:', e, '原始数据:', chunk)
      return null
    }
  }

  _formatToOpenAIEvent(data, msgId) {
    if (!data) return null

    const baseEvent = {
      id: msgId,
      created: Math.floor(Date.now()/1000),
      model: this.config.model,
      system_fingerprint: 'ai_service_1'
    }

    // 优化DeepSeek响应格式适配
    if (data.choices?.[0]?.delta) {
      const choice = data.choices[0]
      const formattedChoice = {
        index: 0,
        finish_reason: choice.finish_reason
      }

      console.log('Delta:', choice.delta) // 调试日志

      // 处理 reasoning_content
      if (choice.delta.reasoning_content !== undefined&&choice.delta.reasoning_content !== null) {
        // 第一个 reasoning_content 前添加 <think>
        let content = choice.delta.reasoning_content || ''
        if (content && !this._hasSeenReasoningContent) {
          content = `<think>${content}`
          this._hasSeenReasoningContent = true
        }
        formattedChoice.delta = { content }
        console.log('Reasoning content:', content) // 调试日志
      } 
      // 处理普通 content
      else if (choice.delta.content !== undefined) {
        let content = choice.delta.content || ''
        // 在第一个普通 content 前添加 </think> 和换行
        if (this._hasSeenReasoningContent) {
          content = `</think>\n${content}`
          this._hasSeenReasoningContent = false
        }
        formattedChoice.delta = { content }
        console.log('Normal content:', content) // 调试日志
      }

      return {
        ...baseEvent,
        object: 'chat.completion.chunk',
        choices: [formattedChoice]
      }
    }

    // 处理其他格式
    if (data.choices) {
      return {
        ...baseEvent,
        object: 'chat.completion.chunk',
        choices: data.choices.map(choice => ({
          delta: choice.message ? { content: choice.message.content } : {},
          index: choice.index || 0,
          finish_reason: choice.finish_reason
        }))
      }
    }

    return null
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

export class AISSEConversation {
  constructor(providerConfig = {}) {
    this.provider = new AISSEProvider({
      apiKey: providerConfig.apiKey,
      endpoint: providerConfig.apiBaseURL,
      model: providerConfig.apiModel,
      temperature: providerConfig.temperature,
      max_tokens: providerConfig.apiMaxTokens,
      chunkInterval: providerConfig.chunkInterval
    });
    this.messages = [];
  }

  addAsSystem(prompt) {
    this.messages.push({
      role: 'system',
      content: prompt
    });
    return this;
  }

  async postAsUser(message) {
    this.messages.push({
      role: 'user',
      content: message
    });
    return this._sendMessages();
  }

  async postBatch(messages) {
    this.messages = this.messages.concat(messages);
    return this._sendMessages();
  }

  async _sendMessages() {
    try {
      let fullResponse = '';
      for await (const chunk of this.provider.createChatCompletion(this.messages)) {
        if (chunk.error) {
          throw new Error(chunk.error.message);
        }
        const content = chunk.choices[0]?.delta?.content || '';
        fullResponse += content;
      }
      
      this.messages.push({
        role: 'assistant',
        content: fullResponse
      });
      
      return {
        choices: [{
          message: {
            content: fullResponse,
            role: 'assistant'
          }
        }]
      };
    } finally {
      // 保持当前消息历史，如需清空可在此添加重置逻辑
    }
  }

  setConfig(newConfig) {
    this.provider = new AISSEProvider({
      ...this.provider.config,
      ...newConfig
    });
  }

  async *streamAsUser(message) {
    this.messages.push({ role: 'user', content: message });
    
    let fullResponse = '';
    for await (const chunk of this.provider.createChatCompletion(this.messages)) {
      if (chunk.error) throw new Error(chunk.error.message);
      
      const content = chunk.choices[0]?.delta?.content || '';
      fullResponse += content;
      
      // 实时返回增量内容
      yield {
        partial: content,
        chunk: chunk,
        full: fullResponse
      };
    }

    this.messages.push({ role: 'assistant', content: fullResponse });
  }

  async postAsUser(message) {
    let full = '';
    for await (const { full: response } of this.streamAsUser(message)) {
      full = response;
    }
    return { choices: [{ message: { content: full, role: 'assistant' } }] };
  }
}

export class SSEPromptStreamer {
  constructor(providerConfig = {}, systemPrompt = '') {
    this.provider = new AISSEProvider({
      apiKey: providerConfig.apiKey,
      endpoint: providerConfig.apiBaseURL,
      model: providerConfig.apiModel,
      temperature: providerConfig.temperature,
      max_tokens: providerConfig.apiMaxTokens,
      chunkInterval: providerConfig.chunkInterval
    });
    this.systemPrompt = systemPrompt;
  }

  /**
   * 创建带系统提示的原始SSE流
   * @param {Array} messages - 单次对话消息数组
   * @yields {Object} 原始SSE事件对象
   */
  async *createStream(messages) {
    const mergedMessages = [
      { role: 'system', content: this.systemPrompt },
      ...messages.filter(m => m.role !== 'system')
    ];

    yield* this.provider.createChatCompletion(mergedMessages);
  }

  /**
   * 更新系统提示词（立即生效）
   * @param {string} newPrompt - 新的系统级提示词
   */
  setSystemPrompt(newPrompt) {
    this.systemPrompt = newPrompt;
  }
}

// 工厂函数
export function createAISSEProvider(config) {
  return new AISSEProvider(config)
}

// 更新工厂函数名称
export function createPromptStreamer(config, systemPrompt = '') {
  return new SSEPromptStreamer(config, systemPrompt);
}
