/**
 * @fileoverview 思源笔记笔记本操作API封装
 * @module toolBox/useAge/forSiyuan/useSiyuanNotebook
 * @requires 思源环境
 */

import { 检查思源环境 } from '../useSiyuan.js';
import { 发送笔记本请求 } from '../../base/forNetWork/forSiyuanApi/apiBase.js';

// 检查环境
if (!检查思源环境()) {
  console.warn('当前不在思源环境中，部分功能可能不可用');
}

/**
 * 获取所有笔记本列表
 * @param {Object} [options] - 请求选项，如使用缓存等
 * @returns {Promise<Object>} 笔记本列表
 */
export const 获取笔记本列表 = (options = {}) => {
  // 对于不频繁变化的数据，可以使用默认缓存
  const defaultOptions = { 使用缓存: true, 缓存时间: 60000 }; // 默认缓存1分钟
  return 发送笔记本请求('lsNotebooks', {}, { ...defaultOptions, ...options });
};

/**
 * 获取笔记本信息
 * @param {string} id - 笔记本ID
 * @param {Object} [options] - 请求选项
 * @returns {Promise<Object>} 笔记本信息
 */
export const 获取笔记本信息 = (id, options = {}) => {
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '笔记本ID不能为空',
      data: null
    });
  }
  return 发送笔记本请求('getNotebookInfo', { notebook: id }, options);
};

/**
 * 打开笔记本
 * @param {string} id - 笔记本ID
 * @param {Object} [options] - 请求选项
 * @returns {Promise<Object>} 打开结果
 */
export const 打开笔记本 = (id, options = {}) => {
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '笔记本ID不能为空',
      data: null
    });
  }
  return 发送笔记本请求('openNotebook', { notebook: id }, options);
};

/**
 * 关闭笔记本
 * @param {string} id - 笔记本ID
 * @param {Object} [options] - 请求选项
 * @returns {Promise<Object>} 关闭结果
 */
export const 关闭笔记本 = (id, options = {}) => {
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '笔记本ID不能为空',
      data: null
    });
  }
  return 发送笔记本请求('closeNotebook', { notebook: id }, options);
};

/**
 * 创建笔记本
 * @param {Object} 选项 - 创建选项
 * @param {string} 选项.name - 笔记本名称
 * @param {Object} [requestOptions] - 请求选项
 * @returns {Promise<Object>} 创建结果
 */
export const 创建笔记本 = (选项, requestOptions = {}) => {
  if (!选项?.name) {
    return Promise.resolve({
      code: -1,
      msg: '笔记本名称不能为空',
      data: null
    });
  }
  return 发送笔记本请求('createNotebook', { name: 选项.name }, requestOptions);
};

/**
 * 重命名笔记本
 * @param {Object} 选项 - 重命名选项
 * @param {string} 选项.notebook - 笔记本ID
 * @param {string} 选项.name - 新名称
 * @param {Object} [requestOptions] - 请求选项
 * @returns {Promise<Object>} 重命名结果
 */
export const 重命名笔记本 = (选项, requestOptions = {}) => {
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
  }, requestOptions);
};

/**
 * 删除笔记本
 * @param {string} id - 笔记本ID
 * @param {Object} [options] - 请求选项
 * @returns {Promise<Object>} 删除结果
 */
export const 删除笔记本 = (id, options = {}) => {
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '笔记本ID不能为空',
      data: null
    });
  }
  return 发送笔记本请求('removeNotebook', { notebook: id }, options);
};

/**
 * 获取笔记本配置
 * @param {string} id - 笔记本ID
 * @param {Object} [options] - 请求选项
 * @returns {Promise<Object>} 笔记本配置
 */
export const 获取笔记本配置 = (id, options = {}) => {
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '笔记本ID不能为空',
      data: null
    });
  }
  return 发送笔记本请求('getNotebookConf', { notebook: id }, options);
};

/**
 * 设置笔记本配置
 * @param {Object} 选项 - 配置选项
 * @param {string} 选项.notebook - 笔记本ID
 * @param {Object} 选项.conf - 笔记本配置
 * @param {Object} [requestOptions] - 请求选项
 * @returns {Promise<Object>} 设置结果
 */
export const 设置笔记本配置 = (选项, requestOptions = {}) => {
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
  }, requestOptions);
};

/**
 * 为笔记本设置图标
 * @param {Object} 选项 - 设置选项
 * @param {string} 选项.notebook - 笔记本ID
 * @param {string} 选项.icon - 图标Emoji或图标URL
 * @param {Object} [requestOptions] - 请求选项
 * @returns {Promise<Object>} 设置结果
 */
export const 设置笔记本图标 = (选项, requestOptions = {}) => {
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
  }, requestOptions);
};

/**
 * 设置笔记本排序
 * @param {Object} 选项 - 排序选项
 * @param {string[]} 选项.notebooks - 笔记本ID数组，按排序顺序
 * @param {Object} [requestOptions] - 请求选项
 * @returns {Promise<Object>} 排序结果
 */
export const 设置笔记本排序 = (选项, requestOptions = {}) => {
  if (!选项?.notebooks || !Array.isArray(选项.notebooks)) {
    return Promise.resolve({
      code: -1,
      msg: '笔记本ID数组不能为空',
      data: null
    });
  }
  return 发送笔记本请求('setNotebooksSort', { notebooks: 选项.notebooks }, requestOptions);
};

/**
 * 导入Markdown文件到笔记本
 * @param {Object} 选项 - 导入选项
 * @param {string} 选项.notebook - 目标笔记本ID
 * @param {string} 选项.localPath - 本地Markdown文件路径
 * @param {string} [选项.toPath=''] - 目标路径
 * @param {Object} [requestOptions] - 请求选项
 * @returns {Promise<Object>} 导入结果
 */
export const 导入Markdown到笔记本 = (选项, requestOptions = {}) => {
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
  }, requestOptions);
};

// 导出英文版API
export const getNotebooks = 获取笔记本列表;
export const getNotebookInfo = 获取笔记本信息;
export const openNotebook = 打开笔记本;
export const closeNotebook = 关闭笔记本;
export const createNotebook = 创建笔记本;
export const renameNotebook = 重命名笔记本;
export const removeNotebook = 删除笔记本;
export const getNotebookConf = 获取笔记本配置;
export const setNotebookConf = 设置笔记本配置;
export const setNotebookIcon = 设置笔记本图标;
export const setNotebookSort = 设置笔记本排序;
export const importMarkdownToNotebook = 导入Markdown到笔记本;
export const lsNotebooks = 获取笔记本列表; // 兼容原API 