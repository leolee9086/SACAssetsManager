/**
 * 启用Electron的remote模块功能
 * @param {Object} options - 配置选项
 * @param {WebContents} options.webContents - 要启用remote模块的WebContents实例
 * @param {Function} [options.errorHandler] - 错误回调函数
 * @param {Function} [options.successHandler] - 成功回调函数
 * @returns {boolean} 是否启用成功
 */
export const enableRemoteModule = (
    options = {
        webContents, errorHandler, successHandler
    }
) => {
    const { webContents, errorHandler, successHandler } = options;
    try {
        const remote = window.require('@electron/remote');
        remote.require("@electron/remote/main").enable(webContents);
        if (successHandler) {
            successHandler({ webContents });
        }
        return true;
    } catch (error) {
        if (errorHandler) {
            errorHandler({ webContents, error });
        }
        return false;
    }
}

/**
 * 为Webview启用Electron的remote模块功能
 * @param {Object} options - 配置选项
 * @param {WebviewTag} options.webview - 要启用remote模块的webview元素
 * @param {Function} [options.errorHandler] - 错误回调函数
 * @param {Function} [options.successHandler] - 成功回调函数
 * @returns {boolean} 是否启用成功
 */
export const enableRemoteModuleForWebview = (options={
    webview,errorHandler,successHandler
}) => {
    const { webview, errorHandler, successHleandler } = options;
    const webContents = webview.getWebContents();
    return enableRemoteModule({ webContents, errorHandler, successHandler });
}
/**
 * 为BrowserWindow启用Electron的remote模块功能
 * @param {Object} options - 配置选项
 * @param {BrowserWindow} options.browserWindow - 要启用remote模块的BrowserWindow实例
 * @param {Function} [options.errorHandler] - 错误回调函数
 * @param {Function} [options.successHandler] - 成功回调函数
 * @returns {boolean} 是否启用成功
 */
export const enableRemoteModuleForBrowserWindow = (options={
    browserWindow,errorHandler,successHandler
}) => {
    const { browserWindow, errorHandler, successHandler } = options;
    const webContents = browserWindow.webContents;
    return enableRemoteModule({ webContents, errorHandler, successHandler });
}

// 中文别名导出
export const 启用远程模块 = enableRemoteModule;
export const 为Webview启用远程模块 = enableRemoteModuleForWebview;
export const 为浏览器窗口启用远程模块 = enableRemoteModuleForBrowserWindow;