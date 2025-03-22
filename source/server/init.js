/***
 * 这个的作用是替换掉原本的require
 * 使服务能够使用require从自定义的node_modules中加载模块
*/
import '../utils/hack/hackRequire.js'
const channel = new BroadcastChannel('SACAssets')
window.channel = channel
channel.onmessage = (e) => {
    const path = require('path')
    if (!window.siyuanConfig && e.data && e.data.type && e.data.type === 'siyuanConfig') {
        window.siyuanConfig = e.data.data
        window.appID = e.data.app
        window.siyuanPort = e.data.siyuanPort
        window.require.setExternalBase(path.join(siyuanConfig.system.workspaceDir, '/data/plugins/SACAssetsManager/node_modules/'))
        window.require.setExternalDeps(path.join(siyuanConfig.system.workspaceDir, '/data/plugins/SACAssetsManager/node_modules/'))
        window.externalBase = path.join(siyuanConfig.system.workspaceDir, '/data/plugins/SACAssetsManager/node_modules/')
        window.workspaceDir = siyuanConfig.system.workspaceDir
        window.port = e.data.port
        if (window.require) {
            import("./server.js")
        }
    }
}
const modifyWebview = async () => {
    const webview = document.querySelector('webview')
    if (webview.src !== 'about:blank') {
        return
    }
    if (window.externalBase) {
        try {

        webview.src = `./imageStaticService.html?externalBase=${window.externalBase.replace(/\\/g, '/')}&port=${window.port + 1}`
        webview.openDevTools();
    } catch (e) {
            console.error('启用静态图片服务器失败:', e);
        }
    } else {
        setTimeout(() => {
            modifyWebview()
        }, 100)
    }
}

window.onload = () => {
    const logAppContainer = document.getElementById('logApp')
    logAppContainer.innerHTML = '<button id="forceButton">强制取得数据库控制</button>'
    document.getElementById('forceButton').addEventListener(
        'click', async () => {
            if (confirm('确定要强制释放所有文件锁吗?当且仅当切换SACAssetsManager的主工作空间时使用。')) {
                await window.强制释放所有文件锁()
                window.location.reload()
            }
        }
    )
    function shiftChild(container, num) {
        const children = Array.from(container.querySelectorAll('.log'))
        //先进行第一次遍历,只删除非error
        const timeOut = 1000
        const startTime = Date.now()
        while (children.length >= num) {
            if (Date.now() - startTime > timeOut) {
                break
            }
            try {
                if (children.shift().getAttribute('class') !== 'log error') {
                    children.shift().remove()
                }
            } catch (e) {
            }
        }
        //再进行第二次遍历,删除error
        while (children.length >= num) {
            if (Date.now() - startTime > timeOut) {
                break
            }
            try {
                children.shift().remove()
            } catch (e) {
            }
        }
    }
    const webview = document.querySelector('webview')
    webview.addEventListener('dom-ready', modifyWebview);
}
