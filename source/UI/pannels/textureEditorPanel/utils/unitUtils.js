/**
 * 计算裁剪路径的顶点
 * @param {Object} relatedGeom - 关联的几何体
 * @param {Boolean} expandEdges - 是否扩展边缘以消除接缝 (默认: true)
 * @param {Number} expandBy - 扩展像素数 (默认: 1)
 * @returns {Array|null} 计算后的顶点数组，如果几何体无效则返回null
 */
export const getClipPath = (relatedGeom, expandEdges = true, expandBy = 1) => {
    if (!relatedGeom || !relatedGeom.vertices || relatedGeom.vertices.length < 3) return null;

    // 获取顶点
    const vertices = relatedGeom.vertices;

    if (!expandEdges) {
        return vertices;
    }

    // 计算中心点
    const center = vertices.reduce(
        (acc, v) => ({ x: acc.x + v.x, y: acc.y + v.y }),
        { x: 0, y: 0 }
    );
    center.x /= vertices.length;
    center.y /= vertices.length;

    // 将顶点稍微向外扩展
    return vertices.map(v => {
        const dx = v.x - center.x;
        const dy = v.y - center.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        return {
            x: center.x + dx * (len + expandBy) / len,
            y: center.y + dy * (len + expandBy) / len
        };
    });
};

/**
 * 查找并计算与图像关联的裁剪路径顶点
 * @param {Object} image - 图像对象
 * @param {Array} geoms - 几何体数组
 * @param {Boolean} expandEdges - 是否扩展边缘以消除接缝 (默认: true)
 * @param {Number} expandBy - 扩展像素数 (默认: 1)
 * @returns {Array|null} 计算后的顶点数组，如果找不到关联几何体则返回null
 */
export const findClipPath = (image, geoms, expandEdges = true, expandBy = 1) => {
    // 找到关联的几何体
    const relatedGeom = geoms.find(g => g.id === image.relatedGeom);
    return getClipPath(relatedGeom, expandEdges, expandBy);
};