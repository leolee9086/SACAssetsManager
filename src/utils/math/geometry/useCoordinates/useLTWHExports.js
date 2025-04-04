export const xywhRect2ltwhRect = (xywhRect) => {
    if (!xywhRect || typeof xywhRect !== 'object') {
        console.warn('无效的XYWH格式数据')
        return null
    }
    return {
        left: xywhRect.x,
        top: xywhRect.y,
        width: xywhRect.width,
        height: xywhRect.height
    }
}
