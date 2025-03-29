/**
 * @fileoverview 思源笔记块操作API封装
 * @module toolBox/useAge/forSiyuan/useSiyuanBlock
 * @requires 思源环境
 */

import { 检查思源环境 } from '../../useSiyuan.js';

// 检查环境
if (!检查思源环境()) {
  console.warn('当前不在思源环境中，部分功能可能不可用');
}

/**
 * 发送块相关请求的通用方法
 * @private
 * @param {string} endpoint - API 端点
 * @param {Object} data - 请求数据
 * @returns {Promise<Object>} 请求结果
 */
const 发送块请求 = async (endpoint, data = {}) => {
  try {
    if (!window.siyuan) {
      throw new Error('思源环境不可用');
    }
    
    const response = await fetch(`/api/block/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`请求失败: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`块${endpoint}操作失败:`, error);
    return {
      code: -1,
      msg: error.message,
      data: null
    };
  }
};

// 块信息查询 API

/**
 * 获取块信息
 * @param {string} id - 块ID
 * @returns {Promise<Object>} 块信息
 */
export const 获取块信息 = (id) => {
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '块ID不能为空',
      data: null
    });
  }
  return 发送块请求('getBlockInfo', { id });
};

/**
 * 获取块DOM
 * @param {string} id - 块ID
 * @returns {Promise<Object>} 块的DOM
 */
export const 获取块DOM = (id) => {
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '块ID不能为空',
      data: null
    });
  }
  return 发送块请求('getBlockDOM', { id });
};

/**
 * 获取块Markdown源码
 * @param {string} id - 块ID
 * @param {string} [模式='md'] - 导出模式：'md'(标记符) 或 'textmark'(文本标记)
 * @returns {Promise<Object>} 块的Markdown源码
 */
export const 获取块Markdown = (id, 模式 = 'md') => {
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
  return 发送块请求('getBlockKramdown', { id, mode: 模式 });
};

/**
 * 获取子块
 * @param {string} id - 块ID
 * @returns {Promise<Object>} 子块列表
 */
export const 获取子块 = (id) => {
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '块ID不能为空',
      data: null
    });
  }
  return 发送块请求('getChildBlocks', { id });
};

/**
 * 检查块是否存在
 * @param {string} id - 块ID
 * @returns {Promise<boolean>} 是否存在
 */
export const 检查块是否存在 = async (id) => {
  if (!id) {
    return false;
  }
  const result = await 发送块请求('checkBlockExist', { id });
  return result.code === 0 && result.data;
};

/**
 * 获取块引用文本
 * @param {string} id - 块ID
 * @returns {Promise<string>} 引用文本
 */
export const 获取块引用文本 = async (id) => {
  if (!id) {
    return '';
  }
  const result = await 发送块请求('getRefText', { id });
  return result.code === 0 ? result.data : '';
};

/**
 * 获取块面包屑
 * @param {string} id - 块ID
 * @param {string[]} [排除类型=[]] - 排除的类型
 * @returns {Promise<Object>} 面包屑信息
 */
export const 获取块面包屑 = (id, 排除类型 = []) => {
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '块ID不能为空',
      data: null
    });
  }
  return 发送块请求('getBlockBreadcrumb', { id, excludeTypes: 排除类型 });
};

// 块操作 API

/**
 * 更新块
 * @param {Object} 选项 - 更新选项
 * @param {string} 选项.id - 块ID
 * @param {string} 选项.data - 块内容
 * @param {string} [选项.dataType='markdown'] - 数据类型：'markdown' | 'dom'
 * @returns {Promise<Object>} 更新结果
 */
export const 更新块 = (选项) => {
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
  });
};

/**
 * 插入块
 * @param {Object} 选项 - 插入选项
 * @param {string} 选项.data - 块内容
 * @param {string} [选项.dataType='markdown'] - 数据类型：'markdown' | 'dom'
 * @param {string} 选项.previousID - 前一个块ID
 * @returns {Promise<Object>} 插入结果
 */
export const 插入块 = (选项) => {
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
  });
};

/**
 * 追加块
 * @param {Object} 选项 - 追加选项
 * @param {string} 选项.data - 块内容
 * @param {string} [选项.dataType='markdown'] - 数据类型：'markdown' | 'dom'
 * @param {string} 选项.parentID - 父块ID
 * @returns {Promise<Object>} 追加结果
 */
export const 追加块 = (选项) => {
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
  });
};

/**
 * 前置块
 * @param {Object} 选项 - 前置选项
 * @param {string} 选项.data - 块内容
 * @param {string} [选项.dataType='markdown'] - 数据类型：'markdown' | 'dom'
 * @param {string} 选项.parentID - 父块ID
 * @returns {Promise<Object>} 前置结果
 */
export const 前置块 = (选项) => {
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

  return 发送块请求('prependBlock', { 
    data, 
    dataType,
    parentID
  });
};

/**
 * 删除块
 * @param {string} id - 块ID
 * @returns {Promise<Object>} 删除结果
 */
export const 删除块 = (id) => {
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '块ID不能为空',
      data: null
    });
  }
  return 发送块请求('deleteBlock', { id });
};

/**
 * 移动块
 * @param {Object} 选项 - 移动选项
 * @param {string} 选项.id - 块ID
 * @param {string} [选项.parentID] - 父块ID
 * @param {string} [选项.previousID] - 前一个块ID
 * @returns {Promise<Object>} 移动结果
 */
export const 移动块 = (选项) => {
  if (!选项?.id) {
    return Promise.resolve({
      code: -1,
      msg: '块ID不能为空',
      data: null
    });
  }

  return 发送块请求('moveBlock', 选项);
};

/**
 * 折叠块
 * @param {string} id - 块ID
 * @returns {Promise<Object>} 折叠结果
 */
export const 折叠块 = (id) => {
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '块ID不能为空',
      data: null
    });
  }
  return 发送块请求('foldBlock', { id });
};

/**
 * 展开块
 * @param {string} id - 块ID
 * @returns {Promise<Object>} 展开结果
 */
export const 展开块 = (id) => {
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '块ID不能为空',
      data: null
    });
  }
  return 发送块请求('unfoldBlock', { id });
};

// 块属性相关API

/**
 * 获取块属性
 * @param {string} id - 块ID
 * @returns {Promise<Object>} 块属性
 */
export const 获取块属性 = (id) => {
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '块ID不能为空',
      data: null
    });
  }
  return 发送块请求('getBlockAttrs', { id });
};

/**
 * 设置块属性
 * @param {string} id - 块ID
 * @param {Object} 属性 - 要设置的属性
 * @returns {Promise<Object>} 设置结果
 */
export const 设置块属性 = (id, 属性) => {
  if (!id || !属性) {
    return Promise.resolve({
      code: -1,
      msg: '块ID和属性不能为空',
      data: null
    });
  }
  return 发送块请求('setBlockAttrs', { id, attrs: 属性 });
};

// 英文命名版本导出
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
export const prependBlock = 前置块;
export const deleteBlock = 删除块;
export const moveBlock = 移动块;
export const foldBlock = 折叠块;
export const unfoldBlock = 展开块;
export const getBlockAttrs = 获取块属性;
export const setBlockAttrs = 设置块属性; 