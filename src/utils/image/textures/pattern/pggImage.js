import { 在画布上下文批量绘制线条 } from '../../../canvas/draw/simpleDraw/lines.js';
import { P1ImagePattern } from './p1Image.js';
import { 从视点和基向量对计算P1网格范围, 以基向量对生成网格线数据 } from './utils/index.js';
import { drawImageWithConfig } from '../../../canvas/draw/simpleDraw/images.js';
import { 校验P1晶格基向量, 规范化P1图案配置 } from './utils/config.js';
export function 校验PGG图案配置(config) {

    // 验证基向量必须正交
    const { basis1, basis2 } = config.lattice;
    const dotProduct = basis1.x * basis2.x + basis1.y * basis2.y;
    if (Math.abs(dotProduct) > 1e-6) { // 允许小误差
        throw new Error('pg群的基向量必须正交');
    }

    // 验证滑移向量（如果提供）
    if (config.symmetry?.glideVector) {
        if (typeof config.symmetry.glideVector.x !== 'number' ||
            typeof config.symmetry.glideVector.y !== 'number') {
            throw new Error('滑移向量必须包含有效的x和y坐标');
        }
    }
}
export function 规范化PGG图案配置(config){
            // 计算默认的滑移向量（使用basis1的一半）
            const defaultGlide = {
                x: config.lattice.basis1.x / 2,
                y: config.lattice.basis1.y / 2
            };
    
            return {
                ...config,
                symmetry: {
                    glideVector: config.symmetry?.glideVector || defaultGlide
                }
            };
    
}
export class PGGImagePattern  {
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

        // 修改变换逻辑以匹配PGG群的对称性
        const shouldRotate = (i % 2 === 1);    // 横向交替旋转180度
        const shouldReflectX = (j % 2 === 1);

        if (this.fillImage && this.fillImageLoaded) {
            ctx.save();

            // 应用变换
            if (shouldRotate) {
                ctx.rotate(Math.PI); // 180度旋转
            }
            if (shouldReflectX) {
                ctx.scale(-1, 1); // x轴反射
            }


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

        // 使用相同的变换逻辑
        const i = Math.floor((x / basis1.x + 1000000));
        const j = Math.floor((y / basis2.y + 1000000));

        const shouldRotate = (i + j) % 2 === 1;
        const shouldReflect = (i % 2 === 1);

        if (this.nodeImage && this.nodeImageLoaded) {
            ctx.save();

            if (shouldRotate) {
                ctx.rotate(Math.PI);
            }
            if (shouldReflect) {
                ctx.scale(-1, 1);
            }

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




