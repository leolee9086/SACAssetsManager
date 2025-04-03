/**
 * @fileoverview 【已废弃】Eagle 资源库管理模块
 * 此文件为兼容层，请不要直接使用。
 * 请从 src/toolBox/useAge/forEagle/useEagleLibrary.js 导入相应功能
 */

import { 
    获取资源库信息 as getLibraryInfo,
    获取资源库历史记录 as getLibraryHistory,
    切换资源库 as switchLibrary
} from '../../../../src/toolBox/useAge/forEagle/useEagleLibrary.js';

// 记录警告
console.warn('eagle/api/library.js 已经废弃，请从 src/toolBox/useAge/forEagle/useEagleLibrary.js 导入相应功能');

// 为兼容性重新导出
export {
    getLibraryInfo,
    getLibraryHistory,
    switchLibrary
};

