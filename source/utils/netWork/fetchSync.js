/**
 * @fileoverview 已弃用 - 同步版本的fetch工具
 * @deprecated 请直接从对应toolBox文件导入函数：
 * - fetchSync: src/toolBox/base/forNetWork/forFetch/fetchSyncTools.js
 * - fetchSyncJSON: src/toolBox/base/forNetWork/forFetch/fetchSyncTools.js
 * - fetchSyncText: src/toolBox/base/forNetWork/forFetch/fetchSyncTools.js
 */

// 从新路径导入函数
import {
    同步发起请求,
    同步获取JSON,
    同步获取文本,
    fetchSync,
    fetchSyncJSON,
    fetchSyncText
} from '../../src/toolBox/base/forNetWork/forFetch/fetchSyncTools.js';

// 为向后兼容重新导出所有函数
export {
    同步发起请求,
    同步获取JSON,
    同步获取文本,
    fetchSync,
    fetchSyncJSON,
    fetchSyncText
};

// 优先使用英文命名的函数以保持兼容性
export default fetchSync;

// 此文件已弃用，请直接从toolBox导入相应函数
console.warn('fetchSync.js 已弃用，请直接从toolBox/base/forNetWork/forFetch/fetchSyncTools.js导入相应函数');

// 移除重复定义的fetchSync函数，避免标识符重复声明的错误
