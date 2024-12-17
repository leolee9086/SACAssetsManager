// 绘制矩形单元边界
const 绘制矩形 = (ctx, rectUnit, options = {}) => {
    const {
        dashPattern = [5, 5],
        strokeColor = 'rgba(255, 0, 0, 0.8)',
        lineWidth = 3,
        showHandles = false,
        handleSize = 8
    } = options;

    ctx.save();
    ctx.rotate(rectUnit.transform.rotation);

    // 绘制主边框
    ctx.setLineDash(dashPattern);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;

    ctx.beginPath();
    ctx.rect(
        rectUnit.transform.origin.x,
        rectUnit.transform.origin.y,
        rectUnit.width,
        rectUnit.height
    );
    ctx.stroke();

    // 绘制控制点
    if (showHandles) {
        ctx.setLineDash([]); // 实线
        ctx.fillStyle = strokeColor;

        // 四个角的控制点
        const corners = [
            { x: rectUnit.transform.origin.x, y: rectUnit.transform.origin.y },
            { x: rectUnit.transform.origin.x + rectUnit.width, y: rectUnit.transform.origin.y },
            { x: rectUnit.transform.origin.x + rectUnit.width, y: rectUnit.transform.origin.y + rectUnit.height },
            { x: rectUnit.transform.origin.x, y: rectUnit.transform.origin.y + rectUnit.height }
        ];

        corners.forEach(corner => {
            ctx.beginPath();
            ctx.arc(corner.x, corner.y, handleSize / 2, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    ctx.restore();
};