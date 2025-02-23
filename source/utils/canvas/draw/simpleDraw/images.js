import { calculateImageFitScale } from "../../../image/utils.js";
import { 蒙版到节点形状 } from "../../../image/textures/pattern/utils/index.js";
export function 以位置配置在画布上下文绘制图像(ctx, image, config) {
    const { width, height, cellWidth, cellHeight, fitMode, transform } = config;
    const { scale, rotation, translate } = transform;
    ctx.save();
    // 计算图片适配比例
    const fitScale = calculateImageFitScale(
        width,
        height,
        cellWidth,
        cellHeight,
        fitMode
    );
    // 应用图片的变换
    ctx.translate(translate.x, translate.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale * fitScale, scale * fitScale);
    // 绘制图片，相对于中心位置
    ctx.drawImage(
        image,
        -width / 2,
        -height / 2
    );
    ctx.restore();
}
function clipToLatticeShape(ctx, width, height, lattice) {
    const { shape, basis1, basis2 } = lattice;
    const 形状配置 = {
        width, height, shape, basis1, basis2
    }
    蒙版到节点形状(ctx, 形状配置)
    return
}
export function drawImageWithConfig(ctx, image, lattice, imageConfig, shouldClip = false) {
    if (!image || !imageConfig) return;

    const { basis1, basis2 } = lattice;
    const { width, height } = image;
    const cellWidth = Math.sqrt(basis1.x * basis1.x + basis1.y * basis1.y);
    const cellHeight = Math.sqrt(basis2.x * basis2.x + basis2.y * basis2.y);

    if (shouldClip) {
        clipToLatticeShape(ctx, cellWidth, cellHeight, lattice);
    }

    以位置配置在画布上下文绘制图像(ctx, image, {
        width,
        height,
        cellWidth,
        cellHeight,
        fitMode: imageConfig.fitMode,
        transform: imageConfig.transform
    });
}