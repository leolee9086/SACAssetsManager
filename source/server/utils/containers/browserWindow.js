import { enableRemote } from './webview.js'

function isSameURL(url1, url2) {
    const $url1 = new URL(url1)
    const $url2 = new URL(url2)
    //注意浏览器会自动将url中的路径解析到index.html
    //所以需要将路径中的index.html去掉
    $url1.pathname = $url1.pathname.replace(/index\.html$/, '')
    $url2.pathname = $url2.pathname.replace(/index\.html$/, '')
    return $url1.pathname === $url2.pathname && $url1.search === $url2.search
}

export function createBrowserWindowByURL(url, options = {
    closePrevious: true,
    single: true,
    showImmediately: true,
    noCache: true,
    keepAlive: true,
    //是否使用心跳检测
    withHeartbeat: true
}) {
    const { BrowserWindow } = require('@electron/remote');
    if (options.keepAlive && !options.single) {
        throw new Error('keepAlive不能对非单例窗口使用')
    }
    return new Promise((resolve, reject) => {
        //找到已经打开过的窗口
        if (options.closePrevious) {
            //关闭已经打开过的所有窗口
            const 已经打开过的窗口 = BrowserWindow.getAllWindows().filter(w => {
                let result = isSameURL(w.webContents.getURL(), url)
                console.log('已经打开过的窗口', result, w.webContents.getURL(), url)

                return result
            })
            if (已经打开过的窗口.length > 0) {
                try {
                    已经打开过的窗口.forEach(w => w.close())
                } catch (e) {
                    console.error('关闭已经打开过的窗口失败', e)
                }
            }
        }
        if (options.single) {
            const 已经打开过的窗口 = BrowserWindow.getAllWindows().filter(w => isSameURL(w.webContents.getURL(), url))
            if (已经打开过的窗口.length > 0) {
                resolve(已经打开过的窗口[0])
                //关闭其他窗口
                已经打开过的窗口.forEach(w => {
                    if (w !== 已经打开过的窗口[0]) {
                        try {
                            w.close()
                        } catch (e) {
                            console.error('关闭其他窗口失败', e)
                        }
                    }
                })
                return
            }
        }
        try {
            const win = new BrowserWindow({
                width: 800,
                height: 600,
                show: options.showImmediately,
                webPreferences: {
                    nodeIntegration: true,
                    contextIsolation: false,
                    webviewTag: true
                }
            });
            //如果使用了心跳检测，则需要注入心跳检测脚本
            if (options.withHeartbeat) {
                win.webContents.executeJavaScript(`
                    setInterval(() => {
                        const webContents = require('@electron/remote').getCurrentWebContents()
                        webContents.send('heartbeat', {
                            type: 'heartbeat',
                            data: {
                                time: new Date().toLocaleString()
                            }
                        })
                    },1000)
                `)
                 
                
            }
            enableRemote(win.webContents)
            if (options.noCache) {
                win.webContents.session.clearCache(() => {
                    console.log('缓存已清除');
                });
            }
            win.loadURL(url);
         
            resolve(win)
        } catch (e) {
            reject(e)
        }
        if (options.keepAlive) {
            win.on('close', () => {
                console.log('窗口关闭')
                createBrowserWindowByURL(url, options)
            })
        }
        if (options.withHeartbeat) {
            console.log('开始心跳检测')
            setInterval(() => {
                win.webContents.send('heartbeat', {
                    type: 'heartbeat',
                    data: {
                        time: new Date().toLocaleString()
                    }
                })
            }, 1000)
            console.log('窗口加载完成,开始心跳检测')
            const colseTimeout = setTimeout(() => {
                console.log('窗口关闭')
                win.close()
            }, 1000 )
            win.webContents.on('close', () => {
                clearTimeout(colseTimeout)
            })
            win.webContents.on('heartbeat', (e, data) => {
                console.log('收到心跳检测', data)
                clearTimeout(colseTimeout)
            })

        }
    })
}