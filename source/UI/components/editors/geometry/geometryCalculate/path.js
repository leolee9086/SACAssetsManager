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


// 为采样点添加抖动效果
export const 添加抖动效果到点集 = (输入点集, 抖动幅度) => {
    const 抖动后的点集 = [];
    for (let i = 0; i < 输入点集.length; i += 2) {
        const x = 输入点集[i];
        const y = 输入点集[i + 1];
        const 抖动X = (Math.random() - 0.5) * 抖动幅度;
        const 抖动Y = (Math.random() - 0.5) * 抖动幅度;
        抖动后的点集.push(x + 抖动X, y + 抖动Y);
    }
    return 抖动后的点集;
}

import { 二维转换器 } from "../utils/pointFormatters.js";
import { 计算贝塞尔点 } from "./bezier.js";
/**
 * 计算三次贝塞尔曲线上的点坐标
 * @param {number[]} 控制点数组 - 包含4个控制点的坐标数组 [x0,y0, x1,y1, x2,y2, x3,y3]
 * @param {number} 插值系数 - 曲线插值参数t，范围[0,1]
 * @returns {{x: number, y: number}} 返回曲线上对应点的坐标
 * @throws {Error} 当控制点数量不等于4时抛出错误
 */
export function 计算三次贝塞尔曲线上的点(控制点数组, 插值系数) {
    // 验证是否为三次贝塞尔曲线（4个控制点）
    if (控制点数组.length !== 8) {
        throw new Error('三次贝塞尔曲线需要恰好4个控制点');
    }
    const 点 = 计算贝塞尔点(控制点数组, 插值系数);
    return 二维转换器.点数组转对象(点)
}