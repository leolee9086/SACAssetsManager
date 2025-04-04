// 创建空白图片
// color: 支持颜色字符串(如'red','#fff')或rgba(如'rgba(255,0,0,0.5)')，不传则为透明
export const createEmptyImage = (width, height, color) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    if (color) {
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, width, height);
    }
    
    return canvas.toDataURL('image/png');
};

// 创建Base64空白图
export const createEmptyBase64Image = () => {
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
};