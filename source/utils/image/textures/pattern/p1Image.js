import { calculateImageFitScale } from "../../utils.js";
import { 在画布上下文批量绘制线条 } from "../../../canvas/draw/simpleDraw/lines.js";
import {
    从晶格获取最小重复单元 as 获取最小重复单元,
    以基向量对生成网格线数据,
    在画布上下文应用变换,
    蒙版到节点形状,
    纯色填充画布
} from "./utils/index.js";
import { 从基向量对计算P1网格填充范围 } from "./utils/p1Utils.js";
import { 以位置配置在画布上下文绘制图像 } from "../../../canvas/draw/simpleDraw/images.js";
import { 校验P1晶格基向量, 规范化P1图案配置 } from "./utils/config.js";
export class P1ImagePattern {
    constructor(config) {
        校验P1晶格基向量(config);
        this.config = 规范化P1图案配置(config);
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
            // 如果图案未准备好，保持上一帧的内容
            return;
        }

        // 创建离屏 canvas 用于双缓冲
        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = viewport.width;
        offscreenCanvas.height = viewport.height;
        const offscreenCtx = offscreenCanvas.getContext('2d');
        // 在离屏 canvas 上绘制
        纯色填充画布(
            offscreenCtx, {
            color: this.config.render.backgroundColor,
            width: viewport.width,
            height: viewport.height
        })
        const { basis1, basis2 } = this.config.lattice;

        const gridRange = viewport.gridRange || 从基向量对计算P1网格填充范围(viewport.width, viewport.height, 1, basis1, basis2);

        //offscreenCtx.fillStyle = this.config.render.backgroundColor;
        // offscreenCtx.fillRect(0, 0, viewport.width, viewport.height);
        offscreenCtx.save();
        offscreenCtx.translate(viewport.x || viewport.width / 2, viewport.y || viewport.height / 2);
        // 1. 先绘制填充图案 - 注意填充图案应该在晶格单元的中心
        const fillPositions = [];
        for (let i = gridRange.minI; i <= gridRange.maxI; i++) {
            for (let j = gridRange.minJ; j <= gridRange.maxJ; j++) {
                fillPositions.push({
                    x: this.config.lattice.basis1.x * (i + 0.5) + this.config.lattice.basis2.x * (j + 0.5),
                    y: this.config.lattice.basis1.y * (i + 0.5) + this.config.lattice.basis2.y * (j + 0.5)
                });
            }
        }

        fillPositions.forEach(pos => {
            offscreenCtx.save();
            offscreenCtx.translate(pos.x, pos.y);
            if (this.fillImage && this.fillImageLoaded) {
                this.drawFillImage(offscreenCtx);
            }
            offscreenCtx.restore();
        });

        // 2. 绘制网格线
        if (this.config.render.showGrid) {
            this.renderGrid(offscreenCtx, gridRange);
        }

        // 3. 最后绘制晶格点图片 - 晶格点应该在格点位置
        const nodePositions = [];
        for (let i = gridRange.minI; i <= gridRange.maxI; i++) {
            for (let j = gridRange.minJ; j <= gridRange.maxJ; j++) {
                nodePositions.push({
                    x: this.config.lattice.basis1.x * i + this.config.lattice.basis2.x * j,
                    y: this.config.lattice.basis1.y * i + this.config.lattice.basis2.y * j
                });
            }
        }

        nodePositions.forEach(pos => {
            offscreenCtx.save();
            offscreenCtx.translate(pos.x, pos.y);
            if (this.nodeImage && this.nodeImageLoaded) {
                this.drawNodeImage(offscreenCtx);
            }
            offscreenCtx.restore();
        });

        offscreenCtx.restore();

        // 最后一次性将结果复制到实际显示的 canvas
        ctx.clearRect(0, 0, viewport.width, viewport.height);
        ctx.drawImage(offscreenCanvas, 0, 0);
    }



    renderGrid(ctx, gridRange) {
        const { color, width, dash } = this.config.render.gridStyle;
        const { basis1, basis2 } = this.config.lattice;
        // 使用独立函数计算网格线数据
        const gridLines = 以基向量对生成网格线数据(basis1, basis2, gridRange);
        // 批量绘制所有网格线
        在画布上下文批量绘制线条(ctx, gridLines, { color, width, dash });
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
        // 计算单元格尺寸
        const { basis1, basis2 } = this.config.lattice;
        const { width, height } = this.fillImage
        const cellWidth = Math.sqrt(basis1.x * basis1.x + basis1.y * basis1.y);
        const cellHeight = Math.sqrt(basis2.x * basis2.x + basis2.y * basis2.y);
        if (this.config.lattice.clipMotif) {
            // 使用基向量定义的平行四边形进行裁剪
            clipToLatticeShape(ctx, cellWidth, cellHeight,this.config.lattice);
        }

        以位置配置在画布上下文绘制图像(ctx, this.fillImage, {
            width,
            height,
            cellWidth,
            cellHeight,
            fitMode: config.fitMode,
            transform: config.transform
        });

    }

    drawNodeImage(ctx) {
        const config = this.config.nodeImage;
        if (!this.nodeImage || !config) return;
        // 计算单元格尺寸
        const { basis1, basis2 } = this.config.lattice;
        const { width, height } = this.nodeImage;
        const cellWidth = Math.sqrt(basis1.x * basis1.x + basis1.y * basis1.y);
        const cellHeight = Math.sqrt(basis2.x * basis2.x + basis2.y * basis2.y);
        以位置配置在画布上下文绘制图像(ctx, this.nodeImage, {
            width,
            height,
            cellWidth,
            cellHeight,
            fitMode: config.fitMode,
            transform: config.transform
        });
    }

    getMinimalSeamlessUnit() {
        return 获取最小重复单元(this.config.lattice)
    }
}


function clipToLatticeShape(ctx, width, height,lattice) {
    const { shape, basis1, basis2 } = lattice;
    const 形状配置 = {
        width, height, shape, basis1, basis2
    }
    蒙版到节点形状(ctx, 形状配置)
    return
}