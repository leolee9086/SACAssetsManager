/**
 * @fileoverview 思源笔记文件树操作API封装
 * @module toolBox/useAge/forSiyuan/forFiletree/useSiyuanFiletree
 * @requires 思源环境
 */

import { 检查思源环境 } from '../../useSiyuan.js';
import { 发送文件树请求 } from '../../../base/forNetWork/forSiyuanApi/apiBase.js';

// 检查环境
if (!检查思源环境()) {
  console.warn('当前不在思源环境中，部分功能可能不可用');
}

/**
 * 列出文档树
 * @param {Object} 选项 - 列表选项
 * @param {string} 选项.notebook - 笔记本ID
 * @param {string} 选项.path - 路径
 * @param {Object} [requestOptions] - 请求选项
 * @returns {Promise<Object>} 文档树结果
 */
export const 列出文档树 = (选项, requestOptions = {}) => {
  if (!选项?.notebook) {
    return Promise.resolve({
      code: -1,
      msg: '笔记本ID不能为空',
      data: null
    });
  }
  
  return 发送文件树请求('listDocTree', {
    notebook: 选项.notebook,
    path: 选项.path || ''
  }, requestOptions);
};

/**
 * 创建文档
 * @param {Object} 选项 - 创建选项
 * @param {string} 选项.notebook - 笔记本ID
 * @param {string} 选项.path - 路径
 * @param {string} 选项.title - 标题
 * @param {string} [选项.md] - Markdown内容
 * @param {string[]} [选项.sorts] - 排序
 * @param {Object} [requestOptions] - 请求选项
 * @returns {Promise<Object>} 创建结果
 */
export const 创建文档 = (选项, requestOptions = {}) => {
  if (!选项?.notebook || !选项?.path || !选项?.title) {
    return Promise.resolve({
      code: -1,
      msg: '笔记本ID、路径和标题不能为空',
      data: null
    });
  }
  
  return 发送文件树请求('createDoc', {
    notebook: 选项.notebook,
    path: 选项.path,
    title: 选项.title,
    md: 选项.md,
    sorts: 选项.sorts
  }, requestOptions);
};

/**
 * 创建每日笔记
 * @param {Object} 选项 - 创建选项
 * @param {string} 选项.notebook - 笔记本ID
 * @param {string} [选项.app] - 应用标识
 * @param {Object} [requestOptions] - 请求选项
 * @returns {Promise<Object>} 创建结果
 */
export const 创建每日笔记 = (选项, requestOptions = {}) => {
  if (!选项?.notebook) {
    return Promise.resolve({
      code: -1,
      msg: '笔记本ID不能为空',
      data: null
    });
  }
  
  return 发送文件树请求('createDailyNote', {
    notebook: 选项.notebook,
    app: 选项.app
  }, requestOptions);
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
      msg: '笔记本ID、路径和新标题不能为空',
      data: null
    });
  }
  
  return 发送文件树请求('renameDoc', {
    notebook: 选项.notebook,
    path: 选项.path,
    title: 选项.title
  }, requestOptions);
};

/**
 * 通过ID重命名文档
 * @param {Object} 选项 - 重命名选项
 * @param {string} 选项.id - 文档ID
 * @param {string} 选项.title - 新标题
 * @param {Object} [requestOptions] - 请求选项
 * @returns {Promise<Object>} 重命名结果
 */
export const 通过ID重命名文档 = (选项, requestOptions = {}) => {
  if (!选项?.id || !选项?.title) {
    return Promise.resolve({
      code: -1,
      msg: '文档ID和新标题不能为空',
      data: null
    });
  }
  
  return 发送文件树请求('renameDocByID', {
    id: 选项.id,
    title: 选项.title
  }, requestOptions);
};

/**
 * 移动文档
 * @param {Object} 选项 - 移动选项
 * @param {string[]} 选项.fromPaths - 源文件路径列表
 * @param {string} 选项.toNotebook - 目标笔记本ID
 * @param {string} 选项.toPath - 目标路径
 * @param {Object} [requestOptions] - 请求选项
 * @returns {Promise<Object>} 移动结果
 */
