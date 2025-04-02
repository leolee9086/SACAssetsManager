/**
 * 窗口持久化功能
 * 提供窗口保持活跃和自动重建功能
 */
import { 创建浏览器窗口 } from './useBrowserWindow.js';

// 创建一个全局变量，用于跟踪窗口重建次数
const 窗口重建计数 = new Map();

// 设置重建窗口的最大次数限制
const 最大重建次数 = 3;

// 设置需要用户确认的重建次数阈值
const 确认重建阈值 = 2;

// 重置计数器的超时时间（毫秒）
const 重置计数器超时 = 60000; // 1分钟

/**
 * 获取Electron dialog模块
 * @returns {Object|null} dialog模块或null
 */
const 获取对话框模块 = () => {
  // 检查是否在Electron环境
  if (!process || !process.type || process.type !== 'renderer') {
    console.warn('当前不在Electron渲染进程中，无法使用对话框');
    return null;
  }
  
  try {
    let dialog = null;
    
    // 尝试使用@electron/remote (Electron 10+)
    try {
      const remote = require('@electron/remote');
      if (remote && remote.dialog) {
        dialog = remote.dialog;
      }
    } catch (err) {
      console.log('未找到@electron/remote，尝试使用electron内置remote');
    }
    
    // 尝试使用electron内置remote (Electron <10)
    if (!dialog) {
      try {
        const { remote } = require('electron');
        if (remote && remote.dialog) {
          dialog = remote.dialog;
        }
      } catch (err) {
        console.log('未找到electron内置remote');
      }
    }
    
    return dialog;
  } catch (error) {
    console.error('获取对话框模块时出错:', error);
    return null;
  }
};

/**
 * 显示确认对话框
 * @param {string} message - 提示信息
 * @returns {Promise<boolean>} 用户选择
 */
const 显示确认对话框 = (message) => {
  const dialog = 获取对话框模块();
  if (!dialog) {
    return Promise.resolve(false); // 如果无法获取dialog模块，默认返回false
  }
  
  return new Promise((resolve) => {
    dialog.showMessageBox({
      type: 'question',
      buttons: ['重建窗口', '关闭窗口'],
      defaultId: 1,
      title: '窗口自动重建',
      message: message
    }).then(result => {
      resolve(result.response === 0); // 第一个按钮被点击时返回true
    }).catch(err => {
      console.error('显示对话框时出错:', err);
      resolve(false);
    });
  });
};

/**
 * 设置窗口保持活跃
 * @param {Object} 窗口 - 窗口对象
 * @param {string} url - 窗口URL
 * @param {Object} 配置 - 窗口配置
 */
export const 设置窗口保持活跃 = (窗口, url, 配置) => {
  if (!配置.保持活跃) return;

  // 生成窗口唯一标识符
  const 窗口标识 = `${url}_${Date.now()}`;
  
  窗口.on('close', async (event) => {
    // 防止默认关闭行为，以便我们可以执行确认逻辑
    // 注意：这里需要谨慎，因为阻止默认行为会导致窗口无法关闭
    // 我们只在需要确认的情况下阻止默认行为
    
    // 如果不存在计数，初始化为0
    if (!窗口重建计数.has(窗口标识)) {
      窗口重建计数.set(窗口标识, 0);
      
      // 设置定时器，一段时间后重置计数器
      setTimeout(() => {
        窗口重建计数.delete(窗口标识);
      }, 重置计数器超时);
    }
    
    // 获取当前计数并增加
    const 当前计数 = 窗口重建计数.get(窗口标识);
    const 新计数 = 当前计数 + 1;
    窗口重建计数.set(窗口标识, 新计数);
    
    // 如果超过最大重建次数，不再自动重建
    if (新计数 > 最大重建次数) {
      console.warn(`窗口 ${url} 已达到最大重建次数 (${最大重建次数})，停止自动重建`);
      return;
    }
    
    // 如果达到确认阈值，请求用户确认
    if (新计数 >= 确认重建阈值) {
      console.log(`窗口重建次数达到 ${新计数}/${最大重建次数}，请求用户确认`);
      
      const message = `窗口"${url}"已自动重建${新计数}次。\n是否继续重建窗口？`;
      const 用户确认 = await 显示确认对话框(message);
      
      if (!用户确认) {
        console.log('用户选择不重建窗口');
        return;
      }
    }
    
    console.log(`窗口关闭，自动重新创建 (${新计数}/${最大重建次数})`);
    
    // 在窗口关闭后，启动一个新窗口
    // 这里不阻止窗口关闭，而是等窗口关闭后再创建新窗口
    
    // 添加延迟，避免立即创建导致的问题
    setTimeout(() => {
      创建浏览器窗口(url, 配置);
    }, 100);
  });
}; 