import { CMImagePattern } from "./cmImage.js";
import { 在画布上下文批量绘制线条 } from "../../../canvas/draw/simpleDraw/lines.js";
import { 校验P1晶格基向量,校验配置基向量是否等长 as 校验P4G图案配置 } from "./utils/config.js";
import { 规范化P1图案配置,规范化CM图案配置  } from "./utils/config.js";
import { 从视点和基向量对计算P1网格范围 } from "./utils/index.js";
import { drawImageWithConfig } from "../../../canvas/draw/simpleDraw/images.js";
import { 在画布上下文批量绘制标记点 } from "../../../canvas/draw/simpleDraw/points.js";

export class P4GImagePattern  {
    constructor(config) {
        校验P1晶格基向量(config);
        校验P4G图案配置(config)
        this.config = 规范化P1图案配置(config);
        this.config= 规范化CM图案配置(config)
        this.nodeImageLoaded = false;
        this.fillImageLoaded = false;
        this.patternReady = false;
        this.nodeImage = null;
        this.fillImage = null;
        this.loadImages();
    }
    async loadImages() {
        if (!this.config.nodeImage && !this.config.fillImage) {
            this.patternReady = true;
            return;
        }
        const loadPromises = [];
        if (this.config.nodeImage) {
            loadPromises.push(this.loadImage('node').catch(() => null));
        }
        if (this.config.fillImage) {
            loadPromises.push(this.loadImage('fill').catch(() => null));
        }
        await Promise.all(loadPromises);
        this.patternReady = true;
    }
    async loadImage(type) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                if (type === 'node') {
                    this.nodeImage = img;
                    this.nodeImageLoaded = true;
                } else {
                    this.fillImage = img;
                    this.fillImageLoaded = true;
                }
                resolve(img);
            };
            img.onerror = (err) => {
                reject(new Error(`${type}图片加载失败`));
            };
            img.src = this.config[`${type}Image`].imageUrl;
        });
    }
    render(ctx, viewport) {
        if (!this.patternReady) {
            throw new Error('图案尚未准备就绪');
        }

        const { width, height } = viewport;
        const { basis1, basis2 } = this.config.lattice;

        ctx.fillStyle = this.config.render.backgroundColor;
        ctx.fillRect(0, 0, width, height);

        ctx.save();
        ctx.translate(viewport.x || width / 2, viewport.y || height / 2);

        const gridRange = 从视点和基向量对计算P1网格范围(viewport, 1, basis1, basis2)

        // 绘制棱形单元及其内部镜像
        for (let i = gridRange.minI; i <= gridRange.maxI; i++) {
            for (let j = gridRange.minJ; j <= gridRange.maxJ; j++) {
                this.drawRhombusUnit(ctx, i, j);
            }
        }

        // 绘制网格
        if (this.config.render.showGrid) {
            const {lines,points} = this.renderRhombusGrid(ctx, gridRange);
            lines&&在画布上下文批量绘制线条(ctx, lines);
            points&&在画布上下文批量绘制标记点(ctx,points,{
                color: '#ff0000',
                radius: 3
            })
        }
        // 绘制网格点
        for (let i = gridRange.minI; i <= gridRange.maxI; i++) {
            for (let j = gridRange.minJ; j <= gridRange.maxJ; j++) {
                const x = basis1.x * i + basis2.x * j;
                const y = basis1.y * i + basis2.y * j;

                ctx.save();
                ctx.translate(x, y);
                this.drawNodePattern(ctx, i, j);
                ctx.restore();
            }
        }

        ctx.restore();
    }

    drawFillPattern(ctx, i, j, isMirrored) {
        if (this.fillImage && this.fillImageLoaded) {
            // 根据是否镜像调整绘制方式
            if (isMirrored) {
                ctx.save();
                //   ctx.scale(1, -1);
            }
            drawImageWithConfig(
                ctx,
                this.fillImage,
                this.config.lattice,
                this.config.fillImage,
                this.config.lattice.clipMotif
            );
            if (isMirrored) {
                ctx.restore();
            }
        }
    }
    drawNodePattern(ctx, i, j) {
        if (this.nodeImage && this.nodeImageLoaded) {
            // 绘制原始节点图案
            this.drawNodeImage(ctx);

            // 绘制水平镜像的节点图案
            ctx.save();
            ctx.scale(-1, 1);
            this.drawNodeImage(ctx);
            ctx.restore();
        }
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
        const lattice = this.config.lattice
        const points= 绘制P4G中心点(gridRange,lattice,gridStyle,mirrorStyle,ctx)
    
        return {lines,points}
    }
}

function 绘制P4G中心点(gridRange, lattice, gridStyle, mirrorStyle, ctx) {
    const { basis1, basis2 } = lattice;
    const points = [];
    const sideLength = Math.sqrt(basis1.x ** 2 + basis1.y ** 2);
    const halfSide = sideLength / 2;
    for (let i = gridRange.minI; i <= gridRange.maxI; i++) {
        for (let j = gridRange.minJ; j <= gridRange.maxJ; j++) {
            points.push({
                x: basis1.x * i + basis2.x * j + halfSide,
                y: basis1.y * i + basis2.y * j + halfSide,
                style: {
                    color: '#ff0000',
                    radius: 3
                }
            });
        }
    }
    return points
    
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