export const 移动文档 = (选项, requestOptions = {}) => {
  if (!选项?.fromPaths || !选项?.toNotebook || 选项?.toPath === undefined) {
    return Promise.resolve({
      code: -1,
      msg: '源文件路径列表、目标笔记本ID和目标路径不能为空',
      data: null
    });
  }
  
  return 发送文件树请求('moveDocs', {
    fromPaths: 选项.fromPaths,
    toNotebook: 选项.toNotebook,
    toPath: 选项.toPath
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
  
  return 发送文件树请求('removeDoc', {
    notebook: 选项.notebook,
    path: 选项.path
  }, requestOptions);
};

/**
 * 获取文档创建保存路径
 * @param {Object} 选项 - 选项
 * @param {string} 选项.notebook - 笔记本ID
 * @param {Object} [requestOptions] - 请求选项
 * @returns {Promise<Object>} 路径结果
 */
export const 获取文档创建保存路径 = (选项, requestOptions = {}) => {
  if (!选项?.notebook) {
    return Promise.resolve({
      code: -1,
      msg: '笔记本ID不能为空',
      data: null
    });
  }
  
  return 发送文件树请求('getDocCreateSavePath', {
    notebook: 选项.notebook
  }, requestOptions);
};

/**
 * 搜索文档
 * @param {Object} 选项 - 搜索选项
 * @param {string} 选项.k - 搜索关键字
 * @param {Object} [requestOptions] - 请求选项
 * @returns {Promise<Object>} 搜索结果
 */
export const 搜索文档 = (选项, requestOptions = {}) => {
  if (!选项?.k) {
    return Promise.resolve({
      code: -1,
      msg: '搜索关键字不能为空',
      data: null
    });
  }
  
  return 发送文件树请求('searchDocs', {
    k: 选项.k
  }, requestOptions);
};

/**
 * 根据路径列出文档
 * @param {Object} 选项 - 列表选项
 * @param {string} 选项.path - 路径
 * @param {Object} [requestOptions] - 请求选项
 * @returns {Promise<Object>} 文档列表
 */
export const 根据路径列出文档 = (选项, requestOptions = {}) => {
  if (!选项?.path) {
    return Promise.resolve({
      code: -1,
      msg: '路径不能为空',
      data: null
    });
  }
  
  return 发送文件树请求('listDocsByPath', {
    path: 选项.path
  }, requestOptions);
};

/**
 * 获取文档内容
 * @param {Object} 选项 - 获取选项
 * @param {string} 选项.id - 文档ID
 * @param {Object} [requestOptions] - 请求选项
 * @returns {Promise<Object>} 文档内容
 */
export const 获取文档 = (选项, requestOptions = {}) => {
  if (!选项?.id) {
    return Promise.resolve({
      code: -1,
      msg: '文档ID不能为空',
      data: null
    });
  }
  
  return 发送文件树请求('getDoc', {
    id: 选项.id
  }, requestOptions);
};

/**
 * 获取引用创建保存路径
 * @param {Object} 选项 - 获取选项
 * @param {string} 选项.notebook - 笔记本ID
 * @param {string} 选项.subtype - 引用子类型
 * @param {string} 选项.title - 标题
 * @param {Object} [requestOptions] - 请求选项
 * @returns {Promise<Object>} 路径结果
 */
export const 获取引用创建保存路径 = (选项, requestOptions = {}) => {
  if (!选项?.notebook || !选项?.subtype || !选项?.title) {
    return Promise.resolve({
      code: -1,
      msg: '笔记本ID、引用子类型和标题不能为空',
      data: null
    });
  }
  
  return 发送文件树请求('getRefCreateSavePath', {
    notebook: 选项.notebook,
    subtype: 选项.subtype,
    title: 选项.title
  }, requestOptions);
};

/**
 * 修改文档排序
 * @param {Object} 选项 - 排序选项
 * @param {string} 选项.notebook - 笔记本ID
 * @param {string} 选项.path - 文档路径
 * @param {string[]} 选项.sorts - 排序列表
 * @param {Object} [requestOptions] - 请求选项
 * @returns {Promise<Object>} 排序结果
 */
export const 修改文档排序 = (选项, requestOptions = {}) => {
  if (!选项?.notebook || !选项?.path || !选项?.sorts) {
    return Promise.resolve({
      code: -1,
      msg: '笔记本ID、文档路径和排序列表不能为空',
      data: null
    });
  }
  
  return 发送文件树请求('changeSort', {
    notebook: 选项.notebook,
    path: 选项.path,
    sorts: 选项.sorts
  }, requestOptions);
};

/**
 * 使用Markdown创建文档
 * @param {Object} 选项 - 创建选项
 * @param {string} 选项.notebook - 笔记本ID
 * @param {string} 选项.path - 路径
 * @param {string} 选项.markdown - Markdown内容
 * @param {Object} [requestOptions] - 请求选项
 * @returns {Promise<Object>} 创建结果
 */
export const 使用Markdown创建文档 = (选项, requestOptions = {}) => {
  if (!选项?.notebook || !选项?.path || !选项?.markdown) {
    return Promise.resolve({
      code: -1,
      msg: '笔记本ID、路径和Markdown内容不能为空',
      data: null
    });
  }
  
  return 发送文件树请求('createDocWithMd', {
    notebook: 选项.notebook,
    path: 选项.path,
    markdown: 选项.markdown
  }, requestOptions);
};

/**
 * 将文档转换为标题
 * @param {Object} 选项 - 转换选项
 * @param {string} 选项.notebook - 笔记本ID
 * @param {string} 选项.path - 文档路径
 * @param {string} 选项.parentPath - 父文档路径
 * @param {Object} [requestOptions] - 请求选项
 * @returns {Promise<Object>} 转换结果
 */
export const 文档转换为标题 = (选项, requestOptions = {}) => {
  if (!选项?.notebook || !选项?.path || !选项?.parentPath) {
    return Promise.resolve({
      code: -1,
      msg: '笔记本ID、文档路径和父文档路径不能为空',
      data: null
    });
  }
  
  return 发送文件树请求('doc2Heading', {
    notebook: 选项.notebook,
    path: 选项.path,
    parentPath: 选项.parentPath
  }, requestOptions);
};

/**
 * 将标题转换为文档
 * @param {Object} 选项 - 转换选项
 * @param {string} 选项.id - 标题块ID
 * @param {Object} [requestOptions] - 请求选项
 * @returns {Promise<Object>} 转换结果
 */
export const 标题转换为文档 = (选项, requestOptions = {}) => {
  if (!选项?.id) {
    return Promise.resolve({
      code: -1,
      msg: '标题块ID不能为空',
      data: null
    });
  }
  
  return 发送文件树请求('heading2Doc', {
    id: 选项.id
  }, requestOptions);
};

/**
 * 将列表项转换为文档
 * @param {Object} 选项 - 转换选项
 * @param {string} 选项.id - 列表项块ID
 * @param {Object} [requestOptions] - 请求选项
 * @returns {Promise<Object>} 转换结果
 */
export const 列表项转换为文档 = (选项, requestOptions = {}) => {
  if (!选项?.id) {
    return Promise.resolve({
      code: -1,
      msg: '列表项块ID不能为空',
      data: null
    });
  }
  
  return 发送文件树请求('li2Doc', {
    id: 选项.id
  }, requestOptions);
};

/**
 * 刷新文件树
 * @param {Object} [options] - 请求选项
 * @returns {Promise<Object>} 刷新结果
 */
export const 刷新文件树 = (options = {}) => {
  return 发送文件树请求('refreshFiletree', {}, options);
};

// 导出英文版API
export const listDocTree = 列出文档树;
export const createDoc = 创建文档;
export const createDailyNote = 创建每日笔记;
export const renameDoc = 重命名文档;
export const renameDocByID = 通过ID重命名文档;
export const moveDocs = 移动文档;
export const removeDoc = 删除文档;
export const getDocCreateSavePath = 获取文档创建保存路径;
export const searchDocs = 搜索文档;
export const listDocsByPath = 根据路径列出文档;
export const getDoc = 获取文档;
export const getRefCreateSavePath = 获取引用创建保存路径;
export const changeSort = 修改文档排序;
export const createDocWithMd = 使用Markdown创建文档;
export const doc2Heading = 文档转换为标题;
export const heading2Doc = 标题转换为文档;
export const li2Doc = 列表项转换为文档;
export const refreshFiletree = 刷新文件树; 