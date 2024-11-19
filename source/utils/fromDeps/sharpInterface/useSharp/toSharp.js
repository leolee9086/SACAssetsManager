import { requirePluginDeps } from '../../../module/requireDeps.js';
let sharp
try{
 sharp=require('sharp')
}catch(e){
    sharp= requirePluginDeps('sharp')
}
/**
 * 从文件路径转换为Sharp对象
 * @param {string} filePath - 文件路径
 * @returns {Sharp} Sharp对象
 * @example
 * const sharp对象 = fromFilePath('/path/to/image.jpg');
 */
export const fromFilePath = filePath => sharp(filePath);

/**
 * 网络相关转换
 */
export const fromURL = async url => {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    return sharp(Buffer.from(buffer));
};

/**
 * 从Base64 URL转换为Sharp对象
 * @param {string} base64url - Base64格式的URL
 * @returns {Promise<Sharp>} Sharp对象
 * @example
 * const sharp对象 = await fromBase64URL('blob:http://example.com/xxxx');
 */
export const fromBase64URL = async base64url => {
    const response = await fetch(base64url);
    const blob = await response.blob();
    return fromBlob(blob);
};

/**
 * 从DataURI转换为Sharp对象
 * @param {string} dataURI - Data URI格式的图像数据
 * @returns {Sharp} Sharp对象
 * @example
 * const sharp对象 = fromDataURI('data:image/png;base64,iVBORw0KGgo...');
 */
export const fromDataURI = dataURI => {
    const base64 = dataURI.split(',')[1];
    return fromBase64(base64);
};

/**
 * 二进制数据转换
 */
export const fromBuffer = buffer => sharp(buffer);

export const fromArrayBuffer = arrayBuffer =>
    sharp(Buffer.from(arrayBuffer));

export const fromUint8Array = uint8Array =>
    sharp(Buffer.from(uint8Array));

/**
 * 从Uint16Array转换为Sharp对象
 * @param {Uint16Array} uint16Array - Uint16Array类型的图像数据
 * @returns {Sharp} Sharp对象
 * @example
 * const sharp对象 = fromUint16Array(new Uint16Array([...]));
 */
export const fromUint16Array = uint16Array =>
    sharp(Buffer.from(new Uint8Array(uint16Array.buffer)));

/**
 * 从Int8Array转换为Sharp对象
 * @param {Int8Array} int8Array - Int8Array类型的图像数据
 * @returns {Sharp} Sharp对象
 * @example
 * const sharp对象 = fromInt8Array(new Int8Array([...]));
 */
export const fromInt8Array = int8Array =>
    sharp(Buffer.from(int8Array));

/**
 * 从TypedArray转换为Sharp对象
 * @param {TypedArray} typedArray - 任意TypedArray类型的图像数据
 * @returns {Sharp} Sharp对象
 * @example
 * const sharp对象 = fromTypedArray(new Float32Array([...]));
 */
export const fromTypedArray = typedArray =>
    sharp(Buffer.from(typedArray.buffer));

/**
 * 浏览器API相关转换
 */
export const fromBlob = async blob => {
    const buffer = await blob.arrayBuffer();
    return sharp(Buffer.from(buffer));
};

export const fromFile = async file => {
    const buffer = await file.arrayBuffer();
    return sharp(Buffer.from(buffer));
};

export const fromCanvas = async canvas => {
    const blob = await new Promise(resolve => canvas.toBlob(resolve));
    return fromBlob(blob);
};

/**
 * 从Canvas上下文转换为Sharp对象
 * @param {CanvasRenderingContext2D} context - Canvas 2D上下文
 * @returns {Promise<Sharp>} Sharp对象
 * @example
 * const ctx = canvas.getContext('2d');
 * const sharp对象 = await fromCanvasContext(ctx);
 */
export const fromCanvasContext = async context => {
    const imageData = context.getImageData(0, 0, context.canvas.width, context.canvas.height);
    return fromImageData(imageData);
};

/**
 * 从Image元素转换为Sharp对象
 * @param {HTMLImageElement} img - HTML Image元素
 * @returns {Promise<Sharp>} Sharp对象
 * @example
 * const img = document.querySelector('img');
 * const sharp对象 = await fromImageElement(img);
 */
export const fromImageElement = async img => {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    return fromCanvas(canvas);
};

/**
 * 从SVG元素转换为Sharp对象
 * @param {SVGElement} svg - SVG DOM元素
 * @returns {Promise<Sharp>} Sharp对象
 * @example
 * const svg = document.querySelector('svg');
 * const sharp对象 = await fromSVGElement(svg);
 */
export const fromSVGElement = async svg => {
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    return fromBlob(blob);
};

/**
 * 特殊格式转换
 */
export const fromImageData = imageData => {
    return sharp(Buffer.from(imageData.data), {
        raw: {
            width: imageData.width,
            height: imageData.height,
            channels: 4
        }
    });
};

/**
 * 从RGBA数组转换为Sharp对象
 * @param {Uint8Array|number[]} data - RGBA像素数据
 * @param {number} width - 图像宽度
 * @param {number} height - 图像高度
 * @returns {Sharp} Sharp对象
 * @example
 * const sharp对象 = fromRGBAArray(new Uint8Array([...]), 100, 100);
 */
export const fromRGBAArray = (data, width, height) => {
    return sharp(Buffer.from(data), {
        raw: {
            width,
            height,
            channels: 4
        }
    });
};

