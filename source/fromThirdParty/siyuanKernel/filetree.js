/**
 * @fileoverview 【已废弃】思源笔记文件树操作API
 * 此文件为兼容层，请不要直接使用。
 * 请从 src/toolBox/useAge/forSiyuan/forFiletree/useSiyuanFiletree.js 导入
 */

import {
  listDocTree,
  createDoc,
  createDailyNote,
  renameDoc,
  renameDocByID,
  moveDocs,
  removeDoc,
  getDocCreateSavePath,
  searchDocs,
  listDocsByPath,
  getDoc,
  getRefCreateSavePath,
  changeSort,
  createDocWithMd,
  doc2Heading,
  heading2Doc,
  li2Doc,
  refreshFiletree,
  列出文档树,
  创建文档,
  创建每日笔记,
  重命名文档,
  通过ID重命名文档,
  移动文档,
  删除文档,
  获取文档创建保存路径,
  搜索文档,
  根据路径列出文档,
  获取文档,
  获取引用创建保存路径,
  修改文档排序,
  使用Markdown创建文档,
  文档转换为标题,
  标题转换为文档,
  列表项转换为文档,
  刷新文件树,
} from '../../../src/toolBox/useAge/forSiyuan/forFiletree/useSiyuanFiletree.js';

// 记录警告
console.warn('siyuanKernel/filetree.js 已经废弃，请从 src/toolBox/useAge/forSiyuan/forFiletree/useSiyuanFiletree.js 导入');

// 为兼容性重新导出
export {
  // 英文API
  listDocTree,
  createDoc,
  createDailyNote,
  renameDoc,
  renameDocByID,
  moveDocs,
  removeDoc,
  getDocCreateSavePath,
  searchDocs,
  listDocsByPath,
  getDoc,
  getRefCreateSavePath,
  changeSort,
  createDocWithMd,
  doc2Heading,
  heading2Doc,
  li2Doc,
  refreshFiletree,
  
  // 中文API
  列出文档树,
  创建文档,
  创建每日笔记,
  重命名文档,
  通过ID重命名文档,
  移动文档,
  删除文档,
  获取文档创建保存路径,
  搜索文档,
  根据路径列出文档,
  获取文档,
  获取引用创建保存路径,
  修改文档排序,
  使用Markdown创建文档,
  文档转换为标题,
  标题转换为文档,
  列表项转换为文档,
  刷新文件树,
};

/**
 * 发送文件树请求
 * @deprecated 使用 src/toolBox/useAge/forSiyuan/forFiletree/useSiyuanFiletree.js 中的函数代替
 * @param {string} url 请求地址
 * @param {Object} data 请求数据
 * @returns {Promise<Object>} 响应结果
 */
export const sendFiletreeRequest = async (url, data) => {
  console.warn('sendFiletreeRequest 已经废弃，请从 src/toolBox/useAge/forSiyuan/forFiletree/useSiyuanFiletree.js 导入');
  const { 发送文件树请求 } = await import('../../../src/toolBox/base/forNetWork/forSiyuanApi/apiBase.js');
  return 发送文件树请求(url, data);
}; 