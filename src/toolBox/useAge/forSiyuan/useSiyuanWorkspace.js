/**
 * @fileoverview 思源笔记工作区操作API封装
 * @module toolBox/useAge/forSiyuan/useSiyuanWorkspace
 * @requires 思源环境
 */

import { 检查思源环境 } from '../useSiyuan.js';

// 检查环境
if (!检查思源环境()) {
  console.warn('当前不在思源环境中，部分功能可能不可用');
}

/**
 * 发送工作区相关请求的通用方法
 * @private
 * @param {string} endpoint - API 端点
 * @param {Object} data - 请求数据
 * @returns {Promise<Object>} 请求结果
 */
const 发送工作区请求 = async (endpoint, data = {}) => {
  try {
    if (!window.siyuan) {
      throw new Error('思源环境不可用');
    }
    
    const response = await fetch(`/api/workspace/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`请求失败: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`工作区${endpoint}操作失败:`, error);
    return {
      code: -1,
      msg: error.message,
      data: null
    };
  }
};

/**
 * 获取当前工作区配置
 * @returns {Promise<Object>} 工作区配置
 */
export const 获取工作区配置 = () => {
  return 发送工作区请求('getConf');
};

/**
 * 设置工作区配置
 * @param {Object} 配置项 - 要设置的配置项
 * @returns {Promise<Object>} 设置结果
 */
export const 设置工作区配置 = (配置项) => {
  if (!配置项 || typeof 配置项 !== 'object') {
    return Promise.resolve({
      code: -1,
      msg: '配置项必须是一个对象',
      data: null
    });
  }
  return 发送工作区请求('setConf', 配置项);
};

/**
 * 获取文件树列表
 * @param {boolean} [排序=false] - 是否按照排序进行返回
 * @returns {Promise<Object>} 文件树列表
 */
export const 获取文件树列表 = (排序 = false) => {
  return 发送工作区请求('getFileTree', { sort: 排序 });
};

/**
 * 重命名文档
 * @param {Object} 选项 - 重命名选项
 * @param {string} 选项.notebook - 笔记本ID 
 * @param {string} 选项.path - 文档路径
 * @param {string} 选项.title - 新标题
 * @returns {Promise<Object>} 重命名结果
 */
export const 重命名文档 = (选项) => {
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
  });
};

/**
 * 创建文档
 * @param {Object} 选项 - 创建选项
 * @param {string} 选项.notebook - 笔记本ID
 * @param {string} 选项.path - 文档路径
 * @param {string} 选项.title - 文档标题
 * @returns {Promise<Object>} 创建结果
 */
export const 创建文档 = (选项) => {
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
  });
};

/**
 * 删除文档
 * @param {Object} 选项 - 删除选项
 * @param {string} 选项.notebook - 笔记本ID
 * @param {string} 选项.path - 文档路径
 * @returns {Promise<Object>} 删除结果
 */
export const 删除文档 = (选项) => {
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
  });
};

/**
 * 移动文档
 * @param {Object} 选项 - 移动选项
 * @param {string} 选项.fromNotebook - 源笔记本ID
 * @param {string} 选项.fromPath - 源文档路径
 * @param {string} 选项.toNotebook - 目标笔记本ID
 * @param {string} 选项.toPath - 目标文档路径
 * @returns {Promise<Object>} 移动结果
 */
export const 移动文档 = (选项) => {
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
  });
};

/**
 * 列出文档子文档
 * @param {Object} 选项 - 列出选项
 * @param {string} 选项.notebook - 笔记本ID
 * @param {string} 选项.path - 文档路径
 * @returns {Promise<Object>} 子文档列表
 */
export const 列出子文档 = (选项) => {
  if (!选项?.notebook) {
    return Promise.resolve({
      code: -1,
      msg: '笔记本ID不能为空',
      data: null
    });
  }
  return 发送工作区请求('listDocsByPath', {
    notebook: 选项.notebook,
    path: 选项.path || '/'
  });
};

/**
 * 对文档树排序
 * @param {Object} 选项 - 排序选项
 * @param {string} 选项.notebook - 笔记本ID
 * @param {string} 选项.path - 文档路径
 * @param {'custom' | 'name' | 'name_reverse' | 'updated' | 'updated_reverse' | 'created' | 'created_reverse'} 选项.sort - 排序方式
 * @returns {Promise<Object>} 排序结果
 */
export const 对文档树排序 = (选项) => {
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
  });
};

/**
 * 获取工作区状态 (同名导出英文版)
 * @returns {Promise<Object>} 工作区状态
 */
export const getWorkspaceState = () => {
  return 发送工作区请求('getWorkspaceState');
};

/**
 * 获取工作区状态
 * @returns {Promise<Object>} 工作区状态
 */
export const 获取工作区状态 = getWorkspaceState;

/**
 * 获取数据历史
 * @param {Object} 选项 - 历史选项
 * @param {string} 选项.notebook - 笔记本ID
 * @param {string} 选项.path - 路径
 * @param {number} [选项.page=1] - 页码
 * @returns {Promise<Object>} 历史数据
 */
export const 获取数据历史 = (选项) => {
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
  });
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
export const getHistoryData = 获取数据历史; 