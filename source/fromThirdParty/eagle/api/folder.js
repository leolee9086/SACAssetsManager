/**
 * @fileoverview 【已废弃】Eagle 文件夹管理模块
 * 此文件为兼容层，请不要直接使用。
 * 请从 src/toolBox/useAge/forEagle/useEagleFolder.js 导入相应功能
 */

import { 
    创建文件夹 as createFolder,
    创建子文件夹 as createSubFolder,
    重命名文件夹 as renameFolder,
    更新文件夹 as updateFolder,
    获取文件夹列表 as getFolderList,
    获取最近使用的文件夹列表 as getRecentFolders
} from '../../../../src/toolBox/useAge/forEagle/useEagleFolder.js';

// 记录警告
console.warn('eagle/api/folder.js 已经废弃，请从 src/toolBox/useAge/forEagle/useEagleFolder.js 导入相应功能');

// 为兼容性重新导出
export {
    createFolder,
    createSubFolder,
    renameFolder,
    updateFolder,
    getFolderList,
    getRecentFolders
};