const { webContents } = require('@electron/remote');
const  remote  = require('@electron/remote');
const remoteRequire = remote.require
const enableRemote =remoteRequire("@electron/remote/main").enable

export function createInvisibleWebview(entryURL) {
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
                const webContentsId = webview.getWebContentsId();
                const webviewWebContents = webContents.fromId(webContentsId)
                webviewWebContents.session.clearCache(() => {
                    console.log('缓存已清除');
                });
                // 每次加载页面时禁用缓存
                webviewWebContents.on('did-finish-load', () => {
                    webviewWebContents.session.clearCache(() => { });
                });
                enableRemote(webviewWebContents)
                webview.src = entryURL
                resolve(webview)
            });
        } catch (e) {
            reject(e)
        }
    })
}