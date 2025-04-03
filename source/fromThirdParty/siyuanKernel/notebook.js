/**
 * @fileoverview 已弃用 - 思源笔记本API
 * @deprecated 请直接从toolBox导入函数：
 * - 笔记本操作: src/toolBox/useAge/forSiyuan/useSiyuanNotebook.js
 * - 或使用集中API: src/toolBox/useAge/useSiyuan.js 中的 notebook 和 api.notebook
 */

// 从新路径导入函数
import * as notebookApi from '../../../src/toolBox/useAge/forSiyuan/useSiyuanNotebook.js';

// 兼容性导出
export const getNotebookInfo = notebookApi.getNotebookInfo || notebookApi.获取笔记本信息;
export const createNotebook = notebookApi.createNotebook || notebookApi.创建笔记本;
export const renameNotebook = notebookApi.renameNotebook || notebookApi.重命名笔记本;
export const removeNotebook = notebookApi.removeNotebook || notebookApi.删除笔记本;
export const lsNotebooks = notebookApi.lsNotebooks || notebookApi.获取笔记本列表;
export const setNotebookConf = notebookApi.setNotebookConf || notebookApi.设置笔记本配置;
export const setNotebookIcon = notebookApi.setNotebookIcon || notebookApi.设置笔记本图标;
export const setNotebookSort = notebookApi.setNotebookSort || notebookApi.设置笔记本排序;
export const openNotebook = notebookApi.openNotebook || notebookApi.打开笔记本;
export const closeNotebook = notebookApi.closeNotebook || notebookApi.关闭笔记本;

// 此文件已弃用，请直接从toolBox导入相应函数
console.warn('siyuanKernel/notebook.js 已弃用，请直接从 src/toolBox/useAge 导入相应函数'); 