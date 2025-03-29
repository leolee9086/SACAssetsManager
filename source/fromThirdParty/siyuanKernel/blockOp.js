/**
 * 思源笔记块操作相关API
 * 兼容层：重定向到src/toolBox/useAge/forSiyuan/useSiyuanBlock.js
 */

import {
  moveBlock as 移动块,
  insertBlock as 插入块,
  updateBlock as 更新块,
  deleteBlock as 删除块,
  appendBlock as 追加块,
  prependBlock as 前置块,
  foldBlock as 折叠块,
  unfoldBlock as 展开块
} from '../../../src/toolBox/useAge/forSiyuan/useSiyuanBlock.js';

// 兼容原有API

/**
 * 导出块操作相关API
 */
export const moveBlock = 移动块;
export const insertBlock = 插入块;
export const updateBlock = 更新块;
export const deleteBlock = 删除块;
export const appendBlock = 追加块;
export const prependBlock = 前置块;
export const foldBlock = 折叠块;
export const unfoldBlock = 展开块;

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

export const moveOutlineHeading = (options, apiOptions = {}) => {
  return 未实现方法提示('moveOutlineHeading');
};

export const appendDailyNoteBlock = (options, apiOptions = {}) => {
  return 未实现方法提示('appendDailyNoteBlock');
};

export const prependDailyNoteBlock = (options, apiOptions = {}) => {
  return 未实现方法提示('prependDailyNoteBlock');
};

// 用示例：
/*
// 移动块
await moveBlock({
  id: '20210808180117-6v0mkxr',
  parentID: '20210808180117-7v0mkxr',
  previousID: '20210808180117-8v0mkxr'
});

// 插入块
await insertBlock({
  data: '# 新标题',
  dataType: 'markdown',
  parentID: '20210808180117-6v0mkxr'
});

// 更新块
await updateBlock({
  id: '20210808180117-6v0mkxr',
  data: '更新后的内容',
  dataType: 'markdown'
});
*/ 