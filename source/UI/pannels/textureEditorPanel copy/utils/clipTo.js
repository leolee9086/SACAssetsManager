

/**
 * 将图像裁剪到指定路径
 * @param {CanvasRenderingContext2D} ctx - 画布上下文
 * @param {Array} pathVertices - 裁剪路径顶点
 */
export const clipToPath = (ctx, pathVertices) => {
    if (!pathVertices) return;

    // 绘制裁剪路径
    ctx.beginPath();
    ctx.moveTo(pathVertices[0].x, pathVertices[0].y);
    for (let i = 1; i < pathVertices.length; i++) {
        ctx.lineTo(pathVertices[i].x, pathVertices[i].y);
    }
    ctx.closePath();
};

