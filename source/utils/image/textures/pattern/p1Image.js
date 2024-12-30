import { calculateImageFitScale } from "../../utils.js";

export class P1ImagePattern {
    constructor(config) {
        this.validateConfig(config);
        this.config = this.normalizeConfig(config);
        this.nodeImageLoaded = false;
        this.fillImageLoaded = false;
        this.patternReady = false;
        this.nodeImage = null;
        this.fillImage = null;
        this.loadImages();
    }
    validateConfig(config) {
        if (!config.lattice?.basis1 || !config.lattice?.basis2) {
            throw new Error('必须提供有效的晶格基向量');
        }
     
    }
    normalizeConfig(config) {
        return {
            lattice: {
                basis1: config.lattice.basis1,
                basis2: config.lattice.basis2,
                shape: config.lattice?.shape || 'rectangle',
                clipMotif: config.lattice?.clipMotif ?? true
            },
            // 晶格点图片配置
            nodeImage: config.nodeImage ? {
                imageUrl: config.nodeImage.imageUrl,
                transform: config.nodeImage.transform || {
                    scale: 1,
                    rotation: 0,
                    translate: { x: 0, y: 0 }
                },
                fitMode: config.nodeImage?.fitMode || 'contain'
            } : null,
            // 填���图片配置
            fillImage: config.fillImage ? {
                imageUrl: config.fillImage.imageUrl,
                transform: config.fillImage.transform || {
                    scale: 1,
                    rotation: 0,
                    translate: { x: 0, y: 0 }
                },
                fitMode: config.fillImage?.fitMode || 'contain'
            } : null,
            render: {
                backgroundColor: config.render?.backgroundColor || '#ffffff',
                showGrid: config.render?.showGrid ?? false,
                gridStyle: {
                    color: config.render?.gridStyle?.color || '#cccccc',
                    width: config.render?.gridStyle?.width || 0.5,
                    dash: config.render?.gridStyle?.dash || []
                },
                scale: config.render?.scale || 1,
                smoothing: config.render?.smoothing ?? true
            }
        };
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
    createPatternCell() {
        const { basis1, basis2 } = this.config.lattice;   
        // 计算单元格的实际尺寸 - 使用基向量的长度
        const width = Math.sqrt(basis1.x * basis1.x + basis1.y * basis1.y);
        const height = Math.sqrt(basis2.x * basis2.x + basis2.y * basis2.y);
        const canvas = document.createElement('canvas');
        // 确保画布足够大以容纳整个平行四边形
        canvas.width = Math.ceil(Math.abs(basis1.x) + Math.abs(basis2.x));
        canvas.height = Math.ceil(Math.abs(basis1.y) + Math.abs(basis2.y));
        const ctx = canvas.getContext('2d');
        // 移动到单元格中心
        ctx.translate(canvas.width/2, canvas.height/2);
        // 先绘制填充图片
        if (this.fillImage && this.fillImageLoaded) {
            this.drawImage(ctx, 'fill', width, height);
        }

        // 再绘制晶格点图片
        if (this.nodeImage && this.nodeImageLoaded) {
            this.drawImage(ctx, 'node', width, height);
        }

        this.patternCell = canvas;
        this.patternReady = true;
    }

    drawImage(ctx, type, cellWidth, cellHeight) {
        const config = this.config[`${type}Image`];
        const image = type === 'node' ? this.nodeImage : this.fillImage;
        ctx.save();
        // 应用裁剪
        if (this.config.lattice.clipMotif) {
            this.clipToLatticeShape(ctx, cellWidth, cellHeight);
        }
        // 计算实际缩放比例
        const fitScale = this.calculateFitScale(
            image.width,
            image.height,
            cellWidth,
            cellHeight,
            config.fitMode
        );

        // 应用变换
        const { scale, rotation, translate } = config.transform;
        
        // 先平移到指定位置
        ctx.translate(translate.x, translate.y);
        
        // 再旋转（转换角度为弧度）
        ctx.rotate((rotation * Math.PI) / 180);
        
        // 最后缩放
        const finalScale = scale * fitScale;
        ctx.scale(finalScale, finalScale);
        // 绘制图片，确保居中
        ctx.drawImage(
            image,
            -image.width / 2,
            -image.height / 2
        );
        ctx.restore();
    }
    clipToLatticeShape(ctx, width, height) {
        const { shape } = this.config.lattice;
        ctx.beginPath();
        switch (shape) {
            case 'parallelogram':
                this.clipToParallelogram(ctx, width, height);
                break;
            case 'hexagon':
                this.clipToHexagon(ctx, width, height);
                break;
            case 'rectangle':
            default:
                ctx.rect(0, 0, width, height);
        }
        ctx.clip();
    }
    calculateFitScale(imgWidth, imgHeight, cellWidth, cellHeight, fitMode) {
        return calculateImageFitScale(imgWidth, imgHeight, cellWidth, cellHeight, fitMode);
    }

    render(ctx, viewport) {
        if (!this.patternReady) {
            // 如果图案未准备好，保持上一帧的内容
            return;
        }

        // 创建离屏 canvas 用于双缓冲
        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = viewport.width;
        offscreenCanvas.height = viewport.height;
        const offscreenCtx = offscreenCanvas.getContext('2d');

        // 在离屏 canvas 上绘制
        offscreenCtx.fillStyle = this.config.render.backgroundColor;
        offscreenCtx.fillRect(0, 0, viewport.width, viewport.height);

        offscreenCtx.save();
        offscreenCtx.translate(viewport.x || viewport.width/2, viewport.y || viewport.height/2);

        const gridRange = viewport.gridRange || this.calculateGridRange(viewport.width, viewport.height);

        // 1. 先绘制填充图案 - 注意填充图案应该在晶格单元的中心
        for (let i = gridRange.minI; i <= gridRange.maxI; i++) {
            for (let j = gridRange.minJ; j <= gridRange.maxJ; j++) {
                // 计算晶格单元的中心点
                const centerX = this.config.lattice.basis1.x * (i + 0.5) + this.config.lattice.basis2.x * (j + 0.5);
                const centerY = this.config.lattice.basis1.y * (i + 0.5) + this.config.lattice.basis2.y * (j + 0.5);
                
                offscreenCtx.save();
                offscreenCtx.translate(centerX, centerY);
                
                if (this.fillImage && this.fillImageLoaded) {
                    this.drawFillImage(offscreenCtx);
                }
                
                offscreenCtx.restore();
            }
        }

        // 2. 绘制网格线
        if (this.config.render.showGrid) {
            this.renderGrid(offscreenCtx, gridRange);
        }

        // 3. 最后绘制晶格点图片 - 晶格点应该在格点位置
        for (let i = gridRange.minI; i <= gridRange.maxI; i++) {
            for (let j = gridRange.minJ; j <= gridRange.maxJ; j++) {
                // 计算晶格点位置（格点位置）
                const nodeX = this.config.lattice.basis1.x * i + this.config.lattice.basis2.x * j;
                const nodeY = this.config.lattice.basis1.y * i + this.config.lattice.basis2.y * j;
                
                offscreenCtx.save();
                offscreenCtx.translate(nodeX, nodeY);
                
                if (this.nodeImage && this.nodeImageLoaded) {
                    this.drawNodeImage(offscreenCtx);
                }
                
                offscreenCtx.restore();
            }
        }

        offscreenCtx.restore();

        // 最后一次性将结果复制到实际显示的 canvas
        ctx.clearRect(0, 0, viewport.width, viewport.height);
        ctx.drawImage(offscreenCanvas, 0, 0);
    }

    calculateGridRange(width, height, scale = 1) {
        const { basis1, basis2 } = this.config.lattice;
        
        // 应用缩放因子到视口尺寸
        const viewportWidth = width / scale;
        const viewportHeight = height / scale;
        
        // 计算基向量的行列式
        const det = basis1.x * basis2.y - basis1.y * basis2.x;
        
        // 处理退化情况（基向量近似平行）
        if (Math.abs(det) < 1e-6) {
            const maxDim = Math.max(viewportWidth, viewportHeight);
            const minBasisLength = Math.min(
                Math.hypot(basis1.x, basis1.y),
                Math.hypot(basis2.x, basis2.y)
            );
            const range = Math.ceil(maxDim / minBasisLength);
            return {
                minI: -range,
                maxI: range,
                minJ: -range,
                maxJ: range
            };
        }
        // 视口的四个角点（相对于中心点）
        const corners = [
            {x: -viewportWidth/2, y: -viewportHeight/2},
            {x: viewportWidth/2, y: -viewportHeight/2},
            {x: viewportWidth/2, y: viewportHeight/2},
            {x: -viewportWidth/2, y: viewportHeight/2}
        ];
        // 对每个角点求解晶格坐标
        const latticeCoords = corners.map(point => {
            // 解线性方程组：
            // point.x = i * basis1.x + j * basis2.x
            // point.y = i * basis1.y + j * basis2.y
            
            const i = (point.x * basis2.y - point.y * basis2.x) / det;
            const j = (-point.x * basis1.y + point.y * basis1.x) / det;
            
            return { i, j };
        });
        // 计算覆盖所有角点的最小晶格范围
        const minI = Math.floor(Math.min(...latticeCoords.map(p => p.i)));
        const maxI = Math.ceil(Math.max(...latticeCoords.map(p => p.i)));
        const minJ = Math.floor(Math.min(...latticeCoords.map(p => p.j)));
        const maxJ = Math.ceil(Math.max(...latticeCoords.map(p => p.j)));
        return {
            minI,
            maxI,
            minJ,
            maxJ
        };
    }

    renderGrid(ctx, gridRange) {
        const { color, width, dash } = this.config.render.gridStyle;
        const { basis1, basis2 } = this.config.lattice;

        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.setLineDash(dash);

        // 沿基向量1方向绘制网格线
        for (let i = gridRange.minI; i <= gridRange.maxI; i++) {
            ctx.beginPath();
            const startX = basis1.x * i + basis2.x * gridRange.minJ;
            const startY = basis1.y * i + basis2.y * gridRange.minJ;
            ctx.moveTo(startX, startY);
            
            const endX = basis1.x * i + basis2.x * gridRange.maxJ;
            const endY = basis1.y * i + basis2.y * gridRange.maxJ;
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }

        // 沿基向量2方向绘制网格线
        for (let j = gridRange.minJ; j <= gridRange.maxJ; j++) {
            ctx.beginPath();
            const startX = basis1.x * gridRange.minI + basis2.x * j;
            const startY = basis1.y * gridRange.minI + basis2.y * j;
            ctx.moveTo(startX, startY);
            
            const endX = basis1.x * gridRange.maxI + basis2.x * j;
            const endY = basis1.y * gridRange.maxI + basis2.y * j;
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }
    }
    renderBoundary(ctx, gridRange) {
        const { color, width, dash } = this.config.render.boundaryStyle;
        const { basis1, basis2 } = this.config.lattice;
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.setLineDash(dash);
        // 绘制晶格单元的边界
        for (let i = gridRange.minI; i <= gridRange.maxI; i++) {
            for (let j = gridRange.minJ; j <= gridRange.maxJ; j++) {
                const x = basis1.x * i + basis2.x * j;
                const y = basis1.y * i + basis2.y * j;
                ctx.beginPath();
                this.drawUnitCellBoundary(ctx, x, y);
                ctx.stroke();
            }
        }
    }
    drawUnitCellBoundary(ctx, x, y) {
        const { shape } = this.config.lattice;
        const { basis1, basis2 } = this.config.lattice;
        switch (shape) {
            case 'parallelogram':
                ctx.moveTo(x, y);
                ctx.lineTo(x + basis1.x, y + basis1.y);
                ctx.lineTo(x + basis1.x + basis2.x, y + basis1.y + basis2.y);
                ctx.lineTo(x + basis2.x, y + basis2.y);
                ctx.closePath();
                break;
            // 可以添加其他形状的边界绘制
            default:
                // 默认矩形
                const width = this.patternCell.width;
                const height = this.patternCell.height;
                ctx.rect(x - width / 2, y - height / 2, width, height);
        }
    }
    // 工具方法
    isReady() {
        return this.nodeImageLoaded && this.fillImageLoaded && this.patternReady;
    }
    // 导出当前视图为图片
    async exportImage(format = 'image/png') {
        if (!this.patternCell) {
            throw new Error('图案尚未准备就绪');
        }
        return this.patternCell.toDataURL(format);
    }
    clipToParallelogram(ctx, width, height) {
        const { basis1, basis2 } = this.config.lattice;   
        // 计算平行四边形的四个顶点
        // 使用基向量定义平行四边形
        const points = [
            { x: -basis1.x/2 - basis2.x/2, y: -basis1.y/2 - basis2.y/2 }, // 左上
            { x: basis1.x/2 - basis2.x/2, y: basis1.y/2 - basis2.y/2 },   // 右上
            { x: basis1.x/2 + basis2.x/2, y: basis1.y/2 + basis2.y/2 },   // 右下
            { x: -basis1.x/2 + basis2.x/2, y: -basis1.y/2 + basis2.y/2 }  // 左下
        ];
        // 绘制裁剪路径
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.closePath();
    }

    clipToHexagon(ctx, width, height) {
        const radius = Math.min(width, height) / 2;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3;
            const x = radius * Math.cos(angle);
            const y = radius * Math.sin(angle);
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
    }

    // 分离填充图片和晶格点图片的绘制
    drawFillImage(ctx) {
        const config = this.config.fillImage;
        if (!this.fillImage || !config) return;
        
        ctx.save();
        
        // 计算单元格尺寸
        const { basis1, basis2 } = this.config.lattice;
        const cellWidth = Math.sqrt(basis1.x * basis1.x + basis1.y * basis1.y);
        const cellHeight = Math.sqrt(basis2.x * basis2.x + basis2.y * basis2.y);
        
        if (this.config.lattice.clipMotif) {
            // 使用基向量定义的平行四边形进行裁剪
            this.clipToLatticeShape(ctx, cellWidth, cellHeight);
        }

        const fitScale = this.calculateFitScale(
            this.fillImage.width,
            this.fillImage.height,
            cellWidth,
            cellHeight,
            config.fitMode
        );

        const { scale, rotation, translate } = config.transform;
        
        // 应用填充图片的变换
        ctx.translate(translate.x, translate.y);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(scale * fitScale, scale * fitScale);

        // 绘制填充图片，相对于格单元中心
        ctx.drawImage(
            this.fillImage,
            -this.fillImage.width / 2,
            -this.fillImage.height / 2
        );

        ctx.restore();
    }

    drawNodeImage(ctx) {
        const config = this.config.nodeImage;
        if (!this.nodeImage || !config) return;
        
        ctx.save();

        // 计算单元格尺寸
        const { basis1, basis2 } = this.config.lattice;
        const cellWidth = Math.sqrt(basis1.x * basis1.x + basis1.y * basis1.y);
        const cellHeight = Math.sqrt(basis2.x * basis2.x + basis2.y * basis2.y);

        const fitScale = this.calculateFitScale(
            this.nodeImage.width,
            this.nodeImage.height,
            cellWidth,
            cellHeight,
            config.fitMode
        );

        const { scale, rotation, translate } = config.transform;
        
        // 应用晶格点图片的变换
        ctx.translate(translate.x, translate.y);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(scale * fitScale, scale * fitScale);

        // 绘制晶格点图片，相对于格点位置
        ctx.drawImage(
            this.nodeImage,
            -this.nodeImage.width / 2,
            -this.nodeImage.height / 2
        );

        ctx.restore();
    }

    getSeamlessTilingRange(targetWidth, targetHeight) {
        const range = calculateSeamlessTilingRange(
            this.config.lattice.basis1,
            this.config.lattice.basis2,
            targetWidth,
            targetHeight
        );
        
        // 使用这个范围来渲染
        this.render(ctx, {
            width: range.actualWidth,
            height: range.actualHeight,
            gridRange: range
        });
        
        // 返回的图案可以完美地平铺
        return {
            width: range.periodWidth,
            height: range.periodHeight,
            fullWidth: range.actualWidth,
            fullHeight: range.actualHeight
        };
    }

    getMinimalSeamlessUnit() {
        const { basis1, basis2 } = this.config.lattice;
        
        // 计算基向量的分量比
        const ratioX = Math.abs(basis2.x / basis1.x);
        const ratioY = Math.abs(basis2.y / basis1.y);
        
        // 找到最小的整数倍数使得两个基向量的分量比接近整数
        const findMinimalMultiple = (ratio) => {
            if (Math.abs(ratio) < 0.001) return 1;
            const precision = 1e-6;
            let i = 1;
            while (i < 10) {
                if (Math.abs(Math.round(ratio * i) - ratio * i) < precision) {
                    return i;
                }
                i++;
            }
            return 1;
        };
        
        const mx = findMinimalMultiple(ratioX);
        const my = findMinimalMultiple(ratioY);
        
        // 计算最小无缝单元的尺寸
        return {
            width: Math.abs(basis1.x * mx) + Math.abs(basis2.x * my),
            height: Math.abs(basis1.y * mx) + Math.abs(basis2.y * my)
        };
    }
}
export function calculateSeamlessTilingRange(basis1, basis2, targetWidth, targetHeight) {
    // 1. 首先计算基向量在x和y方向上的投影
    const projections = {
        basis1: { x: basis1.x, y: basis1.y },
        basis2: { x: basis2.x, y: basis2.y }
    };

    // 2. 计算最大公约数和最小公倍数的辅助函数
    const gcd = (a, b) => {
        a = Math.abs(a);
        b = Math.abs(b);
        while (b > 0.0001) { // 使用一个小的阈值来处理浮点数误差
            const temp = b;
            b = a % b;
            a = temp;
        }
        return a;
    };

    const lcm = (a, b) => {
        if (Math.abs(a) < 0.0001 || Math.abs(b) < 0.0001) return Math.max(Math.abs(a), Math.abs(b));
        return Math.abs(a * b) / gcd(a, b);
    };

    // 3. 计算x和y方向上的周期
    const periodsX = lcm(projections.basis1.x, projections.basis2.x);
    const periodsY = lcm(projections.basis1.y, projections.basis2.y);

    // 4. 计算在目标尺寸内能容纳的完整周期数
    const maxPeriodsX = Math.max(1, Math.floor(targetWidth / Math.abs(periodsX)));
    const maxPeriodsY = Math.max(1, Math.floor(targetHeight / Math.abs(periodsY)));

    // 5. 确保周期数是偶数
    const finalPeriodsX = maxPeriodsX - (maxPeriodsX % 2);
    const finalPeriodsY = maxPeriodsY - (maxPeriodsY % 2);

    // 6. 计算网格范围
    const gridRange = {
        minI: -Math.floor(finalPeriodsX / 2),
        maxI: Math.floor(finalPeriodsX / 2),
        minJ: -Math.floor(finalPeriodsY / 2),
        maxJ: Math.floor(finalPeriodsY / 2)
    };

    // 7. 计算实际尺寸
    const actualWidth = Math.abs(periodsX * finalPeriodsX);
    const actualHeight = Math.abs(periodsY * finalPeriodsY);

    return {
        gridRange,
        actualWidth,
        actualHeight,
        periodWidth: Math.abs(periodsX),
        periodHeight: Math.abs(periodsY)
    };

}

