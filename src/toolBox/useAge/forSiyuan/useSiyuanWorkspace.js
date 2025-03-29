/**
 * @fileoverview 思源笔记工作区操作API封装
 * @module toolBox/useAge/forSiyuan/useSiyuanWorkspace
 * @requires 思源环境
 */

import { 检查思源环境 } from '../useSiyuan.js';
import { 发送工作区请求 } from '../../base/forNetWork/forSiyuanApi/apiBase.js';

// 检查环境
if (!检查思源环境()) {
  console.warn('当前不在思源环境中，部分功能可能不可用');
}

/**
 * 获取当前工作区配置
 * @param {Object} [options] - 请求选项
 * @returns {Promise<Object>} 工作区配置
 */
export const 获取工作区配置 = (options = {}) => {
  // 配置可以使用缓存，因为不会频繁变化
  const defaultOptions = { 使用缓存: true, 缓存时间: 60000 }; // 默认缓存1分钟
  return 发送工作区请求('getConf', {}, { ...defaultOptions, ...options });
};

/**
 * 设置工作区配置
 * @param {Object} 配置项 - 要设置的配置项
 * @param {Object} [options] - 请求选项
 * @returns {Promise<Object>} 设置结果
 */
export const 设置工作区配置 = (配置项, options = {}) => {
  if (!配置项 || typeof 配置项 !== 'object') {
    return Promise.resolve({
      code: -1,
      msg: '配置项必须是一个对象',
      data: null
    });
  }
  return 发送工作区请求('setConf', 配置项, options);
};

/**
 * 获取文件树列表
 * @param {boolean} [排序=false] - 是否按照排序进行返回
 * @param {Object} [options] - 请求选项
 * @returns {Promise<Object>} 文件树列表
 */
export const 获取文件树列表 = (排序 = false, options = {}) => {
  // 文件树可以使用缓存，但有效期较短
  const defaultOptions = { 使用缓存: true, 缓存时间: 10000 }; // 默认缓存10秒钟
  return 发送工作区请求('getFileTree', { sort: 排序 }, { ...defaultOptions, ...options });
};

/**
 * 重命名文档
 * @param {Object} 选项 - 重命名选项
 * @param {string} 选项.notebook - 笔记本ID 
 * @param {string} 选项.path - 文档路径
 * @param {string} 选项.title - 新标题
 * @param {Object} [requestOptions] - 请求选项
 * @returns {Promise<Object>} 重命名结果
 */
export const 重命名文档 = (选项, requestOptions = {}) => {
  if (!选项?.notebook || !选项?.path || !选项?.title) {
    return Promise.resolve({
      code: -1,
      msg: '笔记本ID、文档路径和新标题不能为空',
      data: null
    });
  }
  return 发送工作区请求('renameDoc', {
    notebook: 选项.notebook,
    path: 选项.path,
    title: 选项.title
  }, requestOptions);
};

/**
 * 创建文档
 * @param {Object} 选项 - 创建选项
 * @param {string} 选项.notebook - 笔记本ID
 * @param {string} 选项.path - 文档路径
 * @param {string} 选项.title - 文档标题
 * @param {Object} [requestOptions] - 请求选项
 * @returns {Promise<Object>} 创建结果
 */
export const 创建文档 = (选项, requestOptions = {}) => {
  if (!选项?.notebook || !选项?.path) {
    return Promise.resolve({
      code: -1,
      msg: '笔记本ID和文档路径不能为空',
      data: null
    });
  }
  return 发送工作区请求('createDoc', {
    notebook: 选项.notebook,
    path: 选项.path,
    title: 选项.title || '未命名'
  }, requestOptions);
};

/**
 * 删除文档
 * @param {Object} 选项 - 删除选项
 * @param {string} 选项.notebook - 笔记本ID
 * @param {string} 选项.path - 文档路径
 * @param {Object} [requestOptions] - 请求选项
 * @returns {Promise<Object>} 删除结果
 */
export const 删除文档 = (选项, requestOptions = {}) => {
  if (!选项?.notebook || !选项?.path) {
    return Promise.resolve({
      code: -1,
      msg: '笔记本ID和文档路径不能为空',
      data: null
    });
  }
  return 发送工作区请求('removeDoc', {
    notebook: 选项.notebook,
    path: 选项.path
  }, requestOptions);
};

