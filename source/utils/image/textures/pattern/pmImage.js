import { P1ImagePattern } from './p1Image.js';

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
        ctx.translate(viewport.x || width/2, viewport.y || height/2);

        const gridRange = viewport.gridRange || this.calculateGridRange(width, height);

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
            this.renderGrid(ctx, gridRange);
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
            this.drawFillImage(ctx);
        }

        if (shouldRotate) {
            ctx.save();
            ctx.scale(-1, 1); // y轴反射
            
            if (this.fillImage && this.fillImageLoaded) {
                this.drawFillImage(ctx);
            }
            
            ctx.restore();
        }
    }


    drawNodePattern(ctx, x, y) {
        const { basis1 } = this.config.lattice;
        // 使用相同的计算方法
        const index = Math.floor((x / basis1.x + 1000000)) % 2;
        const shouldRotate = index === 1;

        if (this.nodeImage && this.nodeImageLoaded) {
            this.drawNodeImage(ctx);
        }

        if (shouldRotate) {
            ctx.save();
            ctx.scale(-1, 1); // y轴反射
            
            if (this.nodeImage && this.nodeImageLoaded) {
                this.drawNodeImage(ctx);
            }
            
            ctx.restore();
        }
    }

}
