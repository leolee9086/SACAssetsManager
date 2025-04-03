/**
 * @fileoverview 【已废弃】Eagle API入口
 * 此文件为兼容层，请不要直接使用。
 * 请从 src/toolBox/useAge/forEagle 目录导入相应功能：
 * - useEagleApi.js: API基础功能
 * - useEagleSearch.js: 搜索功能
 * - useEagleFolder.js: 文件夹管理
 * - useEagleLibrary.js: 资源库管理
 */

import { 检查API可用性 } from '../../../src/toolBox/useAge/forEagle/useEagleApi.js';
import { 执行搜索, 搜索Eagle } from '../../../src/toolBox/useAge/forEagle/useEagleSearch.js';
import { 获取文件夹列表 } from '../../../src/toolBox/useAge/forEagle/useEagleFolder.js';
import { 获取资源库列表 } from '../../../src/toolBox/useAge/forEagle/useEagleLibrary.js';

// 记录警告
console.warn('eagle/index.js 已经废弃，请从 src/toolBox/useAge/forEagle 目录导入相应功能');

// 为兼容性重新导出
export {
  检查API可用性 as checkApiAvailability,
  执行搜索 as performSearch,
  搜索Eagle as searchByEagle,
  获取文件夹列表 as getFolders,
  获取资源库列表 as getLibraries
}; 