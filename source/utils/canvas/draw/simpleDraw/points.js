/**
 * 批量绘制多个点（使用相同样式，优化性能的一次性绘制）
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D上下文
 * @param {Array<{x: number, y: number, style?: Object}>} points - 点数组
 * @param {Object} baseStyle - 基础点样式配置
 * @param {string} baseStyle.color - 点颜色（CSS颜色值）
 * @param {number} baseStyle.radius - 点半径（像素）
 * @param {number} [baseStyle.strokeWidth=0] - 描边宽度（像素）
 * @param {string} [baseStyle.strokeColor] - 描边颜色
 * @example
 * batchDrawPoints(ctx, [
 *   {x: 10, y: 10},
 *   {x: 20, y: 20, style: {color: '#00ff00'}}
 * ], {
 *   color: '#ff0000',
 *   radius: 3
 * });
 */
export function 在画布上下文批量绘制标记点(ctx, points, baseStyle) {
    // 创建样式分组映射
    const styleGroups = new Map();
    
    // 分组处理逻辑
    for (const point of points) {
        // 合并样式
        const finalStyle = {
            ...baseStyle,
            ...(point.style || {})
        };
        
        // 生成样式唯一标识
        const styleKey = JSON.stringify(finalStyle);
        
        if (!styleGroups.has(styleKey)) {
            styleGroups.set(styleKey, {
                style: finalStyle,
                coordinates: []
            });
        }
        
        // 添加坐标到对应样式组
        styleGroups.get(styleKey).coordinates.push(point);
    }

    // 按样式分组批量绘制
    for (const [_, group] of styleGroups) {
        ctx.save();
        ctx.fillStyle = group.style.color;
        
        // 设置描边样式
        if (group.style.strokeWidth > 0) {
            ctx.strokeStyle = group.style.strokeColor || group.style.color;
            ctx.lineWidth = group.style.strokeWidth;
        }

        for (const point of group.coordinates) {
            ctx.beginPath();
            ctx.arc(point.x, point.y, group.style.radius, 0, Math.PI * 2);
            ctx.fill();
            if (group.style.strokeWidth > 0) {
                ctx.stroke();
            }
        }
        ctx.restore();
    }
} 