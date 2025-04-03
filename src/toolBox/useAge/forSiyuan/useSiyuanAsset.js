/**
 * @fileoverview 思源笔记资源文件操作API封装
 * @module toolBox/useAge/forSiyuan/useSiyuanAsset
 * @requires 思源环境
 */

import { 检查思源环境 } from '../useSiyuan.js';
import { 发送资源请求 } from '../../base/forNetWork/forSiyuanApi/apiBase.js';

// 检查环境
if (!检查思源环境()) {
  console.warn('当前不在思源环境中，部分功能可能不可用');
}

/**
 * 上传资源文件
 * @param {File|Blob} 文件 - 要上传的文件对象
 * @param {string} [笔记本ID] - 目标笔记本ID，不指定则使用当前打开的笔记本
 * @param {Object} [options] - 请求选项
 * @returns {Promise<Object>} 上传结果
 */
export const 上传资源文件 = (文件, 笔记本ID, options = {}) => {
  if (!文件) {
    return Promise.resolve({
      code: -1,
      msg: '文件不能为空',
      data: null
    });
  }
  
  const formData = new FormData();
  formData.append('file[]', 文件);
  if (笔记本ID) {
    formData.append('notebook', 笔记本ID);
  }
  
  // FormData请求默认设置使用FormData标志
  const defaultOptions = { 使用FormData: true };
  return 发送资源请求('upload', formData, { ...defaultOptions, ...options });
};

/**
 * 批量上传资源文件
 * @param {File[]|Blob[]} 文件列表 - 要上传的文件对象数组
 * @param {string} [笔记本ID] - 目标笔记本ID，不指定则使用当前打开的笔记本
 * @param {Object} [options] - 请求选项
 * @returns {Promise<Object>} 上传结果
 */
export const 批量上传资源文件 = (文件列表, 笔记本ID, options = {}) => {
  if (!文件列表 || !Array.isArray(文件列表) || 文件列表.length === 0) {
    return Promise.resolve({
      code: -1,
      msg: '文件列表不能为空',
      data: null
    });
  }
  
  const formData = new FormData();
  文件列表.forEach(文件 => {
    formData.append('file[]', 文件);
  });
  
  if (笔记本ID) {
    formData.append('notebook', 笔记本ID);
  }
  
  // FormData请求默认设置使用FormData标志
  const defaultOptions = { 使用FormData: true };
  return 发送资源请求('upload', formData, { ...defaultOptions, ...options });
};

/**
 * 基于URL上传资源文件
 * @param {Object} 选项 - 上传选项
 * @param {string} 选项.url - 文件URL
 * @param {string} [选项.name] - 文件名，不指定则从URL中提取
 * @param {string} [选项.path] - 保存路径
 * @param {Object} [requestOptions] - 请求选项
 * @returns {Promise<Object>} 上传结果
 */
export const 基于URL上传资源文件 = (选项, requestOptions = {}) => {
  if (!选项?.url) {
    return Promise.resolve({
      code: -1,
      msg: 'URL不能为空',
      data: null
    });
  }
  
  return 发送资源请求('upload', {
    url: 选项.url,
    name: 选项.name,
    path: 选项.path
  }, requestOptions);
};

/**
 * 获取资源文件
 * @param {string} 路径 - 资源文件路径
 * @param {Object} [options] - 请求选项
 * @returns {Promise<Blob>} 文件内容的Blob对象
 */
export const 获取资源文件 = async (路径, options = {}) => {
  if (!路径) {
    throw new Error('资源文件路径不能为空');
  }
  
  try {
    if (!检查思源环境()) {
      throw new Error('思源环境不可用');
    }
    
    const url = `/api/asset/file?path=${encodeURIComponent(路径)}`;
    
    // 为文件下载请求创建自定义选项
    const fetchOptions = {
      method: 'GET',
      timeout: options.超时时间 || 30000
    };
    
    const response = await fetch(url, fetchOptions);
    
    if (!response.ok) {
      throw new Error(`请求失败: ${response.status} ${response.statusText}`);
    }
    
    return await response.blob();
  } catch (error) {
    console.error('获取资源文件失败:', error);
    throw error;
  }
};

/**
 * 删除资源文件
 * @param {string} 路径 - 资源文件路径
 * @param {Object} [options] - 请求选项
 * @returns {Promise<Object>} 删除结果
 */
