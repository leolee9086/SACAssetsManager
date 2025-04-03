/**
 * @fileoverview 思源配置的OpenAI SSE流式聊天工具
 * @description 提供基于思源笔记配置的OpenAI及兼容API的SSE流式聊天功能
 */

import { AISSEProvider, AISSEConversation, SSEPromptStreamer } from '../../../feature/useOpenAI/useOpenAISSE.js';
import { getOpenAICompatConfig } from './useSiyuanAI.js';

/**
 * 创建基于思源配置的SSE提供器
 * 
 * @param {Object} customOptions - 可选的自定义配置选项
 * @param {Object} sourceOptions - 配置来源选项,用于指定从本地或远程获取思源配置
 * @returns {Promise<AISSEProvider>} SSE提供器实例
 */
export async function createSiyuanSSEProvider(customOptions = {}, sourceOptions = {}) {
  // 获取思源兼容配置
  const siyuanConfig = await getOpenAICompatConfig(sourceOptions);
  
  // 合并自定义选项
  const mergedConfig = {
    ...siyuanConfig,
    ...customOptions
  };
  
  return new AISSEProvider(mergedConfig);
}

/**
 * 创建基于思源配置的SSE对话
 * 
 * @param {Object} customOptions - 可选的自定义配置选项
 * @param {Object} sourceOptions - 配置来源选项,用于指定从本地或远程获取思源配置
 * @returns {Promise<AISSEConversation>} SSE对话实例
 */
export async function createSiyuanSSEConversation(customOptions = {}, sourceOptions = {}) {
  const siyuanConfig = await getOpenAICompatConfig(sourceOptions);
  
  const mergedConfig = {
    ...siyuanConfig,
    ...customOptions
  };
  
  return new AISSEConversation(mergedConfig);
}

/**
 * 创建基于思源配置的SSE提示流处理器
 * 
 * @param {string} systemPrompt - 系统提示词
 * @param {Object} customOptions - 可选的自定义配置选项
 * @param {Object} sourceOptions - 配置来源选项,用于指定从本地或远程获取思源配置
 * @returns {Promise<SSEPromptStreamer>} SSE提示流处理器实例
 */
export async function createSiyuanPromptStreamer(systemPrompt = '', customOptions = {}, sourceOptions = {}) {
  const siyuanConfig = await getOpenAICompatConfig(sourceOptions);
  
  const mergedConfig = {
    ...siyuanConfig,
    ...customOptions
  };
  
  return new SSEPromptStreamer(mergedConfig, systemPrompt);
}

/**
 * 使用思源配置进行流式聊天
 * 
 * @param {Array} messages - 消息数组
 * @param {Object} customOptions - 可选的自定义配置选项
 * @param {Object} sourceOptions - 配置来源选项
 * @returns {AsyncGenerator} 流式聊天响应生成器
 */
export async function* fromSiyuanSSEChat(messages, customOptions = {}, sourceOptions = {}) {
  const provider = await createSiyuanSSEProvider(customOptions, sourceOptions);
  
  try {
    yield* provider.createChatCompletion(messages);
  } catch (error) {
    console.error('思源SSE聊天出错:', error);
    throw error;
  }
}

/**
 * 使用思源配置处理单轮对话
 * 
 * @param {string} prompt - 用户输入
 * @param {string} systemPrompt - 系统提示词
 * @param {Object} customOptions - 可选的自定义配置选项
 * @param {Object} sourceOptions - 配置来源选项
 * @returns {AsyncGenerator} 流式聊天响应生成器
 */
export async function* fromSiyuanSSEPrompt(prompt, systemPrompt = '', customOptions = {}, sourceOptions = {}) {
  const messages = [
    systemPrompt ? { role: 'system', content: systemPrompt } : null,
    { role: 'user', content: prompt }
  ].filter(Boolean);
  
  yield* fromSiyuanSSEChat(messages, customOptions, sourceOptions);
}

/**
 * 收集SSE流式响应为单个字符串
 * 
 * @param {AsyncGenerator} sseGenerator - SSE生成器
 * @returns {Promise<string>} 完整响应内容
 */
export async function computeSSEFullResponse(sseGenerator) {
  let fullResponse = '';
  
  for await (const chunk of sseGenerator) {
    if (chunk.choices && chunk.choices.length > 0) {
      const content = chunk.choices[0]?.delta?.content || '';
      fullResponse += content;
    }
  }
  
  return fullResponse;
}

/**
 * 使用思源配置进行同步方式的AI对话
 * 
 * @param {Array} messages - 消息数组
 * @param {Object} customOptions - 可选的自定义配置选项
 * @param {Object} sourceOptions - 配置来源选项
 * @returns {Promise<string>} 完整响应内容
 */
export async function computeSyncAIResponse(messages, customOptions = {}, sourceOptions = {}) {
  return computeSSEFullResponse(fromSiyuanSSEChat(messages, customOptions, sourceOptions));
}

/**
 * 使用思源配置进行同步方式的单轮AI对话
 * 
 * @param {string} prompt - 用户输入
 * @param {string} systemPrompt - 系统提示词
 * @param {Object} customOptions - 可选的自定义配置选项
 * @param {Object} sourceOptions - 配置来源选项
 * @returns {Promise<string>} 完整响应内容
 */
export async function computeSyncAIPrompt(prompt, systemPrompt = '', customOptions = {}, sourceOptions = {}) {
  return computeSSEFullResponse(fromSiyuanSSEPrompt(prompt, systemPrompt, customOptions, sourceOptions));
} 