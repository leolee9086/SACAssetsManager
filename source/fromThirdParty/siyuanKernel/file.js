/**
 * @fileoverview 已弃用 - 思源文件API
 * @deprecated 请直接从toolBox导入函数：
 * - 文件操作: src/toolBox/useAge/forSiyuan/useSiyuanFile.js
 * - 或使用集中API: src/toolBox/useAge/useSiyuan.js 中的 file 和 api.file
 */

// 从新路径导入函数
import * as fileApi from '../../../src/toolBox/useAge/forSiyuan/useSiyuanFile.js';

// 兼容性导出
export const getUniqueFilename = fileApi.getUniqueFilename || fileApi.获取唯一文件名;
export const globalCopyFiles = fileApi.globalCopyFiles || fileApi.全局复制文件;
export const copyFile = fileApi.copyFile || fileApi.复制文件;
export const getFile = fileApi.getFile || fileApi.获取文件;
export const readDir = fileApi.readDir || fileApi.读取目录;
export const renameFile = fileApi.renameFile || fileApi.重命名文件;
export const removeFile = fileApi.removeFile || fileApi.删除文件;
export const putFile = fileApi.putFile || fileApi.上传文件;

// 此文件已弃用，请直接从toolBox导入相应函数
console.warn('siyuanKernel/file.js 已弃用，请直接从 src/toolBox/useAge 导入相应函数'); 