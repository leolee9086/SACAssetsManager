import { CMImagePattern } from "./cmImage.js";
export class P4GImagePattern extends CMImagePattern {
    constructor(config) {
        super(config);
    }

    drawRhombusUnit(ctx, i, j) {
        const { basis1, basis2 } = this.config.lattice;

        // 计算单元格的基准位置
        const x = basis1.x * i + basis2.x * j;
        const y = basis1.y * i + basis2.y * j;

        // 计算正方形的边长和中心点
        const sideLength = Math.sqrt(basis1.x * basis1.x + basis1.y * basis1.y);
        const halfSide = sideLength / 2;

        // 将正方形分成8个三角形区域
        for (let k = 0; k < 4; k++) {
            let points1 = []; // 存储内侧三角形的顶点
            let points2 = []; // 存储外侧三角形的顶点

            if (k === 0) {
                points1 = [
                    { x: 0, y: halfSide },      // 左边中点
                    { x: halfSide, y: halfSide },// 中心点
                    { x: halfSide, y: 0 }        // 上边中点
                ];
                points2 = [
                    { x: 0, y: halfSide },    // 左边中点
                    { x: 0, y: 0 },           // 左上角顶点
                    { x: halfSide, y: 0 }     // 上边中点
                ];
            } else if (k === 1) {
                points1 = [
                    { x: halfSide, y: 0 },        // 上边中点
                    { x: halfSide, y: halfSide }, // 中心点
                    { x: sideLength, y: halfSide } // 右边中点
                ];
                points2 = [
                    { x: halfSide, y: 0 },        // 上边中点
                    { x: sideLength, y: 0 },      // 右上角顶点
                    { x: sideLength, y: halfSide } // 右边中点
                ];
            } else if (k === 2) {
                points1 = [
                    { x: sideLength, y: halfSide },  // 右边中点
                    { x: halfSide, y: halfSide },    // 中心点
                    { x: halfSide, y: sideLength }   // 下边中点
                ];
                points2 = [
                    { x: sideLength, y: halfSide },    // 右边中点
                    { x: sideLength, y: sideLength },  // 右下角顶点
                    { x: halfSide, y: sideLength }     // 下边中点
                ];
            } else {
                points1 = [
                    { x: halfSide, y: sideLength },  // 下边中点
                    { x: halfSide, y: halfSide },    // 中心点
                    { x: 0, y: halfSide }            // 左边中点
                ];
                points2 = [
                    { x: halfSide, y: sideLength },  // 下边中点
                    { x: 0, y: sideLength },         // 左下角顶点
                    { x: 0, y: halfSide }            // 左边中点
                ];
            }

            // 绘制内侧三角形
            ctx.save();
            ctx.translate(x, y);
            ctx.beginPath();
            ctx.moveTo(points1[0].x, points1[0].y);
            ctx.lineTo(points1[1].x, points1[1].y);
            ctx.lineTo(points1[2].x, points1[2].y);
            ctx.closePath();
            ctx.clip();

            const centroid1X = (points1[0].x + points1[1].x + points1[2].x) / 3;
            const centroid1Y = (points1[0].y + points1[1].y + points1[2].y) / 3;

            ctx.translate(centroid1X, centroid1Y);
            ctx.rotate(k * Math.PI / 2);
            this.drawFillPattern(ctx, i, j);
            ctx.restore();

            // 绘制外侧三角形（沿对角线镜像）
            ctx.save();
            ctx.translate(x, y);
            ctx.beginPath();
            ctx.moveTo(points2[0].x, points2[0].y);
            ctx.lineTo(points2[1].x, points2[1].y);
            ctx.lineTo(points2[2].x, points2[2].y);
            ctx.closePath();
            ctx.clip();

            const centroid2X = (points2[0].x + points2[1].x + points2[2].x) / 3;
            const centroid2Y = (points2[0].y + points2[1].y + points2[2].y) / 3;

            // 计算对角线角度
            const diagonalAngle = k * Math.PI / 2 + Math.PI / 4;

            // 应用对角线镜像变换
            ctx.translate(centroid2X, centroid2Y);
            ctx.rotate(diagonalAngle);
            ctx.scale(-1, 1);
            ctx.rotate(-diagonalAngle);
            ctx.rotate(k * Math.PI / 2);
            this.drawFillPattern(ctx, i, j);
            ctx.restore();
        }
    }

