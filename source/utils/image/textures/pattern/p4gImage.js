import { CMImagePattern } from "./cmImage.js";
import { 在画布上下文批量绘制线条 } from "../../../canvas/draw/simpleDraw/lines.js";
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
        const gridStyle = {
            color: this.config.render.gridColor,
            width: this.config.render.gridWidth
        };
        const mirrorStyle = {
            color: '#0000ff',
            width: 1,
            dash: [5, 5]
        };

        const lines = 计算P4G网格线(
            gridRange,
            this.config.lattice,
            gridStyle,
            mirrorStyle
        );
        在画布上下文批量绘制线条(ctx, lines);

        // 优化后的旋转中心点标记
        ctx.fillStyle = '#ff0000';
        for (let i = gridRange.minI; i <= gridRange.maxI; i++) {
            for (let j = gridRange.minJ; j <= gridRange.maxJ; j++) {
                const x = this.config.lattice.basis1.x * i + this.config.lattice.basis2.x * j;
                const y = this.config.lattice.basis1.y * i + this.config.lattice.basis2.y * j;
                const sideLength = Math.sqrt(
                    Math.pow(this.config.lattice.basis1.x, 2) + 
                    Math.pow(this.config.lattice.basis1.y, 2)
                );
                const halfSide = sideLength / 2;

                // 仅绘制单元中心点（原四个点合并为一个）
                ctx.beginPath();
                ctx.arc(x + halfSide, y + halfSide, 3, 0, Math.PI * 2); // 单元中心
                ctx.fill();
            }
        }
    }
}

function 计算P4G网格线(gridRange, lattice, gridStyle, mirrorStyle) {
    const { basis1, basis2 } = lattice;
    const lines = [];
    const sideLength = Math.sqrt(basis1.x ** 2 + basis1.y ** 2);
    const halfSide = sideLength / 2;

    for (let i = gridRange.minI; i <= gridRange.maxI + 1; i++) {
        for (let j = gridRange.minJ; j <= gridRange.maxJ + 1; j++) {
            const baseX = basis1.x * i + basis2.x * j;
            const baseY = basis1.y * i + basis2.y * j;

            // 主网格线（正方形边界）
            if (j <= gridRange.maxJ) {
                lines.push({
                    startX: baseX,
                    startY: baseY,
                    endX: baseX + basis1.x,
                    endY: baseY + basis1.y,
                    style: gridStyle
                });
            }
            if (i <= gridRange.maxI) {
                lines.push({
                    startX: baseX,
                    startY: baseY,
                    endX: baseX + basis2.x,
                    endY: baseY + basis2.y,
                    style: gridStyle
                });
            }

            // 反射轴线（当在有效单元格范围内时）
            if (i <= gridRange.maxI && j <= gridRange.maxJ) {
                // 中心十字
                lines.push(
                    {
                        startX: baseX + halfSide,
                        startY: baseY,
                        endX: baseX + halfSide,
                        endY: baseY + sideLength,
                        style: mirrorStyle
                    },
                    {
                        startX: baseX,
                        startY: baseY + halfSide,
                        endX: baseX + sideLength,
                        endY: baseY + halfSide,
                        style: mirrorStyle
                    }
                );

                // 四条对角线
                const diagonals = [
                    { start: { x: 0, y: halfSide }, end: { x: halfSide, y: 0 } },
                    { start: { x: halfSide, y: 0 }, end: { x: sideLength, y: halfSide } },
                    { start: { x: sideLength, y: halfSide }, end: { x: halfSide, y: sideLength } },
                    { start: { x: halfSide, y: sideLength }, end: { x: 0, y: halfSide } }
                ];

                diagonals.forEach(({ start, end }) => {
                    lines.push({
                        startX: baseX + start.x,
                        startY: baseY + start.y,
                        endX: baseX + end.x,
                        endY: baseY + end.y,
                        style: mirrorStyle
                    });
                });
            }
        }
    }

    return lines;
}
