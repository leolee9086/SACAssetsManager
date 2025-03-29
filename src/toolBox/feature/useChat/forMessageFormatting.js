/**
 * 聊天消息格式化工具
 * 提供解析和格式化聊天消息的功能
 */
import { 转义HTML, 反转义HTML, 文本转HTML } from '../../../toolBox/base/useEcma/forString/forHtmlProcessing.js';

/**
 * 解析思考内容，处理<think>标签
 * @param {string} 内容 - 原始消息内容
 * @returns {Object} 解析结果对象，包含思考内容、普通内容和是否有思考标记
 */
export function 解析思考内容(内容) {
  if (!内容 || typeof 内容 !== 'string') {
    return { 思考内容: '', 普通内容: '', 有思考: false };
  }

  // 检查是否包含Think标签
  if (!内容.includes('<think>')) {
    return { 思考内容: '', 普通内容: 内容, 有思考: false };
  }

  // 先转义内容中的HTML，但保留think标签
  const 安全内容 = 内容.replace(/<think>(.*?)<\/think>/g, (匹配, 组1) => {
    return `<think>${转义HTML(组1)}</think>`;
  });

  // 使用DOM解析器安全提取标签内容
  const 解析器 = new DOMParser();
  const 文档 = 解析器.parseFromString(`<div>${安全内容}</div>`, 'text/html');
  const 思考元素 = 文档.querySelector('think');

  if (思考元素) {
    // 获取think标签内的内容并反转义
    const 思考内容 = 反转义HTML(思考元素.textContent.trim());
    // 移除think标签后的剩余内容并反转义
    思考元素.remove();
    const 普通内容 = 反转义HTML(文档.body.textContent.trim());

    return {
      思考内容,
      普通内容,
      有思考: true
    };
  }

  // 处理未闭合的think标签情况
  if (内容.includes('<think>') && !内容.includes('</think>')) {
    return {
      思考内容: '',
      普通内容: 转义HTML(内容),
      有思考: false
    };
  }

  return {
    思考内容: '',
    普通内容: 转义HTML(内容),
    有思考: false
  };
}

/**
 * 处理富文本消息，转换各种标记为HTML元素
 * @param {string} 消息文本 - 原始消息文本
 * @returns {string} 格式化后的HTML字符串
 */
export function 格式化富文本消息(消息文本) {
  if (!消息文本 || typeof 消息文本 !== 'string') return '';
  
  // 提取思考内容
  const { 思考内容, 普通内容, 有思考 } = 解析思考内容(消息文本);
  
  // 创建包含思考内容的HTML(如果有)
  let 结果HTML = '';
  if (有思考 && 思考内容) {
    结果HTML += `<div class="think-content">${文本转HTML(思考内容)}</div>`;
  }
  
  // 创建主要内容的HTML
  const 处理后内容 = 普通内容
    // 1. 处理加粗 **文本**
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // 2. 处理斜体 *文本* 或 _文本_
    .replace(/(\*|_)(.*?)\1/g, '<em>$2</em>')
    // 3. 处理行内代码 `代码`
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // 4. 处理链接 [文本](链接)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
    // 5. 处理引用 >文本
    .replace(/^>\s*(.*?)$/gm, '<blockquote>$1</blockquote>');
  
  结果HTML += 文本转HTML(处理后内容);
  return 结果HTML;
}

/**
 * 处理三贤人响应并转换Think标签
 * @param {Array<Object>} 响应列表 - 响应对象数组
 * @returns {Array<string>} 转换后的内容数组
 */
export function 处理三贤人响应并转换Think标签(响应列表) {
  if (!Array.isArray(响应列表)) return [];
  
  return 响应列表
    .filter(响应 => 响应 && 响应.content)
    .map(响应 => {
      const { 普通内容 } = 解析思考内容(响应.content);
      return 普通内容 || 响应.content;
    });
}

// 为保持兼容性提供英文命名的别名
export const parseThinkContent = 解析思考内容;
export const formatRichTextMessage = 格式化富文本消息;
export const processSagesResponsesAndConvertThink = 处理三贤人响应并转换Think标签; 