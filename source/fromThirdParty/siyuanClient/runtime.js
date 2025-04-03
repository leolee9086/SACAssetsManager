/**
 * @fileoverview 【已废弃】思源笔记运行时API
 * 此文件为兼容层，请不要直接使用。
 * 请从 src/toolBox/useAge/forSiyuan/useSiyuanDialog.js 导入
 */

import { confirmAsPromise, createSimpleDialog } from '../../../src/toolBox/useAge/forSiyuan/useSiyuanDialog.js';

// 记录警告
console.warn('siyuanClient/runtime.js 已经废弃，请从 src/toolBox/useAge/forSiyuan/useSiyuanDialog.js 导入');

// 为兼容性重新导出
export {
  confirmAsPromise as confirm,
  createSimpleDialog as Dialog
};