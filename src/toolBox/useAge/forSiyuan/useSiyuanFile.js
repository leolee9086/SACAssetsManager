/**
 * @fileoverview 思源笔记文件操作API封装
 * @module toolBox/useAge/forSiyuan/useSiyuanFile
 * @requires 思源环境
 */

import { 检查思源环境 } from '../useSiyuan.js';
import { 发送文件请求 } from '../../base/forNetWork/forSiyuanApi/apiBase.js';

// 检查环境
if (!检查思源环境()) {
  console.warn('当前不在思源环境中，部分功能可能不可用');
}

/**
 * 获取唯一文件名
 * @param {string} 路径 - 文件路径
 * @param {Object} [options] - 请求选项
 * @returns {Promise<Object>} 唯一文件名
 */
export const 获取唯一文件名 = (路径, options = {}) => {
  if (!路径) {
    return Promise.resolve({
      code: -1,
      msg: '文件路径不能为空',
      data: null
    });
  }
  return 发送文件请求('getUniqueFilename', { path: 路径 }, options);
};

/**
 * 全局复制文件
 * @param {Object} 选项 - 复制选项
 * @param {string[]} 选项.srcs - 源文件路径列表
 * @param {string} 选项.destDir - 目标目录路径
 * @param {Object} [requestOptions] - 请求选项
 * @returns {Promise<Object>} 复制结果
 */
export const 全局复制文件 = (选项, requestOptions = {}) => {
  if (!选项?.srcs || !选项?.destDir) {
    return Promise.resolve({
      code: -1,
      msg: '源文件路径列表和目标目录不能为空',
      data: null
    });
  }
  return 发送文件请求('globalCopyFiles', {
    srcs: 选项.srcs,
    destDir: 选项.destDir
  }, requestOptions);
};

/**
 * 复制文件
 * @param {Object} 选项 - 复制选项
 * @param {string} 选项.src - 源文件路径
 * @param {string} 选项.dest - 目标文件路径
 * @param {Object} [requestOptions] - 请求选项
 * @returns {Promise<Object>} 复制结果
 */
export const 复制文件 = (选项, requestOptions = {}) => {
  if (!选项?.src || !选项?.dest) {
    return Promise.resolve({
      code: -1,
      msg: '源文件路径和目标文件路径不能为空',
      data: null
    });
  }
  return 发送文件请求('copyFile', {
    src: 选项.src,
    dest: 选项.dest
  }, requestOptions);
};

/**
 * 获取文件内容
 * @param {string} 路径 - 文件路径
 * @param {Object} [options] - 请求选项
 * @returns {Promise<ArrayBuffer>} 文件内容
 */
export const 获取文件 = async (路径, options = {}) => {
  if (!路径) {
    throw new Error('文件路径不能为空');
  }
  
  try {
    if (!检查思源环境()) {
      throw new Error('思源环境不可用');
    }
    
    const response = await fetch('/api/file/getFile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ path: 路径 })
    });
    
    if (!response.ok) {
      throw new Error(`请求失败: ${response.status} ${response.statusText}`);
    }
    
    return await response.arrayBuffer();
  } catch (error) {
    console.error('获取文件内容失败:', error);
    throw error;
  }
};

/**
 * 读取目录
 * @param {string} 路径 - 目录路径
 * @param {Object} [options] - 请求选项
 * @returns {Promise<Object>} 目录内容
 */
export const 读取目录 = (路径, options = {}) => {
  if (!路径) {
    return Promise.resolve({
      code: -1,
      msg: '目录路径不能为空',
      data: null
    });
  }
  return 发送文件请求('readDir', { path: 路径 }, options);
};

/**
 * 重命名文件
 * @param {Object} 选项 - 重命名选项
 * @param {string} 选项.path - 原文件路径
 * @param {string} 选项.newPath - 新文件路径
 * @param {Object} [requestOptions] - 请求选项
 * @returns {Promise<Object>} 重命名结果
 */
export const 重命名文件 = (选项, requestOptions = {}) => {
  if (!选项?.path || !选项?.newPath) {
    return Promise.resolve({
      code: -1,
      msg: '原文件路径和新文件路径不能为空',
      data: null
    });
  }
  return 发送文件请求('renameFile', {
    path: 选项.path,
    newPath: 选项.newPath
  }, requestOptions);
};

/**
 * 删除文件
 * @param {string} 路径 - 文件路径
 * @param {Object} [options] - 请求选项
 * @returns {Promise<Object>} 删除结果
 */
export const 删除文件 = (路径, options = {}) => {
  if (!路径) {
    return Promise.resolve({
      code: -1,
      msg: '文件路径不能为空',
      data: null
    });
  }
  return 发送文件请求('removeFile', { path: 路径 }, options);
};

/**
 * 上传文件
 * @param {Object} 选项 - 上传选项
 * @param {string} 选项.path - 文件路径
 * @param {File|Blob} 选项.file - 文件对象
 * @param {boolean} [选项.isDir=false] - 是否为目录
 * @param {number} [选项.modTime] - 修改时间戳(毫秒)
 * @param {Object} [requestOptions] - 请求选项
 * @returns {Promise<Object>} 上传结果
 */
export const 上传文件 = async (选项, requestOptions = {}) => {
  if (!选项?.path) {
    return Promise.resolve({
      code: -1,
      msg: '文件路径不能为空',
      data: null
    });
  }
  
  const formData = new FormData();
  formData.append('path', 选项.path);
  formData.append('isDir', 选项.isDir || false);
  
  if (选项.file) {
    formData.append('file', 选项.file);
  }
  
  if (选项.modTime) {
    formData.append('modTime', 选项.modTime);
  }
  
  // FormData请求默认设置使用FormData标志
  const defaultOptions = { 使用FormData: true };
  return 发送文件请求('putFile', formData, { ...defaultOptions, ...requestOptions });
};

/**
 * 创建目录
 * @param {string} 路径 - 目录路径
 * @param {Object} [options] - 请求选项
 * @returns {Promise<Object>} 创建结果
 */
export const 创建目录 = (路径, options = {}) => {
  if (!路径) {
    return Promise.resolve({
      code: -1,
      msg: '目录路径不能为空',
      data: null
    });
  }
  
  return 发送文件请求('putFile', {
    path: 路径,
    isDir: true
  }, options);
};

/**
 * 获取临时目录路径
 * @param {Object} [options] - 请求选项
 * @returns {Promise<Object>} 临时目录路径
 */
export const 获取临时目录路径 = (options = {}) => {
  return 发送文件请求('getTempDirPath', {}, options);
};

/**
 * 检查文件是否存在
 * @param {string} 路径 - 文件路径
 * @param {Object} [options] - 请求选项
 * @returns {Promise<Object>} 检查结果
 */
export const 检查文件是否存在 = (路径, options = {}) => {
  if (!路径) {
    return Promise.resolve({
      code: -1,
      msg: '文件路径不能为空',
      data: null
    });
  }
  return 发送文件请求('isExist', { path: 路径 }, options);
};

// 导出英文版API
export const getUniqueFilename = 获取唯一文件名;
export const globalCopyFiles = 全局复制文件;
export const copyFile = 复制文件;
export const getFile = 获取文件;
export const readDir = 读取目录;
export const renameFile = 重命名文件;
export const removeFile = 删除文件;
export const putFile = 上传文件;
export const createDir = 创建目录;
export const getTempDirPath = 获取临时目录路径;
export const isFileExist = 检查文件是否存在; 