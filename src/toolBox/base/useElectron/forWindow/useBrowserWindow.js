/**
 * Electron浏览器窗口管理工具
 * 提供创建和管理Electron BrowserWindow的函数
 */
import { enableRemoteModuleForBrowserWindow } from './useRemote.js';
import { 获取BrowserWindow, 合并窗口配置, 验证配置有效性 } from './browserWindowCore.js';
import { 关闭窗口列表, 处理单实例模式, 创建新窗口 } from './browserWindowManagement.js';
import { 设置窗口保持活跃 } from './windowPersistence.js';
import { 设置窗口心跳检测 } from './windowHeartbeat.js';


/**
 * 创建浏览器窗口
 * @param {string} url - 窗口加载的URL
 * @param {Object} 配置 - 窗口配置选项
 * @param {boolean} [配置.关闭已有窗口=true] - 是否关闭已存在的相同URL窗口
 * @param {boolean} [配置.单实例=true] - 是否确保只有一个窗口实例
 * @param {boolean} [配置.立即显示=true] - 是否立即显示窗口
 * @param {boolean} [配置.清除缓存=true] - 是否清除浏览器缓存
 * @param {boolean} [配置.保持活跃=true] - 窗口关闭时是否自动重新创建
 * @param {boolean} [配置.使用心跳检测=true] - 是否启用心跳检测
 * @param {boolean} [配置.显示标题栏=true] - 是否显示窗口标题栏
 * @param {Function} [配置.获取同源窗口函数] - 查找同源窗口的函数
 * @param {Function} [配置.enableRemote] - 自定义的enableRemote函数，用于兼容不同版本的Electron
 * @returns {Promise<BrowserWindow>} 创建的浏览器窗口
 */
export const 创建浏览器窗口 = async (url, 用户配置 = {}) => {
  // 合并并验证配置
  const 配置 = 合并窗口配置(用户配置);
  验证配置有效性(配置);

  // 确保electron环境
  const BrowserWindow = 获取BrowserWindow();
  if (!BrowserWindow) {
    throw new Error('创建浏览器窗口需要Electron环境');
  }

  return new Promise((resolve, reject) => {
    try {
      let 窗口 = null;
      let 同源窗口列表 = [];

      // 使用提供的函数或默认空数组
      if (typeof 配置.获取同源窗口函数 === 'function') {
        同源窗口列表 = 配置.获取同源窗口函数(url);
      }

      // 关闭已有窗口
      if (配置.关闭已有窗口 && 同源窗口列表.length > 0) {
        关闭窗口列表(同源窗口列表);

        // 重新获取窗口列表
        if (typeof 配置.获取同源窗口函数 === 'function') {
          同源窗口列表 = 配置.获取同源窗口函数(url);
        }
      }

      // 单实例模式处理
      if (配置.单实例 && 同源窗口列表.length > 0) {
        窗口 = 处理单实例模式(同源窗口列表, 配置.获取同源窗口函数, url);
      }

      // 如果没有现有窗口，创建新窗口
      if (!窗口) {
        窗口 = 创建新窗口(BrowserWindow, url, 配置);
      }

      // 设置窗口保持活跃
      设置窗口保持活跃(窗口, url, 配置);

      // 设置窗口心跳检测
      设置窗口心跳检测(窗口, 配置);

      resolve(窗口);
    } catch (错误) {
      reject(错误);
    }
  });
};

/**
 * 创建基于URL的浏览器窗口
 * 兼容性函数，保持与旧版API兼容
 */
export const createBrowserWindowByURL = 创建浏览器窗口; 