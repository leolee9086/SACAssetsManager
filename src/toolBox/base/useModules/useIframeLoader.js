/**
 * 创建通用的iframe加载器
 * 用于在隔离环境中加载外部库并获取其导出的对象
 * @returns {Function} 加载函数
 */
const createIframeLoader = () => {
    let loadedLibrary = null;
    let iframe = null;

    // 添加清理函数
    const cleanupIframe = () => {
        if (iframe && iframe.parentNode) {
            try {
                document.body.removeChild(iframe);
                // 保留 loadedLibrary 引用，但清除 iframe
                iframe = null;
            } catch (e) {
                console.warn(`清理iframe失败: ${e.message}`);
            }
        }
    };

    return async (scriptPath, libraryName, globalSymbolName = null) => {
        if (loadedLibrary) {
            // 如果已经加载过库并获取了引用，清理iframe以节省资源
            cleanupIframe();
            return loadedLibrary;
        }

        return new Promise((resolve, reject) => {
            try {
                // 创建一个隐藏的iframe
                iframe = document.createElement('iframe');
                iframe.style.display = 'none';
                document.body.appendChild(iframe);

                // 设置iframe加载完成后的回调
                iframe.onload = () => {
                    const doc = iframe.contentDocument || iframe.contentWindow.document;
                    const script = doc.createElement('script');
                    script.src = scriptPath;
                    
                    script.onload = () => {
                        // 获取iframe窗口中的指定对象
                        if (iframe.contentWindow[libraryName]) {
                            loadedLibrary = iframe.contentWindow[libraryName];
                            
                            // 如果提供了全局Symbol名称，则存储到全局对象
                            if (globalSymbolName) {
                                globalThis[Symbol(globalSymbolName)] = loadedLibrary;
                            }

                            // 成功获取库引用后清理iframe
                            cleanupIframe();
                            
                            resolve(loadedLibrary);
                        } else {
                            cleanupIframe();
                            reject(new Error(`无法在iframe中找到${libraryName}对象`));
                        }
                    };
                    
                    script.onerror = () => {
                        cleanupIframe();
                        reject(new Error(`在iframe中加载${scriptPath}失败`));
                    };

                    doc.head.appendChild(script);
                };

                iframe.onerror = () => {
                    cleanupIframe();
                    reject(new Error(`创建iframe失败`));
                };

                // 设置一个简单的HTML内容
                const html = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Library Loader</title>
                    </head>
                    <body>
                        <!-- 库加载容器 -->
                    </body>
                    </html>
                `;

                // 设置iframe内容
                iframe.srcdoc = html;
            } catch (error) {
                cleanupIframe();
                reject(error);
            }
        });
    };
};

export { createIframeLoader }; 