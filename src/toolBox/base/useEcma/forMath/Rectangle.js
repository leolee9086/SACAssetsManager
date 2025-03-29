/**
 * @fileoverview 矩形几何工具
 */

/**
 * 矩形类，用于表示二维空间中的矩形
 */
export class Rectangle {
    /**
     * 创建矩形实例
     * @param {number} x 左上角X坐标
     * @param {number} y 左上角Y坐标
     * @param {number} width 宽度
     * @param {number} height 高度
     */
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.right = x + width;
        this.bottom = y + height;
    }

    /**
     * 检查当前矩形是否与另一个矩形相交
     * @param {Rectangle} rect 需要检查的矩形
     * @returns {boolean} 如果相交返回true，否则返回false
     */
    intersects(rect) {
        return !(this.right < rect.x || this.bottom < rect.y || this.x > rect.right || this.y > rect.bottom);
    }
} 