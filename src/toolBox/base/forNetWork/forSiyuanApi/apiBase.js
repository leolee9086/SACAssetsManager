/**
 * @fileoverview 思源笔记API请求基础模块
 * @module toolBox/base/forNetWork/forSiyuanApi/apiBase
 * @description 提供统一的思源API请求处理、缓存和重试机制
 */

import { 检查思源环境 } from '../../../useAge/useSiyuan.js';

// 简单的内存缓存
const apiCache = new Map();

/**
 * 清除特定API的缓存
 * @param {string} cacheKey - 缓存键名
 */
export const 清除API缓存 = (cacheKey) => {
  if (cacheKey) {
    apiCache.delete(cacheKey);
  } else {
    apiCache.clear();
  }
};

/**
 * 生成缓存键
 * @private
 * @param {string} apiPath - API路径
 * @param {string} endpoint - API端点
 * @param {Object|FormData} data - 请求数据
 * @returns {string} 缓存键
 */
const 生成缓存键 = (apiPath, endpoint, data) => {
  if (data instanceof FormData) {
    return `${apiPath}/${endpoint}/${Date.now()}`;
  }
  return `${apiPath}/${endpoint}/${JSON.stringify(data)}`;
};

/**
 * 基础思源API请求
 * @param {string} apiPath - API路径，如'workspace'、'notebook'
 * @param {string} endpoint - API端点
 * @param {Object|FormData} data - 请求数据
 * @param {Object} options - 请求选项
 * @param {boolean} [options.使用FormData=false] - 是否使用FormData格式
 * @param {boolean} [options.使用缓存=false] - 是否使用缓存
 * @param {number} [options.缓存时间=60000] - 缓存有效期(毫秒)
 * @param {number} [options.重试次数=3] - 失败时的重试次数
 * @param {number} [options.重试延迟=300] - 重试延迟时间(毫秒)
 * @param {number} [options.超时时间=30000] - 请求超时时间(毫秒)
 * @returns {Promise<Object>} 请求结果
 */
export const 发送思源请求 = async (apiPath, endpoint, data = {}, options = {}) => {
  const {
    使用FormData = false,
    使用缓存 = false,
    缓存时间 = 60000,
    重试次数 = 3,
    重试延迟 = 300,
    超时时间 = 30000
  } = options;

  // 检查思源环境
  if (!检查思源环境()) {
    return {
      code: -1,
      msg: '思源环境不可用',
      data: null
    };
  }

  // 缓存处理
  if (使用缓存 && !使用FormData) {
    const cacheKey = 生成缓存键(apiPath, endpoint, data);
    const cached = apiCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < 缓存时间) {
      // 返回缓存数据的副本，避免引用问题
      return JSON.parse(JSON.stringify(cached.data));
    }
    
    // 进行实际请求，并在成功后缓存结果
    const result = await 带重试的请求(apiPath, endpoint, data, 使用FormData, 重试次数, 重试延迟, 超时时间);
    
    if (result.code === 0) {
      apiCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });
    }
    
    return result;
  }

  // 不使用缓存，直接发送请求
  return 带重试的请求(apiPath, endpoint, data, 使用FormData, 重试次数, 重试延迟, 超时时间);
};

/**
 * 带重试机制的请求
 * @private
 * @param {string} apiPath - API路径
 * @param {string} endpoint - API端点
 * @param {Object|FormData} data - 请求数据
 * @param {boolean} 使用FormData - 是否使用FormData格式
 * @param {number} 重试次数 - 失败时的重试次数
 * @param {number} 重试延迟 - 重试延迟时间(毫秒)
 * @param {number} 超时时间 - 请求超时时间(毫秒)
 * @returns {Promise<Object>} 请求结果
 */
const 带重试的请求 = async (apiPath, endpoint, data, 使用FormData, 重试次数, 重试延迟, 超时时间) => {
  let 当前重试 = 0;
  let 当前延迟 = 重试延迟;
  let 最后错误 = null;

  while (当前重试 <= 重试次数) {
    try {
      return await 带超时的请求(apiPath, endpoint, data, 使用FormData, 超时时间);
    } catch (错误) {
      最后错误 = 错误;
      console.warn(`思源API请求失败，正在重试(${当前重试}/${重试次数}): ${apiPath}/${endpoint}`, 错误);
      
      // 最后一次尝试失败，直接返回错误
      if (当前重试 >= 重试次数) {
        break;
      }
      
      // 等待一段时间后重试
      await new Promise(resolve => setTimeout(resolve, 当前延迟));
      当前重试++;
      当前延迟 *= 1.5; // 指数退避
    }
  }

  // 所有重试都失败
  console.error(`思源API请求失败，已重试${重试次数}次: ${apiPath}/${endpoint}`, 最后错误);
  return {
    code: -1,
    msg: 最后错误?.message || '请求失败，请检查网络连接',
    data: null,
    error: 最后错误
  };
};

