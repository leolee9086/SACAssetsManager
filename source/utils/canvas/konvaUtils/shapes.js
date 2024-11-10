/**
 * 贝塞尔曲线绘制方法映射表
 * @type {Object.<number, function>}
 */
const BEZIER_METHODS = {
    6: (ctx, points) => ctx.quadraticCurveTo(points[2], points[3], points[4], points[5]),
    8: (ctx, points) => ctx.bezierCurveTo(points[2], points[3], points[4], points[5], points[6], points[7])
};

/**
 * 智能绘制贝塞尔曲线（查表法优化版）
 * @param {Konva.Context} ctx - Konva Context对象
 * @param {Object} shape - Konva Shape对象
 * @param {Array<number>} points - 曲线的点坐标数组
 *                                二次贝塞尔曲线: [x1,y1, cx,cy, x2,y2]
 *                                三次贝塞尔曲线: [x1,y1, cx1,cy1, cx2,cy2, x2,y2]
 */
export const 绘制贝塞尔曲线 = (ctx, shape, points) => {
    const drawMethod = BEZIER_METHODS[points.length];
    
    if (!drawMethod) {
        console.error('贝塞尔曲线点的数量必须是6（二次曲线）或8（三次曲线）');
        return;
    }
    
    ctx.beginPath();
    ctx.moveTo(points[0], points[1]);
    drawMethod(ctx, points);
    ctx.strokeShape(shape);
};

export const 从点集创建贝塞尔曲线绘制函数 = (points)=>{
    return (ctx,shape)=>{
        绘制贝塞尔曲线(ctx, shape, points)
    }
}