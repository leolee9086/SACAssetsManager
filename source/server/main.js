import { plugin } from '../asyncModules.js'
import { 获取同源窗口 } from '../../src/utils/webcontents/query.js';
import { 初始化心跳处理, 更新主服务启动时间, 更新静态服务启动时间 } from './heartbeat.js';
//使用webview作为接口
import { 创建浏览器窗口 } from '../../src/toolBox/base/useElectron/forWindow/useBrowserWindow.js';
const entryURL = import.meta.resolve('./index.html?i=1'); // 主服务入口
// 为静态服务器构建URL，带上必要的查询参数
const getStaticServerURL = () => {
    const externalBase = `${window.siyuan.config.system.workspaceDir}/data/plugins/SACAssetsManager/node_modules/`;
    const port = plugin.http服务端口号 + 1;
    return import.meta.resolve(`./staticServerEntry.html?externalBase=${encodeURIComponent(externalBase)}&port=${port}`);
};
const channel = new BroadcastChannel('SACAssets')
const staticChannel = new BroadcastChannel('SACAssetsStatic')
// 定期发送配置信息到主服务
setInterval(() => {
    try {
        // 向主服务发送配置
        channel.postMessage({
            type: 'siyuanConfig',
            data: window.siyuan.config,
            port: plugin.http服务端口号,
            appID: plugin.app.appId,
            siyuanPort: window.location.port
        })
    } catch (e) {
        console.warn('发送siyuanConfig到主服务失败', e)
    }
}, 1000)

// 监听服务器消息
channel.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'serverError') {
        console.error('主服务错误:', e.data.data)
    } else if (e.data === 'serverReady' || (e.data && e.data.type === 'serverReady')) {
        console.log('主服务准备就绪')
        plugin.eventBus.emit('serverReady')
        
        // 主服务准备好后，尝试启动静态服务
        启动静态服务器()
    } else if (e.data && e.data.type === 'requestStartStaticServer') {
        // 响应请求启动静态服务器的消息
        console.log('收到请求启动静态服务器的消息');
        启动静态服务器()
    }
})

// 监听静态服务器消息
staticChannel.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'staticServerError') {
        console.error('静态服务器错误:', e.data.error)
    } else if (e.data && e.data.type === 'staticServerReady') {
        console.log('静态服务器就绪')
        // 记录静态服务启动时间
        更新静态服务启动时间(Date.now());
        // 通知主服务静态服务器已就绪
        channel.postMessage({ type: 'staticServerReady' });
    } else if (e.data && e.data.type === 'pong') {
        // 处理心跳响应
        plugin.staticServerLastPong = e.data.timestamp;
    } else if (e.data && e.data.type === 'staticServerShutdown') {
        console.log('静态服务器关闭');
        // 重置静态服务启动时间
        plugin.staticServerStartTime = null;
        // 可能需要在这里做一些清理工作
    }
})

// 监听enable-remote-module请求
const { ipcRenderer } = require('electron');
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

// 调用函数创建主服务窗口
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

// 记录主服务启动时间
更新主服务启动时间(Date.now());

/**
 * 启动独立的静态服务器
 */
