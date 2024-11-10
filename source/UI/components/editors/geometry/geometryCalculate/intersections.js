export function 自中心以方向向量计算矩形上交点(rect, vector) {
    const center = {
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height / 2
    };

    // 计算x和y方向的偏移
    let xOffset = Math.abs((rect.height / 2 * vector.x) / vector.y);
    let yOffset = Math.abs((rect.width / 2 * vector.y) / vector.x);

    // 限制在矩形边界内
    if (Math.abs(yOffset) > rect.height / 2) {
        yOffset = rect.height / 2;
    }
    if (Math.abs(xOffset) > rect.width / 2) {
        xOffset = rect.width / 2;
    }

    return {
        x: vector.x > 0 ? center.x + xOffset : center.x - xOffset,
        y: vector.y > 0 ? center.y + yOffset : center.y - yOffset
    };
}
