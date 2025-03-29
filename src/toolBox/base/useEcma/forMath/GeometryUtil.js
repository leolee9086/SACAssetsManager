/**
 * @fileoverview 几何工具函数
 */

import { Rectangle } from './Rectangle.js';

/**
 * 生成随机矩形
 * @param {number} num 生成的矩形数量
 * @param {number} maxWidth 最大宽度
 * @param {number} maxHeight 最大高度
 * @returns {Array<Rectangle>} 生成的矩形数组
 */
export function generateRandomRectangles(num, maxWidth, maxHeight) {
    const rectangles = [];
    for (let i = 0; i < num; i++) {
        const x = Math.random() * maxWidth;
        const y = Math.random() * maxHeight;
        const width = Math.random() * (maxWidth - x);
        const height = Math.random() * (maxHeight - y);
        rectangles.push(new Rectangle(x, y, width, height));
    }
    return rectangles;
} 