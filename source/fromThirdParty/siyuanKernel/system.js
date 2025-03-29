/**
 * @fileoverview 已弃用 - 思源系统API
 * @deprecated 请直接从toolBox导入函数：
 * - 获取系统字体: src/toolBox/useAge/forSiyuan/useSiyuanSystem.js
 * - 或使用集中API: src/toolBox/useAge/useSiyuan.js 中的 system 和 api.system
 */

// 从新路径导入函数
import * as systemApi from '../../../src/toolBox/useAge/forSiyuan/useSiyuanSystem.js';

// 兼容性导出
export const getSysFonts = systemApi.getSysFonts;
export const version = systemApi.getVersion;
export const currentTime = systemApi.getCurrentTime;
export const bootProgress = systemApi.getBootProgress;
export const exit = systemApi.exitApp;
export const setAutoLaunch = systemApi.setAutoLaunch;
export const setAppearanceMode = systemApi.setAppearanceMode;
export const checkUpdate = systemApi.checkUpdate;
export const getEchartsRendererInfo = systemApi.getEchartsRendererInfo;
export const getThemeMode = systemApi.getThemeMode;
export const getUpgradeProgress = systemApi.getUpgradeProgress;
export const reloadUI = systemApi.reloadUI;
export const getWorkspaceInfo = systemApi.getWorkspaceInfo;
export const getNetwork = systemApi.getNetworkConfig;
export const setNetworkProxy = systemApi.setNetworkProxy;

// 此文件已弃用，请直接从toolBox导入相应函数
console.warn('siyuanKernel/system.js 已弃用，请直接从 src/toolBox/useAge 导入相应函数'); 