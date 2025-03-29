/**
 * 思源笔记块属性操作相关API
 * 兼容层：重定向到src/toolBox/useAge/forSiyuan/useSiyuanBlock.js
 */

import {
  getBlockAttrs as 获取块属性,
  setBlockAttrs as 设置块属性
} from '../../../src/toolBox/useAge/forSiyuan/useSiyuanBlock.js';

// 兼容原有API

/**
 * 导出块属性操作相关API
 */
export const getBlockAttrs = 获取块属性;
export const setBlockAttrs = 设置块属性;

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

export const getBookmarkLabels = (options = {}) => {
  return 未实现方法提示('getBookmarkLabels');
};

export const batchGetBlockAttrs = (ids, options = {}) => {
  console.warn('batchGetBlockAttrs 方法已迁移，请考虑使用Promise.all结合获取块属性实现批量获取');
  
  if (!Array.isArray(ids) || ids.length === 0) {
    return Promise.resolve({
      code: -1,
      msg: '块ID列表不能为空',
      data: null
    });
  }
  
  return 未实现方法提示('batchGetBlockAttrs');
};

export const batchSetBlockAttrs = (blockAttrs, options = {}) => {
  console.warn('batchSetBlockAttrs 方法已迁移，请考虑使用Promise.all结合设置块属性实现批量设置');
  
  if (!Array.isArray(blockAttrs) || blockAttrs.length === 0) {
    return Promise.resolve({
      code: -1,
      msg: '块属性列表不能为空',
      data: null
    });
  }
  
  return 未实现方法提示('batchSetBlockAttrs');
};

export const resetBlockAttrs = (id, attrs, options = {}) => {
  return 未实现方法提示('resetBlockAttrs');
}; 