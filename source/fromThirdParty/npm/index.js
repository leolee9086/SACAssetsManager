/**
 * @fileoverview 【已废弃】npm API入口
 * 此文件为兼容层，请不要直接使用。
 * 请从 src/toolBox/useAge/forNpm/useNpmApi.js 导入相应功能
 */

import {
  获取包信息 as getPackageInfo,
  获取包版本列表 as getPackageVersions,
  搜索包 as searchPackages,
  带超时请求 as fetchWithTimeout
} from '../../../src/toolBox/useAge/forNpm/useNpmApi.js';

// 记录警告
console.warn('npm/index.js 已经废弃，请从 src/toolBox/useAge/forNpm/useNpmApi.js 导入相应功能');

// 为兼容性重新导出
export {
  getPackageInfo,
  getPackageVersions,
  searchPackages,
  fetchWithTimeout
};

