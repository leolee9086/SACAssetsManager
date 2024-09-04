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
        let win = null
        //找到已经打开过的窗口
        if (options.closePrevious) {
            //关闭已经打开过的所有窗口
            const 已经打开过的窗口 = BrowserWindow.getAllWindows().filter(w => {
                let result = isSameURL(w.webContents.getURL(), url)
                console.log('已经打开过的窗口', result, w.webContents.getURL(), url)
                if (result) {
                    win = result
                }
            })
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
        if (options.single) {
            const 已经打开过的窗口 = BrowserWindow.getAllWindows().filter(w => isSameURL(w.webContents.getURL(), url))
            console.log('已经打开过的窗口', 已经打开过的窗口)
            if (已经打开过的窗口.length > 0) {
                win = 已经打开过的窗口[0]
                //关闭其他窗口
                try {
                    已经打开过的窗口.forEach(w => {
                        if (w !== 已经打开过的窗口[0]) {
                            console.log('关闭其他窗口', w)
                            try {
                                if (w && !w.isDestroyed()) {
                                    w.close()
                                }
                            } catch (e) {
                                console.error('关闭其他窗口失败', e)
                            }
                        }
                    })
                } catch (e) {
                    console.error('关闭其他窗口失败', e)
                }
            }
        }
        try {
            win = new BrowserWindow({
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

            enableRemote(win.webContents)
            if (options.noCache) {
                win.webContents.session.clearCache(() => {
                    console.log('缓存已清除');
                });
            }
            win.loadURL(url);
            if (options.withHeartbeat) {
                try {
                    win.webContents.executeJavaScript(`
                        const ipcRenderer = require('electron').ipcRenderer
                    ipcRenderer.on('heartbeat', (e, data) => {
                        e.sender.send('heartbeat', new Date().toLocaleString())
                        console.log('收到心跳检测', data,e)
                        })
                    `)
                } catch (e) {
                    console.error('注入心跳检测脚本失败', e)
                }
            }
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
            console.log('win', win)
            setInterval(() => {
                let time = new Date().toLocaleString()
                try {
                    if (win && !win.isDestroyed()) {
                        win.webContents.send('heartbeat', {
                            type: 'heartbeat',
                            data: {
                                time: time,
                            }
                        })
                    }
                } catch (e) {
                    console.warn('发送心跳检测失败', e)
                }
            }, 1000)
            console.log('窗口加载完成,开始心跳检测')
            const colseTimeout = setTimeout(() => {
                console.log('窗口关闭')
                try {
                    if (win && !win.isDestroyed()) {
                        //   win.close()
                    }
                } catch (e) {
                    console.error('关闭窗口失败', e)
                }
            }, 2000)
            win.webContents.on('close', () => {
                clearTimeout(colseTimeout)
            })
            const ipc = require('electron').ipcRenderer
            ipc.on('heartbeat', (e, data) => {
                console.log('收到心跳检测', data)
                clearTimeout(colseTimeout)
            })

        }
        resolve(win)

    })
}