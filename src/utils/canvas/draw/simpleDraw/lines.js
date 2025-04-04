/**
 * 批量绘制多条线段（使用相同样式，优化性能的一次性绘制）
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D上下文
 * @param {Array<{startX: number, startY: number, endX: number, endY: number}>} lines - 线段数组
 * @param {Object} baseStyle - 基础线条样式配置
 * @param {string} baseStyle.color - 线条颜色（CSS颜色值）
 * @param {number} baseStyle.width - 线条宽度（像素）
 * @param {number[]} baseStyle.dash - 虚线模式（线段间隔数组，如[5, 5]）
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
export function 在画布上下文批量绘制线条(ctx, lines, baseStyle={}) {
    // 创建样式分组映射（使用JSON序列化作为临时key）
    const styleGroups = new Map();
    
    // 分组处理逻辑
    for (const line of lines) {
        // 合并样式：优先使用线段自带的style，其次使用基础样式
        const finalStyle = {
            ...baseStyle,
            ...(line.style || {})
        };
        
        // 生成样式唯一标识
        const styleKey = JSON.stringify(finalStyle);
        
        if (!styleGroups.has(styleKey)) {
            styleGroups.set(styleKey, {
                style: finalStyle,
                paths: []
            });
        }
        
        // 添加路径到对应样式组
        styleGroups.get(styleKey).paths.push(line);
    }

    // 按样式分组批量绘制
    for (const [_, group] of styleGroups) {
        ctx.save();
        ctx.strokeStyle = group.style.color;
        ctx.lineWidth = group.style.width;
        ctx.setLineDash(group.style.dash || []);
        
        ctx.beginPath();
        for (const line of group.paths) {
            ctx.moveTo(line.startX, line.startY);
            ctx.lineTo(line.endX, line.endY);
        }
        ctx.stroke();
        ctx.restore();
    }
}

