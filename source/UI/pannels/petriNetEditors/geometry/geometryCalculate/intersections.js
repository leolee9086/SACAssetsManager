import { 查找多边形形心 } from "./find/centers.js";
/**
 * 计算从矩形中心出发的射线与矩形边界的交点
 * @param {{x: number, y: number, width: number, height: number}} rect - 矩形
 * @param {{x: number, y: number}} vector - 方向向量
 * @returns {{x: number, y: number}} 交点坐标
 */
export function 自中心以方向向量计算矩形上交点(rect, vector) {
    // 对于水平或垂直的向量，使用快速路径
    if (Math.abs(vector.x) < 1e-10 || Math.abs(vector.y) < 1e-10) {
        return 计算正交方向交点(rect, vector);
    }
    
    // 构造矩形的四个顶点（顺时针方向）
    const 顶点数组 = [
        { x: rect.x, y: rect.y },                    // 左上
        { x: rect.x + rect.width, y: rect.y },       // 右上
        { x: rect.x + rect.width, y: rect.y + rect.height }, // 右下
        { x: rect.x, y: rect.y + rect.height }       // 左下
    ];
    
    return 自中心以方向向量计算多边形上交点(顶点数组, vector);
}

/**
 * 处理水平或垂直方向的快速计算
 * @private
 */
function 计算正交方向交点(rect, vector) {
    const center = {
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height / 2
    };
    
    // 处理垂直方向
    if (Math.abs(vector.x) < 1e-10) {
        return {
            x: center.x,
            y: vector.y > 0 ? rect.y + rect.height : rect.y
        };
    }
    
    // 处理水平方向
    return {
        x: vector.x > 0 ? rect.x + rect.width : rect.x,
        y: center.y
    };
}

/**
 * 计算从多边形中心出发的射线与多边形边界的交点
 * @param {Array<{x: number, y: number}>} 顶点数组 - 多边形的顶点数组
 * @param {{x: number, y: number}} vector - 方向向量
 * @returns {{x: number, y: number}} 交点坐标
 */
export function 自中心以方向向量计算多边形上交点(顶点数组, vector) {
    // 计算多边形中心点
    const center = 查找多边形形心(顶点数组);
    
    // 归一化方向向量
    const 向量长度 = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
    const 单位向量 = {
        x: vector.x / 向量长度,
        y: vector.y / 向量长度
    };
    
    // 找到最远的顶点到中心的距离，用于延长射线
    let 最大距离 = 0;
    for (const 顶点 of 顶点数组) {
        const dx = 顶点.x - center.x;
        const dy = 顶点.y - center.y;
        const 距离 = Math.sqrt(dx * dx + dy * dy);
        最大距离 = Math.max(最大距离, 距离);
    }
    
    // 计算射线终点（将射线延长足够长以确保与多边形相交）
    const 射线终点 = {
        x: center.x + 单位向量.x * 最大距离 * 2,
        y: center.y + 单位向量.y * 最大距离 * 2
    };
    
    // 存储最近的交点
    let 最近交点 = null;
    let 最小距离 = Infinity;
    
    // 检查与每条边的交点
    for (let i = 0; i < 顶点数组.length; i++) {
        const 当前点 = 顶点数组[i];
        const 下一点 = 顶点数组[(i + 1) % 顶点数组.length];
        
        const 交点 = 计算线段交点(
            center.x, center.y,
            射线终点.x, 射线终点.y,
            当前点.x, 当前点.y,
            下一点.x, 下一点.y
        );
        
        if (交点) {
            const dx = 交点.x - center.x;
            const dy = 交点.y - center.y;
            const 距离 = dx * dx + dy * dy; // 使用平方距离以避免开方
            
            // 检查交点是否在射线方向上
            const 同向 = (dx * 单位向量.x + dy * 单位向量.y) > 0;
            
            if (同向 && 距离 < 最小距离) {
                最小距离 = 距离;
                最近交点 = 交点;
            }
        }
    }
    
    return 最近交点 || center; // 如果没有找到交点，返回中心点
}

/**
 * 计算两条线段的交点
 * @private
 */
function 计算线段交点(x1, y1, x2, y2, x3, y3, x4, y4) {
    const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denominator) < 1e-10) return null; // 平行或重合
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denominator;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denominator;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        return {
            x: x1 + t * (x2 - x1),
            y: y1 + t * (y2 - y1)
        };
    }
    return null;
}