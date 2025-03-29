/**
 * 聊天消息创建工具
 * 提供创建各种类型聊天消息的功能
 */

/**
 * 创建标准格式的聊天消息对象
 * @param {string} type 消息类型 (user|assistant|system|error|vote|consensus)
 * @param {string} content 消息内容
 * @param {Object} [options] 附加选项
 * @param {string} [options.status='default'] 消息状态
 * @param {Object} [options.meta={}] 元数据
 * @param {string|number} [options.id] 自定义ID
 * @param {number} [options.timestamp] 自定义时间戳
 * @returns {Object} 格式化的消息对象
 */
export function 创建消息(type, content, options = {}) {
  const { 
    status = 'default', 
    meta = {}, 
    id = Symbol('msg_' + Date.now()), 
    timestamp = Date.now() 
  } = options;
  
  return {
    id,
    type,
    content,
    status,
    timestamp,
    meta
  };
}

/**
 * 创建用户消息
 * @param {string} content 消息内容
 * @param {Object} [options] 附加选项
 * @returns {Object} 用户消息对象
 */
export function 创建用户消息(content, options = {}) {
  return 创建消息('user', content, options);
}

/**
 * 创建系统消息
 * @param {string} content 消息内容
 * @param {Object} [options] 附加选项
 * @returns {Object} 系统消息对象
 */
export function 创建系统消息(content, options = {}) {
  return 创建消息('system', content, options);
}

/**
 * 创建AI助手消息
 * @param {string} content 消息内容
 * @param {Object} [options] 附加选项
 * @returns {Object} 助手消息对象
 */
export function 创建助手消息(content, options = {}) {
  return 创建消息('assistant', content, options);
}

/**
 * 创建错误消息
 * @param {string} content 错误内容
 * @param {Object} [options] 附加选项
 * @returns {Object} 错误消息对象
 */
export function 创建错误消息(content, options = {}) {
  const 合并选项 = {
    status: 'error',
    ...options
  };
  return 创建消息('error', content, 合并选项);
}

/**
 * 创建流式消息
 * @param {Object} [options] 附加选项
 * @returns {Object} 流式消息对象
 */
export function 创建流式消息(options = {}) {
  const 合并选项 = {
    status: 'pending',
    meta: { progress: 0, ...options.meta },
    ...options
  };
  return 创建消息('sse_stream', '', 合并选项);
}

/**
 * 创建投票消息
 * @param {Array} scores 评分数组
 * @param {string} conclusion 结论
 * @param {Object} [options] 附加选项
 * @returns {Object} 投票消息对象
 */
export function 创建投票消息(scores, conclusion, options = {}) {
  const 合并选项 = {
    meta: { scores, conclusion, ...options.meta },
    ...options
  };
  return 创建消息('vote', '', 合并选项);
}

/**
 * 创建共识消息
 * @param {string} content 共识内容
 * @param {Object} [options] 附加选项
 * @returns {Object} 共识消息对象
 */
export function 创建共识消息(content, options = {}) {
  const 合并选项 = {
    meta: { source: 'consensus', ...options.meta },
    ...options
  };
  return 创建消息('consensus', content, 合并选项);
}

// 为保持兼容性提供英文命名的别名
export const createMessage = 创建消息;
export const createUserMessage = 创建用户消息;
export const createSystemMessage = 创建系统消息;
export const createAssistantMessage = 创建助手消息;
export const createErrorMessage = 创建错误消息;
export const createStreamMessage = 创建流式消息;
export const createVoteMessage = 创建投票消息;
export const createConsensusMessage = 创建共识消息; 