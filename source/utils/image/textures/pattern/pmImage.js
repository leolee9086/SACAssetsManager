import { 在画布上下文批量绘制线条 } from '../../../canvas/draw/simpleDraw/lines.js';
import { drawImageWithConfig, flipLattice, P1ImagePattern } from './p1Image.js';
import { 从视点和基向量对计算P1网格范围, 以基向量对生成网格线数据 } from './utils/index.js';

export class PMImagePattern extends P1ImagePattern {
    constructor(config) {
        super(config);
    }

    validateConfig(config) {
        // 先调用P1的基本验证
        super.validateConfig(config);

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

    normalizeConfig(config) {
        // 获取P1的标准化配置
        const baseConfig = super.normalizeConfig(config);

        // 计算默认的滑移向量（使用basis1的一半）
        const defaultGlide = {
            x: baseConfig.lattice.basis1.x / 2,
            y: baseConfig.lattice.basis1.y / 2
        };

        return {
            ...baseConfig,
            symmetry: {
                glideVector: config.symmetry?.glideVector || defaultGlide
            }
        };
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
        const { basis1 } = this.config.lattice;
        // 使用Math.floor确保负数也能正确计算
        // 对于负数，我们需要先加上一个大的偶数来确保结果的正确性
        const index = Math.floor((x / basis1.x + 1000000)) % 2;  // 加上一个足够大的偶数
        const shouldRotate = index === 1;

        if (this.fillImage && this.fillImageLoaded) {
            shouldRotate && ctx.scale(-1, 1); // y轴反射
            drawImageWithConfig(
                ctx,
                this.fillImage,
                shouldRotate?flipLattice(this.config.lattice):this.config.lattice,
                this.config.fillImage,
                this.config.lattice.clipMotif
            );
        }

    }
    drawNodePattern(ctx, x, y) {
        const { basis1 } = this.config.lattice;
        // 使用相同的计算方法
        const index = Math.floor((x / basis1.x + 1000000)) % 2;
        const shouldRotate = index === 1;
        if (this.nodeImage && this.nodeImageLoaded) {
            drawImageWithConfig(
                ctx,
                this.nodeImage,
                this.config.lattice,
                this.config.nodeImage
            );
        }
        if (shouldRotate) {
            ctx.save();
            ctx.scale(-1, 1); // y轴反射
            if (this.nodeImage && this.nodeImageLoaded) {
                drawImageWithConfig(
                    ctx,
                    this.nodeImage,
                    this.config.lattice,
                    this.config.nodeImage
                );
            }
            ctx.restore();
        }
    }
}
