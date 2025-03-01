import { plugin } from '../../../pluginSymbolRegistry.js';
const { BrowserWindow } = require('@electron/remote');

// 通用窗口配置
const DEFAULT_WINDOW_CONFIG = {
    width: 800,
    height: 600,
    frame: false,
    webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
    }
};

/**
 * 创建新的编辑器窗口
 * @param {string} imagePath - 图片路径
 * @param {string} modulePath - 模块路径
 * @returns {Promise<void>}
 */
async function createEditorWindow(imagePath, modulePath) {
    const newWindow = new BrowserWindow(DEFAULT_WINDOW_CONFIG);
    const newWindowContents = newWindow.webContents;
    
    // 启用远程模块
    require('@electron/remote').require('@electron/remote/main').enable(newWindowContents);
    
    // 获取基础样式
    const baseStyle = document.querySelector('link[href^="base"]');
    const baseStyleSrc = baseStyle.getAttribute('href');
    
    // 构建URL参数
    const params = new URLSearchParams({
        workspaceDir: siyuan.config.system.workspaceDir.replace(/\\/g, '/'),
        pluginName: plugin.name,
        imagePath: imagePath,
        baseStyleSrc: '/stage/build/app/' + baseStyleSrc,
        modulePath: import.meta.resolve(modulePath)
    });

    // 加载窗口
    await newWindow.loadURL(import.meta.resolve('../templates/window.html') + '?' + params.toString());
}

// 打开图片编辑器窗口
export async function 打开图片编辑器窗口(imagePath) {
    await createEditorWindow(imagePath, './imageAdjuster/index.js');
}

// 打开图片画板窗口
export async function 打开图片画板窗口(imagePath) {
    await createEditorWindow(imagePath, './draw/app.js');
}
// 打开图片画板窗口
export async function 打开xbel窗口(imagePath) {
    await createEditorWindow(imagePath, './xbel/index.js');
}

