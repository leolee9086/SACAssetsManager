/**
 * Sharp对象转换模块 - 将Sharp对象转换为各种格式
 */

/**
 * 转换为Buffer
 * @param {Sharp} sharpObj - Sharp对象
 * @param {Object} [options] - 输出选项
 * @returns {Promise<Buffer>} 图像buffer
 * @example
 * const buffer = await toBuffer(sharpObj, { quality: 80 });
 */
export const toBuffer = async (sharpObj, options = {}) => {
    return sharpObj.toBuffer(options);
};

/**
 * 转换为Base64
 * @param {Sharp} sharpObj - Sharp对象
 * @param {Object} [options] - 输出选项
 * @returns {Promise<string>} Base64字符串
 * @example
 * const base64 = await toBase64(sharpObj, { format: 'jpeg' });
 */
export const toBase64 = async (sharpObj, options = {}) => {
    const buffer = await sharpObj.toBuffer(options);
    return buffer.toString('base64');
};

/**
 * 转换为DataURL
 * @param {Sharp} sharpObj - Sharp对象
 * @param {Object} [options] - 输出选项
 * @returns {Promise<string>} DataURL字符串
 * @example
 * const dataUrl = await toDataURL(sharpObj, { format: 'png' });
 */
export const toDataURL = async (sharpObj, options = {}) => {
    const buffer = await sharpObj.toBuffer(options);
    const format = options.format || 'jpeg';
    return `data:image/${format};base64,${buffer.toString('base64')}`;
};

/**
 * 转换为Blob
 * @param {Sharp} sharpObj - Sharp对象
 * @param {Object} [options] - 输出选项
 * @returns {Promise<Blob>} Blob对象
 * @example
 * const blob = await toBlob(sharpObj, { format: 'webp' });
 */
export const toBlob = async (sharpObj, options = {}) => {
    const buffer = await sharpObj.toBuffer(options);
    const format = options.format || 'jpeg';
    return new Blob([buffer], { type: `image/${format}` });
};

/**
 * 转换为ArrayBuffer
 * @param {Sharp} sharpObj - Sharp对象
 * @param {Object} [options] - 输出选项
 * @returns {Promise<ArrayBuffer>} ArrayBuffer对象
 * @example
 * const arrayBuffer = await toArrayBuffer(sharpObj);
 */
export const toArrayBuffer = async (sharpObj, options = {}) => {
    const buffer = await sharpObj.toBuffer(options);
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
};

/**
 * 转换为Uint8Array
 * @param {Sharp} sharpObj - Sharp对象
 * @param {Object} [options] - 输出选项
 * @returns {Promise<Uint8Array>} Uint8Array对象
 * @example
 * const uint8Array = await toUint8Array(sharpObj);
 */
export const toUint8Array = async (sharpObj, options = {}) => {
    const buffer = await sharpObj.toBuffer(options);
    return new Uint8Array(buffer);
};

/**
 * 转换为Canvas元素
 * @param {Sharp} sharpObj - Sharp对象
 * @param {Object} [options] - 输出选项
 * @returns {Promise<HTMLCanvasElement>} Canvas元素
 * @example
 * const canvas = await toCanvas(sharpObj);
 */
export const toCanvas = async (sharpObj, options = {}) => {
    const { data, info } = await sharpObj.raw().toBuffer({ resolveWithObject: true });
    const canvas = document.createElement('canvas');
    canvas.width = info.width;
    canvas.height = info.height;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(info.width, info.height);
    imageData.data.set(new Uint8ClampedArray(data.buffer));
    ctx.putImageData(imageData, 0, 0);
    return canvas;
};

/**
 * 转换为ImageData
 * @param {Sharp} sharpObj - Sharp对象
 * @param {Object} [options] - 输出选项
 * @returns {Promise<ImageData>} ImageData对象
 * @example
 * const imageData = await toImageData(sharpObj);
 */
export const toImageData = async (sharpObj, options = {}) => {
    const { data, info } = await sharpObj.raw().toBuffer({ resolveWithObject: true });
    return new ImageData(
        new Uint8ClampedArray(data.buffer),
        info.width,
        info.height
    );
};

/**
 * 转换为像素数组
 * @param {Sharp} sharpObj - Sharp对象
 * @param {Object} [options] - 输出选项
 * @returns {Promise<{data: Uint8Array, info: Object}>} 像素数据和图像信息
 * @example
 * const { data, info } = await toPixelArray(sharpObj);
 */
export const toPixelArray = async (sharpObj, options = {}) => {
    return sharpObj.raw().toBuffer({ resolveWithObject: true });
};

/**
 * 转换为RGB数组
 * @param {Sharp} sharpObj - Sharp对象
 * @returns {Promise<number[][]>} RGB数组 [[r,g,b], ...]
 * @example
 * const rgbArray = await toRGBArray(sharpObj);
 */
