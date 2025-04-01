import { plugin } from '../asyncModules.js'
import { 获取同源窗口 } from '../utils/webcontents/query.js';

//使用webview作为接口
import { 创建浏览器窗口, enableRemote } from '../../src/toolBox/base/useElectron/forWindow/useBrowserWindow.js';
const entryURL = import.meta.resolve('./index.html?i=1'); // 或者指向你想要加载的URL
const channel = new BroadcastChannel('SACAssets')
setInterval(() => {
    try {
        channel.postMessage({
            type: 'siyuanConfig',
            data: window.siyuan.config,
            port: plugin.http服务端口号,
            appID: plugin.app.appId,
            siyuanPort: window.location.port
        })
    } catch (e) {
        console.warn('发送siyuanConfig失败', e)
    }
}, 1000)

channel.addEventListener(
    'message', (e) => {
        if (e.data && e.data.type === 'serverError') {
            console.error(e.data.data)
        } else {
            plugin.eventBus.emit('serverReady')
        }
    }
)

// 监听enable-remote-module请求
const { ipcRenderer, ipcMain } = require('electron');
ipcRenderer.on('enable-remote-module', (event, arg) => {
    console.log('收到enable-remote-module请求:', arg);
    try {
        const { webContentsId } = arg;
        if (webContentsId) {
            const { webContents } = require('electron');
            const targetContents = webContents.fromId(webContentsId);
            if (targetContents) {
                // 使用webview.js中的方式启用
                const remoteEnable = require('@electron/remote').require('@electron/remote/main').enable;
                remoteEnable(targetContents);
                console.log('成功启用远程模块 (通过IPC请求)');
                // 发送确认消息
                event.sender.send('remote-module-enabled', { success: true });
            }
        }
    } catch (错误) {
        console.error('通过IPC启用远程模块失败:', 错误);
        // 发送错误消息
        event.sender.send('remote-module-enabled', { 
            success: false, 
            error: 错误.message 
        });
    }
});

// 自定义enableRemote函数，使用webview.js中的方式
const 启用远程模块 = (webContents) => {
  try {
    // 直接使用webview.js的方式
    const remoteEnable = require('@electron/remote').require('@electron/remote/main').enable;
    remoteEnable(webContents);
    console.log('使用remote.require方式启用远程模块成功');
    return true;
  } catch (错误) {
    console.error('启用远程模块失败:', 错误);
    return false;
  }
};

// 调用函数创建webview
plugin.serverContainer = await 创建浏览器窗口(entryURL, {
  关闭已有窗口: false,
  单实例: true,
  清除缓存: true,
  立即显示: false,
  保持活跃: true,
  使用心跳检测: true,
  显示标题栏: false,
  获取同源窗口函数: 获取同源窗口,
  enableRemote: 启用远程模块
});

// 重建服务器容器函数
plugin.rebuildServerContainer = () => {
  plugin.eventBus.emit('closeAllService', {});
  let 已经打开过的窗口 = 获取同源窗口(entryURL);
  if (已经打开过的窗口.length > 0) {
    try {
      已经打开过的窗口.forEach(w => {
        if (w && !w.isDestroyed()) {
          w.close();
        }
      });
    } catch (e) {
      console.error('关闭已经打开过的窗口失败', e);
    }
  }
}

ipcRenderer.on('heartbeat', (e, data) => {
   if(data.message){ console.log('收到心跳响应', data.message)}
    
   data.webContentID&& (plugin.serverContainerWebContentsID = data.webContentID)
});

plugin.eventBus.on('openDevTools', () => {
    try {
        let 已经打开过的窗口 = 获取同源窗口(entryURL)
        console.log(已经打开过的窗口)
        if(已经打开过的窗口){
            已经打开过的窗口.forEach(w => {
                try{
                    if(!w.isVisible()){
                        w.show()
                    }else{
                        //如果已经打开,置顶
                        w.setAlwaysOnTop(true)
                    }
                }catch(e){
                    console.error('显示窗口失败', e)
                }
                try {   
                    w.webContents.openDevTools()
                } catch (e) {
                    console.error('打开开发者工具失败', e)
                }
            })
            return
        }
    } catch (e) {
        console.error('打开开发者工具失败', e)
    }
})


