/**
 * @fileoverview 已弃用 - 消息处理工具
 * @deprecated 请使用toolBox目录下的工具:
 * - 格式化时间戳: src/toolBox/base/useEcma/forTime/timeFormatters.js
 * - 转义/反转义HTML: src/toolBox/base/useEcma/forString/forHtmlProcessing.js
 * - 解析思考内容: src/toolBox/feature/useChat/forMessageFormatting.js
 * - 更新元素高度: src/toolBox/base/useBrowser/forDOMInteraction/styleManipulation.js
 * - 处理流式消息: src/toolBox/feature/useChat/forStreamProcessing.js
 * - 创建消息: src/toolBox/feature/useChat/forMessageCreation.js
 */

// 从工具箱导入所需功能
import { 格式化时间戳 } from '../../../../../src/toolBox/base/useEcma/forTime/timeFormatters.js';
import { 转义HTML, 反转义HTML } from '../../../../../src/toolBox/base/useEcma/forString/forHtmlProcessing.js';
import { 解析思考内容, 处理三贤人响应并转换Think标签 } from '../../../../../src/toolBox/feature/useChat/forMessageFormatting.js';
import { 更新元素高度 } from '../../../../../src/toolBox/base/useBrowser/forDOMInteraction/styleManipulation.js';
import { 处理流式消息 } from '../../../../../src/toolBox/feature/useChat/forStreamProcessing.js';
import { 创建消息, 创建用户消息, 创建助手消息, 创建系统消息, 创建错误消息, 创建流式消息 } from '../../../../../src/toolBox/feature/useChat/forMessageCreation.js';
import { 解析SSE事件 } from '../../../../../src/toolBox/base/forNetWork/forSSE/parseEvents.js';
import { 是有效流 } from '../../../../../src/toolBox/base/forNetWork/forSSE/validateStream.js';
import { 查找差异索引 } from '../../../../../src/toolBox/base/useEcma/forString/forDiff.js';

// 显示警告提示
console.warn('MAGI/utils/messageUtils.js 已弃用，请尽快将导入切换到toolBox中的对应模块');

// 导出所有工具函数
export {
  格式化时间戳,
  转义HTML,
  反转义HTML,
  解析思考内容,
  更新元素高度,
  处理流式消息,
  创建消息,
  创建用户消息,
  创建助手消息,
  创建系统消息,
  创建错误消息,
  创建流式消息,
  处理三贤人响应并转换Think标签,
  解析SSE事件,
  是有效流,
  查找差异索引
};

// 在控制台记录路径信息以助调试
console.debug('当前路径信息:', {
  documentLocation: window.location ? window.location.href : 'unknown',
  relativeFilePath: './utils/messageUtils.js',
  targetToolboxPath: '../../../../../src/toolBox/'
});