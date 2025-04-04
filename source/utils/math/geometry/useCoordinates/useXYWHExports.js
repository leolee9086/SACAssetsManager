export const ltwhRect2xywhRect = (ltwhRect) => {
    if (!ltwhRect || typeof ltwhRect !== 'object') {
        console.warn('无效的LTWH格式数据')
        return null
    }
    return {
        x: ltwhRect.left,
        y: ltwhRect.top,
        width: ltwhRect.width,
        height: ltwhRect.height
    }
}

