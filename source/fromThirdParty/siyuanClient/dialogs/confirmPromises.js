/**
 * @fileoverview 已弃用 - 思源确认对话框
 * @deprecated 请直接从toolBox导入函数：
 * - 对话框操作: src/toolBox/useAge/forSiyuan/useSiyuanDialog.js
 * - 或使用集中API: src/toolBox/useAge/useSiyuan.js 中的 dialog
 */

// 从新路径导入函数
import { confirmAsPromise } from "../../../../src/toolBox/useAge/forSiyuan/useSiyuanDialog.js";

// 兼容性导出
export { confirmAsPromise };

// 此文件已弃用，请直接从toolBox导入相应函数
console.warn('siyuanClient/dialogs/confirmPromises.js 已弃用，请直接从 src/toolBox/useAge 导入相应函数');