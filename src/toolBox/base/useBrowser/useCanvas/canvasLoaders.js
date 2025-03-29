/**
 * Canvas图像加载工具函数
 * 提供从不同源加载图像到Canvas的工具函数
 */

/**
 * 从Blob创建图像
 * @param {Blob} blob - 要转换为图像的Blob对象
 * @returns {Promise<HTMLImageElement>} 加载好的图像元素
 */
export function 从Blob创建图像(blob) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('图像加载失败'));
        };
        img.src = url;
    });
}

/**
 * 加载图像
 * @param {string} src - 图像URL或base64
 * @returns {Promise<HTMLImageElement>} 加载好的图像元素
 */
export function 加载图像(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('图像加载失败'));
        img.src = src;
    });
}

/**
 * 从SVG字符串创建图像
 * @param {string} svgString - SVG字符串
 * @param {Object} options - 选项
 * @param {number} [options.width=300] - 默认宽度
 * @param {number} [options.height=150] - 默认高度
 * @returns {Promise<HTMLImageElement>} 加载好的图像元素
 */
export function 从SVG创建图像(svgString, options = {}) {
    const { width = 300, height = 150 } = options;
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    return 从Blob创建图像(blob);
}

/**
 * 从二进制数据创建图像
 * @param {ArrayBuffer|Uint8Array} binaryData - 二进制图像数据
 * @param {string} [mimeType='image/png'] - MIME类型
 * @returns {Promise<HTMLImageElement>} 加载好的图像元素
 */
export function 从二进制数据创建图像(binaryData, mimeType = 'image/png') {
    const blob = new Blob([binaryData], { type: mimeType });
    return 从Blob创建图像(blob);
}

// 为了兼容性，提供英文别名
export const createImageFromBlob = 从Blob创建图像;
export const loadImage = 加载图像;
export const createImageFromSVG = 从SVG创建图像;
export const createImageFromBinaryData = 从二进制数据创建图像; 