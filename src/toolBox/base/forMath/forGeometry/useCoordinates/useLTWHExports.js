/**
 * 将xywh格式的矩形转换为ltwh格式
 * @param {Object} rect - xywh格式矩形 {x, y, width, height}
 * @returns {Object} ltwh格式矩形 {left, top, width, height}
 */
export function xywhRect2ltwhRect(rect) {
    return {
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height
    };
}