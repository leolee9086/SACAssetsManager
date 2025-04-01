/**
 * Electron Webview管理工具
 * 提供创建和管理不可见Webview的函数
 */

/**
 * 创建代理HTML以加载JavaScript文件
 * @param {string} jsURL - JavaScript文件的URL
 * @param {Object} options - 配置选项
 * @param {boolean} [options.esm=true] - 是否作为ES模块加载
 * @param {number} [options.timeout=10000] - 加载超时时间(毫秒)
 * @returns {string} HTML字符串
 */
function 创建代理HTML(jsURL, options = {
  esm: true,
  timeout: 10000,
}) {
  return `<!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Proxy HTML</title>
  </head>
  <body>
      <script>
          const { ipcRenderer } = require('@electron/remote');
          ipcRenderer.send('load-js', '${jsURL}');
          import('${jsURL}').then((module) => {
              ipcRenderer.send('loaded-js', '${jsURL}');
          }).catch((error) => {
              console.error('Failed to load JavaScript file:', error);
              ipcRenderer.send('load-js-error', '${jsURL}');
          });
      </script>
  </body>
  </html>`;
}

/**
 * 创建代理HTML的URL
 * @param {string} jsURL - JavaScript文件的URL
 * @param {Object} options - 配置选项
 * @param {boolean} [options.esm=true] - 是否作为ES模块加载
 * @param {number} [options.timeout=10000] - 加载超时时间(毫秒)
 * @returns {string} HTML的Blob URL
 */
export function 创建代理HTMLURL(jsURL, options = {
  esm: true,
  timeout: 10000,
}) {
  const html = 创建代理HTML(jsURL, options);
  const blob = new Blob([html], { type: 'text/html' });
  return URL.createObjectURL(blob);
}

/**
 * 启用远程模块
 * @returns {Function|null} 启用远程模块的函数
 */
export const 启用远程模块 = () => {
  try {
    const remote = window.require('@electron/remote');
    return remote.require("@electron/remote/main").enable;
  } catch (错误) {
    console.error('创建enableRemote函数失败:', 错误);
    return null;
  }
};

/**
 * 创建不可见的Webview
 * @param {string} entryURL - 加载的URL
 * @param {boolean} [enableRemote=true] - 是否启用远程模块
 * @param {string} [preload] - 预加载脚本路径
 * @returns {Promise<HTMLElement>} Webview元素
 */
export function 创建不可见Webview(entryURL, enableRemote = true, preload) {
  return new Promise((resolve, reject) => {
    try {
      // 确保electron环境
      const remote = window.require && window.require('@electron/remote');
      if (!remote) {
        throw new Error('创建Webview需要Electron环境');
      }
      
      const { webContents } = remote;
      const enableRemoteFunc = 启用远程模块();
      
      let webview = document.createElement('webview');
      webview.setAttribute('nodeintegration', '');
      
      if (preload) {
        webview.setAttribute('preload', preload);
      }
      
      webview.setAttribute('webpreferences', 'contextIsolation=0');
      
      if (enableRemote && preload) {
        webview.setAttribute('webpreferences', `contextIsolation=0,preload=${preload}`);
      }
      
      webview.style.display = 'none'; // 使webview隐形
      webview.src = 'about:blank';
      document.body.appendChild(webview);
      
      webview.addEventListener('did-finish-load', async () => {
        console.log('Webview加载完成:', webview.src);
        
        if (webview.src !== 'about:blank') {
          return;
        }
        
        const webContentsId = webview.getWebContentsId();
        const webviewWebContents = webContents.fromId(webContentsId);
        
        if (enableRemote && enableRemoteFunc) {
          try {
            await enableRemoteFunc(webviewWebContents);
            console.log('Webview远程模块启用成功');
          } catch (错误) {
            console.error('Webview远程模块启用失败:', 错误);
          }
        }
        
        webview.src = entryURL;
        
        // 清除缓存
        webviewWebContents.session.clearCache(() => {
          console.log('Webview缓存已清除');
        });
        
        // 每次加载页面时禁用缓存
        webviewWebContents.on('did-finish-load', () => {
          webviewWebContents.session.clearCache(() => {});
        });
        
        // 保存webContents引用
        webview.$webContents = webviewWebContents;
        resolve(webview);
      });
      
      // 设置超时加载
      setTimeout(() => {
        if (webview.src === 'about:blank') {
          webview.src = entryURL;
        }
      }, 1000);
      
    } catch (错误) {
      reject(错误);
    }
  });
}

/**
 * 通过JavaScript URL创建Webview
 * @param {string} jsURL - JavaScript文件URL
 * @returns {Promise<HTMLElement>} Webview元素
 */
export async function 通过JS地址创建Webview(jsURL) {
  const htmlURL = 创建代理HTMLURL(jsURL);
  return await 创建不可见Webview(htmlURL, false);
}

/**
 * 通过JavaScript字符串创建Webview
 * @param {string} jsString - JavaScript代码字符串
 * @returns {Promise<HTMLElement>} Webview元素
 */
export async function 通过JS字符串创建Webview(jsString) {
  const blob = new Blob([jsString], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);
  return await 通过JS地址创建Webview(url);
}

/**
 * 向Webview暴露函数
 * @param {Function} functionImpl - 要暴露的函数实现
 * @returns {Promise<Function>} 包装后的函数
 */
export async function 向Webview暴露函数(functionImpl) {
  try {
    // 确保electron环境
    const remote = window.require && window.require('@electron/remote');
    if (!remote) {
      throw new Error('向Webview暴露函数需要Electron环境');
    }
    
    const jsString = functionImpl.toString();
    const wrappedJsString = `
    const electron = require('@electron/remote');
    const {ipcRenderer} = electron;
    ipcRenderer.on('invokeFunction', ($event, data) => {
      const sender = $event.sender;
      const {timeStamp, args} = data;
      const result = ${jsString}.apply(null, args);
      electron.ipcRenderer.send('invokeFunctionResult', {timeStamp, result});
    });
    `;
    
    const blob = new Blob([wrappedJsString], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const webview = await 通过JS地址创建Webview(url);
    
    // 返回包装函数
    return (...args) => {
      return new Promise((resolve, reject) => {
        const timeStamp = Date.now();
        const webviewId = webview.getWebContentsId();
        const webviewWebContents = remote.webContents.fromId(webviewId);
        
        webviewWebContents.send('invokeFunction', {timeStamp, args});
        
        // 设置监听器获取结果
        const resultListener = (event, result) => {
          if (result.timeStamp === timeStamp) {
            remote.ipcRenderer.removeListener('invokeFunctionResult', resultListener);
            clearTimeout(timeout);
            resolve(result.result);
          }
        };
        
        remote.ipcRenderer.on('invokeFunctionResult', resultListener);
        
        // 设置超时
        const timeout = setTimeout(() => {
          remote.ipcRenderer.removeListener('invokeFunctionResult', resultListener);
          reject(new Error('函数调用超时'));
        }, 10000);
      });
    };
  } catch (错误) {
    console.error('向Webview暴露函数失败:', 错误);
    throw 错误;
  }
}

// 兼容性导出
export const createProxyHTMLURL = 创建代理HTMLURL;
export const enableRemote = 启用远程模块;
export const createInvisibleWebview = 创建不可见Webview;
export const createWebviewByJsURL = 通过JS地址创建Webview;
export const createWebviewByJsString = 通过JS字符串创建Webview;
export const exposeFunctionToWebview = 向Webview暴露函数; 