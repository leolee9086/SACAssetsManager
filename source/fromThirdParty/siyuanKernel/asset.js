/**
 * @fileoverview 已弃用 - 思源资源API
 * @deprecated 请直接从toolBox导入函数：
 * - 资源文件操作: src/toolBox/useAge/forSiyuan/useSiyuanAsset.js
 * - 或使用集中API: src/toolBox/useAge/useSiyuan.js 中的 asset 和 api.asset
 */

// 从新路径导入函数
import * as assetApi from '../../../src/toolBox/useAge/forSiyuan/useSiyuanAsset.js';

// 兼容性导出
export const uploadAsset = assetApi.uploadAsset || assetApi.上传资源文件;
export const removeAsset = assetApi.removeAsset || assetApi.删除资源文件;
export const getAssetInfo = assetApi.getAssetInfo || assetApi.获取资源文件信息;
export const uploadCloud = assetApi.uploadCloud || assetApi.上传资源到云端;
export const insertLocalAssets = assetApi.insertLocalAssets || assetApi.插入本地资源;
export const resolveAssetPath = assetApi.resolveAssetPath || assetApi.解析资源路径;
export const setFileAnnotation = assetApi.setFileAnnotation || assetApi.设置文件注释;
export const getFileAnnotation = assetApi.getFileAnnotation || assetApi.获取文件注释;
export const getUnusedAssets = assetApi.getUnusedAssets || assetApi.获取未使用资源;
export const getMissingAssets = assetApi.getMissingAssets || assetApi.获取缺失资源;
export const removeUnusedAsset = assetApi.removeUnusedAsset || assetApi.删除未使用资源;
export const removeUnusedAssets = assetApi.removeUnusedAssets || assetApi.删除所有未使用资源;
export const getDocImageAssets = assetApi.getDocImageAssets || assetApi.获取文档图片资源;
export const renameAsset = assetApi.renameAsset || assetApi.重命名资源文件;
export const getImageOCRText = assetApi.getImageOCRText || assetApi.获取图片OCR文本;
export const setImageOCRText = assetApi.setImageOCRText || assetApi.设置图片OCR文本;
export const ocr = assetApi.ocr || assetApi.执行OCR;
export const fullReindexAssetContent = assetApi.fullReindexAssetContent || assetApi.重建资源内容索引;
export const statAsset = assetApi.statAsset || assetApi.获取资源统计;

// 此文件已弃用，请直接从toolBox导入相应函数
console.warn('siyuanKernel/asset.js 已弃用，请直接从 src/toolBox/useAge 导入相应函数'); 