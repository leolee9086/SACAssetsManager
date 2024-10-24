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
export function getPdfPageCount(url) {
    return pdfjsLib.getDocument(url).promise.then(pdf => {
        return pdf.numPages;
    }).catch(error => {
        console.error('Error loading PDF: ', error);
        throw error;
    });
}