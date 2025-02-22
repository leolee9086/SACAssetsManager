import { calculateImageFitScale } from "../../../image/utils.js";
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

