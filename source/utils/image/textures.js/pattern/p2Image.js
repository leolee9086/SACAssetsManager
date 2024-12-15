import { P1ImagePattern } from './p1Image.js';

export class P2ImagePattern extends P1ImagePattern {
    constructor(config) {
        super(config);
    }

    normalizeConfig(config) {
        // 获取父类的标准化配置
        const baseConfig = super.normalizeConfig(config);
        
        // 使用基向量计算默认的旋转中心
        // 默认将旋转中心设置在基向量形成的平行四边形的中心
        const defaultCenter = {
            x: (baseConfig.lattice.basis1.x + baseConfig.lattice.basis2.x) / 2,
            y: (baseConfig.lattice.basis1.y + baseConfig.lattice.basis2.y) / 2
        };
    
        // 添加P2特有的配置
        return {
            ...baseConfig,
            symmetry: {
                rotationCenter: config.symmetry?.rotationCenter || defaultCenter,
                rotationAngle: 180 // P2群固定为180度旋转
            }
        };
    }
    
    // 相应地，验证函数也需要修改
    validateConfig(config) {
        // 先调用父类的验证
        super.validateConfig(config);
        
        // P2不再强制要求指定旋转中心，因��认值
        // 如果指定了旋转中心，可以增加额外的验证
        if (config.symmetry?.rotationCenter) {
            // 可以添加坐标值的合法性验证
            if (typeof config.symmetry.rotationCenter.x !== 'number' ||
                typeof config.symmetry.rotationCenter.y !== 'number') {
                throw new Error('旋转中心坐标必须是数字类型');
            }
        }
    }

    // 重写render方法
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

        // 1. 先绘制填充图案 - 注意填充图案应该在晶格单元的中心
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

        // 3. 最后绘制晶格点图片 - 晶格点应该在格点位置
        for (let i = gridRange.minI; i <= gridRange.maxI; i++) {
            for (let j = gridRange.minJ; j <= gridRange.maxJ; j++) {
                // 计算晶格点位置（格点位置）
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

    // 分别处理填充图案和晶格点图案的绘制
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
            ctx.rotate(Math.PI); // 旋转180度
            
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
            ctx.rotate(Math.PI); // 旋转180度
            
            if (this.nodeImage && this.nodeImageLoaded) {
                this.drawNodeImage(ctx);
            }
            
            ctx.restore();
        }
    }

    // 重写renderSymmetryElements以显示旋转中心
    renderSymmetryElements(ctx) {
        super.renderSymmetryElements?.(ctx);

        const center = this.config.symmetry.rotationCenter;
        const radius = 5;

        ctx.save();
        
        // 绘制旋转中心点
        ctx.beginPath();
        ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = '#ff0000';
        ctx.fill();

        // 绘制旋转轴指示线
        ctx.beginPath();
        ctx.moveTo(center.x - radius * 2, center.y);
        ctx.lineTo(center.x + radius * 2, center.y);
        ctx.moveTo(center.x, center.y - radius * 2);
        ctx.lineTo(center.x, center.y + radius * 2);
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();
    }
}