const 启动静态服务器 = async () => {
    // 获取静态服务URL
    const staticServerURL = getStaticServerURL();
    console.log('静态服务URL:', staticServerURL);
    
    // 检查是否已经有同源窗口
    let 静态服务窗口 = 获取同源窗口(staticServerURL);
    console.log('现有静态服务窗口:', 静态服务窗口?.length);
    
    if (静态服务窗口 && 静态服务窗口.length > 0) {
        console.log('静态服务器窗口已存在，无需重复创建');
        
        // 发送ping检查服务是否活跃
        staticChannel.postMessage({ type: 'ping', timestamp: Date.now() });
        
        // 如果10秒内没有收到响应，可能需要重启服务
        if (plugin.staticServerLastPing && 
            Date.now() - plugin.staticServerLastPing > 10000 &&
            (!plugin.staticServerLastPong || Date.now() - plugin.staticServerLastPong > 10000)) {
            console.log('静态服务器可能已经停止响应，尝试重启...');
            
            // 关闭现有窗口
            静态服务窗口.forEach(w => {
                if (w && !w.isDestroyed()) {
                    try {
                        w.close();
                    } catch (e) {
                        console.error('关闭静态服务窗口失败:', e);
                    }
                }
            });
            
            // 短暂延迟后重新创建窗口
            setTimeout(() => 启动静态服务器(), 1000);
        }
        
        return;
    }
    
    console.log('创建独立的静态服务器窗口...');
    
    try {
        // 创建静态服务器窗口
        plugin.staticServerContainer = await 创建浏览器窗口(staticServerURL, {
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
        
        console.log('静态服务器窗口创建成功:', plugin.staticServerContainer);
        
        // 记录最后一次ping时间
        plugin.staticServerLastPing = Date.now();
        
        // 每10秒发送一次心跳检测
        if (plugin.staticServerHeartbeat) {
            clearInterval(plugin.staticServerHeartbeat);
        }
        
        plugin.staticServerHeartbeat = setInterval(() => {
            plugin.staticServerLastPing = Date.now();
            staticChannel.postMessage({ type: 'ping', timestamp: Date.now() });
            
            // 如果30秒内没有接收到响应，尝试重启服务
            if (plugin.staticServerLastPong && 
                Date.now() - plugin.staticServerLastPong > 30000) {
                console.log('静态服务器30秒未响应，尝试重启...');
                重启静态服务器();
            }
        }, 10000);
        
    } catch (错误) {
        console.error('创建静态服务器窗口失败:', 错误);
    }
};

/**
 * 重启静态服务器
 */
const 重启静态服务器 = async () => {
    console.log('开始重启静态服务器...');
    
    // 清除心跳定时器
    if (plugin.staticServerHeartbeat) {
        clearInterval(plugin.staticServerHeartbeat);
        plugin.staticServerHeartbeat = null;
    }
    
    // 关闭所有静态服务窗口
    const staticServerURL = getStaticServerURL();
    let 静态服务窗口 = 获取同源窗口(staticServerURL);
    
    if (静态服务窗口.length > 0) {
        try {
            静态服务窗口.forEach(w => {
                if (w && !w.isDestroyed()) {
                    w.close();
                }
            });
        } catch (e) {
            console.error('关闭静态服务窗口失败:', e);
        }
    }
    
    // 短暂延迟后启动新的服务
    setTimeout(启动静态服务器, 1000);
};

// 重建服务器容器函数
plugin.rebuildServerContainer = () => {
  plugin.eventBus.emit('closeAllService', {});
  
  // 清除静态服务器心跳定时器
  if (plugin.staticServerHeartbeat) {
    clearInterval(plugin.staticServerHeartbeat);
    plugin.staticServerHeartbeat = null;
  }
  
  // 关闭所有主服务窗口
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
  
  // 关闭所有静态服务窗口
  const staticServerURL = getStaticServerURL();
  let 静态服务窗口 = 获取同源窗口(staticServerURL);
  if (静态服务窗口.length > 0) {
    try {
      静态服务窗口.forEach(w => {
        if (w && !w.isDestroyed()) {
          w.close();
        }
      });
    } catch (e) {
      console.error('关闭静态服务窗口失败', e);
    }
  }
}

// 处理心跳消息
ipcRenderer.on('heartbeat', (e, data) => {
  try {
    if (data && data.message) {
      console.log('收到心跳消息:', data.message);
    }
    
    const statusInfo = {
      type: 'heartbeat',
      isActive: true,
      timestamp: Date.now(),
      webContentID: plugin.serverContainerWebContentsID,
      port: plugin.http服务端口号,
      status: 'running',
      services: {
        main: {
          isRunning: true,
          startTime: plugin.mainServerStartTime || Date.now(),
          port: plugin.http服务端口号,
          status: 'running'
        },
        static: {
          isRunning: !!plugin.staticServerContainer && 
                    (typeof plugin.staticServerContainer.isDestroyed !== 'function' || 
                     !plugin.staticServerContainer.isDestroyed()),
          startTime: plugin.staticServerStartTime || Date.now(),
          port: plugin.https服务端口号,
          status: plugin.staticServerContainer ? 'running' : 'stopped'
        }
      }
    };
    
    // 发送心跳回应
    e.sender.send('heartbeat', statusInfo);
  } catch (error) {
    // 即使发生错误，也尝试发送最小的心跳响应
    console.error('处理心跳消息时发生错误:', error);
    e.sender.send('heartbeat', {
      type: 'heartbeat',
      isActive: true,
      timestamp: Date.now(),
      webContentID: plugin.serverContainerWebContentsID,
      error: error.message
    });
  }
});

plugin.eventBus.on('openDevTools', () => {
    try {
        // 打开主服务窗口的开发者工具
        let 已经打开过的窗口 = 获取同源窗口(entryURL)
        console.log('主服务窗口:', 已经打开过的窗口)
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
        }
        
        // 打开静态服务窗口的开发者工具
        const staticServerURL = getStaticServerURL();
        let 静态服务窗口 = 获取同源窗口(staticServerURL);
        console.log('静态服务窗口:', 静态服务窗口)
        if(静态服务窗口){
            静态服务窗口.forEach(w => {
                try{
                    if(!w.isVisible()){
                        w.show()
                    }else{
                        w.setAlwaysOnTop(true)
                    }
                }catch(e){
                    console.error('显示静态服务窗口失败', e)
                }
                try {   
                    w.webContents.openDevTools()
                } catch (e) {
                    console.error('打开静态服务窗口开发者工具失败', e)
                }
            })
        }
    } catch (e) {
        console.error('打开开发者工具失败', e)
    }
})

// 初始化心跳响应处理
初始化心跳处理(ipcRenderer);

// 导出函数
export { 
    启动静态服务器,
    重启静态服务器
}


