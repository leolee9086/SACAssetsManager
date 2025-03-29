/**
 * @fileoverview 已弃用 - SSE处理工具
 * @deprecated 请使用toolBox目录下的工具:
 * - 解析SSE事件: src/toolBox/base/forNetWork/forSSE/parseEvents.js
 * - 是有效流: src/toolBox/base/forNetWork/forSSE/validateStream.js
 * - 查找差异索引: src/toolBox/base/useEcma/forString/forDiff.js
 */

// 使用本地实现

// SSE 事件解析工具
export const 本地_解析SSE事件 = (原始事件) => {
  if (typeof 原始事件 !== 'string') return { 类型: 'error', 数据: { 错误: '无效事件' } };
  
  const 行列表 = 原始事件.split('\n').filter(行 => 行.trim());
  let 类型 = 'chunk';
  let 数据 = {};

  行列表.forEach(行 => {
    if (行.startsWith('event:')) 类型 = 行.replace('event:', '').trim();
    if (行.startsWith('data:')) {
      try {
        const 数据文本 = 行.replace('data:', '').trim();
        if (数据文本 === '[DONE]') {
          数据 = { isFull: true };
        } else {
          数据 = JSON.parse(数据文本);
        }
      } catch (错误) {
        console.error('SSE数据解析失败:', 错误);
      }
    }
  });

  // 自动检测内容模式
  const 是增量模式 = 数据.choices?.[0]?.delta?.content !== undefined;
  const 是完整模式 = 数据.choices?.[0]?.message?.content !== undefined ||
    (数据.content && 数据._isFull);

  return {
    类型,
    数据: {
      内容: 是增量模式
        ? 数据.choices[0].delta.content || ''
        : 是完整模式
          ? 数据.choices[0]?.message?.content || 数据.content || ''
          : 数据.content || '',
      进度: 数据.progress || 0,
      模式: 是增量模式 ? 'delta' : 是完整模式 ? 'full' : 'unknown',
      是完整: !!数据.isFull
    }
  };
};

// SSE 流验证工具
export const 本地_是有效流 = (响应) => {
  return 响应 &&
    typeof 响应[Symbol.asyncIterator] === 'function' &&
    typeof 响应.next === 'function';
};

// 文本差异比对工具
export const 本地_查找差异索引 = (前文本, 当前文本) => {
  if (!前文本 || !当前文本) return 0;
  const 最小长度 = Math.min(前文本.length, 当前文本.length);
  for (let i = 0; i < 最小长度; i++) {
    if (前文本[i] !== 当前文本[i]) return i;
  }
  return 最小长度;
};

// 导出本地函数供外部使用
export const 解析SSE事件 = 本地_解析SSE事件;
export const 是有效流 = 本地_是有效流;
export const 查找差异索引 = 本地_查找差异索引;

// 弃用警告
console.warn('MAGI/utils/sseUtils.js 已弃用，使用本地实现，请尽快修复相关导入路径');

// 记录调试信息
console.debug('当前路径信息:', {
  documentLocation: window.location.href,
  relativeFilePath: './utils/sseUtils.js',
  targetToolboxPath: '../../../../src/toolBox/'
});