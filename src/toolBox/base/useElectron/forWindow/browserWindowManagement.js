/**
 * 浏览器窗口管理功能
 * 提供窗口创建、关闭和实例管理功能
 */
import { enableRemoteModuleForBrowserWindow } from './useRemote.js';

/**
 * 关闭已有窗口
 * @param {Array} 窗口列表 - 窗口对象列表
 */
export const 关闭窗口列表 = (窗口列表) => {
  try {
    窗口列表.forEach(w => {
      if (w && !w.isDestroyed()) {
        w.close();
      }
    });
  } catch (错误) {
    console.error('关闭已存在窗口失败:', 错误);
  }
};

/**
 * 处理单实例模式
 * @param {Array} 同源窗口列表 - 同源窗口列表
 * @param {Function} 获取同源窗口函数 - 获取窗口列表的函数
 * @param {string} url - 窗口URL
 * @returns {Object|null} 已存在的窗口或null
 */
export const 处理单实例模式 = (同源窗口列表, 获取同源窗口函数, url) => {
  if (同源窗口列表.length === 0) {
    return null;
  }

  const 最大尝试次数 = 10;
  let 尝试次数 = 0;
  let 当前窗口列表 = [...同源窗口列表];

  while (当前窗口列表.length > 1 && 尝试次数 < 最大尝试次数) {
    // 重新获取窗口列表
    if (typeof 获取同源窗口函数 === 'function') {
      当前窗口列表 = 获取同源窗口函数(url);
    }

    // 关闭额外窗口
    for (let i = 1; i < 当前窗口列表.length; i++) {
      try {
        if (当前窗口列表[i] && !当前窗口列表[i].isDestroyed()) {
          当前窗口列表[i].close();
        }
      } catch (错误) {
        console.error('关闭额外窗口失败:', 错误);
      }
    }

    尝试次数++;
  }

  // 如果尝试次数达到上限还未成功，报错
  if (尝试次数 >= 最大尝试次数 && 当前窗口列表.length > 1) {
    throw new Error('无法关闭额外的窗口实例');
  }

  // 使用第一个窗口
  return 当前窗口列表.length > 0 ? 当前窗口列表[0] : null;
};

/**
 * 创建新窗口
 * @param {Object} BrowserWindow - Electron的BrowserWindow类
 * @param {string} url - 窗口加载的URL
 * @param {Object} 配置 - 窗口配置
 * @returns {Object} 创建的窗口对象
 */
export const 创建新窗口 = (BrowserWindow, url, 配置) => {
  const 窗口 = new BrowserWindow({
    width: 800,
    height: 600,
    show: 配置.立即显示,
    titleBarStyle: 配置.显示标题栏 ? 'hidden' : 'default',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true,
    }
  });

  // 开启远程模块
  if (配置.enableRemote) {
    enableRemoteModuleForBrowserWindow({
      browserWindow: 窗口,
      successHandler: () => {
        console.log('使用自定义enableRemote函数启用远程模块成功');
      },
      errorHandler: (error) => {
        console.error('使用自定义enableRemote函数失败:', error);
      }
    });
  }

  // 清除缓存
  if (配置.清除缓存) {
    窗口.webContents.session.clearCache(() => {
      console.log('浏览器缓存已清除');
    });
  }

  // 加载URL
  窗口.loadURL(url);

  return 窗口;
}; 