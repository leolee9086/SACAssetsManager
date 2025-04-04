/**
 * 聊天流处理工具
 * 提供处理流式消息和实时更新的功能
 */
import { 是有效流 } from '../../../toolBox/base/forNetWork/forSSE/validateStream.js';
import { 解析SSE事件 } from '../../../toolBox/base/forNetWork/forSSE/parseEvents.js';
import { 查找差异索引 } from '../../../toolBox/base/useEcma/forString/forDiff.js';

/**
 * 处理 SSE 流式消息
 * @param {ReadableStream} response SSE响应流
 * @param {Object} options 配置选项
 * @param {Function} [options.onStart] 开始处理回调
 * @param {Function} [options.onProgress] 进度更新回调
 * @param {Function} [options.onChunk] 接收到块回调
 * @param {Function} [options.onError] 错误处理回调
 * @param {Function} [options.onComplete] 完成回调
 * @param {Object} [options.初始消息] 初始消息对象
 * @returns {Promise<{content: string, success: boolean}>} 处理结果
 */
export async function 处理流式消息(response, options = {}) {
  const {
    onStart,
    onProgress,
    onChunk,
    onError,
    onComplete,
    初始消息 = {
      id: Symbol('sseMsg'),
      type: 'sse_stream',
      content: '',
      status: 'pending',
      timestamp: Date.now(),
      meta: { progress: 0 },
      _lastFull: ''
    }
  } = options;
  console.log(response,options)
  if (!是有效流(response)) {
    const 错误信息 = { error: '无效响应流', message: '提供的响应不是有效的流' };
    onError?.(错误信息);
    return { content: '', success: false };
  }

  try {
    let hasContent = false;
    let finalContent = '';
    let receivedChunks = 0;
    const pendingMsg = { ...初始消息 };

    onStart?.(pendingMsg);

    for await (const chunk of response) {
      const data = 解析SSE事件(chunk);
      
      // 如果解析失败或为null，则跳过此块
      if (!data) continue;
      
      // 检查是否有错误
      if (data.error) {
        const 错误信息 = {
          type: 'stream_error',
          message: data.error.message || '流处理错误',
          data: data.error
        };
        onError?.(错误信息);
        return { content: pendingMsg.content, success: false };
      }
      
      // 获取内容增量
      const contentDelta = data.choices?.[0]?.delta?.content || '';
      const finishReason = data.choices?.[0]?.finish_reason;
      
      // 检查是否是结束信号
      if (finishReason === 'stop') {
        pendingMsg.status = 'success';
        pendingMsg.meta.progress = 100;
        onChunk?.(pendingMsg);
        onComplete?.(pendingMsg);
        return { content: pendingMsg.content, success: true };
      }

      // 更新统计
      receivedChunks++;
      
      // 处理内容增量
      if (contentDelta) {
        if (!hasContent) {
          hasContent = true;
          pendingMsg.status = 'loading';
        }
        
        // 累加内容
        pendingMsg.content += contentDelta;
        finalContent = pendingMsg.content;
        
        // 更新时间戳
        pendingMsg.timestamp = Date.now();
        
        // 回调进度
        onChunk?.(pendingMsg);
      }
    }

    // 流正常结束
    if (hasContent) {
      pendingMsg.status = 'success';
      pendingMsg.meta.progress = 100;
      onComplete?.(pendingMsg);
      return { content: finalContent, success: true };
    }

    // 流结束但未获取内容
    const 错误信息 = { type: 'empty_stream', message: '流结束但未接收到内容' };
    onError?.(错误信息);
    return { content: '', success: false };
  } catch (error) {
    console.error('流处理错误:', error);
    const 错误信息 = { type: 'stream_error', message: error.message, error };
    onError?.(错误信息);
    return { content: '', success: false };
  }
}

/**
 * 简化版流处理函数，适用于简单场景
 * @param {ReadableStream} response SSE响应流
 * @param {Object} options 配置选项
 * @param {Function} [options.onUpdate] 内容更新回调
 * @param {Function} [options.onComplete] 完成回调
 * @param {Function} [options.onError] 错误处理回调
 * @returns {Promise<string>} 完整内容
 */
export async function 简易流处理(response, options = {}) {
  const { onUpdate, onComplete, onError } = options;
  let content = '';
  
  try {
    const result = await 处理流式消息(response, {
      onChunk: (msg) => {
        content = msg.content;
        onUpdate?.(content, msg.meta.progress);
      },
      onComplete: (msg) => {
        onComplete?.(msg.content);
      },
      onError: (err) => {
        onError?.(err);
      }
    });
    
    return result.success ? result.content : '';
  } catch (error) {
    onError?.(error);
    return '';
  }
}

// 为保持兼容性提供英文命名的别名
export const processStreamMessage = 处理流式消息;
export const simpleStreamProcess = 简易流处理; 