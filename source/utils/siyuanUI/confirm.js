/**
 * @fileoverview 已弃用 - 思源确认对话框工具
 * @deprecated 请直接从toolBox导入函数：
 * - confirmAsPromise: src/toolBox/useAge/forSiyuan/useSiyuanDialog.js
 * - 或使用集中API: src/toolBox/useAge/useSiyuan.js 中的 ui.确认对话框
 */

// 从新路径导入函数
import { confirmAsPromise } from '../../../src/toolBox/useAge/forSiyuan/useSiyuanDialog.js';

// 重新导出所有函数，保持兼容性
export { confirmAsPromise };

// 此文件已弃用，请直接从toolBox导入相应函数
console.warn('siyuanUI/confirm.js 已弃用，请直接从 src/toolBox/useAge 导入相应函数');