import { drawImageWithConfig } from "../../../canvas/draw/simpleDraw/images.js";
import { 校验P1晶格基向量,规范化P1图案配置 } from "./utils/config.js";
import { 校验PGG图案配置,规范化PGG图案配置 } from "./pggImage.js";
import { 从视点和基向量对计算P1网格范围 } from "./utils/index.js";
import { 以基向量对生成网格线数据 } from "./utils/index.js";
import { 在画布上下文批量绘制线条 } from "../../../canvas/draw/simpleDraw/lines.js";
export class PMMImagePattern  {
    constructor(config) {
        校验P1晶格基向量(config);
        校验PGG图案配置(config)
        this.config = 规范化P1图案配置(config);
        this.config = 规范化PGG图案配置(config)
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
        //const gridRange = viewport.gridRange || this.calculateGridRange(width, height);
        const gridRange = 从视点和基向量对计算P1网格范围(viewport, 1, basis1, basis2)
        // 1. 先绘制填充图案
        for (let i = gridRange.minI; i <= gridRange.maxI; i++) {
            for (let j = gridRange.minJ; j <= gridRange.maxJ; j++) {
                // 计算晶格单元的中心点
                const centerX = basis1.x * (i + 0.5) + basis2.x * (j + 0.5);
                const centerY = basis1.y * (i + 0.5) + basis2.y * (j + 0.5);
                ctx.save();
                ctx.translate(centerX, centerY);
                this.drawFillPattern(ctx, centerX, centerY);
                ctx.restore();
            }
        }

        // 2. 绘制网格线
        if (this.config.render.showGrid) {
            const { color, width, dash } = this.config.render.gridStyle;
            const { basis1, basis2 } = this.config.lattice;
            // 使用独立函数计算网格线数据
            const gridLines = 以基向量对生成网格线数据(basis1, basis2, gridRange);
            // 批量绘制所有网格线
            在画布上下文批量绘制线条(ctx, gridLines, { color, width, dash });
        }

        // 3. 绘制晶格点图案
        for (let i = gridRange.minI; i <= gridRange.maxI; i++) {
            for (let j = gridRange.minJ; j <= gridRange.maxJ; j++) {
                // 计算晶格点位置
                const nodeX = basis1.x * i + basis2.x * j;
                const nodeY = basis1.y * i + basis2.y * j;

                ctx.save();
                ctx.translate(nodeX, nodeY);
                this.drawNodePattern(ctx, nodeX, nodeY);
                ctx.restore();
            }
        }

        ctx.restore();
    }


    drawFillPattern(ctx, x, y) {
        const { basis1, basis2 } = this.config.lattice;

        // 计算单元格的位置索引
        const i = Math.floor((x / basis1.x + 1000000));
        const j = Math.floor((y / basis2.y + 1000000));

        if (this.fillImage && this.fillImageLoaded) {
            // 1. 绘制原始图案
            ctx.save();
            // 根据行列索引决定使用哪种变换
            if (i % 2 === 0 && j % 2 === 0) {
                ctx.scale(-1, -1); // 对角镜像
            } else if (i % 2 === 0) {
                ctx.scale(-1, 1); // 水平镜像
            } else if (j % 2 === 0) {
                ctx.scale(1, -1); // 垂直镜像
            }

            // 只绘制一次
            drawImageWithConfig(
                ctx,
                this.fillImage,
                this.config.lattice,
                this.config.fillImage,
                this.config.lattice.clipMotif
            );
            ctx.restore();
        }
    }

    drawNodePattern(ctx, x, y) {
        const { basis1, basis2 } = this.config.lattice;

        // 计算单元格的位置索引
        const i = Math.floor((x / basis1.x + 1000000));
        const j = Math.floor((y / basis2.y + 1000000));

        if (this.nodeImage && this.nodeImageLoaded) {
            ctx.save();
            // 根据行列索引决定使用哪种变换
            if (i % 2 === 0 && j % 2 === 0) {
                ctx.scale(-1, -1); // 对角镜像
            } else if (i % 2 === 0) {
                ctx.scale(-1, 1); // 水平镜像
            } else if (j % 2 === 0) {
                ctx.scale(1, -1); // 垂直镜像
            }

            // 只绘制一次
            drawImageWithConfig(
                ctx,
                this.nodeImage,
                this.config.lattice,
                this.config.nodeImage
            ); 
            ctx.restore();
        }
    }
}