export const 删除资源文件 = (路径, options = {}) => {
  if (!路径) {
    return Promise.resolve({
      code: -1,
      msg: '资源文件路径不能为空',
      data: null
    });
  }
  
  return 发送资源请求('removeFile', { path: 路径 }, options);
};

/**
 * 重命名资源文件
 * @param {Object} 选项 - 重命名选项
 * @param {string} 选项.oldPath - 原文件路径
 * @param {string} 选项.newPath - 新文件路径
 * @param {Object} [requestOptions] - 请求选项
 * @returns {Promise<Object>} 重命名结果
 */
export const 重命名资源文件 = (选项, requestOptions = {}) => {
  if (!选项?.oldPath || !选项?.newPath) {
    return Promise.resolve({
      code: -1,
      msg: '原文件路径和新文件路径不能为空',
      data: null
    });
  }
  
  return 发送资源请求('renameFile', {
    oldPath: 选项.oldPath,
    newPath: 选项.newPath
  }, requestOptions);
};

/**
 * 创建资源目录
 * @param {string} 路径 - 目录路径
 * @param {Object} [options] - 请求选项
 * @returns {Promise<Object>} 创建结果
 */
export const 创建资源目录 = (路径, options = {}) => {
  if (!路径) {
    return Promise.resolve({
      code: -1,
      msg: '目录路径不能为空',
      data: null
    });
  }
  
  return 发送资源请求('mkdir', { path: 路径 }, options);
};

/**
 * 列出指定目录下的资源文件
 * @param {string} [路径='/'] - 目录路径，默认为根目录
 * @param {Object} [options] - 请求选项
 * @returns {Promise<Object>} 资源文件列表
 */
export const 列出资源文件 = (路径 = '/', options = {}) => {
  // 文件列表可以使用缓存，但有效期不宜过长
  
  return 发送资源请求('listFiles', { path: 路径 }, options);
};

/**
 * 复制资源文件
 * @param {Object} 选项 - 复制选项
 * @param {string} 选项.srcPath - 源文件路径
 * @param {string} 选项.destPath - 目标文件路径
 * @param {Object} [requestOptions] - 请求选项
 * @returns {Promise<Object>} 复制结果
 */
export const 复制资源文件 = (选项, requestOptions = {}) => {
  if (!选项?.srcPath || !选项?.destPath) {
    return Promise.resolve({
      code: -1,
      msg: '源文件路径和目标文件路径不能为空',
      data: null
    });
  }
  
  return 发送资源请求('copyFile', {
    srcPath: 选项.srcPath,
    destPath: 选项.destPath
  }, requestOptions);
};

/**
 * 从本地路径复制文件到资源目录
 * @param {Object} 选项 - 复制选项
 * @param {string} 选项.srcPath - 本地源文件路径
 * @param {string} 选项.destPath - 目标资源文件路径
 * @param {Object} [requestOptions] - 请求选项
 * @returns {Promise<Object>} 复制结果
 */
export const 从本地复制到资源目录 = (选项, requestOptions = {}) => {
  if (!选项?.srcPath || !选项?.destPath) {
    return Promise.resolve({
      code: -1,
      msg: '源文件路径和目标文件路径不能为空',
      data: null
    });
  }
  
  return 发送资源请求('copyFileToAssets', {
    srcPath: 选项.srcPath,
    destPath: 选项.destPath
  }, requestOptions);
};

/**
 * 获取资源文件预览信息
 * @param {Object} 选项 - 预览选项
 * @param {string} 选项.path - 资源文件路径
 * @param {string} [选项.type='pdf'] - 预览类型，如'pdf', 'image'等
 * @param {Object} [requestOptions] - 请求选项
 * @returns {Promise<Object>} 预览信息
 */
export const 获取资源文件预览信息 = (选项, requestOptions = {}) => {
  if (!选项?.path) {
    return Promise.resolve({
      code: -1,
      msg: '资源文件路径不能为空',
      data: null
    });
  }
  
  return 发送资源请求('getFilePreview', {
    path: 选项.path,
    type: 选项.type || 'pdf'
  }, requestOptions);
};

/**
 * 上传资源到云端
 * @param {Object} 选项 - 上传选项
 * @param {string} 选项.path - 本地资源路径
 * @param {Object} [requestOptions] - 请求选项
 * @returns {Promise<Object>} 上传结果
 */
