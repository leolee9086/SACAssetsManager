/**
 * @fileoverview 兼容层 - 对象操作工具
 * 此文件作为兼容层保持API兼容性
 * @deprecated 请直接从src/toolBox/base/useEcma/forObjectManagement/forDeepCopy.js导入函数
 */

import {
  深拷贝,
  深度合并,
  扁平化对象,
  还原嵌套对象,
  对象差异,
  安全获取,
  安全设置,
  deepCopy,
  deepMerge,
  flattenObject,
  unflattenObject,
  objectDiff,
  safeGet,
  safeSet
} from '../../src/toolBox/base/useEcma/forObjectManagement/forDeepCopy.js';

// 为向后兼容重新导出所有函数
export {
  深拷贝,
  深度合并,
  扁平化对象,
  还原嵌套对象,
  对象差异,
  安全获取,
  安全设置,
  deepCopy,
  deepMerge,
  flattenObject,
  unflattenObject,
  objectDiff,
  safeGet,
  safeSet
};

// 兼容旧版API名称
export const deepClone = 深拷贝;
export const merge = 深度合并;
export const flatten = 扁平化对象;
export const unflatten = 还原嵌套对象;
export const diff = 对象差异;
export const get = 安全获取;
export const set = 安全设置;

// 默认导出
export default {
  深拷贝,
  深度合并,
  扁平化对象,
  还原嵌套对象,
  对象差异,
  安全获取,
  安全设置,
  deepCopy,
  deepMerge,
  flattenObject,
  unflattenObject,
  objectDiff,
  safeGet,
  safeSet,
  deepClone,
  merge,
  flatten,
  unflatten,
  diff,
  get,
  set
}; 