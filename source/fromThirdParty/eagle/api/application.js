/**
 * @fileoverview 【已废弃】Eagle 应用信息模块
 * 此文件为兼容层，请不要直接使用。
 * 请从 src/toolBox/useAge/forEagle/useEagleApplication.js 导入相应功能
 */

import { 获取应用信息 as getApplicationInfo } from '../../../../src/toolBox/useAge/forEagle/useEagleApplication.js';

// 记录警告
console.warn('eagle/api/application.js 已经废弃，请从 src/toolBox/useAge/forEagle/useEagleApplication.js 导入相应功能');

// 为兼容性重新导出
export { getApplicationInfo }; 