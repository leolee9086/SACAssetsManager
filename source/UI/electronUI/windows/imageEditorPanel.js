import { plugin } from '../../../pluginSymbolRegistry.js';
const { BrowserWindow } = require('@electron/remote');
export async function 打开图片编辑器窗口(imagePath) {
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
    // 构建带参数的 URL
    const baseStyle = document.querySelector('link[href^="base"]');
    const baseStyleSrc = baseStyle.getAttribute('href')
    const params = new URLSearchParams({
        workspaceDir: siyuan.config.system.workspaceDir.replace(/\\/g, '/'),
        pluginName: plugin.name,
        imagePath: imagePath,
        baseStyleSrc: '/stage/build/app/' + baseStyleSrc
    });
    newWindow.loadURL(import.meta.resolve('./imageAdjuster') + '?' + params.toString());
    newWindowContents.openDevTools()
}
