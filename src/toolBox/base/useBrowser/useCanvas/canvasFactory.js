/**
 * Canvas工厂函数
 * 提供创建Canvas处理器的工厂方法
 */
import { CanvasProcessor } from './canvasProcessor.js';
import { 从Blob创建图像, 加载图像, 从SVG创建图像, 从二进制数据创建图像 } from './canvasLoaders.js';

/**
 * 创建Canvas处理器
 * @param {HTMLCanvasElement|HTMLImageElement|Blob|File|ImageData|ArrayBuffer|Uint8Array|string} 输入源 - 输入数据源
 * @returns {Promise<CanvasProcessor>} Canvas处理器实例
 * @throws {TypeError} 当输入类型不支持时抛出
 */
export async function 创建Canvas处理器(输入源) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('无法创建Canvas上下文');
    }

    if (输入源 instanceof HTMLCanvasElement) {
        // 从Canvas创建
        canvas.width = 输入源.width;
        canvas.height = 输入源.height;
        ctx.drawImage(输入源, 0, 0);
    } 
    else if (输入源 instanceof HTMLImageElement) {
        // 从Image创建
        canvas.width = 输入源.naturalWidth;
        canvas.height = 输入源.naturalHeight;
        ctx.drawImage(输入源, 0, 0);
    } 
    else if (输入源 instanceof Blob || 输入源 instanceof File) {
        // 从Blob或File创建
        const image = await 从Blob创建图像(输入源);
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        ctx.drawImage(image, 0, 0);
    } 
    else if (输入源 instanceof ImageData) {
        // 从ImageData创建
        canvas.width = 输入源.width;
        canvas.height = 输入源.height;
        ctx.putImageData(输入源, 0, 0);
    } 
    else if (输入源 instanceof ArrayBuffer || 输入源 instanceof Uint8Array) {
        // 从二进制数据创建
        const image = await 从二进制数据创建图像(输入源);
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        ctx.drawImage(image, 0, 0);
    } 
    else if (typeof 输入源 === 'string') {
        // 从字符串创建（URL、base64或SVG）
        if (输入源.startsWith('<svg')) {
            // SVG字符串
            const image = await 从SVG创建图像(输入源);
            canvas.width = image.naturalWidth || 300;
            canvas.height = image.naturalHeight || 150;
            ctx.drawImage(image, 0, 0);
        } else {
            // URL或base64
            const image = await 加载图像(输入源);
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            ctx.drawImage(image, 0, 0);
        }
    } 
    else {
        throw new TypeError('不支持的输入类型');
    }

    return new CanvasProcessor(canvas);
}

// 为了兼容性，提供英文别名
export const createProcessor = 创建Canvas处理器; 