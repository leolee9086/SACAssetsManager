/**
 * @fileoverview 【已废弃】Eagle 标签管理入口
 * 此文件为兼容层，请不要直接使用。
 * 请从 src/toolBox/useAge/forEagle/useEagleTags.js 导入相应功能
 */

import { plugin } from "../../../pluginSymbolRegistry.js";
import {
    获取标签列表 as getTags,
    获取素材库路径 as getLibraryPath
} from '../../../../src/toolBox/useAge/forEagle/useEagleTags.js';

// 记录警告
console.warn('eagle/fromLocal/tags.js 已经废弃，请从 src/toolBox/useAge/forEagle/useEagleTags.js 导入相应功能');

// 为兼容性重新导出
export const getTags = (eaglePath) => getTags(eaglePath, plugin.http服务端口号);
export const getLibraryPath = (localPath) => getLibraryPath(localPath, plugin.http服务端口号);
