/**
 * @fileoverview 【已废弃】思源笔记客户端API入口
 * 此文件为兼容层，请不要直接使用。
 * 请从 src/toolBox/useAge/forSiyuan/useSiyuanDialog.js 导入
 */

import { confirmAsPromise } from '../../../src/toolBox/useAge/forSiyuan/useSiyuanDialog.js';

// 记录警告
console.warn('siyuanClient/index.js 已经废弃，请从 src/toolBox/useAge/forSiyuan/useSiyuanDialog.js 导入');

// 为兼容性重新导出
export {
  confirmAsPromise
};