export const toRGBArray = async (sharpObj) => {
    const { data } = await sharpObj.raw().toBuffer({ resolveWithObject: true });
    const result = [];
    for (let i = 0; i < data.length; i += 3) {
        result.push([data[i], data[i + 1], data[i + 2]]);
    }
    return result;
};

/**
 * 转换为RGBA数组
 * @param {Sharp} sharpObj - Sharp对象
 * @returns {Promise<number[][]>} RGBA数组 [[r,g,b,a], ...]
 * @example
 * const rgbaArray = await toRGBAArray(sharpObj);
 */
export const toRGBAArray = async (sharpObj) => {
    const { data } = await sharpObj.raw().toBuffer({ resolveWithObject: true });
    const result = [];
    for (let i = 0; i < data.length; i += 4) {
        result.push([data[i], data[i + 1], data[i + 2], data[i + 3]]);
    }
    return result;
};

/**
 * 转换为颜色矩阵
 * @param {Sharp} sharpObj - Sharp对象
 * @returns {Promise<number[][][]>} 颜色矩阵 [[[r,g,b], ...], ...]
 * @example
 * const colorMatrix = await toColorMatrix(sharpObj);
 */
export const toColorMatrix = async (sharpObj) => {
    const { data, info } = await sharpObj.raw().toBuffer({ resolveWithObject: true });
    const matrix = [];
    const channels = info.channels;
    
    for (let y = 0; y < info.height; y++) {
        const row = [];
        for (let x = 0; x < info.width; x++) {
            const pos = (y * info.width + x) * channels;
            const pixel = [];
            for (let c = 0; c < channels; c++) {
                pixel.push(data[pos + c]);
            }
            row.push(pixel);
        }
        matrix.push(row);
    }
    return matrix;
};

/**
 * 转换为Stream
 * @param {Sharp} sharpObj - Sharp对象
 * @param {Object} [options] - 输出选项
 * @returns {ReadableStream} 可读流
 * @example
 * const stream = toStream(sharpObj);
 * stream.pipe(fs.createWriteStream('output.jpg'));
 */
export const toStream = (sharpObj, options = {}) => {
    return sharpObj.pipe();
};

/**
 * 转换为SVG
 * @param {Sharp} sharpObj - Sharp对象
 * @param {Object} [options] - 输出选项
 * @returns {Promise<string>} SVG字符串
 * @example
 * const svg = await toSVG(sharpObj, { width: 800 });
 */
export const toSVG = async (sharpObj, options = {}) => {
    const { data, info } = await sharpObj.raw().toBuffer({ resolveWithObject: true });
    const width = options.width || info.width;
    const height = Math.round(width * (info.height / info.width));
    
    let svgData = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
    svgData += `<image width="100%" height="100%" href="${await toDataURL(sharpObj)}"/>`;
    svgData += '</svg>';
    
    return svgData;
};

/**
 * 转换为像素直方图
 * @param {Sharp} sharpObj - Sharp对象
 * @param {Object} [options] - 输出选项
 * @returns {Promise<Object>} 直方图数据
 * @example
 * const histogram = await toHistogram(sharpObj);
 */
export const toHistogram = async (sharpObj, options = {}) => {
    const { data } = await sharpObj.raw().toBuffer({ resolveWithObject: true });
    const histogram = {
        r: new Array(256).fill(0),
        g: new Array(256).fill(0),
        b: new Array(256).fill(0),
        a: new Array(256).fill(0)
    };
    
    for (let i = 0; i < data.length; i += 4) {
        histogram.r[data[i]]++;
        histogram.g[data[i + 1]]++;
        histogram.b[data[i + 2]]++;
        histogram.a[data[i + 3]]++;
    }
    
    return histogram;
};

/**
 * 转换为主色调数组
 * @param {Sharp} sharpObj - Sharp对象
 * @param {number} [colorCount=5] - 提取的颜色数量
 * @returns {Promise<Array<{color: number[], percentage: number}>>} 主色调数组
 * @example
 * const dominantColors = await toDominantColors(sharpObj, 5);
 */
export const toDominantColors = async (sharpObj, colorCount = 5) => {
    const { data } = await sharpObj.raw().toBuffer({ resolveWithObject: true });
    const colors = new Map();
    
    for (let i = 0; i < data.length; i += 4) {
        const color = [data[i], data[i + 1], data[i + 2]];
        const key = color.join(',');
        colors.set(key, (colors.get(key) || 0) + 1);
    }
    
    const sortedColors = [...colors.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, colorCount)
        .map(([color, count]) => ({
            color: color.split(',').map(Number),
            percentage: count / (data.length / 4)
        }));
    
    return sortedColors;
};

/**
 * 转换为灰度直方图
 * @param {Sharp} sharpObj - Sharp对象
 * @returns {Promise<number[]>} 灰度直方图数据
 * @example
 * const grayscaleHist = await toGrayscaleHistogram(sharpObj);
 */