export const 上传资源到云端 = (选项, requestOptions = {}) => {
  if (!选项?.path) {
    return Promise.resolve({
      code: -1,
      msg: '资源路径不能为空',
      data: null
    });
  }
  
  return 发送资源请求('uploadCloud', {
    path: 选项.path
  }, requestOptions);
};

/**
 * 插入本地资源
 * @param {Object} 选项 - 插入选项
 * @param {string[]} 选项.assetPaths - 要插入的资源路径列表
 * @param {string} 选项.id - 文档ID
 * @param {boolean} [选项.isUpload=true] - 是否上传资源
 * @param {Object} [requestOptions] - 请求选项
 * @returns {Promise<Object>} 插入结果
 */
export const 插入本地资源 = (选项, requestOptions = {}) => {
  if (!选项?.assetPaths || !选项?.id) {
    return Promise.resolve({
      code: -1,
      msg: '资源路径列表和文档ID不能为空',
      data: null
    });
  }
  
  return 发送资源请求('insertLocalAssets', {
    assetPaths: 选项.assetPaths,
    id: 选项.id,
    isUpload: 选项.isUpload !== false
  }, requestOptions);
};

/**
 * 解析资源路径
 * @param {string} 路径 - 资源路径
 * @param {Object} [options] - 请求选项
 * @returns {Promise<Object>} 解析结果
 */
export const 解析资源路径 = (路径, options = {}) => {
  if (!路径) {
    return Promise.resolve({
      code: -1,
      msg: '资源路径不能为空',
      data: null
    });
  }
  
  return 发送资源请求('resolveAssetPath', { path: 路径 }, options);
};

/**
 * 设置文件注释
 * @param {Object} 选项 - 注释选项
 * @param {string} 选项.path - 文件路径
 * @param {string} 选项.data - 注释内容
 * @param {Object} [requestOptions] - 请求选项
 * @returns {Promise<Object>} 设置结果
 */
export const 设置文件注释 = (选项, requestOptions = {}) => {
  if (!选项?.path || 选项?.data === undefined) {
    return Promise.resolve({
      code: -1,
      msg: '文件路径和注释内容不能为空',
      data: null
    });
  }
  
  return 发送资源请求('setFileAnnotation', {
    path: 选项.path,
    data: 选项.data
  }, requestOptions);
};

/**
 * 获取文件注释
 * @param {string} id - 文件ID
 * @param {Object} [options] - 请求选项
 * @returns {Promise<Object>} 注释内容
 */
export const 获取文件注释 = (id, options = {}) => {
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '文件ID不能为空',
      data: null
    });
  }
  
  return 发送资源请求('getFileAnnotation', { id }, options);
};

/**
 * 获取未使用资源
 * @param {Object} [options] - 请求选项
 * @returns {Promise<Object>} 未使用资源列表
 */
export const 获取未使用资源 = (options = {}) => {
  return 发送资源请求('getUnusedAssets', {}, options);
};

/**
 * 获取缺失资源
 * @param {Object} [options] - 请求选项
 * @returns {Promise<Object>} 缺失资源列表
 */
export const 获取缺失资源 = (options = {}) => {
  return 发送资源请求('getMissingAssets', {}, options);
};

/**
 * 删除未使用资源
 * @param {string} 路径 - 资源路径
 * @param {Object} [options] - 请求选项
 * @returns {Promise<Object>} 删除结果
 */
export const 删除未使用资源 = (路径, options = {}) => {
  if (!路径) {
    return Promise.resolve({
      code: -1,
      msg: '资源路径不能为空',
      data: null
    });
  }
  
  return 发送资源请求('removeUnusedAsset', { path: 路径 }, options);
};

/**
 * 删除所有未使用资源
 * @param {Object} [options] - 请求选项
 * @returns {Promise<Object>} 删除结果
 */
export const 删除所有未使用资源 = (options = {}) => {
  return 发送资源请求('removeUnusedAssets', {}, options);
};

/**
 * 获取文档图片资源
 * @param {string} id - 文档ID
 * @param {Object} [options] - 请求选项
 * @returns {Promise<Object>} 图片资源列表
 */
export const 获取文档图片资源 = (id, options = {}) => {
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '文档ID不能为空',
      data: null
    });
  }
  
  return 发送资源请求('getDocImageAssets', { id }, options);
};

