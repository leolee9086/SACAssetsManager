import { plugin } from "../../pluginSymbolRegistry.js";
const { BrowserWindow } = require('@electron/remote');

export const 创建无边框窗口 = (配置 = {}) => {
    const 默认配置 = {
        width: 800,
        height: 600,
        frame: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        }
    };
    const 窗口 = new BrowserWindow({ ...默认配置, ...配置 });
    const 窗口内容 = 窗口.webContents;
    require('@electron/remote').require('@electron/remote/main').enable(窗口内容);
    return { 窗口, 窗口内容 };
}
export const 构建思源环境脚本 = () => {
    const baseStyle = document.querySelector('link[href^="base"]');
    const baseStyleSrc = baseStyle.getAttribute('href');
    `
    window.workspaceDir ='${siyuan.config.system.workspaceDir.replace(/\\/g, '/')}'
    window.pluginName = '${plugin.name}'
    window.imagePath = '${result.imagePath}'
    try{
        document.getElementById('baseStyle').setAttribute('href','${'/stage/build/app/' + baseStyleSrc}')
    }catch(e){
        console.warn(e)
    }
    import('${import.meta.resolve('./app.js')}')
    `;
} 