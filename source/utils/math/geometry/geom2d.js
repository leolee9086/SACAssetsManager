// 计算两点之间的距离和角度
export const 计算点距离和角度 = (startX, startY, endX, endY) => {
    const dx = endX - startX
    const dy = endY - startY
    return {
        distance: Math.sqrt(dx * dx + dy * dy),
        angle: Math.atan2(dy, dx)
    }
}
