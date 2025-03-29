/**
 * Canvas工具集
 * 提供Canvas图像处理、加载和操作的工具函数
 */

// 导出Canvas处理器
export { CanvasProcessor } from './canvasProcessor.js';

// 导出图像加载函数
export {
    从Blob创建图像,
    加载图像,
    从SVG创建图像,
    从二进制数据创建图像,
    // 英文别名
    createImageFromBlob,
    loadImage,
    createImageFromSVG,
    createImageFromBinaryData
} from './canvasLoaders.js';

// 导出工厂函数
export {
    创建Canvas处理器,
    // 英文别名
    createProcessor
} from './canvasFactory.js';

// 默认导出所有功能
export default {
    CanvasProcessor,
    从Blob创建图像,
    加载图像,
    从SVG创建图像,
    从二进制数据创建图像,
    创建Canvas处理器,
    // 英文别名
    createImageFromBlob: 从Blob创建图像,
    loadImage: 加载图像,
    createImageFromSVG: 从SVG创建图像,
    createImageFromBinaryData: 从二进制数据创建图像,
    createProcessor: 创建Canvas处理器
}; 