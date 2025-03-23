let artTemplate = null
artTemplate = globalThis[Symbol('artTemplate')] || null


const 加载模板引擎 = (() => {
    let templateEngine = null;
    let iframe = null;

    return async () => {
        if (templateEngine) {
            return templateEngine;
        }

        return new Promise((resolve, reject) => {
            try {
                // 创建一个隐藏的iframe
                iframe = document.createElement('iframe');
                iframe.style.display = 'none';
                document.body.appendChild(iframe);

                // 设置iframe加载完成后的回调,将art-template-web.js注入到iframe中
                // 然后获取iframe中的template对象赋值给artTemplate
                iframe.onload = () => {
                    // 注入script标签加载art-template-web.js
                    const doc = iframe.contentDocument || iframe.contentWindow.document;
                    const script = doc.createElement('script');
                    script.src = import.meta.resolve('../../../../static/art-template-web.js');

                    script.onload = () => {
                        // 获取iframe窗口中的template对象
                        if (iframe.contentWindow.template) {
                            artTemplate = iframe.contentWindow.template;
                            globalThis[Symbol('artTemplate')] = artTemplate
                            resolve(artTemplate);
                        } else {
                            reject(new Error('无法在iframe中找到template对象'));
                        }
                    };

                    script.onerror = () => {
                        reject(new Error('在iframe中加载art-template-web.js失败'));
                    };

                    doc.head.appendChild(script);
                };

                // 设置一个简单的HTML内容
                const html = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Template Engine Loader</title>
                    </head>
                    <body>
                        <!-- 模板引擎加载容器 -->
                    </body>
                    </html>
                `;

                // 设置iframe内容
                iframe.srcdoc = html;
            } catch (error) {
                reject(error);
            }
        });
    };
})();
!artTemplate && await 加载模板引擎()
!artTemplate && (() => { throw new Error('模板引擎加载失败') })()
export { artTemplate }