export const toGrayscaleHistogram = async (sharpObj) => {
    const grayImage = sharpObj.grayscale();
    const { data } = await grayImage.raw().toBuffer({ resolveWithObject: true });
    const histogram = new Array(256).fill(0);
    
    for (let i = 0; i < data.length; i++) {
        histogram[data[i]]++;
    }
    
    return histogram;
};

/**
 * 转换为二值化图像数据
 * @param {Sharp} sharpObj - Sharp对象
 * @param {number} [threshold=128] - 二值化阈值
 * @returns {Promise<Uint8Array>} 二值化数据
 * @example
 * const binaryData = await toBinaryData(sharpObj, 128);
 */
export const toBinaryData = async (sharpObj, threshold = 128) => {
    const grayImage = sharpObj.grayscale();
    const { data } = await grayImage.raw().toBuffer({ resolveWithObject: true });
    const binaryData = new Uint8Array(data.length);
    
    for (let i = 0; i < data.length; i++) {
        binaryData[i] = data[i] > threshold ? 255 : 0;
    }
    
    return binaryData;
};

/**
 * 转换为HSL数组
 * @param {Sharp} sharpObj - Sharp对象
 * @returns {Promise<Array<[number,number,number]>>} HSL数组
 * @example
 * const hslArray = await toHSLArray(sharpObj);
 */
export const toHSLArray = async (sharpObj) => {
    const rgbaArray = await toRGBAArray(sharpObj);
    return rgbaArray.map(([r, g, b]) => {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }

        return [h * 360, s * 100, l * 100];
    });
};

/**
 * 转换为图像特征描述符
 * @param {Sharp} sharpObj - Sharp对象
 * @returns {Promise<Object>} 图像特征数据
 * @example
 * const features = await toImageFeatures(sharpObj);
 */
export const toImageFeatures = async (sharpObj) => {
    const { data, info } = await sharpObj.raw().toBuffer({ resolveWithObject: true });
    const features = {
        dimensions: {
            width: info.width,
            height: info.height,
            aspectRatio: info.width / info.height
        },
        colorStats: {
            r: { min: 255, max: 0, avg: 0 },
            g: { min: 255, max: 0, avg: 0 },
            b: { min: 255, max: 0, avg: 0 }
        },
        brightness: 0,
        contrast: 0
    };
    
    let rSum = 0, gSum = 0, bSum = 0;
    const pixelCount = data.length / 4;
    
    for (let i = 0; i < data.length; i += 4) {
        const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
        
        // 更新颜色统计
        features.colorStats.r.min = Math.min(features.colorStats.r.min, r);
        features.colorStats.r.max = Math.max(features.colorStats.r.max, r);
        features.colorStats.g.min = Math.min(features.colorStats.g.min, g);
        features.colorStats.g.max = Math.max(features.colorStats.g.max, g);
        features.colorStats.b.min = Math.min(features.colorStats.b.min, b);
        features.colorStats.b.max = Math.max(features.colorStats.b.max, b);
        
        rSum += r;
        gSum += g;
        bSum += b;
    }
    
    features.colorStats.r.avg = rSum / pixelCount;
    features.colorStats.g.avg = gSum / pixelCount;
    features.colorStats.b.avg = bSum / pixelCount;
    
    features.brightness = (features.colorStats.r.avg + 
                         features.colorStats.g.avg + 
                         features.colorStats.b.avg) / 3;
    
    features.contrast = (features.colorStats.r.max - features.colorStats.r.min +
                        features.colorStats.g.max - features.colorStats.g.min +
                        features.colorStats.b.max - features.colorStats.b.min) / 3;
    
    return features;
};

/**
 * 智能转换函数
 * @param {Sharp} sharpObj - Sharp对象
 * @param {string} format - 目标格式
 * @param {Object} [options] - 输出选项
 * @returns {Promise<any>} 转换后的对象
 * @example
 * const result = await fromSharp(sharpObj, 'base64', { quality: 80 });
 */
export const fromSharp = async (sharpObj, format, options = {}) => {
    const converters = {
        'buffer': toBuffer,
        'base64': toBase64,
        'dataurl': toDataURL,
        'blob': toBlob,
        'arraybuffer': toArrayBuffer,
        'uint8array': toUint8Array,
        'canvas': toCanvas,
        'imagedata': toImageData,
        'pixelarray': toPixelArray,
        'rgbarray': toRGBArray,
        'rgbaarray': toRGBAArray,
        'colormatrix': toColorMatrix,
        'stream': toStream,
        'svg': toSVG,
        'histogram': toHistogram,
        'dominantcolors': toDominantColors,
        'grayscalehistogram': toGrayscaleHistogram,
        'binary': toBinaryData,
        'hsl': toHSLArray,
        'features': toImageFeatures
    };

    const converter = converters[format.toLowerCase()];
    if (!converter) {
        throw new Error(`不支持的输出格式: ${format}`);
    }

    return converter(sharpObj, options);
};

