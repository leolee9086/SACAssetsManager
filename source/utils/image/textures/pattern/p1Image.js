import {
    以基向量对生成网格线数据,
    蒙版到节点形状,
    从视点和基向量对计算P1网格范围
} from "./utils/index.js";
import { 校验P1晶格基向量, 规范化P1图案配置 } from "./utils/config.js";
import { 顺序连接生成器 } from "../../../generators/combine.js";


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
        if (!this.patternReady) return;
        const { basis1, basis2 } = this.config.lattice;
        const gridRange = 从视点和基向量对计算P1网格范围(viewport, 1, basis1, basis2);
        // 创建组合生成器
        const combinedGenerator = 顺序连接生成器(
            计算P1填充图片位置(
                gridRange,
                basis1,
                basis2,
                this.config.lattice,
                this.config.fillImage,
                this.fillImage
            ),
            计算P1节点图片位置(
                gridRange,
                basis1,
                basis2,
                this.config.lattice,
                this.config.nodeImage,
                this.nodeImage
            )
        );
        // 网格线绘制保持不变
        const { color, width, dash } = this.config.render.gridStyle;
        // 使用独立函数计算网格线数据
        const gridLines = 以基向量对生成网格线数据(basis1, basis2, gridRange, { color, width, dash });
        return { imageConfigs: combinedGenerator, lineConfigs: gridLines }
    }

    // 工具方法
    isReady() {
        return this.nodeImageLoaded && this.fillImageLoaded && this.patternReady;
    }

}

function* 计算P1填充图片位置(gridRange, basis1, basis2, latticeConfig, imageConfig, image) {
    for (let i = gridRange.minI; i <= gridRange.maxI; i++) {
        for (let j = gridRange.minJ; j <= gridRange.maxJ; j++) {
            yield {
                position: {
                    x: basis1.x * (i + 0.5) + basis2.x * (j + 0.5),
                    y: basis1.y * (i + 0.5) + basis2.y * (j + 0.5)
                },
                lattice: latticeConfig,
                imageConfig: imageConfig,
                image: image,
                shouldClip: latticeConfig.clipMotif
            };
        }
    }
}

function* 计算P1节点图片位置(gridRange, basis1, basis2, latticeConfig, imageConfig, image) {
    for (let i = gridRange.minI; i <= gridRange.maxI; i++) {
        for (let j = gridRange.minJ; j <= gridRange.maxJ; j++) {
            yield {
                position: {
                    x: basis1.x * i + basis2.x * j,
                    y: basis1.y * i + basis2.y * j
                },
                lattice: latticeConfig,
                imageConfig: imageConfig,
                image: image
            };
        }
    }
}


export function flipLattice(lattice) {
    return {
        ...lattice,
        basis1: { x: lattice.basis1.x, y: -lattice.basis1.y },
        basis2: { x: lattice.basis2.x, y: -lattice.basis2.y }
    };
}

