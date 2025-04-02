/**
 * Electron浏览器窗口管理工具
 * 提供创建和管理Electron BrowserWindow的函数
 */
import { enableRemoteModuleForBrowserWindow } from './useRemote.js';
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
export const 创建浏览器窗口 = async (url, 配置 = {}) => {
  const 默认配置 = {
    关闭已有窗口: true,
    单实例: true,
    立即显示: true,
    清除缓存: true,
    保持活跃: true,
    使用心跳检测: true,
    显示标题栏: true,
    获取同源窗口函数: null,
    enableRemote: null
  };

  // 合并配置
  const 实际配置 = { ...默认配置, ...配置 };

  // 检查配置有效性
  if (实际配置.保持活跃 && !实际配置.单实例) {
    throw new Error('保持活跃选项不能对非单例窗口使用');
  }

  // 确保electron环境
  const BrowserWindow = (window.require && window.require('@electron/remote'))
    ? window.require('@electron/remote').BrowserWindow
    : null;

  if (!BrowserWindow) {
    throw new Error('创建浏览器窗口需要Electron环境');
  }

  return new Promise((resolve, reject) => {
    let 窗口 = null;
    let 同源窗口列表 = [];

    // 使用提供的函数或默认空数组
    if (typeof 实际配置.获取同源窗口函数 === 'function') {
      同源窗口列表 = 实际配置.获取同源窗口函数(url);
    }

    // 关闭已有窗口
    if (实际配置.关闭已有窗口 && 同源窗口列表.length > 0) {
      try {
        同源窗口列表.forEach(w => {
          if (w && !w.isDestroyed()) {
            w.close();
          }
        });
      } catch (错误) {
        console.error('关闭已存在窗口失败:', 错误);
      }

      // 重新获取窗口列表
      if (typeof 实际配置.获取同源窗口函数 === 'function') {
        同源窗口列表 = 实际配置.获取同源窗口函数(url);
      }
    }

    // 单实例模式处理
    if (实际配置.单实例 && 同源窗口列表.length > 0) {
      // 保留第一个窗口，关闭其他窗口
      const 最大尝试次数 = 10;
      let 尝试次数 = 0;

      while (同源窗口列表.length > 1 && 尝试次数 < 最大尝试次数) {
        // 重新获取窗口列表
        if (typeof 实际配置.获取同源窗口函数 === 'function') {
          同源窗口列表 = 实际配置.获取同源窗口函数(url);
        }

        // 关闭额外窗口
        for (let i = 1; i < 同源窗口列表.length; i++) {
          try {
            if (同源窗口列表[i] && !同源窗口列表[i].isDestroyed()) {
              同源窗口列表[i].close();
            }
          } catch (错误) {
            console.error('关闭额外窗口失败:', 错误);
          }
        }

        尝试次数++;
      }

      // 如果尝试次数达到上限还未成功，报错
      if (尝试次数 >= 最大尝试次数 && 同源窗口列表.length > 1) {
        reject(new Error('无法关闭额外的窗口实例'));
        return;
      }

      // 使用第一个窗口
      if (同源窗口列表.length > 0) {
        窗口 = 同源窗口列表[0];
      }
    }

    try {
      // 如果没有现有窗口，创建新窗口
      if (!窗口) {
        窗口 = new BrowserWindow({
          width: 800,
          height: 600,
          show: 实际配置.立即显示,
          titleBarStyle: 实际配置.显示标题栏 ? 'hidden' : 'default',
          webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webviewTag: true,
          }
        });

        // 开启远程模块
        if (实际配置.enableRemote) {
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
        if (实际配置.清除缓存) {
          窗口.webContents.session.clearCache(() => {
            console.log('浏览器缓存已清除');
          });
        }

        // 加载URL
        窗口.loadURL(url);
      }

      // 保持活跃
      if (实际配置.保持活跃) {
        窗口.on('close', () => {
          console.log('窗口关闭，自动重新创建');
          创建浏览器窗口(url, 实际配置);
        });
      }

      // 心跳检测
      if (实际配置.使用心跳检测 && window.location.href.includes('/stage/build/app')) {
        console.log('启动心跳检测');

        // 定期发送心跳
        const 发送心跳 = (窗口实例) => {
          try {
            const 当前窗口ID = window.require('@electron/remote').getCurrentWindow().webContents.id;

            if (窗口实例 && !窗口实例.isDestroyed()) {
              窗口实例.webContents.send('heartbeat', {
                type: 'heartbeat',
                data: {
                  currentWebcontentID: 当前窗口ID,
                }
              });
            }
          } catch (错误) {
            console.warn('发送心跳失败:', 错误);
          }
        };

        // 每秒发送心跳
        setInterval(() => 发送心跳(窗口), 1000);

        // 注入心跳检测脚本
        setTimeout(() => {
          try {
            if (窗口 && !窗口.isDestroyed()) {
              窗口.webContents.executeJavaScript(`
                if(!window.heartbeatStarted){
                  window.heartbeatStarted = true;
                  const ipcRenderer = require('electron').ipcRenderer;
                  
                  ipcRenderer.on('heartbeat', (e, data) => {
                    try {
                      const currentWebcontentID = data.data.currentWebcontentID;
                      const targetWebcontent = require('@electron/remote').webContents.fromId(currentWebcontentID);
                      const selfWebcontentID = require('@electron/remote').getCurrentWindow().webContents.id;
                      
                      if(targetWebcontent){
                        targetWebcontent.send('heartbeat', {webContentID: selfWebcontentID});
                      }
                    } catch(err) {
                      console.error('处理心跳事件失败:', err);
                    }
                  });
                  
                  ipcRenderer.on('forceClose', (e, data) => {
                    window.close();
                  });
                }
              `);
            }
          } catch (错误) {
            console.error('注入心跳检测脚本失败:', 错误);
          }

          // 启动高级心跳检测
          try {
            const 当前窗口ID = window.require('@electron/remote').getCurrentWindow().webContents.id;
            let 心跳间隔;
            let 心跳超时;

            const 启动心跳检测 = () => {
              clearInterval(心跳间隔);
              clearTimeout(心跳超时);

              心跳间隔 = setInterval(() => {
                if (窗口 && !窗口.isDestroyed()) {
                  窗口.webContents.send('heartbeat', {
                    type: 'heartbeat',
                    data: {
                      currentWebcontentID: 当前窗口ID,
                    }
                  });

                  clearTimeout(心跳超时);
                  心跳超时 = setTimeout(() => {
                    console.log('心跳超时,准备关闭窗口');
                    try {
                      if (窗口 && !窗口.isDestroyed()) {
                        窗口.close();
                      }
                    } catch (错误) {
                      console.error('关闭窗口失败', 错误);
                    }
                  }, 10000); // 10秒内没响应则关闭窗口
                }
              }, 1000); // 每秒发送心跳
            };

            // 接收心跳响应
            const ipc = window.require('electron').ipcRenderer;
            ipc.on('heartbeat', (e, data) => {
              clearTimeout(心跳超时);
            });

            // 启动心跳
            启动心跳检测();

            // 窗口关闭时清理心跳
            窗口.webContents.on('close', () => {
              clearInterval(心跳间隔);
              clearTimeout(心跳超时);
            });
          } catch (错误) {
            console.error('设置心跳检测失败:', 错误);
          }
        }, 3000); // 等待窗口加载
      }

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