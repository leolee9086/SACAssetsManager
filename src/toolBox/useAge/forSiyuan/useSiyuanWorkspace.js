/**
 * @fileoverview 思源笔记工作空间API封装
 * @module toolBox/useAge/forSiyuan/useSiyuanWorkspace
 * @requires 思源环境
 */

import { 检查思源环境 } from '../useSiyuan.js';
import { 发送工作区请求 } from '../../base/forNetWork/forSiyuanApi/apiBase.js';

// 检查环境
if (!检查思源环境()) {
  console.warn('当前不在思源环境中，部分功能可能不可用');
}

/**
 * 检查工作空间路径是否有效
 * @private
 * @param {string} 路径 - 工作空间路径
 * @returns {boolean} 是否有效
 */
const 检查工作空间路径是否有效 = (路径) => {
  if (!路径) return true;
  
  const 名称 = 路径.split('/').pop();
  if (!名称) return true;
  
  if (名称.startsWith('.')) return true;
  
  // 检查文件名是否有效
  const 无效字符 = /[<>:"/\\|?*\x00-\x1F]/;
  if (无效字符.test(名称)) return true;
  
  // 限制名称长度为32个字符
  if (Array.from(名称).length > 32) return true;
  
  const 小写名称 = 名称.toLowerCase();
  return ['conf', 'home', 'data', 'temp'].some(保留字 => 小写名称.includes(保留字));
};

/**
 * 检查工作空间目录
 * @param {Object} 选项 - 检查选项
 * @param {string} 选项.path - 工作空间路径
 * @param {Object} [requestOptions] - 请求选项
 * @returns {Promise<Object>} 检查结果
 */
export const 检查工作空间目录 = (选项, requestOptions = {}) => {
  const { path } = 选项;

  if (检查工作空间路径是否有效(path)) {
    return Promise.resolve({
      code: -1,
      msg: '工作空间名称不允许，请使用其他名称',
      data: null
    });
  }

  return 发送工作区请求('checkWorkspaceDir', { path }, requestOptions);
};

/**
 * 创建工作空间目录
 * @param {Object} 选项 - 创建选项
 * @param {string} 选项.path - 工作空间路径
 * @param {Object} [requestOptions] - 请求选项
 * @returns {Promise<Object>} 创建结果
 */
export const 创建工作空间目录 = (选项, requestOptions = {}) => {
  const { path } = 选项;
  
  if (检查工作空间路径是否有效(path)) {
    return Promise.resolve({
      code: -1,
      msg: '工作空间名称不允许，请使用其他名称',
      data: null
    });
  }

  return 发送工作区请求('createWorkspaceDir', { 
    path: path.trim() 
  }, requestOptions);
};

/**
 * 移除工作空间目录(仅从列表移除)
 * @param {Object} 选项 - 移除选项
 * @param {string} 选项.path - 工作空间路径
 * @param {Object} [requestOptions] - 请求选项
 * @returns {Promise<Object>} 移除结果
 */
export const 移除工作空间目录 = (选项, requestOptions = {}) => {
  return 发送工作区请求('removeWorkspaceDir', 选项, requestOptions);
};

/**
 * 物理删除工作空间目录
 * @param {Object} 选项 - 删除选项
 * @param {string} 选项.path - 工作空间路径
 * @param {Object} [requestOptions] - 请求选项
 * @returns {Promise<Object>} 删除结果
 */
export const 物理删除工作空间目录 = (选项, requestOptions = {}) => {
  return 发送工作区请求('removeWorkspaceDirPhysically', 选项, requestOptions);
};

/**
 * 获取移动端工作空间列表
 * @param {Object} [requestOptions] - 请求选项
 * @returns {Promise<Object>} 工作空间列表
 */
export const 获取移动端工作空间列表 = (requestOptions = {}) => {
  return 发送工作区请求('getMobileWorkspaces', {}, requestOptions);
};

/**
 * 获取工作空间列表
 * @param {Object} [requestOptions] - 请求选项
 * @returns {Promise<Object>} 工作空间列表
 */
export const 获取工作空间列表 = (requestOptions = {}) => {
  return 发送工作区请求('getWorkspaces', {}, requestOptions);
};

/**
 * 设置工作空间目录
 * @param {Object} 选项 - 设置选项
 * @param {string} 选项.path - 工作空间路径
 * @param {Object} [requestOptions] - 请求选项
 * @returns {Promise<Object>} 设置结果
 */
export const 设置工作空间目录 = (选项, requestOptions = {}) => {
  const { path } = 选项;

  if (检查工作空间路径是否有效(path)) {
    return Promise.resolve({
      code: -1,
      msg: '工作空间名称不允许，请使用其他名称',
      data: { closeTimeout: 3000 }
    });
  }

  // 检查是否为云端同步路径
  if (path.includes(':/') || path.includes(':\\')) {
    return Promise.resolve({
      code: -1,
      msg: '不能选择云端同步路径作为工作空间',
      data: { closeTimeout: 7000 }
    });
  }

  return 发送工作区请求('setWorkspaceDir', { path }, requestOptions);
};

/**
 * 列出工作空间目录
 * @param {Object} 选项 - 列表选项
 * @param {string} 选项.path - 工作空间路径
 * @param {Object} [requestOptions] - 请求选项
 * @returns {Promise<Object>} 目录列表
 */
export const 列出工作空间目录 = (选项, requestOptions = {}) => {
  const { path } = 选项;
  
  if (!path) {
    return Promise.resolve({
      code: -1,
      msg: '工作空间路径不能为空',
      data: null
    });
  }

  return 发送工作区请求('listWorkspaceDir', { path }, requestOptions);
};

/**
 * 获取工作空间配置
 * @param {Object} [requestOptions] - 请求选项
 * @returns {Promise<Object>} 工作空间配置
 */
export const 获取工作空间配置 = (requestOptions = {}) => {
  return 发送工作区请求('getWorkspaceConfig', {}, requestOptions);
};

/**
 * 获取工作空间状态
 * @param {Object} [requestOptions] - 请求选项
 * @returns {Promise<Object>} 工作空间状态
 */
export const 获取工作空间状态 = (requestOptions = {}) => {
  return 发送工作区请求('getWorkspaceState', {}, requestOptions);
};

// 导出英文版API
export const checkWorkspaceDir = 检查工作空间目录;
export const createWorkspaceDir = 创建工作空间目录;
export const removeWorkspaceDir = 移除工作空间目录;
export const removeWorkspaceDirPhysically = 物理删除工作空间目录;
export const getMobileWorkspaces = 获取移动端工作空间列表;
export const getWorkspaces = 获取工作空间列表;
export const setWorkspaceDir = 设置工作空间目录;
export const listWorkspaceDir = 列出工作空间目录;
export const getWorkspaceConfig = 获取工作空间配置;
export const getWorkspaceState = 获取工作空间状态; 