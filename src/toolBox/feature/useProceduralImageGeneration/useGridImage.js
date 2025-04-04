// 创建带网格的空白图片（用于占位预览）
export const createGridImage = (width, height, gridSize = 10, color1 = '#eee', color2 = '#ddd') => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color1;
    ctx.fillRect(0, 0, width, height);
    
    ctx.fillStyle = color2;
    for (let y = 0; y < height; y += gridSize * 2) {
        for (let x = 0; x < width; x += gridSize * 2) {
            ctx.fillRect(x, y, gridSize, gridSize);
            ctx.fillRect(x + gridSize, y + gridSize, gridSize, gridSize);
        }
    }
    
    return canvas.toDataURL('image/png');
};
