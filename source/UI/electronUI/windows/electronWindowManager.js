import { plugin } from '../../../pluginSymbolRegistry.js';
import { getBaseStyleSource } from '../../../../src/toolBox/useAge/forSiyuan/useSiyuanBaseStyle.js';
const { BrowserWindow } = require('@electron/remote');

// 通用窗口配置
const DEFAULT_WINDOW_CONFIG = {
    width: 800,
    height: 600,
    frame: false,
    webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        // 添加额外的安全限制
        enableRemoteModule: true,
        worldSafeExecuteJavaScript: true,
        spellcheck: false,
        // 禁用实验性功能
        experimentalFeatures: false
    }
};



/**
 * 解析模块的完整路径
 * @param {string} modulePath - 模块路径
 * @returns {string} 完整的模块路径
 */
function resolveModulePath(modulePath) {
    try {
        // 获取插件根目录的URL前缀
        const pluginUrlBase = new URL('/plugins/SACAssetsManager/', window.location.origin).toString();
        
        // 规范化模块路径
        if (modulePath.startsWith('/')) {
            // 已经是绝对路径，直接使用
            return pluginUrlBase + modulePath.substring(1);
        } else if (modulePath.startsWith('./') || modulePath.startsWith('../')) {
            // 相对路径，基于当前文件位置解析
            const currentDir = 'source/UI/electronUI/windows/';
            return new URL(modulePath, pluginUrlBase + currentDir).toString();
        } else {
            // 没有前缀的路径，假定为相对于插件根目录
            return pluginUrlBase + modulePath;
        }
    } catch (error) {
        console.error('解析模块路径出错:', error);
        return import.meta.resolve(modulePath);
    }
}

/**
 * 构建窗口URL参数
 * @param {string} filePath - 文件路径（可选）
 * @param {string} fullModulePath - 完整模块路径
 * @param {string} baseStyleSrc - 基础样式源
 * @returns {URLSearchParams} URL参数
 */
function buildWindowParams(filePath, fullModulePath, baseStyleSrc) {
    return new URLSearchParams({
        workspaceDir: siyuan.config.system.workspaceDir.replace(/\\/g, '/'),
        pluginName: plugin.name,
        imagePath: filePath || '',
        baseStyleSrc: '/stage/build/app/' + baseStyleSrc,
        modulePath: fullModulePath
    });
}

/**
 * 创建新的电子窗口
 * @param {string} filePath - 文件路径（可选）
 * @param {string} modulePath - 模块路径
 * @returns {Promise<BrowserWindow|null>} 创建的窗口或null（如果失败）
 */
async function createElectronWindow(filePath, modulePath) {
    try {
        const newWindow = new BrowserWindow(DEFAULT_WINDOW_CONFIG);
        const newWindowContents = newWindow.webContents;
        
        // 启用远程模块
        require('@electron/remote').require('@electron/remote/main').enable(newWindowContents);
        
        // 获取所需资源
        const baseStyleSrc = getBaseStyleSource();
        const fullModulePath = resolveModulePath(modulePath);
        console.log('原始模块路径:', modulePath);
        console.log('处理后的完整模块路径:', fullModulePath);
        
        // 构建URL参数并加载窗口
        const params = buildWindowParams(filePath, fullModulePath, baseStyleSrc);
        const windowTemplateUrl = import.meta.resolve('../templates/window.html');
        await newWindow.loadURL(windowTemplateUrl + '?' + params.toString());
        
        // 设置窗口关闭时的清理操作
        newWindow.on('closed', () => {
            console.log('窗口已关闭，正在清理资源');
        });
        
        return newWindow;
    } catch (error) {
        console.error('创建窗口时出错:', error);
        showErrorNotification(error);
        return null;
    }
}

/**
 * 显示错误通知
 * @param {Error} error - 错误对象
 */
function showErrorNotification(error) {
    if (window.siyuan?.notifications) {
        window.siyuan.notifications.show({
            type: 'error',
            content: `创建窗口失败: ${error.message}`,
            timeout: 5000
        });
    }
}

// 通用的窗口打开函数，处理错误并返回窗口实例
async function openWindow(modulePath, filePath) {
    const window = await createElectronWindow(filePath, modulePath);
    if (!window) {
        console.error(`打开模块 ${modulePath} 失败`);
        return null;
    }
    return window;
}

// 打开图片编辑器窗口
export async function openImageEditorWindow(filePath) {
    return await openWindow('../windows/imageAdjuster/index.js', filePath);
}

// 打开图片画板窗口
export async function openDrawBoardWindow(filePath) {
    return await openWindow('../windows/draw/index.js', filePath);
}

// 打开xbel窗口
export async function openXbelWindow(filePath) {
    return await openWindow('../windows/xbel/index.js', filePath);
}

// 打开zipLike窗口
export async function openZipViewerWindow(filePath) {
    return await openWindow('../windows/zipLike/index.js', filePath);
}

// 打开元数据编辑器窗口
export async function openMetadataEditorWindow(filePath) {
    return await openWindow('../windows/metadataEditor/index.js', filePath);
}

// 为了向后兼容，保留原有函数名
export const 打开图片编辑器窗口 = openImageEditorWindow;
export const 打开图片画板窗口 = openDrawBoardWindow;
export const 打开xbel窗口 = openXbelWindow;
export const 打开压缩文件窗口 = openZipViewerWindow;
export const 打开元数据编辑器窗口 = openMetadataEditorWindow; 