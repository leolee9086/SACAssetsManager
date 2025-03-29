/**
 * @fileoverview 思源笔记资源文件操作API封装
 * @module toolBox/useAge/forSiyuan/useSiyuanAsset
 * @requires 思源环境
 */

import { 检查思源环境 } from '../useSiyuan.js';

// 检查环境
if (!检查思源环境()) {
  console.warn('当前不在思源环境中，部分功能可能不可用');
}

/**
 * 发送资源文件相关请求的通用方法
 * @private
 * @param {string} endpoint - API 端点
 * @param {Object|FormData} data - 请求数据
 * @param {boolean} [使用FormData=false] - 是否使用FormData格式
 * @returns {Promise<Object>} 请求结果
 */
const 发送资源请求 = async (endpoint, data = {}, 使用FormData = false) => {
  try {
    if (!window.siyuan) {
      throw new Error('思源环境不可用');
    }
    
    const headers = !使用FormData ? { 'Content-Type': 'application/json' } : undefined;
    const body = !使用FormData ? JSON.stringify(data) : data;
    
    const response = await fetch(`/api/asset/${endpoint}`, {
      method: 'POST',
      headers,
      body
    });
    
    if (!response.ok) {
      throw new Error(`请求失败: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`资源${endpoint}操作失败:`, error);
    return {
      code: -1,
      msg: error.message,
      data: null
    };
  }
};

/**
 * 上传资源文件
 * @param {File|Blob} 文件 - 要上传的文件对象
 * @param {string} [笔记本ID] - 目标笔记本ID，不指定则使用当前打开的笔记本
 * @returns {Promise<Object>} 上传结果
 */
export const 上传资源文件 = (文件, 笔记本ID) => {
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
  
  return 发送资源请求('upload', formData, true);
};

/**
 * 批量上传资源文件
 * @param {File[]|Blob[]} 文件列表 - 要上传的文件对象数组
 * @param {string} [笔记本ID] - 目标笔记本ID，不指定则使用当前打开的笔记本
 * @returns {Promise<Object>} 上传结果
 */
export const 批量上传资源文件 = (文件列表, 笔记本ID) => {
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
  
  return 发送资源请求('upload', formData, true);
};

/**
 * 基于URL上传资源文件
 * @param {Object} 选项 - 上传选项
 * @param {string} 选项.url - 文件URL
 * @param {string} [选项.name] - 文件名，不指定则从URL中提取
 * @param {string} [选项.path] - 保存路径
 * @returns {Promise<Object>} 上传结果
 */
export const 基于URL上传资源文件 = (选项) => {
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
  });
};

/**
 * 获取资源文件
 * @param {string} 路径 - 资源文件路径
 * @returns {Promise<Blob>} 文件内容的Blob对象
 */
export const 获取资源文件 = async (路径) => {
  if (!路径) {
    throw new Error('资源文件路径不能为空');
  }
  
  try {
    if (!window.siyuan) {
      throw new Error('思源环境不可用');
    }
    
    const url = `/api/asset/file?path=${encodeURIComponent(路径)}`;
    const response = await fetch(url);
    
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
 * @returns {Promise<Object>} 删除结果
 */
export const 删除资源文件 = (路径) => {
  if (!路径) {
    return Promise.resolve({
      code: -1,
      msg: '资源文件路径不能为空',
      data: null
    });
  }
  
  return 发送资源请求('removeFile', { path: 路径 });
};

/**
 * 重命名资源文件
 * @param {Object} 选项 - 重命名选项
 * @param {string} 选项.oldPath - 原文件路径
 * @param {string} 选项.newPath - 新文件路径
 * @returns {Promise<Object>} 重命名结果
 */
export const 重命名资源文件 = (选项) => {
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
  });
};

/**
 * 创建资源目录
 * @param {string} 路径 - 目录路径
 * @returns {Promise<Object>} 创建结果
 */
export const 创建资源目录 = (路径) => {
  if (!路径) {
    return Promise.resolve({
      code: -1,
      msg: '目录路径不能为空',
      data: null
    });
  }
  
  return 发送资源请求('mkdir', { path: 路径 });
};

/**
 * 列出指定目录下的资源文件
 * @param {string} [路径='/'] - 目录路径，默认为根目录
 * @returns {Promise<Object>} 资源文件列表
 */
export const 列出资源文件 = (路径 = '/') => {
  return 发送资源请求('listFiles', { path: 路径 });
};

/**
 * 复制资源文件
 * @param {Object} 选项 - 复制选项
 * @param {string} 选项.srcPath - 源文件路径
 * @param {string} 选项.destPath - 目标文件路径
 * @returns {Promise<Object>} 复制结果
 */
export const 复制资源文件 = (选项) => {
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
  });
};

/**
 * 从本地路径复制文件到资源目录
 * @param {Object} 选项 - 复制选项
 * @param {string} 选项.srcPath - 本地源文件路径
 * @param {string} 选项.destPath - 目标资源文件路径
 * @returns {Promise<Object>} 复制结果
 */
export const 从本地复制到资源目录 = (选项) => {
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
  });
};

/**
 * 获取资源文件预览信息
 * @param {Object} 选项 - 预览选项
 * @param {string} 选项.path - 资源文件路径
 * @param {string} [选项.type='pdf'] - 预览类型，如'pdf', 'image'等
 * @returns {Promise<Object>} 预览信息
 */
export const 获取资源文件预览信息 = (选项) => {
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
  });
};

// 导出英文版API
export const uploadAsset = 上传资源文件;
export const batchUploadAssets = 批量上传资源文件;
export const uploadAssetByUrl = 基于URL上传资源文件;
export const getAssetFile = 获取资源文件;
export const removeAssetFile = 删除资源文件;
export const renameAssetFile = 重命名资源文件;
export const createAssetDirectory = 创建资源目录;
export const listAssetFiles = 列出资源文件;
export const copyAssetFile = 复制资源文件;
export const copyFromLocalToAssets = 从本地复制到资源目录;
export const getAssetFilePreview = 获取资源文件预览信息; 