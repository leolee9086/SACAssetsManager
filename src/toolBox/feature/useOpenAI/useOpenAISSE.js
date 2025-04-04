/**
 * @fileoverview OpenAI SSE 流式处理工具
 * @description 提供对OpenAI和兼容API的SSE流式处理功能
 */

import { 解析SSE事件 } from '../../base/forNetWork/forSSE/parseEvents.js'
import { 是有效流 } from '../../base/forNetWork/forSSE/validateStream.js'
import { 分割缓冲区 } from '../../base/forNetWork/forSSE.js'
import { 查找差异索引 } from '../../base/useEcma/forString/forDiff.js'
import { 标准化openAI兼容配置 } from './forOpenAIConfig.js'
import { getChatCompletionsEndpoint } from './defaultEndpoints.js'
// ===== 核心功能函数 =====

/**
 * 创建新的OpenAI SSE提供者状态
 * @param {Object} config - OpenAI配置选项
 * @returns {Object} 提供者状态对象
 */
function createProviderState(config = {}) {
  return {
    config: 标准化openAI兼容配置(config),
    abortController: new AbortController(),
    _hasSeenReasoningContent: false,
    _lastFullContent: null
  }
}

/**
 * 发送OpenAI请求
 * @param {Object} state - 提供者状态
 * @param {Array} messages - 消息数组
 * @returns {Promise<Array>} 包含响应和读取器的数组
 */
async function 发送请求(state, messages, endpoint) {
  console.log(state, messages, endpoint)
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: state.config.headers,
    body: JSON.stringify({
      model: state.config.model,
      messages,
      temperature: state.config.temperature,
      max_tokens: state.config.max_tokens,
      stream: true
    }),
    signal: state.abortController.signal
  })
  console.log(response)
  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`HTTP ${response.status}: ${errorBody.slice(0, 200)}`)
  }
  console.log(response.body)      
  const reader = response.body.getReader()
  console.log(reader)
  return [response, reader]
}

/**
 * 处理思考内容
 * @param {Object} state - 提供者状态
 * @param {string} content - 思考内容
 * @returns {Object} 处理后的delta对象
 */
function 处理思考内容(state, content) {
  content = content || ''
  if (content && !state._hasSeenReasoningContent) {
    content = `<think>${content}`
    state._hasSeenReasoningContent = true
  }
  console.log('Reasoning content:', content) // 调试日志
  return { content }
}

/**
 * 处理普通内容
 * @param {Object} state - 提供者状态
 * @param {string} content - 普通内容
 * @returns {Object} 处理后的delta对象
 */
function 处理普通内容(state, content) {
  content = content || ''
  // 在第一个普通 content 前添加 </think> 和换行
  if (state._hasSeenReasoningContent) {
    content = `</think>\n${content}`
    state._hasSeenReasoningContent = false
  }
  console.log('Normal content:', content) // 调试日志
  return { content }
}

/**
 * 处理增量Delta响应
 * @param {Object} state - 提供者状态
 * @param {Object} data - 响应数据
 * @param {Object} baseEvent - 基础事件对象
 * @returns {Object} 格式化后的事件对象
 */
function 处理增量Delta响应(state, data, baseEvent) {
  const choice = data.choices[0]
  const formattedChoice = {
    index: 0,
    finish_reason: choice.finish_reason
  }

  if (choice.delta._isFull && state._lastFullContent && choice.delta.content) {
    const diffStartIndex = 查找差异索引(state._lastFullContent, choice.delta.content)
    const newContent = choice.delta.content.slice(diffStartIndex)
    choice.delta.content = newContent
    state._lastFullContent = choice.delta.content
  } else if (choice.delta._isFull) {
    state._lastFullContent = choice.delta.content || ''
  }

  // 处理 reasoning_content
  if (choice.delta.reasoning_content !== undefined && choice.delta.reasoning_content !== null) {
    formattedChoice.delta = 处理思考内容(state, choice.delta.reasoning_content)
  }
  // 处理普通 content
  else if (choice.delta.content !== undefined) {
    formattedChoice.delta = 处理普通内容(state, choice.delta.content)
  }

  return {
    ...baseEvent,
    object: 'chat.completion.chunk',
    choices: [formattedChoice]
  }
}

