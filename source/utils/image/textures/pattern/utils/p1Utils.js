export function 从基向量对计算P1网格填充范围(宽度, 高度, 缩放, 基向量1, 基向量2) {
    // 应用缩放因子到视口尺寸
    const viewportWidth = 宽度 / 缩放;
    const viewportHeight = 高度 / 缩放;

    // 计算基向量的行列式
    const det = 基向量1.x * 基向量2.y - 基向量1.y * 基向量2.x;

    // 处理退化情况（基向量近似平行）
    if (Math.abs(det) < 1e-6) {
        const maxDim = Math.max(viewportWidth, viewportHeight);
        const minBasisLength = Math.min(
            Math.hypot(基向量1.x, 基向量1.y),
            Math.hypot(基向量2.x, 基向量2.y)
        );
        const range = Math.ceil(maxDim / minBasisLength);
        return {
            minI: -range,
            maxI: range,
            minJ: -range,
            maxJ: range
        };
    }

    // 视口的四个角点（相对于中心点）
    const corners = [
        { x: -viewportWidth / 2, y: -viewportHeight / 2 },
        { x: viewportWidth / 2, y: -viewportHeight / 2 },
        { x: viewportWidth / 2, y: viewportHeight / 2 },
        { x: -viewportWidth / 2, y: viewportHeight / 2 }
    ];

    // 对每个角点求解晶格坐标
    const latticeCoords = corners.map(point => {
        const i = (point.x * 基向量2.y - point.y * 基向量2.x) / det;
        const j = (-point.x * 基向量1.y + point.y * 基向量1.x) / det;
        return { i, j };
    });

    // 计算覆盖所有角点的最小晶格范围
    return {
        minI: Math.floor(Math.min(...latticeCoords.map(p => p.i))),
        maxI: Math.ceil(Math.max(...latticeCoords.map(p => p.i))),
        minJ: Math.floor(Math.min(...latticeCoords.map(p => p.j))),
        maxJ: Math.ceil(Math.max(...latticeCoords.map(p => p.j)))
    };
}