/**
 * 将ltwh格式的矩形转换为xywh格式
 * @param {Object} rect - ltwh格式矩形 {left, top, width, height}
 * @returns {Object} xywh格式矩形 {x, y, width, height}
 */
export function ltwhRect2xywhRect(rect) {
    return {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height
    };
}