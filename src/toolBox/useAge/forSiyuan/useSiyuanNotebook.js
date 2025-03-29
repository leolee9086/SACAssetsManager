/**
 * @fileoverview 思源笔记笔记本操作API封装
 * @module toolBox/useAge/forSiyuan/useSiyuanNotebook
 * @requires 思源环境
 */

import { 检查思源环境 } from '../useSiyuan.js';

// 检查环境
if (!检查思源环境()) {
  console.warn('当前不在思源环境中，部分功能可能不可用');
}

/**
 * 发送笔记本相关请求的通用方法
 * @private
 * @param {string} endpoint - API 端点
 * @param {Object} data - 请求数据
 * @returns {Promise<Object>} 请求结果
 */
const 发送笔记本请求 = async (endpoint, data = {}) => {
  try {
    if (!window.siyuan) {
      throw new Error('思源环境不可用');
    }
    
    const response = await fetch(`/api/notebook/${endpoint}`, {
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
    console.error(`笔记本${endpoint}操作失败:`, error);
    return {
      code: -1,
      msg: error.message,
      data: null
    };
  }
};

/**
 * 获取所有笔记本列表
 * @returns {Promise<Object>} 笔记本列表
 */
export const 获取笔记本列表 = () => {
  return 发送笔记本请求('lsNotebooks');
};

/**
 * 打开笔记本
 * @param {string} id - 笔记本ID
 * @returns {Promise<Object>} 打开结果
 */
export const 打开笔记本 = (id) => {
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '笔记本ID不能为空',
      data: null
    });
  }
  return 发送笔记本请求('openNotebook', { notebook: id });
};

/**
 * 关闭笔记本
 * @param {string} id - 笔记本ID
 * @returns {Promise<Object>} 关闭结果
 */
export const 关闭笔记本 = (id) => {
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '笔记本ID不能为空',
      data: null
    });
  }
  return 发送笔记本请求('closeNotebook', { notebook: id });
};

/**
 * 创建笔记本
 * @param {Object} 选项 - 创建选项
 * @param {string} 选项.name - 笔记本名称
 * @returns {Promise<Object>} 创建结果
 */
export const 创建笔记本 = (选项) => {
  if (!选项?.name) {
    return Promise.resolve({
      code: -1,
      msg: '笔记本名称不能为空',
      data: null
    });
  }
  return 发送笔记本请求('createNotebook', { name: 选项.name });
};

/**
 * 重命名笔记本
 * @param {Object} 选项 - 重命名选项
 * @param {string} 选项.notebook - 笔记本ID
 * @param {string} 选项.name - 新名称
 * @returns {Promise<Object>} 重命名结果
 */
export const 重命名笔记本 = (选项) => {
  if (!选项?.notebook || !选项?.name) {
    return Promise.resolve({
      code: -1,
      msg: '笔记本ID和新名称不能为空',
      data: null
    });
  }
  return 发送笔记本请求('renameNotebook', {
    notebook: 选项.notebook,
    name: 选项.name
  });
};

/**
 * 删除笔记本
 * @param {string} id - 笔记本ID
 * @returns {Promise<Object>} 删除结果
 */
export const 删除笔记本 = (id) => {
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '笔记本ID不能为空',
      data: null
    });
  }
  return 发送笔记本请求('removeNotebook', { notebook: id });
};

/**
 * 获取笔记本配置
 * @param {string} id - 笔记本ID
 * @returns {Promise<Object>} 笔记本配置
 */
export const 获取笔记本配置 = (id) => {
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '笔记本ID不能为空',
      data: null
    });
  }
  return 发送笔记本请求('getNotebookConf', { notebook: id });
};

/**
 * 设置笔记本配置
 * @param {Object} 选项 - 配置选项
 * @param {string} 选项.notebook - 笔记本ID
 * @param {Object} 选项.conf - 笔记本配置
 * @returns {Promise<Object>} 设置结果
 */
export const 设置笔记本配置 = (选项) => {
  if (!选项?.notebook || !选项?.conf) {
    return Promise.resolve({
      code: -1,
      msg: '笔记本ID和配置不能为空',
      data: null
    });
  }
  return 发送笔记本请求('setNotebookConf', {
    notebook: 选项.notebook,
    conf: 选项.conf
  });
};

/**
 * 为笔记本设置图标
 * @param {Object} 选项 - 设置选项
 * @param {string} 选项.notebook - 笔记本ID
 * @param {string} 选项.icon - 图标Emoji或图标URL
 * @returns {Promise<Object>} 设置结果
 */
export const 设置笔记本图标 = (选项) => {
  if (!选项?.notebook || !选项?.icon) {
    return Promise.resolve({
      code: -1,
      msg: '笔记本ID和图标不能为空',
      data: null
    });
  }
  return 发送笔记本请求('setNotebookIcon', {
    notebook: 选项.notebook,
    icon: 选项.icon
  });
};

/**
 * 设置笔记本排序
 * @param {Object} 选项 - 排序选项
 * @param {string[]} 选项.notebooks - 笔记本ID数组，按排序顺序
 * @returns {Promise<Object>} 排序结果
 */
export const 设置笔记本排序 = (选项) => {
  if (!选项?.notebooks || !Array.isArray(选项.notebooks)) {
    return Promise.resolve({
      code: -1,
      msg: '笔记本ID数组不能为空',
      data: null
    });
  }
  return 发送笔记本请求('setNotebooksSort', { notebooks: 选项.notebooks });
};

/**
 * 导入Markdown文件到笔记本
 * @param {Object} 选项 - 导入选项
 * @param {string} 选项.notebook - 目标笔记本ID
 * @param {string} 选项.localPath - 本地Markdown文件路径
 * @param {string} [选项.toPath=''] - 目标路径
 * @returns {Promise<Object>} 导入结果
 */
export const 导入Markdown到笔记本 = (选项) => {
  if (!选项?.notebook || !选项?.localPath) {
    return Promise.resolve({
      code: -1,
      msg: '笔记本ID和本地文件路径不能为空',
      data: null
    });
  }
  return 发送笔记本请求('importStdMd', {
    notebook: 选项.notebook,
    localPath: 选项.localPath,
    toPath: 选项.toPath || ''
  });
};

// 导出英文版API
export const getNotebookList = 获取笔记本列表;
export const openNotebook = 打开笔记本;
export const closeNotebook = 关闭笔记本;
export const createNotebook = 创建笔记本;
export const renameNotebook = 重命名笔记本;
export const removeNotebook = 删除笔记本;
export const getNotebookConfig = 获取笔记本配置;
export const setNotebookConfig = 设置笔记本配置;
export const setNotebookIcon = 设置笔记本图标;
export const setNotebooksSort = 设置笔记本排序;
export const importMarkdownToNotebook = 导入Markdown到笔记本; 