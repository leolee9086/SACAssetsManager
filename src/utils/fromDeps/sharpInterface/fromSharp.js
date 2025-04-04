

/**
 * 创建一个懒计算的Sharp转换对象
 * @param {Sharp} sharpObj - Sharp对象
 * @param {Object} [options] - 全局输出选项
 * @returns {Object} 包含所有可能转换的懒计算对象
 * @example
 * const converter = fromSharp(sharpObj);
 * const base64 = await converter.base64;
 * const buffer = await converter.buffer;
 */
export const fromSharp = (sharpObj, options = {}) => {
    const cache = new Map();
    const createGetter = (converter) => ({
        get: async () => {
            if (!cache.has(converter.name)) {
                cache.set(converter.name, await converter(sharpObj, options));
            }
            return cache.get(converter.name);
        },
        enumerable: true,
        configurable: true
    });

    return Object.defineProperties({}, {
        buffer: createGetter(toBuffer),
        base64: createGetter(toBase64),
        dataURL: createGetter(toDataURL),
        blob: createGetter(toBlob),
        arrayBuffer: createGetter(toArrayBuffer),
        uint8Array: createGetter(toUint8Array),
        canvas: createGetter(toCanvas),
        imageData: createGetter(toImageData),
        pixelArray: createGetter(toPixelArray),
        rgbArray: createGetter(toRGBArray),
        rgbaArray: createGetter(toRGBAArray),
        colorMatrix: createGetter(toColorMatrix),
        stream: { get: () => toStream(sharpObj, options) }, // stream 不缓存
        svg: createGetter(toSVG),
        histogram: createGetter(toHistogram),
        dominantColors: createGetter(toDominantColors),
        grayscaleHistogram: createGetter(toGrayscaleHistogram),
        binaryData: createGetter(toBinaryData),
        hslArray: createGetter(toHSLArray),
        features: createGetter(toImageFeatures),
        file: createGetter(toFile),
        objectURL: createGetter(toObjectURL),
        hsv: createGetter(toHSVArray),
        cmyk: createGetter(toCMYKArray),
        imageBitmap: createGetter(toImageBitmap),
        // 添加一个方法来清除缓存
        clearCache: {
            value: () => cache.clear(),
            enumerable: false,
            configurable: true
        },
        // 添加一个方法来使用自定义选项进行转换
        with: {
            value: (customOptions) => fromSharp(sharpObj, { ...options, ...customOptions }),
            enumerable: false,
            configurable: true
        }
    });
};
