import { drawImageWithConfig } from "../../../canvas/draw/simpleDraw/images.js";
import { 从视点和基向量对计算P1网格范围 } from "./utils/index.js";
import { 校验P1晶格基向量, 规范化P1图案配置 } from "./utils/config.js";
import { 在画布上下文批量绘制线条 } from "../../../canvas/draw/simpleDraw/lines.js";
function 校验CM图案配置(config){
    const { basis1, basis2 } = config.lattice;

    // 验证两个基向量长度必须相等
    const length1 = Math.sqrt(basis1.x * basis1.x + basis1.y * basis1.y);
    const length2 = Math.sqrt(basis2.x * basis2.x + basis2.y * basis2.y);

    if (Math.abs(length1 - length2) > 1e-6) {
        throw new Error('cm群的两个基向量长度必须相等');
    }

}
function 规范化CM图案配置(config){
    const defaultMirrorLine = {
        x: config.lattice.basis1.x / 2,
        y: config.lattice.basis1.y / 2
    };

    return {
        ...config,
        symmetry: {
            mirrorLine: config.symmetry?.mirrorLine || defaultMirrorLine
        }
    };

}
export class CMImagePattern  {
    constructor(config) {
        校验P1晶格基向量(config);
        校验CM图案配置(config)
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
            this.renderRhombusGrid(ctx, gridRange);
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

        // 绘制第一个三角形
        ctx.save();
        ctx.translate(x, y);

        ctx.beginPath();
        ctx.moveTo(vertices[3].x, vertices[3].y);  // 左上顶点
        ctx.lineTo(vertices[1].x, vertices[1].y);  // 右下顶点
        ctx.lineTo(vertices[0].x, vertices[0].y);  // 左下顶点
        ctx.closePath();
        ctx.clip();

        // 计算第一个三角形的形心
        const centroid1X = (vertices[3].x + vertices[1].x + vertices[0].x) / 3;
        const centroid1Y = (vertices[3].y + vertices[1].y + vertices[0].y) / 3;

        // 移动到第一个三角形的形心
        ctx.translate(centroid1X, centroid1Y);
        this.drawFillPattern(ctx, i, j, false);
        ctx.restore();

        // 绘制第二个三角形（镜像部分）
        ctx.save();
        ctx.translate(x, y);

        // 创建第二个三角形的裁剪路径
        ctx.beginPath();
        ctx.moveTo(vertices[3].x, vertices[3].y);  // 左上顶点
        ctx.lineTo(vertices[1].x, vertices[1].y);  // 右下顶点
        ctx.lineTo(vertices[2].x, vertices[2].y);  // 右上顶点
        ctx.closePath();
        ctx.clip();

        // 计算第二个三角形的形心
        const centroid2X = (vertices[3].x + vertices[1].x + vertices[2].x) / 3;
        const centroid2Y = (vertices[3].y + vertices[1].y + vertices[2].y) / 3;

        // 计算对角线方向并进行镜像变换
        const diagonalX = vertices[1].x - vertices[3].x;
        const diagonalY = vertices[1].y - vertices[3].y;
        const angle = Math.atan2(diagonalY, diagonalX);

        // 移动到第二个三角形的形心并应用镜像变换
        ctx.translate(centroid2X, centroid2Y);
        ctx.rotate(angle);
        ctx.scale(1, -1);
        ctx.rotate(-angle);

        this.drawFillPattern(ctx, i, j, true);
        ctx.restore();
    }

    renderRhombusGrid(ctx, gridRange) {
        const { basis1, basis2 } = this.config.lattice;
        const lines = [];

        // 合并所有线段到同一个数组
        // 生成菱形边界线段
        for (let i = gridRange.minI; i <= gridRange.maxI + 1; i++) {
            for (let j = gridRange.minJ; j <= gridRange.maxJ; j++) {
                const x = basis1.x * i + basis2.x * j;
                const y = basis1.y * i + basis2.y * j;
                lines.push({
                    startX: x,
                    startY: y,
                    endX: x + basis2.x,
                    endY: y + basis2.y,
                    style: {
                        color: this.config.render.gridColor,
                        width: this.config.render.gridWidth
                    }
                });
            }
        }

        for (let j = gridRange.minJ; j <= gridRange.maxJ + 1; j++) {
            for (let i = gridRange.minI; i <= gridRange.maxI; i++) {
                const x = basis1.x * i + basis2.x * j;
                const y = basis1.y * i + basis2.y * j;
                lines.push({
                    startX: x,
                    startY: y,
                    endX: x + basis1.x,
                    endY: y + basis1.y,
                    style: {
                        color: this.config.render.gridColor,
                        width: this.config.render.gridWidth
                    }
                });
            }
        }

        // 生成镜像线线段（直接合并到lines数组）
        for (let i = gridRange.minI; i <= gridRange.maxI; i++) {
            for (let j = gridRange.minJ; j <= gridRange.maxJ; j++) {
                const x = basis1.x * i + basis2.x * j;
                const y = basis1.y * i + basis2.y * j;
                
                lines.push({
                    startX: x + basis2.x,
                    startY: y + basis2.y,
                    endX: x + basis1.x,
                    endY: y + basis1.y,
                    style: {
                        color: '#0000ff',
                        width: 2,    // 直接指定完整样式
                        dash: [5, 5]
                    }
                });
            }
        }

        // 单次批量绘制（移除第二个基础样式参数）
        在画布上下文批量绘制线条(ctx, lines);
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

    renderSymmetryElements(ctx) {
        super.renderSymmetryElements?.(ctx);

        const { basis1, basis2 } = this.config.lattice;

        ctx.save();

        // 绘制镜面线
        ctx.beginPath();
        ctx.strokeStyle = '#0000ff';
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 2;

        // 在每个棱形单元中绘制镜面线
        for (let i = -2; i <= 2; i++) {
            for (let j = -2; j <= 2; j++) {
                const x = basis1.x * i + basis2.x * j;
                const y = basis1.y * i + basis2.y * j;

                // 计算棱形的对角线端点
                const x2 = x + basis1.x + basis2.x;
                const y2 = y + basis1.y + basis2.y;

                // 绘制从棱形一个顶点到对角顶点的镜面线
                ctx.moveTo(x, y);
                ctx.lineTo(x2, y2);
            }
        }

        ctx.stroke();
        ctx.restore();
    }
}

