/**
 * @fileoverview 思源配置的非流式AI对话工具
 * @description 提供基于思源笔记配置的非流式AI对话功能,适用于不需要流式响应的场景
 */

import { getOpenAICompatConfig } from './useSiyuanAI.js';

/**
 * 发送非流式AI请求
 * 
 * @param {Object} options - 请求选项
 * @param {Array} options.messages - 消息数组
 * @param {Object} customOptions - 可选的自定义配置选项
 * @param {Object} sourceOptions - 配置来源选项
 * @returns {Promise<Object>} 响应对象
 */
export async function computeNormalAIRequest(options, customOptions = {}, sourceOptions = {}) {
  // 获取思源兼容配置
  const siyuanConfig = await getOpenAICompatConfig(sourceOptions);
  
  // 合并自定义选项
  const mergedConfig = {
    ...siyuanConfig,
    ...customOptions,
    stream: false // 确保非流式请求
  };
  
  const { apiKey, model, endpoint, headers, temperature, max_tokens } = mergedConfig;
  
  // 验证必要参数
  if (!apiKey) {
    throw new Error('API密钥不能为空');
  }
  
  // 构建请求体
  const requestBody = {
    model: model,
    messages: options.messages,
    temperature: temperature || 0.7,
    max_tokens: max_tokens || 2048,
    stream: false
  };
  
  // 发送请求
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI请求失败: ${response.status} ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('AI请求出错:', error);
    throw error;
  }
}

/**
 * 使用思源配置进行非流式AI对话
 * 
 * @param {Array} messages - 消息数组
 * @param {Object} customOptions - 可选的自定义配置选项
 * @param {Object} sourceOptions - 配置来源选项
 * @returns {Promise<string>} AI回复内容
 */
export async function computeNormalAIChat(messages, customOptions = {}, sourceOptions = {}) {
  const response = await computeNormalAIRequest({ messages }, customOptions, sourceOptions);
  
  if (response.choices && response.choices.length > 0) {
    return response.choices[0].message.content;
  }
  
  return '';
}

/**
 * 使用思源配置进行非流式单轮AI对话
 * 
 * @param {string} prompt - 用户输入
 * @param {string} systemPrompt - 系统提示词
 * @param {Object} customOptions - 可选的自定义配置选项
 * @param {Object} sourceOptions - 配置来源选项
 * @returns {Promise<string>} AI回复内容
 */
export async function computeNormalAIPrompt(prompt, systemPrompt = '', customOptions = {}, sourceOptions = {}) {
  const messages = [];
  
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  
  messages.push({ role: 'user', content: prompt });
  
  return computeNormalAIChat(messages, customOptions, sourceOptions);
}

/**
 * 创建基于思源配置的简单AI对话管理器
 * 
 * @param {Object} customOptions - 可选的自定义配置选项
 * @param {Object} sourceOptions - 配置来源选项
 * @returns {Promise<Object>} 对话管理器对象
 */
export async function createSimpleAIChat(customOptions = {}, sourceOptions = {}) {
  // 获取思源兼容配置
  const siyuanConfig = await getOpenAICompatConfig(sourceOptions);
  
  // 合并自定义选项
  const mergedConfig = {
    ...siyuanConfig,
    ...customOptions,
    stream: false // 确保非流式请求
  };
  
  // 创建对话历史
  const messages = [];
  
  return {
    /**
     * 添加系统提示信息
     * @param {string} systemPrompt - 系统提示内容
     * @returns {Object} 对话管理器实例
     */
    addSystemPrompt(systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
      return this;
    },
    
    /**
     * 添加用户消息
     * @param {string} content - 用户消息内容
     * @returns {Object} 对话管理器实例
     */
    addUserMessage(content) {
      messages.push({ role: 'user', content: content });
      return this;
    },
    
    /**
     * 添加助手消息
     * @param {string} content - 助手消息内容
     * @returns {Object} 对话管理器实例
     */
    addAssistantMessage(content) {
      messages.push({ role: 'assistant', content: content });
      return this;
    },
    
    /**
     * 发送当前对话并获取回复
     * @returns {Promise<string>} AI回复内容
     */
    async sendChat() {
      const response = await computeNormalAIRequest({ messages }, mergedConfig, sourceOptions);
      
      if (response.choices && response.choices.length > 0) {
        const content = response.choices[0].message.content;
        messages.push({ role: 'assistant', content: content });
        return content;
      }
      
      return '';
    },
    
    /**
     * 获取当前对话历史
     * @returns {Array} 对话历史
     */
    getMessages() {
      return [...messages];
    },
    
    /**
     * 清空对话历史
     */
    clearMessages() {
      messages.length = 0;
    }
  };
} 