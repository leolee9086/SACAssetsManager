/**
 * 批量绘制多条线段（使用相同样式，优化性能的一次性绘制）
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D上下文
 * @param {Array<{startX: number, startY: number, endX: number, endY: number}>} lines - 线段数组
 * @param {Object} style - 线条样式配置
 * @param {string} style.color - 线条颜色（CSS颜色值）
 * @param {number} style.width - 线条宽度（像素）
 * @param {number[]} style.dash - 虚线模式（线段间隔数组，如[5, 5]）
 * @example
 * batchDrawLines(ctx, [
 *   {startX: 10, startY: 10, endX: 50, endY: 50},
 *   {startX: 60, startY: 60, endX: 100, endY: 100}
 * ], {
 *   color: '#ff0000',
 *   width: 2,
 *   dash: [5, 3]
 * });
 */
export function 在画布上下文批量绘制线条(ctx, lines, style) {
    ctx.save();
    ctx.strokeStyle = style.color;
    ctx.lineWidth = style.width;
    ctx.setLineDash(style.dash);
    ctx.beginPath();
    for (const line of lines) {
        ctx.moveTo(line.startX, line.startY);
        ctx.lineTo(line.endX, line.endY);
    }
    ctx.stroke();
    ctx.restore();
}

