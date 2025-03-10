export function 查找矩形中心(矩形) {
    // 构造矩形的四个顶点
    const 顶点数组 = [
        { x: 矩形.x, y: 矩形.y },                    // 左上
        { x: 矩形.x + 矩形.width, y: 矩形.y },       // 右上
        { x: 矩形.x + 矩形.width, y: 矩形.y + 矩形.height }, // 右下
        { x: 矩形.x, y: 矩形.y + 矩形.height }       // 左下
    ];
    
    return 查找多边形形心(顶点数组);
}
/**
 * 计算多边形的形心坐标（性能优化版本）
 * @param {Array<{x: number, y: number}>} 顶点数组 - 多边形的顶点坐标数组
 * @returns {{x: number, y: number}} 返回形心坐标
 */
export function 查找多边形形心(顶点数组) {
    // 快速处理特殊情况
    const 顶点数量 = 顶点数组.length;
    if (!顶点数组 || 顶点数量 < 3) {
        throw new Error('计算形心需要至少3个顶点');
    }
    
    // 三角形的快速处理
    if (顶点数量 === 3) {
        return {
            x: (顶点数组[0].x + 顶点数组[1].x + 顶点数组[2].x) / 3,
            y: (顶点数组[0].y + 顶点数组[1].y + 顶点数组[2].y) / 3
        };
    }
    
    // 矩形的快速处理
    if (顶点数量 === 4) {
        const x0 = 顶点数组[0].x, y0 = 顶点数组[0].y;
        const x2 = 顶点数组[2].x, y2 = 顶点数组[2].y;
        return {
            x: (x0 + x2) * 0.5,
            y: (y0 + y2) * 0.5
        };
    }

    // 对于其他多边形，使用优化后的高斯面积公式
    let 面积 = 0;
    let 形心x = 0;
    let 形心y = 0;
    
    // 缓存第一个点，避免最后一次循环时重复访问数组
    const 首点 = 顶点数组[0];
    let 上一点 = 首点;
    
    // 使用 for 循环替代 for...of，并减少一次循环
    for (let i = 1; i < 顶点数量; i++) {
        const 当前点 = 顶点数组[i];
        
        // 使用临时变量避免重复计算
        const 部分面积 = 上一点.x * 当前点.y - 当前点.x * 上一点.y;
        面积 += 部分面积;
        
        const x和 = 上一点.x + 当前点.x;
        const y和 = 上一点.y + 当前点.y;
        
        形心x += x和 * 部分面积;
        形心y += y和 * 部分面积;
        
        上一点 = 当前点;
    }
    
    // 处理最后一个三角形（最后一个点和第一个点之间）
    const 部分面积 = 上一点.x * 首点.y - 首点.x * 上一点.y;
    面积 += 部分面积;
    
    const x和 = 上一点.x + 首点.x;
    const y和 = 上一点.y + 首点.y;
    
    形心x += x和 * 部分面积;
    形心y += y和 * 部分面积;
    
    // 使用乘法代替除法（因为除法运算较慢）
    const 面积倒数 = 1 / (3 * 面积); // 只计算一次除法
    
    return {
        x: 形心x * 面积倒数,
        y: 形心y * 面积倒数
    };
}