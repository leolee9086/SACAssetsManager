import { 在画布上下文批量绘制线条 } from "../../../canvas/draw/simpleDraw/lines.js";
import { calculateImageFitScale } from "../../utils.js";
import { 校验P1晶格基向量, 规范化P1图案配置 } from "./utils/config.js";
import { 以基向量对生成网格线数据, 在画布上下文应用变换, 蒙版到节点形状 } from "./utils/index.js";
import { 从基向量对计算P1网格填充范围 } from "./utils/p1Utils.js";
import { drawImageWithConfig } from "../../../canvas/draw/simpleDraw/images.js";
import { 顺序连接生成器 } from "../../../generators/combine.js";
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
        if (!this.patternReady) return;

        const { basis1, basis2 } = this.config.lattice;
        const gridRange = viewport.gridRange || 从基向量对计算P1网格填充范围(
            viewport.width, 
            viewport.height,
            1,
            basis1,
            basis2
        );

        // 创建组合生成器（包含填充和节点）
        const combinedGenerator = 顺序连接生成器(
            计算P2填充图片位置(
                gridRange,
                basis1,
                basis2,
                this.config.lattice,
                this.config.fillImage,
                this.fillImage,
            ),
            计算P2节点图片位置(
                gridRange,
                basis1,
                basis2,
                this.config.lattice,
                this.config.nodeImage,
                this.nodeImage,
            )
        );

        // 生成网格线数据
        const gridLines = this.config.render.showGrid 
            ? 以基向量对生成网格线数据(basis1, basis2, gridRange)
            : [];

        return { 
            imageConfigs: combinedGenerator,
            lineConfigs: gridLines 
        };
    }


}

// 填充图片生成器
function* 计算P2填充图片位置(gridRange, basis1, basis2, latticeConfig, imageConfig, image) {
    for (let i = gridRange.minI; i <= gridRange.maxI; i++) {
        for (let j = gridRange.minJ; j <= gridRange.maxJ; j++) {
            const centerX = basis1.x * (i + 0.5) + basis2.x * (j + 0.5);
            const centerY = basis1.y * (i + 0.5) + basis2.y * (j + 0.5);
            
            // 计算旋转标记
            const index = Math.floor((centerX / basis1.x + 1000000)) % 2;
            const shouldRotate = index === 1;
            console.log(shouldRotate)
            yield {
                position: { x: centerX, y: centerY },
                lattice: latticeConfig,
                imageConfig: {...imageConfig, transform: {
                    rotation:imageConfig.transform.rotation+(shouldRotate ? 180 : 0), // 180度旋转
                    scale: imageConfig?.transform?.scale || 1
                }},
                image: image,
                shouldClip: latticeConfig.clipMotif,
               
            };
        }
    }
}

// 节点图片生成器
function* 计算P2节点图片位置(gridRange, basis1, basis2, latticeConfig, imageConfig, image) {
    for (let i = gridRange.minI; i <= gridRange.maxI; i++) {
        for (let j = gridRange.minJ; j <= gridRange.maxJ; j++) {
            const nodeX = basis1.x * i + basis2.x * j;
            const nodeY = basis1.y * i + basis2.y * j;
            
            // 计算旋转标记
            const index = Math.floor((nodeX / basis1.x + 1000000)) % 2;
            const shouldRotate = index === 1;

            yield {
                position: { x: nodeX, y: nodeY },
                lattice: latticeConfig,
                imageConfig: imageConfig,
                image: image,
                transform: {
                    rotation: shouldRotate ? Math.PI : 0 // 180度旋转
                },
                // 需要绘制两次（原始和旋转后的）
                needMirror: shouldRotate 
            };
        }
    }
}
