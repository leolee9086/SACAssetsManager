// 工程制图常量
const ENGINEERING_PRECISION = 1000000; // 微米级精度
const DIRECTION = {
    HORIZONTAL: 0, // 横向优先
    VERTICAL: 1    // 纵向优先
}

/**
 * 计算两点间的正交分段路径
 * @param {Point} start - 起点坐标 {x: number, y: number}
 * @param {Point} end - 终点坐标 {x: number, y: number}
 * @param {number} [direction] - 分段方向 0:横向优先(默认) 1:纵向优先
 * @returns {number[]} - 返回路径点数组 [x1,y1, x2,y2, x3,y3, x4,y4]
 */
export function 计算正交分段路径(start, end, direction = DIRECTION.HORIZONTAL) {
    // 局部变量缓存坐标值，避免重复属性访问
    const x1 = start.x, y1 = start.y;
    const x2 = end.x, y2 = end.y;

    // 使用位运算将数值提升到整数域
    const sx = (x1 * ENGINEERING_PRECISION) | 0;
    const sy = (y1 * ENGINEERING_PRECISION) | 0;
    const ex = (x2 * ENGINEERING_PRECISION) | 0;
    const ey = (y2 * ENGINEERING_PRECISION) | 0;

    // 使用位运算计算中点 (更快的除以2)
    const mx = (sx + ex) >> 1;
    const my = (sy + ey) >> 1;

    // 使用数组字面量而不是多次push
    return direction === DIRECTION.HORIZONTAL
        ? new Float64Array([
            x1, y1,                           // 起点
            mx / ENGINEERING_PRECISION, y1,   // 横向中点
            mx / ENGINEERING_PRECISION, y2,   // 转折点
            x2, y2                           // 终点
        ])
        : new Float64Array([
            x1, y1,                          // 起点
            x1, my / ENGINEERING_PRECISION,  // 纵向中点
            x2, my / ENGINEERING_PRECISION,  // 转折点
            x2, y2                          // 终点
        ]);
}
