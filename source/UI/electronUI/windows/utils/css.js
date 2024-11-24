/**
 * 计算图像实际显示区域
 * @param {DOMRect} containerRect 容器的位置和尺寸信息
 * @param {Object} imageInfo 图像信息
 * @param {number} scale 缩放比例
 * @param {Object} offset 偏移量
 */
export const getImageDisplayRect = (containerRect, imageInfo, scale, offset) => {
    if (!imageInfo?.width || !imageInfo?.height) {
        return {
            left: 0,
            top: 0,
            width: containerRect.width,
            height: containerRect.height,
            baseWidth: containerRect.width,
            baseHeight: containerRect.height,
            baseLeft: 0,
            baseTop: 0,
            scale: 1
        };
    }

    const imageAspect = imageInfo.width / imageInfo.height;
    const containerAspect = containerRect.width / containerRect.height;

    let baseWidth, baseHeight;

    // 计算基础尺寸（未缩放时的尺寸）
    if (imageAspect > containerAspect) {
        baseWidth = containerRect.width;
        baseHeight = containerRect.width / imageAspect;
    } else {
        baseHeight = containerRect.height;
        baseWidth = containerRect.height * imageAspect;
    }

    // 计算居中位置
    const baseLeft = (containerRect.width - baseWidth) / 2;
    const baseTop = (containerRect.height - baseHeight) / 2;

    // 添加实际显示尺寸和位置的计算
    const scaledWidth = baseWidth * scale;
    const scaledHeight = baseHeight * scale;
    const actualLeft = baseLeft + offset.x;
    const actualTop = baseTop + offset.y;

    return {
        baseWidth,
        baseHeight,
        baseLeft,
        baseTop,
        scale,
        // 添加实际显示相关的信息
        scaledWidth,
        scaledHeight,
        actualLeft,
        actualTop
    };
};