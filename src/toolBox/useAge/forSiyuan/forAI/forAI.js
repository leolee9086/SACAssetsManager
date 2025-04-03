/**
 * @fileoverview 思源AI工具统一入口
 * @description 提供对所有思源AI相关功能的集中导出
 */

// 导出配置相关函数
export {
  getSiyuanAIConfig,
  computeConfigWithCustomOptions,
  computeConfigWithModel,
  computeConfigWithAPICredentials,
  computeConfigWithTargetLang,
  clearConfigCache,
  getOpenAICompatConfig
} from './useSiyuanAI.js';

// 导出SSE流式聊天功能
export {
  createSiyuanSSEProvider,
  createSiyuanSSEConversation,
  createSiyuanPromptStreamer,
  fromSiyuanSSEChat,
  fromSiyuanSSEPrompt,
  computeSSEFullResponse,
  computeSyncAIResponse,
  computeSyncAIPrompt
} from './forSSEChat.js';

// 导出AI对话管理功能
export {
  createSiyuanAIConversation,
  computeSiyuanSingleChat,
  fromSiyuanStreamChat
} from './forAIConversation.js';

// 导出非流式AI对话功能
export {
  computeNormalAIRequest,
  computeNormalAIChat,
  computeNormalAIPrompt,
  createSimpleAIChat
} from './forNormalChat.js';

// 导出思源AI计算工具中的公共函数
export {
  API_CONSTANTS,
  computeMergedObject,
  computeCacheKey,
  createApiConfig,
  createCredentialOptions
} from './computeSiyuanAI.js';

// 常量定义
export const SOURCE_TYPE = {
  LOCAL: 'local',
  REMOTE: 'remote'
}; 