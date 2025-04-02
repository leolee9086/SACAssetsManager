/**
 * 窗口持久化功能
 * 提供窗口保持活跃和自动重建功能
 */
import { 创建浏览器窗口 } from './useBrowserWindow.js';

/**
 * 设置窗口保持活跃
 * @param {Object} 窗口 - 窗口对象
 * @param {string} url - 窗口URL
 * @param {Object} 配置 - 窗口配置
 */
export const 设置窗口保持活跃 = (窗口, url, 配置) => {
  if (!配置.保持活跃) return;

  窗口.on('close', () => {
    console.log('窗口关闭，自动重新创建');
    创建浏览器窗口(url, 配置);
  });
}; 