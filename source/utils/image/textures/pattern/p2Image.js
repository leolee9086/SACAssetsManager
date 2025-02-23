import { 在画布上下文批量绘制线条 } from "../../../canvas/draw/simpleDraw/lines.js";
import { calculateImageFitScale } from "../../utils.js";
import { 校验P1晶格基向量, 规范化P1图案配置 } from "./utils/config.js";
import { 以基向量对生成网格线数据, 在画布上下文应用变换, 蒙版到节点形状 } from "./utils/index.js";
import { 从基向量对计算P1网格填充范围 } from "./utils/p1Utils.js";
import { drawImageWithConfig } from "../../../canvas/draw/simpleDraw/images.js";
function 校验P2图案配置(config) {
    if (config.symmetry?.rotationCenter) {
        // 可以添加坐标值的合法性验证
        if (typeof config.symmetry.rotationCenter.x !== 'number' ||
            typeof config.symmetry.rotationCenter.y !== 'number') {
            throw new Error('旋转中心坐标必须是数字类型');
        }
    }
}
function 规范化P2图案配置(config){
    const defaultCenter = {
        x: (config.lattice.basis1.x + config.lattice.basis2.x) / 2,
        y: (config.lattice.basis1.y + config.lattice.basis2.y) / 2
    };

    // 添加P2特有的配置
    return {
        ...config,
        symmetry: {
            rotationCenter: config.symmetry?.rotationCenter || defaultCenter,
            rotationAngle: 180 // P2群固定为180度旋转
        }
    };

}
export class P2ImagePattern {
    constructor(config) {
        校验P1晶格基向量(config);
        校验P2图案配置(config)
        this.config = 规范化P1图案配置(config);
        this.config = 规范化P2图案配置(config);

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
        ctx.translate(viewport.x || width / 2, viewport.y || height / 2);

        const gridRange = viewport.gridRange || 从基向量对计算P1网格填充范围(width, height, 1, basis1, basis2);

        // 1. 先绘制填充图案 - 注意填充图案应该在晶格单元的中心
        for (let i = gridRange.minI; i <= gridRange.maxI; i++) {
            for (let j = gridRange.minJ; j <= gridRange.maxJ; j++) {
                // 计算晶格单元的中心点
                const centerX = basis1.x * (i + 0.5) + basis2.x * (j + 0.5);
                const centerY = basis1.y * (i + 0.5) + basis2.y * (j + 0.5);

                ctx.save();
                ctx.translate(centerX, centerY);
                // 使用Math.floor确保负数也能正确计算
                // 对于负数，我们需要先加上一个大的偶数来确保结果的正确性
                const index = Math.floor((centerX / basis1.x + 1000000)) % 2;  // 加上一个足够大的偶数
                const shouldRotate = index === 1;

                if (this.fillImage && this.fillImageLoaded) {
                    const config = this.config.fillImage;
                    if (!this.fillImage || !config) return;
                    ctx.save();
                    shouldRotate && ctx.rotate(Math.PI); // 旋转180度
                    // 计算单元格尺寸
                    const { basis1, basis2 } = this.config.lattice;
                    const { width, height } = this.fillImage
                    const cellWidth = Math.sqrt(basis1.x * basis1.x + basis1.y * basis1.y);
                    const cellHeight = Math.sqrt(basis2.x * basis2.x + basis2.y * basis2.y);
                    if (this.config.lattice.clipMotif) {
                        // 使用基向量定义的平行四边形进行裁剪
                        const { shape, basis1, basis2 } = this.config.lattice;
                        const 形状配置 = {
                            width, height, shape, basis1, basis2
                        }
                        蒙版到节点形状(ctx, 形状配置)
                    }
                    const fitScale = calculateImageFitScale(
                        width,
                        height,
                        cellWidth,
                        cellHeight,
                        config.fitMode
                    );
                    const { scale, rotation, translate } = config.transform;
                    在画布上下文应用变换(ctx, fitScale, translate, rotation, scale);
                    // 绘制填充图片，相对于格单元中心
                    ctx.drawImage(
                        this.fillImage,
                        -this.fillImage.width / 2,
                        -this.fillImage.height / 2
                    );
                    ctx.restore();
                }

                ctx.restore();
            }
        }

        // 2. 绘制网格线
        if (this.config.render.showGrid) {
            const { color, width, dash } = this.config.render.gridStyle;
            const { basis1, basis2 } = this.config.lattice;
            const gridLines = 以基向量对生成网格线数据(basis1, basis2, gridRange);
            // 批量绘制所有网格线
            在画布上下文批量绘制线条(ctx, gridLines, { color, width, dash });

        }

        // 3. 最后绘制晶格点图片 - 晶格点应该在格点位置
        for (let i = gridRange.minI; i <= gridRange.maxI; i++) {
            for (let j = gridRange.minJ; j <= gridRange.maxJ; j++) {
                // 计算晶格点位置（格点位置）
                const nodeX = basis1.x * i + basis2.x * j;
                const nodeY = basis1.y * i + basis2.y * j;

                ctx.save();
                ctx.translate(nodeX, nodeY);
                // 使用相同的计算方法
                const index = Math.floor((nodeX / basis1.x + 1000000)) % 2;
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
                    ctx.rotate(Math.PI); // 旋转180度

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
                ctx.restore();
            }
        }

        ctx.restore();
    }


}
