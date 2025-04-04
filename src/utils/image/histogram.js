import { 创建经典直方图配置 } from '../fromDeps/echarts/presets.js';
import { fromFilePath } from '../fromDeps/sharpInterface/useSharp/toSharp.js';
import { getHistogramGPUjs } from './histogram/cpu.js';
import { getHistogramWebGPU } from './histogram/webgpu.js';
/**
 * 转换为像素直方图
 * @param {Uint8Array|Uint8ClampedArray} buffer - 图像buffer数据
 * @returns {Object} 直方图数据
 */
const getHistogramFromBuffer = (buffer) => {
    // 确保输入数据有效
    if (!buffer || !buffer.length) {
        throw new Error('无效的图像数据');
    }

    // 检查数据长度是否为4的倍数（RGBA）
    if (buffer.length % 4 !== 0) {
        throw new Error('图像数据长度必须是4的倍数');
    }

    // 初始化直方图数组
    const histogram = {
        r: new Array(256).fill(0),
        g: new Array(256).fill(0),
        b: new Array(256).fill(0),
        a: new Array(256).fill(0),
        brightness: new Array(256).fill(0)
    };

    // 遍历像素数据
    for (let i = 0; i < buffer.length; i += 4) {
        const r = buffer[i];
        const g = buffer[i + 1];
        const b = buffer[i + 2];
        const a = buffer[i + 3];

        // 计算亮度
        const brightness = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

        // 添加范围检查
        if (r >= 0 && r < 256) histogram.r[r]++;
        if (g >= 0 && g < 256) histogram.g[g]++;
        if (b >= 0 && b < 256) histogram.b[b]++;
        if (a >= 0 && a < 256) histogram.a[a]++;
        if (brightness >= 0 && brightness < 256) histogram.brightness[brightness]++;
    }

    return histogram;
};
/**
 * 统一的直方图计算接口
 * @param {ImageBitmap|ImageData|Buffer} imageData - 图像数据
 * @returns {Promise<Object>} 直方图数据
 */
export const calculateHistogram = async (imageData, options = {}) => {
    const { useGPU = true, onProgress } = options;

    try {
        // 只在明确指定且支持的情况下使用GPU
        if (useGPU && navigator?.gpu) {
            return await getHistogramWebGPU(imageData);
        }

        // 处理 ImageBitmap
        if (imageData instanceof ImageBitmap) {
            // 转换 ImageBitmap 为 ImageData
            const canvas = new OffscreenCanvas(imageData.width, imageData.height);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(imageData, 0, 0);
            const imgData = ctx.getImageData(0, 0, imageData.width, imageData.height);
            return getHistogramFromBuffer(imgData.data);
        }

        // 现有的降级处理逻辑
        if (imageData instanceof ImageData) {
            return getHistogramFromBuffer(imageData.data);
        } else if (imageData instanceof Buffer || imageData instanceof Uint8Array) {
            return getHistogramFromBuffer(imageData);
        }

        throw new Error('不持的图像数据格式');
    } catch (error) {
        console.warn('直方图计算失败，尝试降级处理:', error);
        // 降级处理
        if (imageData instanceof ImageData) {
            return getHistogramFromBuffer(imageData.data);
        }
        throw error;
    }
};


export const getHistogramFromPath = async (imagePath) => {
    // 使用 sharp 读取图像数据
    const image = fromFilePath(imagePath);
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

    console.log('图片大小:', (info.size / 1024 / 1024).toFixed(2), 'MB');
    console.log('ImageData信息:');
    console.log('- 宽度:', info.width);
    console.log('- 高度:', info.height);
    console.log('- 数据类型:', data.constructor.name);
    console.log('- 数据长度:', data.length);
    console.log('- 前10个像素值:', Array.from(data.slice(0, 40)));

    // 测试CPU版本
    console.time('直方图计算时间');
    const histogram = await getHistogramWebGPU({ data, width, height }, { useGPU: false });
    console.timeEnd('直方图计算时间');
    return {
        data,
        info,
        histogram,
        imagePath
    }
}
export const getHistogramFromSharp = async (sharpObj) => {
    // 使用 sharp 读取图像数据
    const { data, info } = await sharpObj.raw().toBuffer({ resolveWithObject: true });
    const { width, height } = info
    // 测试CPU版本
    const histogram = await getHistogramWebGPU({ data, width, height }, { useGPU: false });
    return {
        data,
        info,
        histogram,
    }
}


