// 模拟OpenAI风格SSE接口
export class MockOpenAI {
  constructor(config = {}) {
    this.config = {
      model: 'mock-gpt-4',
      temperature: 0.7,
      max_tokens: 500,
      responseTemplates: [],
      responseMode: 'delta', // delta|full
      ...config
    }
    this._loading = false
    this.responseDelay = config.responseDelay || 500
  }

  // 核心SSE生成方法
  async *createChatCompletion(messages) {
    const msgId = `chatcmpl-${Date.now()}`
    const validRoles = ['system', 'user', 'assistant', 'tool']
    const validateMessages = messages.map(msg => {
      if (!validRoles.includes(msg.role)) {
        throw new Error(`Invalid role: ${msg.role}`)
      }
      return { ...msg, content: msg.content || '' }
    })

    try {
      // 生成基础响应
      const fullResponse = this._generateResponse(messages)
      
      // 分块策略
      const chunker = this.config.responseMode === 'delta' 
        ? (str) => {
            // 增量分块：按语义分割
            const chunks = []
            let pos = 0
            while(pos < str.length) {
              const chunkSize = 2 + Math.floor(Math.random() * 3)
              chunks.push(str.substr(pos, chunkSize))
              pos += chunkSize
            }
            return chunks
          }
        : (str) => {
            // 全量分块：重复发送完整内容
            return Array(5).fill(str)
          }

      // 初始化响应
      yield this._generateSSEEvent({
        id: msgId,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now()/1000),
        model: this.config.model,
        system_fingerprint: 'mock_system_1',
        choices: [{
          delta: { role: 'assistant' },
          index: 0,
          logprobs: null,
          finish_reason: null
        }]
      })

      // 流式输出内容
      for (const chunk of chunker(fullResponse)) {
        yield this._generateSSEEvent({
          id: msgId,
          object: 'chat.completion.chunk',
          created: Math.floor(Date.now()/1000),
          model: this.config.model,
          system_fingerprint: 'mock_system_1',
          choices: [{
            delta: this.config.responseMode === 'delta' 
              ? { content: chunk }
              : { message: { content: fullResponse } }
          }]
        })
        await delay(this.responseDelay)
      }

      // 结束标记
      yield this._generateSSEEvent({
        id: msgId,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now()/1000),
        model: this.config.model,
        system_fingerprint: 'mock_system_1',
        choices: [{
          delta: {},
          index: 0,
          logprobs: null,
          finish_reason: 'stop'
        }]
      })

    } catch(e) {
      console.error('SSE流生成异常:', e)
      yield this._generateSSEEvent({
        id: msgId,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now()/1000),
        model: this.config.model,
        system_fingerprint: 'mock_system_1',
        error: {
          code: 500,
          message: e.message,
          type: 'mock_server_error'
        },
        choices: []
      })
      throw e
    }
  }

  // 生成响应内容（私有方法）
  _generateResponse(prompt) {
    // 支持函数型模板
    if (this.config.responseTemplates?.length > 0) {
      const template = this.config.responseTemplates[
        Math.floor(Math.random() * this.config.responseTemplates.length)
      ]
      
      try {
        return typeof template === 'function' 
          ? template(prompt, this.config) 
          : template.replace(/\${prompt}/g, prompt)
      } catch(e) {
        console.error('模板处理失败:', e)
        return `响应生成错误: ${e.message}`
      }
    }

    // 默认响应模板
    const defaultResponses = [
      `模拟响应（温度 ${this.config.temperature}）：${prompt}的可行性分析...`,
      `根据${this.config.model}模型评估：${prompt}的解决方案建议...`,
      `流式思考：关于${prompt}的${['战略', '战术', '逻辑'][Math.floor(Math.random()*3)]}层面分析...`
    ]
    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)]
  }

  // SSE事件生成器
  _generateSSEEvent(data) {
    return `data: ${JSON.stringify(data)}\n\n`
  }
}

// 延迟工具函数
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// 导出工厂函数
export function createOpenAI(config) {
  return new MockOpenAI(config)
} 