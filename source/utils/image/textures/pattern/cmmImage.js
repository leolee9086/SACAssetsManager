import { CMImagePattern } from "./cmImage.js";
export class CMMImagePattern extends CMImagePattern {
    constructor(config) {
        super(config);
    }
    renderRhombusGrid(ctx, gridRange) {
        const { basis1, basis2 } = this.config.lattice;

        ctx.beginPath();
        ctx.strokeStyle = this.config.render.gridColor;
        ctx.lineWidth = this.config.render.gridWidth;

        // 绘制菱形边界
        for (let i = gridRange.minI; i <= gridRange.maxI + 1; i++) {
            for (let j = gridRange.minJ; j <= gridRange.maxJ; j++) {
                const x = basis1.x * i + basis2.x * j;
                const y = basis1.y * i + basis2.y * j;

                ctx.moveTo(x, y);
                ctx.lineTo(x + basis2.x, y + basis2.y);
            }
        }

        for (let j = gridRange.minJ; j <= gridRange.maxJ + 1; j++) {
            for (let i = gridRange.minI; i <= gridRange.maxI; i++) {
                const x = basis1.x * i + basis2.x * j;
                const y = basis1.y * i + basis2.y * j;

                ctx.moveTo(x, y);
                ctx.lineTo(x + basis1.x, y + basis1.y);
            }
        }

        ctx.stroke();

        // 绘制两组对角线对称轴
        ctx.beginPath();
        ctx.strokeStyle = '#0000ff';
        ctx.setLineDash([5, 5]);

        for (let i = gridRange.minI; i <= gridRange.maxI; i++) {
            for (let j = gridRange.minJ; j <= gridRange.maxJ; j++) {
                const x = basis1.x * i + basis2.x * j;
                const y = basis1.y * i + basis2.y * j;

                // 计算棱形的四个顶点
                const vertices = [
                    { x, y },  // 左下顶点
                    { x: x + basis1.x, y: y + basis1.y },  // 右下顶点
                    { x: x + basis1.x + basis2.x, y: y + basis1.y + basis2.y },  // 右上顶点
                    { x: x + basis2.x, y: y + basis2.y }   // 左上顶点
                ];

                // 绘制第一条对角线（从左上到右下）
                ctx.moveTo(vertices[3].x, vertices[3].y);  // 左上顶点
                ctx.lineTo(vertices[1].x, vertices[1].y);  // 右下顶点

                // 绘制第二条对角线（从左下到右上）
                ctx.moveTo(vertices[0].x, vertices[0].y);  // 左下顶点
                ctx.lineTo(vertices[2].x, vertices[2].y);  // 右上顶点
            }
        }

        ctx.stroke();
    }
    drawRhombusUnit(ctx, i, j) {
        const { basis1, basis2 } = this.config.lattice;

        // 计算棱形的四个顶点
        const x = basis1.x * i + basis2.x * j;
        const y = basis1.y * i + basis2.y * j;

        // 计算棱形的四个顶点相对坐标
        const vertices = [
            { x: 0, y: 0 },  // 左下顶点
            { x: basis1.x, y: basis1.y },  // 右下顶点
            { x: basis1.x + basis2.x, y: basis1.y + basis2.y },  // 右上顶点
            { x: basis2.x, y: basis2.y }   // 左上顶点
        ];

        // 计算对角线交点
        const centerX = (basis1.x + basis2.x) / 2;
        const centerY = (basis1.y + basis2.y) / 2;

        // 1. 绘制第一个三角形 (原始)
        ctx.save();
        ctx.translate(x, y);
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(vertices[0].x, vertices[0].y);
        ctx.lineTo(vertices[3].x, vertices[3].y);
        ctx.closePath();
        ctx.clip();

        // 计算第一个三角形的形心
        const centroid1X = (centerX + vertices[0].x + vertices[3].x) / 3;
        const centroid1Y = (centerY + vertices[0].y + vertices[3].y) / 3;
        ctx.translate(centroid1X, centroid1Y);
        this.drawFillPattern(ctx, i, j, false);
        ctx.restore();

        ctx.save();
        ctx.translate(x, y);
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(vertices[3].x, vertices[3].y);
        ctx.lineTo(vertices[2].x, vertices[2].y);
        ctx.closePath();
        ctx.clip();
        // 计算第一条对角线的角度
        const diagonal1Angle = Math.atan2(vertices[0].y - vertices[2].y, vertices[0].x - vertices[2].x);
        // 计算第二条对角线的角度
        const diagonal2Angle = Math.atan2(vertices[3].y - vertices[1].y, vertices[3].x - vertices[1].x);
        // 2. 绘制第二个三角形 (沿第一条对角线镜像)

        // 计算第二个三角形的形心
        const centroid2X = (centerX + vertices[2].x + vertices[3].x) / 3;
        const centroid2Y = (centerY + vertices[2].y + vertices[3].y) / 3;

        // 应用沿对角线的镜像变换
        ctx.translate(centroid2X, centroid2Y);
        ctx.rotate(diagonal1Angle);
        ctx.scale(-1, 1);
        ctx.rotate(-diagonal1Angle);

        this.drawFillPattern(ctx);
        ctx.restore();



        // 3. 绘制第三个三角形 (沿第二条对角线镜像)
        ctx.save();
        ctx.translate(x, y);
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(vertices[2].x, vertices[2].y);
        ctx.lineTo(vertices[1].x, vertices[1].y);
        ctx.closePath();
        ctx.clip();

        // 计算第三个三角形的形心

        const centroid3X = (centerX + vertices[2].x + vertices[1].x) / 3;
        const centroid3Y = (centerY + vertices[2].y + vertices[1].y) / 3;
        ctx.translate(centroid3X, centroid3Y);
        ctx.rotate(diagonal2Angle);
        ctx.scale(-1, -1);
        ctx.rotate(-diagonal2Angle);

        this.drawFillPattern(ctx, i, j, true);
        ctx.restore();
        // 4. 绘制第四个三角形 (双重镜像)

        ctx.save();
        ctx.translate(x, y);
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(vertices[1].x, vertices[1].y);
        ctx.lineTo(vertices[0].x, vertices[0].y);
        ctx.closePath();
        ctx.clip();


        const centroid4X = (centerX + vertices[0].x + vertices[1].x) / 3;
        const centroid4Y = (centerY + vertices[0].y + vertices[1].y) / 3;
        ctx.translate(centroid4X, centroid4Y);
        ctx.rotate(diagonal1Angle);
        ctx.scale(1, -1);
        ctx.rotate(-diagonal1Angle);

        this.drawFillPattern(ctx, i, j, true);
        ctx.restore();

    }
}