/**
 * 获取图片OCR文本
 * @param {string} 路径 - 图片路径
 * @param {Object} [options] - 请求选项
 * @returns {Promise<Object>} OCR文本内容
 */
export const 获取图片OCR文本 = (路径, options = {}) => {
  if (!路径) {
    return Promise.resolve({
      code: -1,
      msg: '图片路径不能为空',
      data: null
    });
  }
  
  return 发送资源请求('getImageOCRText', { path: 路径 }, options);
};

/**
 * 设置图片OCR文本
 * @param {Object} 选项 - OCR选项
 * @param {string} 选项.path - 图片路径
 * @param {string} 选项.text - OCR文本内容
 * @param {Object} [requestOptions] - 请求选项
 * @returns {Promise<Object>} 设置结果
 */
export const 设置图片OCR文本 = (选项, requestOptions = {}) => {
  if (!选项?.path || 选项?.text === undefined) {
    return Promise.resolve({
      code: -1,
      msg: '图片路径和OCR文本不能为空',
      data: null
    });
  }
  
  return 发送资源请求('setImageOCRText', {
    path: 选项.path,
    text: 选项.text
  }, requestOptions);
};

/**
 * 执行OCR
 * @param {Object} 选项 - OCR选项
 * @param {string} 选项.path - 要执行OCR的图片路径
 * @param {Object} [requestOptions] - 请求选项
 * @returns {Promise<Object>} OCR结果
 */
export const 执行OCR = (选项, requestOptions = {}) => {
  if (!选项?.path) {
    return Promise.resolve({
      code: -1,
      msg: '图片路径不能为空',
      data: null
    });
  }
  
  return 发送资源请求('ocr', { path: 选项.path }, requestOptions);
};

/**
 * 重建资源内容索引
 * @param {Object} [options] - 请求选项
 * @returns {Promise<Object>} 重建结果
 */
export const 重建资源内容索引 = (options = {}) => {
  return 发送资源请求('fullReindexAssetContent', {}, options);
};

/**
 * 获取资源统计
 * @param {string} 路径 - 资源路径
 * @param {Object} [options] - 请求选项
 * @returns {Promise<Object>} 资源统计信息
 */
export const 获取资源统计 = (路径, options = {}) => {
  if (!路径) {
    return Promise.resolve({
      code: -1,
      msg: '资源路径不能为空',
      data: null
    });
  }
  
  return 发送资源请求('statAsset', { path: 路径 }, options);
};

/**
 * 获取资源文件信息
 * @param {string} 路径 - 资源路径
 * @param {Object} [options] - 请求选项
 * @returns {Promise<Object>} 资源文件信息
 */
export const 获取资源文件信息 = (路径, options = {}) => {
  if (!路径) {
    return Promise.resolve({
      code: -1,
      msg: '资源路径不能为空',
      data: null
    });
  }
  
  return 发送资源请求('getInfo', { path: 路径 }, options);
};

// 导出英文版API
export const uploadAsset = 上传资源文件;
export const batchUploadAssets = 批量上传资源文件;
export const uploadAssetByUrl = 基于URL上传资源文件;
export const getAsset = 获取资源文件;
export const removeAsset = 删除资源文件;
export const renameAsset = 重命名资源文件;
export const createAssetDir = 创建资源目录;
export const listAssets = 列出资源文件;
export const copyAsset = 复制资源文件;
export const copyLocalToAssets = 从本地复制到资源目录;
export const getAssetPreview = 获取资源文件预览信息;
export const uploadCloud = 上传资源到云端;
export const insertLocalAssets = 插入本地资源;
export const resolveAssetPath = 解析资源路径;
export const setFileAnnotation = 设置文件注释;
export const getFileAnnotation = 获取文件注释;
export const getUnusedAssets = 获取未使用资源;
export const getMissingAssets = 获取缺失资源;
export const removeUnusedAsset = 删除未使用资源;
export const removeUnusedAssets = 删除所有未使用资源;
export const getDocImageAssets = 获取文档图片资源;
export const getImageOCRText = 获取图片OCR文本;
export const setImageOCRText = 设置图片OCR文本;
export const ocr = 执行OCR;
export const fullReindexAssetContent = 重建资源内容索引;
export const statAsset = 获取资源统计;
export const getAssetInfo = 获取资源文件信息; 