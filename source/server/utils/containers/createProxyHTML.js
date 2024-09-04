/**
 * 用于创建代理HTML以能够通过webview访问
 */
function createProxyHTML(jsURL, options={
    esm:true,
    timeout:10000,
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
    </html>
    </head>`
    
}
export function createProxyHTMLURL(jsURL, options={
    esm:true,
    timeout:10000,
}) {
    const html = createProxyHTML(jsURL, options)
    const blob = new Blob([html], { type: 'text/html' });
    return URL.createObjectURL(blob);
}