/**
 * 从RGB数组转换为Sharp对象
 * @param {Uint8Array|number[]} data - RGB像素数据
 * @param {number} width - 图像宽度
 * @param {number} height - 图像高度
 * @returns {Sharp} Sharp对象
 * @example
 * const sharp对象 = fromRGBArray(new Uint8Array([...]), 100, 100);
 */
export const fromRGBArray = (data, width, height) => {
    return sharp(Buffer.from(data), {
        raw: {
            width,
            height,
            channels: 3
        }
    });
};

/**
 * 从灰度数组转换为Sharp对象
 * @param {Uint8Array|number[]} data - 灰度像素数据
 * @param {number} width - 图像宽度
 * @param {number} height - 图像高度
 * @returns {Sharp} Sharp对象
 * @example
 * const sharp对象 = fromGrayscaleArray(new Uint8Array([...]), 100, 100);
 */
export const fromGrayscaleArray = (data, width, height) => {
    return sharp(Buffer.from(data), {
        raw: {
            width,
            height,
            channels: 1
        }
    });
};

/**
 * Node.js 特定转换
 */
export const fromStream = async stream => {
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
    }
    return sharp(Buffer.concat(chunks));
};

export const fromPath = path => sharp(path);

/**
 * 高级转换
 */
export const fromPixelArray = (pixels, width, height, channels = 4) => {
    return sharp(Buffer.from(pixels), {
        raw: {
            width,
            height,
            channels
        }
    });
};

export const fromColorMatrix = (matrix, channels = 4) => {
    const width = matrix[0].length;
    const height = matrix.length;
    const pixels = new Uint8Array(width * height * channels);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const pos = (y * width + x) * channels;
            const color = matrix[y][x];
            pixels[pos] = color[0];
            pixels[pos + 1] = color[1];
            pixels[pos + 2] = color[2];
            if (channels === 4) pixels[pos + 3] = color[3] ?? 255;
        }
    }

    return fromPixelArray(pixels, width, height, channels);
};

/**
 * 智能转换函数
 */
export const toSharp = input => {
    // 使用 typeof 检查作为第一层过滤，因为它是最快的类型检查
    const type = typeof input;
    
    if (type === 'string') {
        const firstChar = input.charAt(0);
        // 使用 charAt(0) 替代 startsWith，性能更好
        if (firstChar === 'd') return fromDataURI(input);  // data:
        if (firstChar === 'h') return fromURL(input);      // http
        if (firstChar === 'b') return fromBase64URL(input);// blob:
        return fromPath(input).catch(() => fromBase64(input));
    }
    
    // 使用 Map 存储实例检查，避免多个 if 判断
    const instanceHandlers = new Map([
        [Buffer.isBuffer, fromBuffer],
        [input => input instanceof Blob, fromBlob],
        [input => input instanceof File, fromFile],
        [input => input instanceof ArrayBuffer, fromArrayBuffer],
        [input => input instanceof Uint8Array, fromUint8Array],
        [input => input instanceof Uint16Array, fromUint16Array],
        [input => input instanceof Int8Array, fromInt8Array],
        [input => input instanceof HTMLCanvasElement, fromCanvas],
        [input => input instanceof HTMLImageElement, fromImageElement],
        [input => input instanceof SVGElement, fromSVGElement],
        [input => input instanceof ImageData, fromImageData]
    ]);

    // 遍历 Map 查找匹配的处理函数
    for (const [checker, handler] of instanceHandlers) {
        if (checker(input)) return handler(input);
    }
    
    // 数组检查放在最后，因为通常不是最常见的情况
    if (Array.isArray(input) && input[0]?.length) {
        return fromColorMatrix(input);
    }

    throw new Error('不支持的输入类型');
};

/**
 * 函数式工具
 */
/**
 * 函数管道组合
 * @param {...Function} fns - 要组合的函数列表
 * @returns {Function} 组合后的函数
 * @example
 * const 处理流程 = pipe(
 *   ensureSharp,
 *   img => img.resize(800, 600),
 *   img => img.grayscale()
 * );
 */
export const pipe = (...fns) => x => fns.reduce((v, f) => f(v), x);

/**
 * 函数组合（从右到左）
 * @param {...Function} fns - 要组合的函数列表
 * @returns {Function} 组合后的函数
 * @example
 * const 处理流程 = compose(
 *   img => img.grayscale(),
 *   img => img.resize(800, 600),
 *   ensureSharp
 * );
 */
export const compose = (...fns) => x => fns.reduceRight((v, f) => f(v), x);

/**
 * 实用工具函数
 */
/**
 * 检查对象是否为Sharp实例
 * @param {any} obj - 待检查的对象
 * @returns {boolean} 是否为Sharp实例
 * @example
 * if (isSharp(obj)) {
 *   await obj.toFile('output.jpg');
 * }
 */
export const isSharp = obj =>
    obj && typeof obj.pipe === 'function' && typeof obj.toBuffer === 'function';

/**
 * 确保输入转换为Sharp对象
 * @param {any} input - 任意输入数据
 * @returns {Sharp|Promise<Sharp>} Sharp对象
 * @example
 * const sharp对象 = await ensureSharp(someInput);
 */
export const ensureSharp = input =>
    isSharp(input) ? input : toSharp(input);

/**
 * 从Base64字符串转换为Sharp对象
 * @param {string} base64 - Base64编码的字符串
 * @returns {Promise<Sharp>} Sharp对象
 */
export const fromBase64 = async base64 => {
    const buffer = Buffer.from(base64, 'base64');
    return sharp(buffer);
};

