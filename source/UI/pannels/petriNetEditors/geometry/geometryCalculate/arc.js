// 计算弧线末端的切线点

export function calculateArcEndPoints(points) {
    const t = 0.95; // 用于计算箭头方向的点
    const [x0, y0, cx, cy, x1, y1] = points;

    // 计算结束点
    const endPoint = {
        x: x1,
        y: y1
    };
    // 计算靠近结束点的点（用于确定箭头方向）
    const mt = 1 - t;
    const nearEndPoint = {
        x: mt * mt * x0 + 2 * mt * t * cx + t * t * x1,
        y: mt * mt * y0 + 2 * mt * t * cy + t * t * y1
    };
    return [
        nearEndPoint.x,
        nearEndPoint.y,
        endPoint.x,
        endPoint.y
    ];
}
 // 计算弧线上的点
 export function getPointOnArc(points, t) {
    const [x0, y0, cx, cy, x1, y1] = points;
    const mt = 1 - t;

    // 二次贝塞尔曲线插值
    return {
        x: mt * mt * x0 + 2 * mt * t * cx + t * t * x1,
        y: mt * mt * y0 + 2 * mt * t * cy + t * t * y1
    };
}