/**
 * 处理标准响应
 * @param {Object} data - 响应数据
 * @param {Object} baseEvent - 基础事件对象
 * @returns {Object} 格式化后的事件对象
 */
function 处理标准响应(data, baseEvent) {
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

/**
 * 格式化为OpenAI事件
 * @param {Object} state - 提供者状态
 * @param {Object} data - 事件数据
 * @param {string} msgId - 消息ID
 * @returns {Object} 格式化后的事件对象
 */
function formatToOpenAIEvent(state, data, msgId) {
  if (!data) return null

  const baseEvent = {
    id: msgId,
    created: Math.floor(Date.now() / 1000),
    model: state.config.model,
    system_fingerprint: 'ai_service_1'
  }

  // 使用专门函数处理不同类型的响应
  if (data.choices?.[0]?.delta) {
    return 处理增量Delta响应(state, data, baseEvent)
  }

  // 处理其他格式
  if (data.choices) {
    return 处理标准响应(data, baseEvent)
  }

  return null
}

/**
 * 处理数据块
 * @param {Object} state - 提供者状态
 * @param {string} chunk - 数据块
 * @param {string} msgId - 消息ID
 * @returns {Object} 处理后的事件对象
 */
function processChunk(state, chunk, msgId) {
  const eventData = 解析SSE事件(chunk)
  return eventData ? formatToOpenAIEvent(state, eventData, msgId) : null
}

/**
 * 批量处理数据块
 * @param {Object} state - 提供者状态
 * @param {Array} chunks - 数据块数组
 * @param {string} msgId - 消息ID
 * @returns {Array} 处理后的事件数组
 */
function 批量处理数据块(state, chunks, msgId) {
  const events = []
  for (const chunk of chunks) {
    if (chunk.startsWith('data: ')) {
      const event = processChunk(state, chunk, msgId)
      event && events.push(event)
    }
  }
  return events
}

/**
 * 生成网络请求错误事件
 * @param {Object} state - 提供者状态
 * @param {Error} error - 网络请求错误对象
 * @param {string} msgId - 消息ID
 * @returns {Object} 网络错误事件对象
 * @description 此函数仅用于处理网络请求类错误，包括HTTP错误、连接错误、响应流错误等
 */
function generateErrorEvent(state, error, msgId,stack) {
  console.error(state, error, msgId,stack)
  return {
    id: msgId,
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model: state.config.model,
    system_fingerprint: 'ai_service_1',
    error: {
      code: 500,
      message: error.message,
      type: 'network_error',
      stack: stack
    },
    choices: []
  }
}

/**
 * 处理响应流
 * @param {Object} state - 提供者状态
 * @param {ReadableStreamDefaultReader} reader - 读取器
 * @param {string} msgId - 消息ID
 * @yields {Object} 处理后的事件对象
 */
async function* 处理响应流(state, reader, msgId) {
  const CHUNK_DELIMITER = '\n\n'
  const TEXT_DECODER = new TextDecoder()
  let buffer = ''
  let pendingYield = Promise.resolve()
    console.log(state, reader, msgId)

  do {
    const { done, value } = await reader.read()
    if (done) break

    buffer += TEXT_DECODER.decode(value, { stream: true })

    // 高效分割处理块
    let chunks
    [chunks, buffer] = 分割缓冲区(buffer, CHUNK_DELIMITER)

    // 批量处理并生成事件
    const events = 批量处理数据块(state, chunks, msgId)

    // 批量yield并添加调度间隙
    if (events.length) {
      await pendingYield
      for (const event of events) {
        yield event
        pendingYield = new Promise(resolve =>
          setTimeout(resolve, state.config.chunkInterval || 0)
        )
      }
    }
  } while (true)

  // 处理最终残留数据
  if (buffer) {
    const event = processChunk(state, buffer, msgId)
    event && (yield event)
  }
}

/**
 * 创建聊天完成流
 * @param {Object} provider - 提供者状态
 * @param {Array} messages - 消息数组
 * @yields {Object} 聊天完成事件
 */
async function* createChatCompletion(provider, messages) {
  provider._hasSeenReasoningContent = false
  const msgId = `chatcmpl-${Date.now()}`
  let response
  let reader = null
  let endpoint = getChatCompletionsEndpoint(provider.config.apiBaseURL)
  let result = await 发送请求(provider, messages, endpoint)
  response = result[0]
  reader = result[1]
 
  if (!是有效流(response.body)) {
    throw new Error('无效的响应流')
  }
  yield* 处理响应流(provider, reader, msgId)

}

/**
 * 中止请求
 * @param {Object} state - 提供者状态
 */
function abort(state) {
  state.abortController.abort()
}

// ===== SSE会话函数 =====

/**
 * 创建会话状态
 * @param {Object} providerConfig - 提供者配置
 * @returns {Object} 会话状态
 */
function createConversationState(providerConfig = {}) {
  return {
    provider: createProviderState({
      apiKey: providerConfig.apiKey,
      apiBaseURL: providerConfig.apiBaseURL,
      model: providerConfig.model || providerConfig.apiModel,
      temperature: providerConfig.temperature,
      max_tokens: providerConfig.max_tokens || providerConfig.apiMaxTokens,
      chunkInterval: providerConfig.chunkInterval
    }),
    messages: []
  }
}

/**
 * 添加系统消息
 * @param {Object} state - 会话状态
 * @param {string} prompt - 系统提示
 * @returns {Object} 更新后的状态
 */
function addAsSystem(state, prompt) {
  state.messages.push({
    role: 'system',
    content: prompt
  })
  return state
}

/**
 * 处理聊天响应流
 * @param {Object} state - 会话状态
 * @param {string} fullResponse - 完整响应
 * @yields {Object} 处理后的响应对象
 */
async function* 处理聊天响应流(state, fullResponse) {
  for await (const chunk of createChatCompletion(state.provider, state.messages)) {
    // 如果是网络错误生成的错误事件，直接抛出异常
    if (chunk.error) throw new Error(chunk.error.message)

    const content = chunk.choices[0]?.delta?.content || ''
    fullResponse += content

    // 实时返回增量内容
    yield {
      partial: content,
      chunk: chunk,
      full: fullResponse
    }
  }

  state.messages.push({ role: 'assistant', content: fullResponse })
}

/**
 * 流式发送用户消息
 * @param {Object} state - 会话状态
 * @param {string} message - 用户消息
 * @yields {Object} 响应流
 */
async function* streamAsUser(state, message) {
  state.messages.push({ role: 'user', content: message })

  let fullResponse = ''
  yield* 处理聊天响应流(state, fullResponse)
}

/**
 * 发送用户消息并等待完整响应
 * @param {Object} state - 会话状态
 * @param {string} message - 用户消息
 * @returns {Promise<Object>} 完整响应
 */
async function postAsUser(state, message) {
  let full = ''
  for await (const { full: response } of streamAsUser(state, message)) {
    full = response
  }
  return { choices: [{ message: { content: full, role: 'assistant' } }] }
}

/**
 * 批量发送消息
 * @param {Object} state - 会话状态
 * @param {Array} messages - 消息数组
 * @returns {Promise<Object>} 完整响应
 */
async function postBatch(state, messages) {
  state.messages = state.messages.concat(messages)
  let fullResponse = ''

  try {
    for await (const chunk of createChatCompletion(state.provider, state.messages)) {
      // 检查是否是网络错误事件
      if (chunk.error) {
        throw new Error(`网络请求错误: ${chunk.error.message}`)
      }
      const content = chunk.choices[0]?.delta?.content || ''
      fullResponse += content
    }

    state.messages.push({
      role: 'assistant',
      content: fullResponse
    })

    return {
      choices: [{
        message: {
          content: fullResponse,
          role: 'assistant'
        }
      }]
    }
  } catch (error) {
    console.error('Batch message error:', error)
    throw error
  }
}

/**
 * 获取单次完成响应
 * @param {Object} state - 会话状态
 * @param {Object} options - 请求选项
 * @returns {Promise<Object>} 完整响应
 */
async function getCompletion(state, { messages }) {
  try {
    // 重置消息历史，只使用当前请求的消息
    state.messages = [...messages]

    let fullResponse = ''
    for await (const chunk of createChatCompletion(state.provider, state.messages)) {
      // 检查是否是网络错误事件
      if (chunk.error) {
        throw new Error(`网络请求错误: ${chunk.error.message}`)
      }
      const content = chunk.choices[0]?.delta?.content || ''
      fullResponse += content
    }

    // 不保存到消息历史，因为这是单次完成请求
    return {
      content: fullResponse,
      role: 'assistant'
    }
  } catch (error) {
    console.error('AI completion error:', error)
    throw error
  }
}

/**
 * 刷新缓冲区
 * @param {Array} buffer - 缓冲区数组
 * @returns {Object|null} 刷新后的内容
 */
function 刷新缓冲区(buffer) {
  if (buffer.length > 0) {
    const content = buffer.join('')
    return { content }
  }
  return null
}

/**
 * 处理SSE完成流
 * @param {Object} state - 会话状态
 * @yields {Object} 处理后的响应对象
 */
async function* 处理SSE完成流(state) {
  let buffer = []

  for await (const chunk of createChatCompletion(state.provider, state.messages)) {
    // 如果是网络错误生成的错误事件，直接抛出异常
    if (chunk.error) throw new Error(chunk.error.message)

    const content = chunk.choices[0]?.delta?.content || ''
    buffer.push(content)

    if (content.includes('\n') || buffer.length > 3) {
      const flushed = 刷新缓冲区(buffer)
      buffer = []
      if (flushed) yield flushed
    }
  }

  // 处理剩余内容
  if (buffer.length > 0) {
    const finalContent = 刷新缓冲区(buffer)
    if (finalContent) yield finalContent
  }
}

/**
 * 获取SSE流式响应
 * @param {Object} state - 会话状态
 * @param {Object} options - 请求选项
 * @yields {Object} SSE流式响应
 */
async function* getSSECompletion(state, { messages }) {
  try {
    state.messages = [...messages]
    yield* 处理SSE完成流(state)
  } catch (error) {
    console.error('SSE completion error:', error)
    throw error
  }
}

/**
 * 设置会话配置
 * @param {Object} state - 会话状态
 * @param {Object} newConfig - 新配置
 */
function setConversationConfig(state, newConfig) {
  state.provider.config = {
    ...state.provider.config,
    ...newConfig
  }
}

// ===== Prompt Streamer 函数 =====

/**
 * 创建Prompt Streamer状态
 * @param {Object} providerConfig - 提供者配置
 * @param {string} systemPrompt - 系统提示
 * @returns {Object} Prompt Streamer状态
 */
function createStreamerState(providerConfig = {}, systemPrompt = '') {
  return {
    provider: createProviderState({
      apiKey: providerConfig.apiKey,
      apiBaseURL: providerConfig.apiBaseURL,
      model: providerConfig.apiModel,
      temperature: providerConfig.temperature,
      max_tokens: providerConfig.apiMaxTokens,
      chunkInterval: providerConfig.chunkInterval
    }),
    systemPrompt
  }
}

/**
 * 创建带系统提示的原始SSE流
 * @param {Object} state - Prompt Streamer状态
 * @param {Array} messages - 单次对话消息数组
 * @yields {Object} 原始SSE事件对象
 */
async function* createStream(state, messages) {
  const mergedMessages = [
    { role: 'system', content: state.systemPrompt },
    ...messages.filter(m => m.role !== 'system')
  ]

  yield* createChatCompletion(state.provider, mergedMessages)
}

/**
 * 设置系统提示词
 * @param {Object} state - Prompt Streamer状态
 * @param {string} newPrompt - 新的系统级提示词
 */
function setSystemPrompt(state, newPrompt) {
  state.systemPrompt = newPrompt
}

// ===== 兼容层：类接口 =====

/**
 * AISSEProvider类 - 提供兼容层
 */
export class AISSEProvider {
  constructor(config = {}) {
    const state = createProviderState(config)
    Object.assign(this, state)

    // 绑定方法
    this.createChatCompletion = (messages) => createChatCompletion(this, messages)
    this.abort = () => abort(this)

    // 内部方法
    this._发送请求 = (messages) => 发送请求(this, messages)
    this._处理响应流 = (reader, msgId) => 处理响应流(this, reader, msgId)
    this._批量处理数据块 = (chunks, msgId) => 批量处理数据块(this, chunks, msgId)
    this._processChunk = (chunk, msgId) => processChunk(this, chunk, msgId)
    this._formatToOpenAIEvent = (data, msgId) => formatToOpenAIEvent(this, data, msgId)
    this._处理增量Delta响应 = (data, baseEvent) => 处理增量Delta响应(this, data, baseEvent)
    this._处理标准响应 = (data, baseEvent) => 处理标准响应(data, baseEvent)
    this._处理思考内容 = (content) => 处理思考内容(this, content)
    this._处理普通内容 = (content) => 处理普通内容(this, content)
    this._generateErrorEvent = (error, msgId) => generateErrorEvent(this, error, msgId)
  }
}

/**
 * AISSEConversation类 - 提供兼容层
 */
export class AISSEConversation {
  constructor(providerConfig = {}) {
    const state = createConversationState(providerConfig)
    Object.assign(this, state)

    // 绑定方法
    this.addAsSystem = (prompt) => {
      addAsSystem(this, prompt)
      return this
    }
    this.postAsUser = (message) => postAsUser(this, message)
    this.postBatch = (messages) => postBatch(this, messages)
    this.streamAsUser = (message) => streamAsUser(this, message)
    this.getCompletion = (options) => getCompletion(this, options)
    this.getSSECompletion = (options) => getSSECompletion(this, options)
    this.setConfig = (newConfig) => setConversationConfig(this, newConfig)

    // 内部方法
    this._处理聊天响应流 = (fullResponse) => 处理聊天响应流(this, fullResponse)
    this._处理SSE完成流 = () => 处理SSE完成流(this)
    this._刷新缓冲区 = (buffer) => 刷新缓冲区(buffer)
  }
}

/**
 * SSEPromptStreamer类 - 提供兼容层
 */
export class SSEPromptStreamer {
  constructor(providerConfig = {}, systemPrompt = '') {
    const state = createStreamerState(providerConfig, systemPrompt)
    Object.assign(this, state)

    // 绑定方法
    this.createStream = (messages) => createStream(this, messages)
    this.setSystemPrompt = (newPrompt) => setSystemPrompt(this, newPrompt)
  }
}

// 工厂函数
export function createAISSEProvider(config) {
  const state = createProviderState(config)

  return {
    ...state,
    createChatCompletion: (messages) => createChatCompletion(state, messages),
    abort: () => abort(state)
  }
}

// 更新工厂函数名称
export function createPromptStreamer(config, systemPrompt = '') {
  const state = createStreamerState(config, systemPrompt)

  return {
    ...state,
    createStream: (messages) => createStream(state, messages),
    setSystemPrompt: (newPrompt) => setSystemPrompt(state, newPrompt)
  }
}
