/**
 * @fileoverview 思源笔记块操作API封装
 * @module toolBox/useAge/forSiyuan/useSiyuanBlock
 * @requires 思源环境
 */

import { 检查思源环境 } from '../useSiyuan.js';
import { 发送块请求 } from '../../base/forNetWork/forSiyuanApi/apiBase.js';

// 检查环境
if (!检查思源环境()) {
  console.warn('当前不在思源环境中，部分功能可能不可用');
}

// 块信息查询 API

/**
 * 获取块信息
 * @param {string} id - 块ID
 * @param {Object} [options] - 请求选项
 * @returns {Promise<Object>} 块信息
 */
export const 获取块信息 = (id, options = {}) => {
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '块ID不能为空',
      data: null
    });
  }
  return 发送块请求('getBlockInfo', { id }, options);
};

/**
 * 获取块DOM
 * @param {string} id - 块ID
 * @param {Object} [options] - 请求选项
 * @returns {Promise<Object>} 块的DOM
 */
export const 获取块DOM = (id, options = {}) => {
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '块ID不能为空',
      data: null
    });
  }
  return 发送块请求('getBlockDOM', { id }, options);
};

/**
 * 获取块Markdown源码
 * @param {string} id - 块ID
 * @param {string} [模式='md'] - 导出模式：'md'(标记符) 或 'textmark'(文本标记)
 * @param {Object} [options] - 请求选项
 * @returns {Promise<Object>} 块的Markdown源码
 */
export const 获取块Markdown = (id, 模式 = 'md', options = {}) => {
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '块ID不能为空',
      data: null
    });
  }
  if (模式 !== 'md' && 模式 !== 'textmark') {
    return Promise.resolve({
      code: -1,
      msg: '无效的导出模式',
      data: null
    });
  }
  return 发送块请求('getBlockKramdown', { id, mode: 模式 }, options);
};

/**
 * 获取子块
 * @param {string} id - 块ID
 * @param {Object} [options] - 请求选项
 * @returns {Promise<Object>} 子块列表
 */
export const 获取子块 = (id, options = {}) => {
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '块ID不能为空',
      data: null
    });
  }
  return 发送块请求('getChildBlocks', { id }, options);
};

/**
 * 检查块是否存在
 * @param {string} id - 块ID
 * @param {Object} [options] - 请求选项
 * @returns {Promise<boolean>} 是否存在
 */
export const 检查块是否存在 = async (id, options = {}) => {
  if (!id) {
    return false;
  }
  const result = await 发送块请求('checkBlockExist', { id }, options);
  return result.code === 0 && result.data;
};

/**
 * 获取块引用文本
 * @param {string} id - 块ID
 * @param {Object} [options] - 请求选项
 * @returns {Promise<string>} 引用文本
 */
export const 获取块引用文本 = async (id, options = {}) => {
  if (!id) {
    return '';
  }
  const result = await 发送块请求('getRefText', { id }, options);
  return result.code === 0 ? result.data : '';
};

/**
 * 获取块面包屑
 * @param {string} id - 块ID
 * @param {string[]} [排除类型=[]] - 排除的类型
 * @param {Object} [options] - 请求选项
 * @returns {Promise<Object>} 面包屑信息
 */
export const 获取块面包屑 = (id, 排除类型 = [], options = {}) => {
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '块ID不能为空',
      data: null
    });
  }
  return 发送块请求('getBlockBreadcrumb', { id, excludeTypes: 排除类型 }, options);
};

// 块操作 API

/**
 * 更新块
 * @param {Object} 选项 - 更新选项
 * @param {string} 选项.id - 块ID
 * @param {string} 选项.data - 块内容
 * @param {string} [选项.dataType='markdown'] - 数据类型：'markdown' | 'dom'
 * @param {Object} [requestOptions] - 请求选项
 * @returns {Promise<Object>} 更新结果
 */
export const 更新块 = (选项, requestOptions = {}) => {
  if (!选项?.id || !选项?.data) {
    return Promise.resolve({
      code: -1,
      msg: '块ID和内容不能为空',
      data: null
    });
  }

  const { id, data, dataType = 'markdown' } = 选项;
  
  if (dataType && !['markdown', 'dom'].includes(dataType)) {
    return Promise.resolve({
      code: -1,
      msg: '无效的数据类型，必须是 markdown 或 dom',
      data: null
    });
  }

  return 发送块请求('updateBlock', { 
    id, 
    data,
    dataType
  }, requestOptions);
};

/**
 * 插入块
 * @param {Object} 选项 - 插入选项
 * @param {string} 选项.data - 块内容
 * @param {string} [选项.dataType='markdown'] - 数据类型：'markdown' | 'dom'
 * @param {string} 选项.previousID - 前一个块ID
 * @param {Object} [requestOptions] - 请求选项
 * @returns {Promise<Object>} 插入结果
 */
