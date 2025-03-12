/**
 * 创建网页浏览器上下文,用于扩展点机制中的菜单等
 * Create webview browser context for extension points like context menus
 * @param {*} webview 
 * @returns 
 */
export const 创建网页浏览器上下文 = (webview) => {
    return {
        webview,
        // 基本导航 - Basic Navigation
        getURL: () => webview.getURL(),
        获取URL: () => webview.getURL(),
        
        getTitle: () => webview.getTitle(),
        获取标题: () => webview.getTitle(),
        
        executeJavaScript: (script) => webview.executeJavaScript(script),
        执行JavaScript: (script) => webview.executeJavaScript(script),
        
        loadURL: (url) => webview.loadURL(url),
        加载URL: (url) => webview.loadURL(url),
        
        reload: () => webview.reload(),
        刷新: () => webview.reload(),
        
        goBack: () => webview.goBack(),
        后退: () => webview.goBack(),
        
        goForward: () => webview.goForward(),
        前进: () => webview.goForward(),
        
        // 页面控制 - Page Control
        stop: () => webview.stop(),
        停止加载: () => webview.stop(),
        
        reloadIgnoringCache: () => webview.reloadIgnoringCache(),
        忽略缓存刷新: () => webview.reloadIgnoringCache(),
        
        // 页面信息 - Page Information
        getWebContentsId: () => webview.getWebContentsId(),
        获取页面ID: () => webview.getWebContentsId(),
        
        canGoBack: () => webview.canGoBack(),
        是否可后退: () => webview.canGoBack(),
        
        canGoForward: () => webview.canGoForward(),
        是否可前进: () => webview.canGoForward(),
        
        getHistory: () => webview.getWebContents().history,
        获取导航历史: () => webview.getWebContents().history,
        
        getCurrentHistoryIndex: () => webview.getWebContents().currentIndex,
        获取当前历史索引: () => webview.getWebContents().currentIndex,
        
        // 缩放控制 - Zoom Control
        setZoomFactor: (factor) => webview.setZoomFactor(factor),
        设置缩放: (factor) => webview.setZoomFactor(factor),
        
        getZoomFactor: () => webview.getZoomFactor(),
        获取缩放: () => webview.getZoomFactor(),
        
        resetZoom: () => webview.setZoomFactor(1.0),
        重置缩放: () => webview.setZoomFactor(1.0),
        
        // 文本查找 - Text Search
        findInPage: (text, options) => webview.findInPage(text, options),
        页内查找: (text, options) => webview.findInPage(text, options),
        
        stopFindInPage: (action) => webview.stopFindInPage(action || 'clearSelection'),
        停止查找: (action) => webview.stopFindInPage(action || 'clearSelection'),
        
        // 截图和打印 - Screenshot & Print
        capturePage: (rect) => webview.getWebContents().capturePage(rect),
        截图: (rect) => webview.getWebContents().capturePage(rect),
        
        print: (options) => webview.getWebContents().print(options),
        打印: (options) => webview.getWebContents().print(options),
        
        printToPDF: (options) => webview.getWebContents().printToPDF(options),
        打印到PDF: (options) => webview.getWebContents().printToPDF(options),
        
        // 开发工具 - Dev Tools
        openDevTools: () => webview.openDevTools(),
        打开开发者工具: () => webview.openDevTools(),
        
        closeDevTools: () => webview.closeDevTools(),
        关闭开发者工具: () => webview.closeDevTools(),
        
        isDevToolsOpened: () => webview.isDevToolsOpened(),
        是否已打开开发者工具: () => webview.isDevToolsOpened(),
        
        // 剪贴板操作 - Clipboard Operations
        copy: () => webview.copy(),
        复制: () => webview.copy(),
        
        cut: () => webview.cut(),
        剪切: () => webview.cut(),
        
        paste: () => webview.paste(),
        粘贴: () => webview.paste(),
        
        selectAll: () => webview.selectAll(),
        全选: () => webview.selectAll(),
        
        // 页面事件 - Page Events
        sendMouseEvent: (type, x, y, button) => webview.sendInputEvent({type, x, y, button}),
        发送鼠标事件: (type, x, y, button) => webview.sendInputEvent({type, x, y, button}),
        
        sendKeyEvent: (type, keyCode) => webview.sendInputEvent({type, keyCode}),
        发送按键事件: (type, keyCode) => webview.sendInputEvent({type, keyCode}),
        
        // 内容安全 - Content Security
        setContentSecurityPolicy: (policy) => webview.getWebContents().session.webRequest.onHeadersReceived(
            {urls: ['*://*/*']},
            (details, callback) => {
                callback({
                    responseHeaders: {
                        ...details.responseHeaders,
                        'Content-Security-Policy': [policy]
                    }
                });
            }
        ),
        设置内容安全策略: (policy) => webview.getWebContents().session.webRequest.onHeadersReceived(
            {urls: ['*://*/*']},
            (details, callback) => {
                callback({
                    responseHeaders: {
                        ...details.responseHeaders,
                        'Content-Security-Policy': [policy]
                    }
                });
            }
        ),
        
        // 会话管理 - Session Management
        clearCache: () => webview.getWebContents().session.clearCache(),
        清除缓存: () => webview.getWebContents().session.clearCache(),
        
        clearStorageData: () => webview.getWebContents().session.clearStorageData(),
        清除本地存储: () => webview.getWebContents().session.clearStorageData()
    }
}

// 为英文用户提供别名
export const createWebviewContext = 创建网页浏览器上下文;