/**
 * 移动文档
 * @param {Object} 选项 - 移动选项
 * @param {string} 选项.fromNotebook - 源笔记本ID
 * @param {string} 选项.fromPath - 源文档路径
 * @param {string} 选项.toNotebook - 目标笔记本ID
 * @param {string} 选项.toPath - 目标文档路径
 * @param {Object} [requestOptions] - 请求选项
 * @returns {Promise<Object>} 移动结果
 */
export const 移动文档 = (选项, requestOptions = {}) => {
  if (!选项?.fromNotebook || !选项?.fromPath || !选项?.toNotebook || !选项?.toPath) {
    return Promise.resolve({
      code: -1,
      msg: '源笔记本ID、源文档路径、目标笔记本ID和目标文档路径不能为空',
      data: null
    });
  }
  return 发送工作区请求('moveDoc', {
    fromNotebook: 选项.fromNotebook,
    fromPath: 选项.fromPath,
    toNotebook: 选项.toNotebook,
    toPath: 选项.toPath
  }, requestOptions);
};

/**
 * 列出文档子文档
 * @param {Object} 选项 - 列出选项
 * @param {string} 选项.notebook - 笔记本ID
 * @param {string} 选项.path - 文档路径
 * @param {Object} [requestOptions] - 请求选项
 * @returns {Promise<Object>} 子文档列表
 */
export const 列出子文档 = (选项, requestOptions = {}) => {
  if (!选项?.notebook) {
    return Promise.resolve({
      code: -1,
      msg: '笔记本ID不能为空',
      data: null
    });
  }
  
  // 子文档列表可以使用缓存
  const defaultOptions = { 使用缓存: true, 缓存时间: 30000 }; // 默认缓存30秒钟
  
  return 发送工作区请求('listDocsByPath', {
    notebook: 选项.notebook,
    path: 选项.path || '/'
  }, { ...defaultOptions, ...requestOptions });
};

/**
 * 对文档树排序
 * @param {Object} 选项 - 排序选项
 * @param {string} 选项.notebook - 笔记本ID
 * @param {string} 选项.path - 文档路径
 * @param {'custom' | 'name' | 'name_reverse' | 'updated' | 'updated_reverse' | 'created' | 'created_reverse'} 选项.sort - 排序方式
 * @param {Object} [requestOptions] - 请求选项
 * @returns {Promise<Object>} 排序结果
 */
export const 对文档树排序 = (选项, requestOptions = {}) => {
  if (!选项?.notebook || !选项?.sort) {
    return Promise.resolve({
      code: -1,
      msg: '笔记本ID和排序方式不能为空',
      data: null
    });
  }
  
  const 有效排序方式 = ['custom', 'name', 'name_reverse', 'updated', 'updated_reverse', 'created', 'created_reverse'];
  if (!有效排序方式.includes(选项.sort)) {
    return Promise.resolve({
      code: -1,
      msg: '无效的排序方式',
      data: null
    });
  }
  
  return 发送工作区请求('sortFolder', {
    notebook: 选项.notebook,
    path: 选项.path || '/',
    sort: 选项.sort
  }, requestOptions);
};

/**
 * 获取工作区状态
 * @param {Object} [options] - 请求选项
 * @returns {Promise<Object>} 工作区状态
 */
export const 获取工作区状态 = (options = {}) => {
  return 发送工作区请求('getWorkspaceState', {}, options);
};

/**
 * 获取数据历史
 * @param {Object} 选项 - 历史选项
 * @param {string} 选项.notebook - 笔记本ID
 * @param {string} 选项.path - 路径
 * @param {number} [选项.page=1] - 页码
 * @param {Object} [requestOptions] - 请求选项
 * @returns {Promise<Object>} 历史数据
 */
export const 获取数据历史 = (选项, requestOptions = {}) => {
  if (!选项?.notebook) {
    return Promise.resolve({
      code: -1,
      msg: '笔记本ID不能为空',
      data: null
    });
  }
  
  return 发送工作区请求('getHistoryItems', {
    notebook: 选项.notebook,
    path: 选项.path || '/',
    page: 选项.page || 1
  }, requestOptions);
};

// 导出英文版API
export const getWorkspaceConfig = 获取工作区配置;
export const setWorkspaceConfig = 设置工作区配置;
export const getFileTreeList = 获取文件树列表;
export const renameDocument = 重命名文档;
export const createDocument = 创建文档;
export const removeDocument = 删除文档;
export const moveDocument = 移动文档;
export const listSubDocuments = 列出子文档;
export const sortDocumentTree = 对文档树排序;
export const getWorkspaceState = 获取工作区状态;
export const getHistoryData = 获取数据历史; 