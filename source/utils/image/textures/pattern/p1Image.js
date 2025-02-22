import { calculateImageFitScale } from "../../utils.js";
import { 在画布上下文批量绘制线条 } from "../../../canvas/draw/simpleDraw/lines.js";
import {
    从晶格获取最小重复单元 as 获取最小重复单元,
    以基向量对生成网格线数据,
    以高度和宽度在画布上下文创建正六边形路径,
    在画布上下文应用填充图片变换,
    以基向量对在画布上下文创建平行四边形路径,
    蒙版到节点形状
} from "./utils/index.js";
import { 从基向量对计算P1网格填充范围 } from "./utils/p1Utils.js";
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
            // 填充图片配置
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
        ctx.translate(canvas.width / 2, canvas.height / 2);
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
        // 计算实际缩放比例
        const fitScale = calculateImageFitScale(
            image.width,
            image.height,
            cellWidth,
            cellHeight,
            config.fitMode
        );


        ctx.save();
        // 应用裁剪
        if (this.config.lattice.clipMotif) {
            this.clipToLatticeShape(ctx, cellWidth, cellHeight);
        }
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
        const { shape,basis1,basis2 } = this.config.lattice;
        const 形状配置 ={
            width, height,shape,basis1,basis2
        } 
        蒙版到节点形状(ctx,形状配置)
        return
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
        offscreenCtx.translate(viewport.x || viewport.width / 2, viewport.y || viewport.height / 2);

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
        return 从基向量对计算P1网格填充范围(
            width,
            height,
            scale,
            basis1,
            basis2
        );
    }

    renderGrid(ctx, gridRange) {
        const { color, width, dash } = this.config.render.gridStyle;
        const { basis1, basis2 } = this.config.lattice;
        // 使用独立函数计算网格线数据
        const gridLines = 以基向量对生成网格线数据(basis1, basis2, gridRange);
        // 批量绘制所有网格线
        在画布上下文批量绘制线条(ctx, gridLines, { color, width, dash });
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
        const fitScale = calculateImageFitScale(
            this.fillImage.width,
            this.fillImage.height,
            cellWidth,
            cellHeight,
            config.fitMode
        );
        const { scale, rotation, translate } = config.transform;
        在画布上下文应用填充图片变换(ctx, fitScale, translate, rotation, scale);
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

        const fitScale = calculateImageFitScale(
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

    getMinimalSeamlessUnit() {
        return 获取最小重复单元(this.config.lattice)
    }
}
