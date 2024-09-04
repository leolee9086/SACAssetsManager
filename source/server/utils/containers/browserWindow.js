import { enableRemote } from './webview.js'
import { 获取同源窗口 } from './webcontentsUtils/query.js'


export function createBrowserWindowByURL(url, options = {
    closePrevious: true,
    single: true,
    showImmediately: true,
    noCache: true,
    keepAlive: true,
    //是否使用心跳检测
    withHeartbeat: true,
    //是否显示默认的窗口标题栏
    showTitleBar: true
}) {
    const { BrowserWindow } = require('@electron/remote');
    if (options.keepAlive && !options.single) {
        throw new Error('keepAlive不能对非单例窗口使用')
    }

    return new Promise((resolve, reject) => {
        let win = null
        //找到已经打开过的窗口
        const 已经打开过的窗口 = 获取同源窗口(url)
        console.log(已经打开过的窗口)

        if (options.closePrevious) {
            //关闭已经打开过的所有窗口
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
            if (已经打开过的窗口.length > 0) {
                //关闭直到只有一个窗口
                const maxCount = 10
                let count = 0
                while (已经打开过的窗口.length > 1 && count < maxCount) {
                    try {
                        if (已经打开过的窗口[0] && !已经打开过的窗口[0].isDestroyed()) {
                            已经打开过的窗口[0].close()
                        }
                    } catch (e) {
                        console.error('关闭其他窗口失败', e)
                    }
                    count++
                    if (count > maxCount) {
                        throw new Error('关闭其他窗口失败')
                    }
                }
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
            if (!win) {
                win = new BrowserWindow({
                    width: 800,
                    height: 600,
                    show: options.showImmediately,
                    webPreferences: {
                        nodeIntegration: true,
                        contextIsolation: false,
                        webviewTag: true,
                        titleBarStyle: options.showTitleBar ? 'hidden' : 'default'
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
                        // 注入心跳检测脚本
                        // 获取当前窗口
                        const currentWebcontentID = require('@electron/remote').getCurrentWindow().id
                        win.webContents.executeJavaScript(`
                        const ipcRenderer = require('electron').ipcRenderer
                        ipcRenderer.on('heartbeat', (e, data) => {
                        const currentWebcontentID = ${currentWebcontentID}
                        console.log('收到心跳检测', currentWebcontentID)
                        const targetWebcontent = require('@electron/remote').webContents.fromId(currentWebcontentID)
                        if(targetWebcontent){
                            targetWebcontent.send('heartbeat', data)
                        }
                        })
                    `)
                    } catch (e) {
                        console.error('注入心跳检测脚本失败', e)
                    }
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
                          win.close()
                    }
                } catch (e) {
                    console.error('关闭窗口失败', e)
                }
            }, 5000)
            win.webContents.on('close', () => {
                clearTimeout(colseTimeout)
            })
            const ipc = require('electron').ipcRenderer
            ipc.on('heartbeat', (e, data) => {
                clearTimeout(colseTimeout)
            })
            let 已经打开过的窗口2 = 获取同源窗口(url)
            console.log(已经打开过的窗口2)

        }

        resolve(win)

    })
}