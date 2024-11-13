import { plugin } from '../asyncModules.js'
import { 获取同源窗口 } from '../utils/webcontents/query.js';

//使用webview作为接口
import { createBrowserWindowByURL } from './utils/containers/browserWindow.js'
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
// 调用函数创建webview
plugin.serverContainer = await createBrowserWindowByURL(entryURL,{
    closePrevious: false,
    single: true,
    noCache:true,
    showImmediately: false,
    keepAlive:true,
    withHeartbeat:true,
    showTitleBar:false
});
plugin.rebuildServerContainer=()=>{
    plugin.eventBus.emit('closeAllService',{})
    let 已经打开过的窗口 = 获取同源窗口(entryURL)
    if (已经打开过的窗口.length > 0) {
        try {
            已经打开过的窗口.forEach(w => {
                if (w && !w.isDestroyed()) {
                    w.close()
                }
            })
        } catch (e) {
            console.error('关闭已经打开过的窗口失败', e)
        }
    }
}
const ipc = require('electron').ipcRenderer;
ipc.on('heartbeat', (e, data) => {
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


