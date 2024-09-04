import { plugin } from '../asyncModules.js'
//使用webview作为接口
import { createInvisibleWebview } from './utils/containers/webview.js'

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
plugin.serverContainer = await createInvisibleWebview(entryURL);
plugin.eventBus.on('openDevTools', () => {
    plugin.serverContainer.openDevTools()
})


