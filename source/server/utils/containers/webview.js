const { webContents } = require('@electron/remote');
import { createProxyHTMLURL } from './createProxyHTML.js';
export const enableRemote =require('@electron/remote').require("@electron/remote/main").enable
export function createInvisibleWebview(entryURL,$enableRemote=true,preload) {
    return new Promise((resolve, reject) => {
        try {

            let webview = document.createElement('webview');
            webview.setAttribute('nodeintegration', '');
            if(preload){
                webview.setAttribute('preload', preload);
            }
            webview.setAttribute('webpreferences', 'contextIsolation=0');
            if($enableRemote){
                webview.setAttribute('webpreferences', 'contextIsolation=0,preload='+preload);
            }
            webview.style.display = 'none'; // 使webview隐形
            webview.src = 'about:blank'
            document.body.appendChild(webview);
            webview.addEventListener('did-finish-load', async () => {
                console.log(webview.src)
                if(webview.src !== 'about:blank'){
                    return
                }
                const webContentsId = webview.getWebContentsId();
                const webviewWebContents = webContents.fromId(webContentsId)
                try {
                    await enableRemote(webviewWebContents)
                } catch (e) {
                    console.log(e)
                }
                webview.src = entryURL
              
                // 在这里可以与webview进行交互，例如打开开发者工具
                webviewWebContents.session.clearCache(() => {
                    console.log('缓存已清除');
                });
                
                // 每次加载页面时禁用缓存
                webviewWebContents.on('did-finish-load', () => {
                    webviewWebContents.session.clearCache(() => { });
                });
                webview.$webContents=webviewWebContents
                resolve(webview)
            });
            setTimeout(() => {
                webview.src = entryURL
            }, 1000)
        } catch (e) {
            reject(e)
        }
    })
}
export async function createWebviewByJsURL(jsURL) {
    const htmlURL = createProxyHTMLURL(jsURL)
    return await createInvisibleWebview(htmlURL,false) 
}
export async function createWebviewByJsString(jsString) {
    const blob = new Blob([jsString], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    return await createWebviewByJsURL(url);
}