export const 插入块 = (选项, requestOptions = {}) => {
  if (!选项?.data || !选项?.previousID) {
    return Promise.resolve({
      code: -1,
      msg: '块内容和前一个块ID不能为空',
      data: null
    });
  }

  const { data, dataType = 'markdown', previousID } = 选项;
  
  if (dataType && !['markdown', 'dom'].includes(dataType)) {
    return Promise.resolve({
      code: -1,
      msg: '无效的数据类型，必须是 markdown 或 dom',
      data: null
    });
  }

  return 发送块请求('insertBlock', { 
    data, 
    dataType,
    previousID
  }, requestOptions);
};

/**
 * 追加块
 * @param {Object} 选项 - 追加选项
 * @param {string} 选项.data - 块内容
 * @param {string} [选项.dataType='markdown'] - 数据类型：'markdown' | 'dom'
 * @param {string} 选项.parentID - 父块ID
 * @param {Object} [requestOptions] - 请求选项
 * @returns {Promise<Object>} 追加结果
 */
export const 追加块 = (选项, requestOptions = {}) => {
  if (!选项?.data || !选项?.parentID) {
    return Promise.resolve({
      code: -1,
      msg: '块内容和父块ID不能为空',
      data: null
    });
  }

  const { data, dataType = 'markdown', parentID } = 选项;
  
  if (dataType && !['markdown', 'dom'].includes(dataType)) {
    return Promise.resolve({
      code: -1,
      msg: '无效的数据类型，必须是 markdown 或 dom',
      data: null
    });
  }

  return 发送块请求('appendBlock', { 
    data, 
    dataType,
    parentID
  }, requestOptions);
};

/**
 * 删除块
 * @param {string} id - 块ID
 * @param {Object} [options] - 请求选项
 * @returns {Promise<Object>} 删除结果
 */
export const 删除块 = (id, options = {}) => {
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '块ID不能为空',
      data: null
    });
  }
  return 发送块请求('deleteBlock', { id }, options);
};

/**
 * 移动块
 * @param {Object} 选项 - 移动选项
 * @param {string} 选项.id - 要移动的块ID
 * @param {string} 选项.previousID - 目标位置的前一个块ID，为空时将移动到父块第一个子块位置
 * @param {string} 选项.parentID - 目标父块ID
 * @param {Object} [requestOptions] - 请求选项
 * @returns {Promise<Object>} 移动结果
 */
export const 移动块 = (选项, requestOptions = {}) => {
  if (!选项?.id || (!选项?.previousID && !选项?.parentID)) {
    return Promise.resolve({
      code: -1,
      msg: '块ID和目标位置不能同时为空',
      data: null
    });
  }

  const { id, previousID, parentID } = 选项;

  return 发送块请求('moveBlock', { 
    id, 
    previousID,
    parentID
  }, requestOptions);
};

/**
 * 设置块属性
 * @param {Object} 选项 - 设置选项
 * @param {string} 选项.id - 块ID
 * @param {Object} 选项.attrs - 要设置的属性对象
 * @param {Object} [requestOptions] - 请求选项
 * @returns {Promise<Object>} 设置结果
 */
export const 设置块属性 = (选项, requestOptions = {}) => {
  if (!选项?.id || !选项?.attrs || typeof 选项.attrs !== 'object') {
    return Promise.resolve({
      code: -1,
      msg: '块ID和属性对象不能为空',
      data: null
    });
  }

  const { id, attrs } = 选项;

  return 发送块请求('setBlockAttrs', { 
    id, 
    attrs
  }, requestOptions);
};

/**
 * 获取块属性
 * @param {string} id - 块ID
 * @param {Object} [options] - 请求选项
 * @returns {Promise<Object>} 属性对象
 */
export const 获取块属性 = (id, options = {}) => {
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '块ID不能为空',
      data: null
    });
  }
  return 发送块请求('getBlockAttrs', { id }, options);
};

// 导出英文版API
export const getBlockInfo = 获取块信息;
export const getBlockDOM = 获取块DOM;
export const getBlockMarkdown = 获取块Markdown;
export const getChildBlocks = 获取子块;
export const checkBlockExist = 检查块是否存在;
export const getBlockRefText = 获取块引用文本;
export const getBlockBreadcrumb = 获取块面包屑;
export const updateBlock = 更新块;
export const insertBlock = 插入块;
export const appendBlock = 追加块;
export const deleteBlock = 删除块;
export const moveBlock = 移动块;
export const setBlockAttributes = 设置块属性;
export const getBlockAttributes = 获取块属性; 