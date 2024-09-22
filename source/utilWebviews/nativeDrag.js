/**
 * 这里是为了让主窗口的拖拽事件能够被其自身响应
 */
const remote = require('@electron/remote');
const { ipcRenderer } = require('electron')
const { webContents } = remote
ipcRenderer.on('startDrag', async (e, arg) => {
    if (arg.id) {
        const webContentsId = arg.id
        const webviewWebContents = webContents.fromId(webContentsId)
        const browserWindow = remote.BrowserWindow.fromWebContents(webviewWebContents)
        const nativeHandle = browserWindow.getNativeWindowHandle()
        //startCustomNativeDrag(nativeHandle, arg.data)

        webviewWebContents.startDrag({
              ...arg.data,
          })
    }
})
/***
 * 
 */
const startCustomNativeDrag = (windowHandler, data) => {
    console.log(windowHandler, data)
    nativeDrag({ windowHandler, data }, (error, result) => {
        console.log(error, result)
    })

}

const nativeDrag = (nativeWindowHandler, data) => {
    let fn = require('electron-edge-js').func(
        `
        using System.Threading.Tasks;
        using System;
        public class Startup
        {
            public async Task<object> Invoke(dynamic input)
            {
                return new FileDataObject(input.files);
            }
        }
        `
    )
    fn(nativeWindowHandler, data)
}
