// 创建纯函数实现Y轴翻转
export const flipPixelsYAxis = (pixels, width, height) => {
    const flipped = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
        const srcOffset = y * width * 4;
        const dstOffset = (height - y - 1) * width * 4;
        flipped.set(pixels.subarray(srcOffset, srcOffset + width * 4), dstOffset);
    }
    return new ImageData(flipped, width, height);
};
