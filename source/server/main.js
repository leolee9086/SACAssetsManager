import { plugin } from '../asyncModules.js'
import { createSiyuanBroadcastChannel } from './processors/web/siyuanWebSocket.js'
const entryURL = import.meta.resolve('./index.html?i=1'); // 或者指向你想要加载的URL
const channel = new BroadcastChannel('SACAssets')
const siyuanBroadcastChannel = await createSiyuanBroadcastChannel('sacAssetsManager', window.location.port)
setInterval(() => {
    console.log(window.siyuan.config,plugin.http服务端口号,plugin.app.appId,window.location.port)
    channel.postMessage({
        type: 'siyuanConfig',
        data: window.siyuan.config,
        port: plugin.http服务端口号,
        appID: plugin.app.appId,
        siyuanPort: window.location.port
    })
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
//使用webview作为接口
function createInvisibleWebview(entryURL) {
    return new Promise((resolve, reject) => {
        try {
            let webview = document.createElement('webview');
            webview.style.display = 'none'; // 使webview隐形
            webview.src = 'about:blank'
            webview.setAttribute('nodeintegration', '');
            webview.setAttribute('webpreferences', 'contextIsolation=false');
            document.body.appendChild(webview);
            // 等待webview加载完成
            webview.addEventListener('did-finish-load', () => {
                if (webview.src !== 'about:blank') {
                    return
                }
                // 在这里可以与webview进行交互，例如打开开发者工具
                const { webContents } = require('@electron/remote');
                const webContentsId = webview.getWebContentsId();
                const webviewWebContents = webContents.fromId(webContentsId)
                webviewWebContents.session.clearCache(() => {
                    console.log('缓存已清除');
                });

                // 每次加载页面时禁用缓存
                webviewWebContents.on('did-finish-load', () => {
                    webviewWebContents.session.clearCache(() => { });
                });
                require("@electron/remote")
                    .require("@electron/remote/main")
                    .enable(webviewWebContents);
                webview.src = entryURL
                resolve(webview)
            });
        } catch (e) {
            reject(e)
        }
    })
}
// 调用函数创建webview
plugin.serverContainer = await createInvisibleWebview(entryURL);
plugin.eventBus.on('openDevTools', () => {
    plugin.serverContainer.openDevTools()
})