    renderRhombusGrid(ctx, gridRange) {
        const { basis1, basis2 } = this.config.lattice;

        // 绘制主网格线（正方形边界）
        ctx.beginPath();
        ctx.strokeStyle = this.config.render.gridColor;
        ctx.lineWidth = this.config.render.gridWidth;
        ctx.setLineDash([]);

        // 绘制正方形网格的外边界
        for (let i = gridRange.minI; i <= gridRange.maxI + 1; i++) {
            for (let j = gridRange.minJ; j <= gridRange.maxJ + 1; j++) {
                const x = basis1.x * i + basis2.x * j;
                const y = basis1.y * i + basis2.y * j;

                if (j <= gridRange.maxJ) {
                    ctx.moveTo(x, y);
                    ctx.lineTo(x + basis1.x, y + basis1.y);
                }
                if (i <= gridRange.maxI) {
                    ctx.moveTo(x, y);
                    ctx.lineTo(x + basis2.x, y + basis2.y);
                }
            }
        }
        ctx.stroke();
        // 绘制反射轴（十字和对角线）
        ctx.beginPath();
        ctx.strokeStyle = '#0000ff';
        ctx.setLineDash([5, 5]);
        for (let i = gridRange.minI; i <= gridRange.maxI; i++) {
            for (let j = gridRange.minJ; j <= gridRange.maxJ; j++) {
                const x = basis1.x * i + basis2.x * j;
                const y = basis1.y * i + basis2.y * j;
                const sideLength = Math.sqrt(basis1.x * basis1.x + basis1.y * basis1.y);
                const halfSide = sideLength / 2;
                // 绘制中心十字（连接边中点）
                ctx.moveTo(x + halfSide, y);  // 上边中点
                ctx.lineTo(x + halfSide, y + sideLength);  // 下边中点
                ctx.moveTo(x, y + halfSide);  // 左边中点
                ctx.lineTo(x + sideLength, y + halfSide);  // 右边中点
                // 绘制对角线（连接顶点和中心）
                ctx.moveTo(x, y + halfSide);
                ctx.lineTo(x + halfSide, y);  // 左上顶点

                ctx.moveTo(x + halfSide, y);  // 左下顶点
                ctx.lineTo(x + sideLength, y + halfSide);  // 左上顶点

                ctx.moveTo(x + sideLength, y + halfSide);
                ctx.lineTo(x + halfSide, y + sideLength);

                ctx.moveTo(x + halfSide, y + sideLength);
                ctx.lineTo(x, y + halfSide);


            }
        }
        ctx.stroke();

        // 标记旋转中心点（可选）
        ctx.fillStyle = '#ff0000';
        for (let i = gridRange.minI; i <= gridRange.maxI + 1; i++) {
            for (let j = gridRange.minJ; j <= gridRange.maxJ + 1; j++) {
                const x = basis1.x * i + basis2.x * j;
                const y = basis1.y * i + basis2.y * j;
                const sideLength = Math.sqrt(basis1.x * basis1.x + basis1.y * basis1.y);
                const halfSide = sideLength / 2;

                // 四重旋转中心（正方形顶点和中心）
                ctx.beginPath();
                ctx.arc(x, y, 3, 0, Math.PI * 2);
                ctx.arc(x + halfSide, y + halfSide, 3, 0, Math.PI * 2);
                ctx.fill();

                // 二重旋转中心（正方形边的中点）
                ctx.beginPath();
                ctx.arc(x + halfSide, y, 3, 0, Math.PI * 2);
                ctx.arc(x, y + halfSide, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
}
