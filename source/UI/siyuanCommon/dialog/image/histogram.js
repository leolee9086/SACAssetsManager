import { plugin } from '../../../../pluginSymbolRegistry.js';
const { BrowserWindow } = require('@electron/remote');
export async function showHistogramDialog(result) {
    const newWindow = new BrowserWindow({
        width: 800,
        height: 600,
        frame: false, // 设置无边框

        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });
    const newWindowContents = newWindow.webContents
    require('@electron/remote').require('@electron/remote/main').enable(newWindowContents);    // 加载新的页面
    newWindow.loadURL(import.meta.resolve('./panelStyleEditor.html'));
    const baseStyle = document.querySelector('link[href^="base"]');
    const baseStyleSrc=baseStyle.getAttribute('href')
    newWindowContents.on('dom-ready', () => {
        newWindowContents.executeJavaScript(`
            window.workspaceDir ='${siyuan.config.system.workspaceDir.replace(/\\/g, '/')}'
            window.pluginName = '${plugin.name}'
            window.imagePath = '${result.imagePath}'
            try{
                document.getElementById('baseStyle').setAttribute('href','${'/stage/build/app/'+baseStyleSrc}')
            }catch(e){
                console.warn(e)
            }
            import('${import.meta.resolve('./app.js')}')
        `);
    });
}
