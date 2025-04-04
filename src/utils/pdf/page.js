/**
 * 将 PDF 文件的指定页面转换为图片
 * @param {string} url - PDF 文件的 URL 地址
 * @param {number} pageNumber - 需要转换的 PDF 页码
 * @returns {Promise<string>} 返回一个 Promise，解析为图片的 base64 格式数据 URL
 * @throws {Error} 当页码无效或 PDF 加载失败时抛出错误
 */
export function getPdfPageAsImage(url, pageNumber) {
    return pdfjsLib.getDocument(url).promise.then(pdf => {
        if (pageNumber < 1 || pageNumber > pdf.numPages) {
            throw new Error('Invalid page number');
        }
        return pdf.getPage(pageNumber).then(page => {
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            // 渲染页面到 Canvas
            return page.render({ canvasContext: context, viewport: viewport }).promise.then(() => {
                // 将 Canvas 转换为图片
                return canvas.toDataURL();
            });
        });
    }).catch(error => {
        console.error('Error loading PDF: ', error);
        throw error;
    });
}

/**
 * 获取 PDF 文件的总页数
 * @param {string} url - PDF 文件的 URL 地址
 * @returns {Promise<number>} 返回一个 Promise，解析为 PDF 的总页数
 * @throws {Error} 当 PDF 加载失败时抛出错误
 */
export function getPdfPageCount(url) {
    return pdfjsLib.getDocument(url).promise.then(pdf => {
        return pdf.numPages;
    }).catch(error => {
        console.error('Error loading PDF: ', error);
        throw error;
    });
}