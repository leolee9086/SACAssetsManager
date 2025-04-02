/**
 * 窗口心跳检测功能
 * 提供窗口活跃状态检测和自动关闭功能
 */

/**
 * 注入心跳检测脚本
 * @param {Object} 窗口 - 窗口对象
 */
const 注入心跳检测脚本 = (窗口) => {
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
};

/**
 * 设置基本心跳检测
 * @param {Object} 窗口 - 窗口对象
 */
const a设置基本心跳检测 = (窗口) => {
  try {
    const 当前窗口ID = window.require('@electron/remote').getCurrentWindow().webContents.id;

    // 定期发送心跳
    const 发送心跳 = (窗口实例) => {
      try {
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
  } catch (错误) {
    console.error('设置基本心跳检测失败:', 错误);
  }
};

/**
 * 设置高级心跳检测
 * @param {Object} 窗口 - 窗口对象
 */
const 设置高级心跳检测 = (窗口) => {
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
    console.error('设置高级心跳检测失败:', 错误);
  }
};

/**
 * 设置窗口心跳检测
 * @param {Object} 窗口 - 窗口对象
 * @param {Object} 配置 - 窗口配置
 */
export const 设置窗口心跳检测 = (窗口, 配置) => {
  if (!配置.使用心跳检测 || !window.location.href.includes('/stage/build/app')) {
    return;
  }

  console.log('启动心跳检测');
  
  // 设置基本心跳检测
  a设置基本心跳检测(窗口);

  // 注入心跳检测脚本
  setTimeout(() => {
    注入心跳检测脚本(窗口);
    
    // 设置高级心跳检测
    设置高级心跳检测(窗口);
  }, 3000); // 等待窗口加载
}; 