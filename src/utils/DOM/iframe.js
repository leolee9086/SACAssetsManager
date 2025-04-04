const hljsSrc = '/stage/protyle/js/highlight.js/';
function escapeHtml(unsafe) {
    return unsafe.replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
const hljsEditorSrc = `/editors/webview/text.html`
export async function writeHljsIframe(contentFrame, data) {
    try {
        // 构造新的代码块
        const newCodeBlock = `<pre style='white-space: pre-wrap !important'><code>${escapeHtml(data)}</code></pre>`;

        // 将内容插入到 iframe 中
        if (contentFrame) {
            const doc = contentFrame.contentDocument || contentFrame.contentWindow.document;
            if (!contentFrame.contentWindow.hljs) {
                // 初次写入
                const iframeContent = `
                    <html>
                    <head>
                        <link rel="stylesheet" href="${hljsSrc}styles/default.min.css">
                        <script src="${hljsSrc}highlight.min.js"></script>
                        <style>
                        :root{
                            background-color:white;
                        }
                        </style>
                        <style>
                            body { margin: 0; overflow: hidden; } // 隐藏滚动条
                            pre { white-space: pre-wrap !important } // 启用折行
                        </style>
                    </head>
                    <body>
                        ${newCodeBlock}
                    </body>
                                            <script>
                            // 使用 ResizeObserver 调整 iframe 高度以适应内容
                            function resizeIframe() {
                                const observer = new ResizeObserver(entries => {
                                    for (let entry of entries) {
                                        const height = entry.contentRect.height;
                                        window.parent.document.querySelector('iframe').style.height = height + 'px';
                                    }
                                });
                                observer.observe(document.body);
                            }
                            window.onload = function() {
                                resizeIframe();
                                requestIdleCallback(hljs.highlightAll);
                            };
                        </script>

                    </html>
                `;
                doc.open();
                doc.write(iframeContent);
                doc.close();
            } else {
                const existingCodeBlock = doc.querySelector('pre code');
                if (existingCodeBlock) {
                    existingCodeBlock.innerHTML += escapeHtml(data);
                    contentFrame.contentWindow.hljs.highlightElement(existingCodeBlock);
                } else {
                    console.warn('未找到现有的代码块');
                }
            }
        }
    } catch (err) {
        console.error('Error reading file:', err);
    }
}