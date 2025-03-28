/**
 * @fileoverview OpenAI SSE 流式处理工具
 * @description 提供对OpenAI和兼容API的SSE流式处理功能
 */

import { 解析SSE事件 } from '../../base/forNetWork/forSSE/parseEvents.js'
import { 是有效流 } from '../../base/forNetWork/forSSE/validateStream.js'
import { 分割缓冲区 } from '../../base/forNetWork/forSSE.js'
import { 查找差异索引 } from '../../base/useEcma/forString/forDiff.js'
import { 标准化openAI兼容配置 } from './forOpenAIConfig.js'


export class AISSEProvider {
  constructor(config = {}) {
    this.config = 标准化openAI兼容配置(config)
    this.abortController = new AbortController()
    this._hasSeenReasoningContent = false
    this._lastFullContent = null
  }

  async *createChatCompletion(messages) {
    this._hasSeenReasoningContent = false
    const msgId = `chatcmpl-${Date.now()}`
    let response
    let reader = null
    
    try {
      [response, reader] = await this._发送请求(messages)
      if (!是有效流(response.body)) {
        throw new Error('无效的响应流')
      }
      yield* this._处理响应流(reader, msgId)
    } catch (e) {
      yield this._generateErrorEvent(e, msgId)
      throw e
    } finally {
      reader?.releaseLock()
    }
  }

  async _发送请求(messages) {
    const response = await fetch(this.config.endpoint, {
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

    const reader = response.body.getReader()
    return [response, reader]
  }

  async *_处理响应流(reader, msgId) {
    const CHUNK_DELIMITER = '\n\n'
    const TEXT_DECODER = new TextDecoder()
    let buffer = ''
    let pendingYield = Promise.resolve()

    do {
      const { done, value } = await reader.read()
      if (done) break

      buffer += TEXT_DECODER.decode(value, { stream: true })
      
      // 高效分割处理块
      let chunks
      [chunks, buffer] = 分割缓冲区(buffer, CHUNK_DELIMITER)

      // 批量处理并生成事件
      const events = this._批量处理数据块(chunks, msgId)

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
  }

  _批量处理数据块(chunks, msgId) {
    const events = []
    for (const chunk of chunks) {
      if (chunk.startsWith('data: ')) {
        const event = this._processChunk(chunk, msgId)
        event && events.push(event)
      }
    }
    return events
  }

  _processChunk(chunk, msgId) {
    const eventData = 解析SSE事件(chunk)
    return eventData ? this._formatToOpenAIEvent(eventData, msgId) : null
  }

  _formatToOpenAIEvent(data, msgId) {
    if (!data) return null

    const baseEvent = {
      id: msgId,
      created: Math.floor(Date.now()/1000),
      model: this.config.model,
      system_fingerprint: 'ai_service_1'
    }

    // 使用专门函数处理不同类型的响应
    if (data.choices?.[0]?.delta) {
      return this._处理增量Delta响应(data, baseEvent)
    }

    // 处理其他格式
    if (data.choices) {
      return this._处理标准响应(data, baseEvent)
    }

    return null
  }

  _处理增量Delta响应(data, baseEvent) {
    const choice = data.choices[0]
    const formattedChoice = {
      index: 0,
      finish_reason: choice.finish_reason
    }

    if (choice.delta._isFull && this._lastFullContent && choice.delta.content) {
      const diffStartIndex = 查找差异索引(this._lastFullContent, choice.delta.content)
      const newContent = choice.delta.content.slice(diffStartIndex)
      choice.delta.content = newContent
      this._lastFullContent = choice.delta.content
    } else if (choice.delta._isFull) {
      this._lastFullContent = choice.delta.content || ''
    }

    // 处理 reasoning_content
    if (choice.delta.reasoning_content !== undefined && choice.delta.reasoning_content !== null) {
      formattedChoice.delta = this._处理思考内容(choice.delta.reasoning_content)
    } 
    // 处理普通 content
    else if (choice.delta.content !== undefined) {
      formattedChoice.delta = this._处理普通内容(choice.delta.content)
    }

    return {
      ...baseEvent,
      object: 'chat.completion.chunk',
      choices: [formattedChoice]
    }
  }

  _处理思考内容(content) {
    content = content || ''
    if (content && !this._hasSeenReasoningContent) {
      content = `<think>${content}`
      this._hasSeenReasoningContent = true
    }
    console.log('Reasoning content:', content) // 调试日志
    return { content }
  }

  _处理普通内容(content) {
    content = content || ''
    // 在第一个普通 content 前添加 </think> 和换行
    if (this._hasSeenReasoningContent) {
      content = `</think>\n${content}`
      this._hasSeenReasoningContent = false
    }
    console.log('Normal content:', content) // 调试日志
    return { content }
  }

  _处理标准响应(data, baseEvent) {
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
      endpoint: providerConfig.endpoint || providerConfig.apiBaseURL,
      model: providerConfig.model || providerConfig.apiModel,
      temperature: providerConfig.temperature,
      max_tokens: providerConfig.max_tokens || providerConfig.apiMaxTokens,
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
    yield* this._处理聊天响应流(fullResponse);
  }

  async *_处理聊天响应流(fullResponse) {
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

  async getCompletion({ messages }) {
    try {
      // 重置消息历史，只使用当前请求的消息
      this.messages = [...messages];
      
      let fullResponse = '';
      for await (const chunk of this.provider.createChatCompletion(this.messages)) {
        if (chunk.error) {
          throw new Error(chunk.error.message);
        }
        const content = chunk.choices[0]?.delta?.content || '';
        fullResponse += content;
      }
      
      // 不保存到消息历史，因为这是单次完成请求
      return {
        content: fullResponse,
        role: 'assistant'
      };
    } catch (error) {
      console.error('AI completion error:', error);
      throw error;
    }
  }

  /**
   * 获取SSE流式响应
   * @param {Object} options - 请求选项
   * @param {Array} options.messages - 消息数组
   * @returns {AsyncGenerator} SSE流式响应
   */
  async *getSSECompletion({ messages }) {
    try {
      this.messages = [...messages];
      yield* this._处理SSE完成流();
    } catch (error) {
      console.error('SSE completion error:', error);
      throw error;
    }
  }

  async *_处理SSE完成流() {
    let buffer = [];
    
    for await (const chunk of this.provider.createChatCompletion(this.messages)) {
      if (chunk.error) throw new Error(chunk.error.message);
      
      const content = chunk.choices[0]?.delta?.content || '';
      buffer.push(content);
      
      if (content.includes('\n') || buffer.length > 3) {
        const flushed = this._刷新缓冲区(buffer);
        buffer = [];
        if (flushed) yield flushed;
      }
    }

    // 处理剩余内容
    if (buffer.length > 0) {
      const finalContent = this._刷新缓冲区(buffer);
      if (finalContent) yield finalContent;
    }
  }

  _刷新缓冲区(buffer) {
    if (buffer.length > 0) {
      const content = buffer.join('');
      return { content };
    }
    return null;
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
