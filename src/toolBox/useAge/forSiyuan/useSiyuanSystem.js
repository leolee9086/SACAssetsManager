/**
 * @fileoverview 思源笔记系统API封装
 * @module toolBox/useAge/forSiyuan/useSiyuanSystem
 * @requires 思源环境
 */

import { 检查思源环境 } from '../useSiyuan.js';

// 检查环境
if (!检查思源环境()) {
  console.warn('当前不在思源环境中，部分功能可能不可用');
}

/**
 * 发送系统相关请求的通用方法
 * @private
 * @param {string} endpoint - API 端点
 * @param {Object} data - 请求数据
 * @returns {Promise<Object>} 请求结果
 */
const 发送系统请求 = async (endpoint, data = {}) => {
  try {
    if (!window.siyuan) {
      throw new Error('思源环境不可用');
    }
    
    const response = await fetch(`/api/system/${endpoint}`, {
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
    console.error(`系统${endpoint}操作失败:`, error);
    return {
      code: -1,
      msg: error.message,
      data: null
    };
  }
};

/**
 * 重载UI
 * @returns {Promise<Object>} 请求结果
 */
export const 重载UI = () => {
  return 发送系统请求('reloadUI');
};

/**
 * 获取工作空间信息
 * @returns {Promise<Object>} 工作空间信息
 */
export const 获取工作空间信息 = () => {
  return 发送系统请求('getWorkspaceInfo');
};

/**
 * 获取网络配置
 * @returns {Promise<Object>} 网络配置
 */
export const 获取网络配置 = () => {
  return 发送系统请求('getNetwork');
};

/**
 * 设置网络代理
 * @param {Object} 参数 - 代理配置
 * @param {string} 参数.协议 - 代理协议(http/https/socks5)
 * @param {string} 参数.主机 - 代理主机
 * @param {string} 参数.端口 - 代理端口
 * @returns {Promise<Object>} 请求结果
 */
export const 设置网络代理 = ({ 协议, 主机, 端口 }) => {
  if (!['http', 'https', 'socks5'].includes(协议)) {
    return Promise.resolve({
      code: -1,
      msg: '无效的代理协议，必须是 http/https/socks5',
      data: null
    });
  }

  if (!主机) {
    return Promise.resolve({
      code: -1,
      msg: '代理主机不能为空',
      data: null
    });
  }

  if (!端口 || !/^\d+$/.test(端口)) {
    return Promise.resolve({
      code: -1,
      msg: '无效的代理端口',
      data: null
    });
  }

  return 发送系统请求('setNetworkProxy', { scheme: 协议, host: 主机, port: 端口 });
};

/**
 * 获取系统字体列表
 * @returns {Promise<string[]>} 字体列表
 */
export const 获取系统字体 = async () => {
  const result = await 发送系统请求('getSysFonts');
  return result.data || [];
};

/**
 * 获取版本号
 * @returns {Promise<string>} 版本号
 */
export const 获取版本号 = async () => {
  const result = await 发送系统请求('version');
  return result.data || '';
};

/**
 * 获取当前时间戳
 * @returns {Promise<number>} 时间戳
 */
export const 获取当前时间戳 = async () => {
  const result = await 发送系统请求('currentTime');
  return result.data || Date.now();
};

/**
 * 获取启动进度
 * @returns {Promise<Object>} 启动进度
 */
export const 获取启动进度 = () => {
  return 发送系统请求('bootProgress');
};

/**
 * 退出应用
 * @param {Object} [参数] - 退出选项
 * @param {boolean} [参数.强制退出=false] - 是否强制退出
 * @param {number} [参数.执行安装包=0] - 执行安装包(0:检查新版本,1:不执行,2:执行)
 * @returns {Promise<Object>} 请求结果
 */
export const 退出应用 = ({ 强制退出 = false, 执行安装包 = 0 } = {}) => {
  if (![0, 1, 2].includes(执行安装包)) {
    return Promise.resolve({
      code: -1,
      msg: '无效的安装包执行选项，必须是 0/1/2',
      data: null
    });
  }

  return 发送系统请求('exit', { force: 强制退出, execInstallPkg: 执行安装包 });
};

/**
 * 设置自动启动
 * @param {boolean} 启用 - 是否启用自动启动
 * @returns {Promise<Object>} 请求结果
 */
export const 设置自动启动 = (启用) => {
  return 发送系统请求('setAutoLaunch', { enabled: 启用 });
};

/**
 * 设置外观模式
 * @param {number} 模式 - 外观模式(0:跟随系统,1:亮色,2:暗色)
 * @returns {Promise<Object>} 请求结果
 */
export const 设置外观模式 = (模式) => {
  if (![0, 1, 2].includes(模式)) {
    return Promise.resolve({
      code: -1,
      msg: '无效的外观模式，必须是 0/1/2',
      data: null
    });
  }

  return 发送系统请求('setAppearanceMode', { mode: 模式 });
};

/**
 * 检查更新
 * @param {boolean} [自动检查=false] - 是否为自动检查
 * @returns {Promise<Object>} 更新信息
 */
export const 检查更新 = (自动检查 = false) => {
  return 发送系统请求('checkUpdate', { automatic: 自动检查 });
};

/**
 * 获取图表渲染器信息
 * @returns {Promise<Object>} 图表渲染器信息
 */
export const 获取图表渲染器信息 = () => {
  return 发送系统请求('getEchartsRendererInfo');
};

/**
 * 获取主题模式
 * @returns {Promise<Object>} 主题模式信息
 */
export const 获取主题模式 = () => {
  return 发送系统请求('getThemeMode');
};

/**
 * 获取升级进度
 * @returns {Promise<Object>} 升级进度
 */
export const 获取升级进度 = () => {
  return 发送系统请求('getUpgradeProgress');
};

// 英文命名版本导出
export const reloadUI = 重载UI;
export const getWorkspaceInfo = 获取工作空间信息;
export const getNetworkConfig = 获取网络配置;
export const setNetworkProxy = ({ protocol, host, port }) => 设置网络代理({ 协议: protocol, 主机: host, 端口: port });
export const getSysFonts = 获取系统字体;
export const getVersion = 获取版本号;
export const getCurrentTime = 获取当前时间戳;
export const getBootProgress = 获取启动进度;
export const exitApp = ({ force = false, execInstallPkg = 0 } = {}) => 退出应用({ 强制退出: force, 执行安装包: execInstallPkg });
export const setAutoLaunch = 设置自动启动;
export const setAppearanceMode = 设置外观模式;
export const checkUpdate = 检查更新;
export const getEchartsRendererInfo = 获取图表渲染器信息;
export const getThemeMode = 获取主题模式;
export const getUpgradeProgress = 获取升级进度; 