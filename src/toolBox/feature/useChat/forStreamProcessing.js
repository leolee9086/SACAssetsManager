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
    let lastFullContent = '';
    const pendingMsg = { ...初始消息 };

    onStart?.(pendingMsg);

    for await (const chunk of response) {
      const { 类型: type, 数据: data } = 解析SSE事件(chunk);
      // 检查是否是结束信号
      if (type === 'done' ) {
        pendingMsg.status = 'success';
        pendingMsg.meta.progress = 100;
        onChunk?.(pendingMsg);
        onComplete?.(pendingMsg);
        return { content: pendingMsg.content, success: true };
      }

      // 首包验证
      receivedChunks++;
      if (receivedChunks === 1) {
        const isValidFirstChunk = (
          (type === 'init' && (data.进度 !== undefined || data.内容)) ||
          (type === 'chunk' && (data.内容 || data.进度 !== undefined))
        );

        if (!isValidFirstChunk) {
          const 错误信息 = {
            type: 'first_chunk_invalid',
            message: `首包格式异常 [${type}]`,
            data: { type, data, event: chunk }
          };
          onError?.(错误信息);
          return { content: '', success: false };
        }

        if (data.进度 !== undefined) {
          pendingMsg.meta.progress = data.进度;
          onProgress?.(data.进度);
        }
      }

      // 处理内容
      if (data.内容?.trim() && !hasContent) {
        hasContent = true;
        pendingMsg.status = 'loading';
        pendingMsg.content = data.内容;
        onChunk?.(pendingMsg);
      }

      // 更新内容
      if (hasContent) {
        if (data.模式 === 'delta') {
          // 增量更新
          pendingMsg.content += data.内容;
        } else if (data.模式 === 'full') {
          // 全量更新，查找差异部分
          const diffStartIndex = 查找差异索引(lastFullContent, data.内容);
          const newContent = data.内容.slice(diffStartIndex);
          pendingMsg.content += newContent;
          lastFullContent = data.内容;
        } else {
          // 未知模式，直接替换
          pendingMsg.content = data.内容 || pendingMsg.content;
        }

        pendingMsg.meta.progress = data.进度 || pendingMsg.meta.progress;
        pendingMsg.status = 'loading';
        pendingMsg.timestamp = Date.now();
        finalContent = pendingMsg.content;

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