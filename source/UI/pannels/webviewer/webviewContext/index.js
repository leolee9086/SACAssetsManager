export const 创建网页浏览器上下文 = (webview) => {
    return {
      webview,
      getURL: () => webview.getURL(),
      getTitle: () => webview.getTitle(),
      executeJavaScript: (script) => webview.executeJavaScript(script),
      loadURL: (url) => webview.loadURL(url),
      reload: () => webview.reload(),
      goBack: () => webview.goBack(),
      goForward: () => webview.goForward()
    }
  }