/**
 * 带超时的请求
 * @private
 * @param {string} apiPath - API路径
 * @param {string} endpoint - API端点
 * @param {Object|FormData} data - 请求数据
 * @param {boolean} 使用FormData - 是否使用FormData格式
 * @param {number} 超时时间 - 请求超时时间(毫秒)
 * @returns {Promise<Object>} 请求结果
 */
const 带超时的请求 = (apiPath, endpoint, data, 使用FormData, 超时时间) => {
  return new Promise((resolve, reject) => {
    // 超时处理
    const timeoutId = setTimeout(() => {
      reject(new Error(`请求超时: ${apiPath}/${endpoint}`));
    }, 超时时间);
    
    // 发起实际请求
    const headers = !使用FormData ? { 'Content-Type': 'application/json' } : undefined;
    const body = !使用FormData ? JSON.stringify(data) : data;
    
    fetch(`/api/${apiPath}/${endpoint}`, {
      method: 'POST',
      headers,
      body
    })
    .then(response => {
      clearTimeout(timeoutId);
      if (!response.ok) {
        throw new Error(`请求失败: ${response.status} ${response.statusText}`);
      }
      return response.json();
    })
    .then(result => {
      resolve(result);
    })
    .catch(error => {
      clearTimeout(timeoutId);
      reject(error);
    });
  });
};

/**
 * 块API请求
 * @param {string} endpoint - API端点
 * @param {Object} data - 请求数据
 * @param {Object} [options] - 请求选项
 * @returns {Promise<Object>} 请求结果
 */
export const 发送块请求 = (endpoint, data = {}, options = {}) => {
  return 发送思源请求('block', endpoint, data, options);
};

/**
 * 笔记本API请求
 * @param {string} endpoint - API端点
 * @param {Object} data - 请求数据
 * @param {Object} [options] - 请求选项
 * @returns {Promise<Object>} 请求结果
 */
export const 发送笔记本请求 = (endpoint, data = {}, options = {}) => {
  return 发送思源请求('notebook', endpoint, data, options);
};

/**
 * 工作区API请求
 * @param {string} endpoint - API端点
 * @param {Object} data - 请求数据
 * @param {Object} [options] - 请求选项
 * @returns {Promise<Object>} 请求结果
 */
export const 发送工作区请求 = (endpoint, data = {}, options = {}) => {
  return 发送思源请求('workspace', endpoint, data, options);
};

/**
 * 资源文件API请求
 * @param {string} endpoint - API端点
 * @param {Object|FormData} data - 请求数据
 * @param {Object} [options] - 请求选项
 * @returns {Promise<Object>} 请求结果
 */
export const 发送资源请求 = (endpoint, data = {}, options = {}) => {
  const 默认选项 = { 使用FormData: data instanceof FormData };
  return 发送思源请求('asset', endpoint, data, { ...默认选项, ...options });
};

/**
 * SQL查询API请求
 * @param {string} sql - SQL语句
 * @param {Object} [options] - 请求选项
 * @returns {Promise<Object>} 查询结果
 */
export const 发送SQL查询 = (sql, options = {}) => {
  return 发送思源请求('query', 'sql', { stmt: sql }, options);
};

/**
 * 搜索API请求
 * @param {Object} 查询条件 - 搜索条件
 * @param {Object} [options] - 请求选项
 * @returns {Promise<Object>} 搜索结果
 */
export const 发送搜索请求 = (查询条件, options = {}) => {
  return 发送思源请求('search', 'fullTextSearchBlock', 查询条件, options);
};

/**
 * 同步API请求
 * @param {string} endpoint - API端点
 * @param {Object} data - 请求数据
 * @param {Object} [options] - 请求选项
 * @returns {Promise<Object>} 请求结果
 */
export const 发送同步请求 = (endpoint, data = {}, options = {}) => {
  return 发送思源请求('sync', endpoint, data, options);
};

// 导出英文版API
export const sendSiyuanRequest = 发送思源请求;
export const clearApiCache = 清除API缓存;
export const sendBlockRequest = 发送块请求;
export const sendNotebookRequest = 发送笔记本请求;
export const sendWorkspaceRequest = 发送工作区请求;
export const sendAssetRequest = 发送资源请求;
export const sendSQLQuery = 发送SQL查询;
export const sendSearchRequest = 发送搜索请求;
export const sendSyncRequest = 发送同步请求; 