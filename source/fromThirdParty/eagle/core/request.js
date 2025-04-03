/**
 * @fileoverview 【已废弃】Eagle API 基础请求模块
 * 此文件为兼容层，请不要直接使用。
 * 请从 src/toolBox/useAge/forEagle/useEagleRequest.js 导入相应功能
 */

import { 发送请求 as request } from '../../../../src/toolBox/useAge/forEagle/useEagleRequest.js';

// 记录警告
console.warn('eagle/core/request.js 已经废弃，请从 src/toolBox/useAge/forEagle/useEagleRequest.js 导入相应功能');

// 为兼容性重新导出
export { request }; 