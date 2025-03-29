/**
 * 思源笔记块操作相关API
 * 兼容层：重定向到src/toolBox/useAge/forSiyuan/useSiyuanBlock.js
 */

import {
  getBlockInfo as 获取块信息,
  getBlockDOM as 获取块DOM,
  getBlockMarkdown as 获取块Markdown,
  getChildBlocks as 获取子块,
  getBlockRefText as 获取块引用文本,
  getBlockBreadcrumb as 获取块面包屑,
  checkBlockExist as 检查块是否存在
} from '../../../src/toolBox/useAge/forSiyuan/useSiyuanBlock.js';

// 兼容原有API

/**
 * 导出块信息相关API
 */
export const getBlockInfo = 获取块信息;
export const getBlockDOM = 获取块DOM;
export const getBlockKramdown = 获取块Markdown;
export const getChildBlocks = 获取子块;
export const getRefText = 获取块引用文本;
export const getBlockBreadcrumb = 获取块面包屑;
export const checkBlockExist = 检查块是否存在;

/**
 * 以下方法在新版API中暂未实现，使用时会提示
 */
const 未实现方法提示 = (方法名) => {
  console.warn(`${方法名} 方法已迁移到新版API，但尚未实现，请联系开发者`);
  return Promise.resolve({
    code: -1,
    msg: `${方法名} 方法已迁移但尚未实现`,
    data: null
  });
};

export const getBlockTreeInfos = (ids, options = {}) => {
  console.warn('getBlockTreeInfos 方法已迁移到新版API，请使用 useSiyuanBlock 模块中的方法');
  // 暂时兼容处理
  if (Array.isArray(ids) && ids.length === 1) {
    return 获取块信息(ids[0]);
  }
  return 未实现方法提示('getBlockTreeInfos');
};

export const getBlockSiblingID = (id, options = {}) => {
  return 未实现方法提示('getBlockSiblingID');
};

export const getBlockIndex = (id, options = {}) => {
  return 未实现方法提示('getBlockIndex');
};

export const getTreeStat = (id, options = {}) => {
  return 未实现方法提示('getTreeStat');
};

export const getBlocksWordCount = (ids, options = {}) => {
  return 未实现方法提示('getBlocksWordCount');
};

export const getContentWordCount = (content, options = {}) => {
  return 未实现方法提示('getContentWordCount');
};

export const getRecentUpdatedBlocks = (params = {}, options = {}) => {
  return 未实现方法提示('getRecentUpdatedBlocks');
};

export const getDocInfo = (id, options = {}) => {
  return 未实现方法提示('getDocInfo');
};

export const getBlocksIAL = (ids, options = {}) => {
  return 未实现方法提示('getBlocksIAL');
};

// 使用示例：
/*
// 获取块信息
const blockInfo = await getBlockInfo('20210808180117-6v0mkxr');

// 获取块DOM
const blockDOM = await getBlockDOM('20210808180117-6v0mkxr');

// 获取块Markdown源码
const blockKramdown = await getBlockKramdown('20210808180117-6v0mkxr', 'textmark');

// 获取子块
const children = await getChildBlocks('20210808180117-6v0mkxr');
*/ 