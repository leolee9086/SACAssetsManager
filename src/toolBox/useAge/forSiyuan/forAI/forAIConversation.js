/**
 * @fileoverview 思源配置的AI对话管理工具
 * @description 提供基于思源笔记配置的AI对话状态管理功能
 */

import { AISSEConversation } from '../../../feature/useOpenAI/useOpenAISSE.js';
import { getOpenAICompatConfig } from './useSiyuanAI.js';

/**
 * 创建基于思源配置的AI对话管理器
 * 
 * @param {Object} customOptions - 可选的自定义配置选项
 * @param {Object} sourceOptions - 配置来源选项,用于指定从本地或远程获取思源配置
 * @returns {Promise<Object>} 对话管理器对象
 */
export async function createSiyuanAIConversation(customOptions = {}, sourceOptions = {}) {
  // 获取思源兼容配置
  const siyuanConfig = await getOpenAICompatConfig(sourceOptions);
  
  // 合并自定义选项
  const mergedConfig = {
    ...siyuanConfig,
    ...customOptions
  };
  
  // 创建AI对话实例
  const conversation = new AISSEConversation(mergedConfig);
  
  // 创建对话历史
  const history = [];
  
  return {
    /**
     * 添加系统提示信息
     * @param {string} systemPrompt - 系统提示内容
     * @returns {Object} 对话管理器实例
     */
    addSystemPrompt(systemPrompt) {
      conversation.addAsSystem(systemPrompt);
      history.push({ role: 'system', content: systemPrompt });
      return this;
    },
    
    /**
     * 发送用户消息并获取AI回复
     * @param {string} userMessage - 用户消息内容
     * @returns {Promise<string>} AI回复内容
     */
    async sendMessage(userMessage) {
      history.push({ role: 'user', content: userMessage });
      
      let fullResponse = '';
      try {
        for await (const { partial } of conversation.streamAsUser(userMessage)) {
          fullResponse += partial;
        }
        
        history.push({ role: 'assistant', content: fullResponse });
        return fullResponse;
      } catch (error) {
        console.error('AI对话出错:', error);
        throw error;
      }
    },
    
    /**
     * 流式发送用户消息并获取AI回复
     * @param {string} userMessage - 用户消息内容
     * @returns {AsyncGenerator} 流式回复生成器
     */
    async *streamMessage(userMessage) {
      history.push({ role: 'user', content: userMessage });
      
      let fullResponse = '';
      try {
        for await (const { partial, full } of conversation.streamAsUser(userMessage)) {
          fullResponse = full;
          yield { partial, full };
        }
        
        history.push({ role: 'assistant', content: fullResponse });
      } catch (error) {
        console.error('AI流式对话出错:', error);
        throw error;
      }
    },
    
    /**
     * 获取当前对话历史
     * @returns {Array} 对话历史
     */
    getHistory() {
      return [...history];
    },
    
    /**
     * 清空对话历史
     */
    clearHistory() {
      conversation.messages = [];
      history.length = 0;
    },
    
    /**
     * 更新配置
     * @param {Object} newConfig - 新配置选项
     */
    updateConfig(newConfig) {
      conversation.setConfig(newConfig);
    },
    
    /**
     * 获取原始对话实例
     * @returns {AISSEConversation} 原始对话实例
     */
    getRawConversation() {
      return conversation;
    }
  };
}

/**
 * 使用思源配置创建简单对话,仅进行单轮对话
 * 
 * @param {string} prompt - 用户输入
 * @param {string} systemPrompt - 系统提示词
 * @param {Object} customOptions - 可选的自定义配置选项
 * @param {Object} sourceOptions - 配置来源选项
 * @returns {Promise<string>} AI回复内容
 */
export async function computeSiyuanSingleChat(prompt, systemPrompt = '', customOptions = {}, sourceOptions = {}) {
  const conversation = await createSiyuanAIConversation(customOptions, sourceOptions);
  
  if (systemPrompt) {
    conversation.addSystemPrompt(systemPrompt);
  }
  
  return conversation.sendMessage(prompt);
}

/**
 * 使用思源配置创建流式单轮对话
 * 
 * @param {string} prompt - 用户输入
 * @param {string} systemPrompt - 系统提示词
 * @param {Object} customOptions - 可选的自定义配置选项
 * @param {Object} sourceOptions - 配置来源选项
 * @returns {AsyncGenerator} 流式回复生成器
 */
export async function* fromSiyuanStreamChat(prompt, systemPrompt = '', customOptions = {}, sourceOptions = {}) {
  const conversation = await createSiyuanAIConversation(customOptions, sourceOptions);
  
  if (systemPrompt) {
    conversation.addSystemPrompt(systemPrompt);
  }
  
  yield* conversation.streamMessage(prompt);
} 