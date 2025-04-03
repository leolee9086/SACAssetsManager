/**
 * @fileoverview 【已废弃】Eagle 项目管理模块
 * 此文件为兼容层，请不要直接使用。
 * 请从 src/toolBox/useAge/forEagle/useEagleItem.js 导入相应功能
 */

import { 
    从URL添加图片 as addImageFromURL,
    批量从URL添加图片 as addImagesFromURLs,
    从本地路径添加图片 as addImageFromPath,
    批量从本地路径添加图片 as addImagesFromPaths,
    添加书签 as addBookmark,
    获取项目信息 as getItemInfo,
    移动到回收站 as moveToTrash
} from '../../../../src/toolBox/useAge/forEagle/useEagleItem.js';

// 记录警告
console.warn('eagle/api/item.js 已经废弃，请从 src/toolBox/useAge/forEagle/useEagleItem.js 导入相应功能');

// 为兼容性重新导出
export {
    addImageFromURL,
    addImagesFromURLs,
    addImageFromPath,
    addImagesFromPaths,
    addBookmark,
    getItemInfo,
    moveToTrash
};
