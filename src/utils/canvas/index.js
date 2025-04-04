/**
 * @fileoverview 已弃用 - Canvas工具
 * @deprecated 请使用toolBox目录下的Canvas工具:
 * - src/toolBox/base/useBrowser/useCanvas/
 * - 或通过 src/toolBox/toolBoxExports.js 统一导入
 */

// 从新模块导入所有内容
import {
    CanvasProcessor,
    从Blob创建图像,
    加载图像,
    从SVG创建图像,
    从二进制数据创建图像,
    创建Canvas处理器,
    createImageFromBlob,
    loadImage,
    createImageFromSVG,
    createImageFromBinaryData,
    createProcessor
} from '../../../src/toolBox/base/useBrowser/useCanvas/index.js';

// 重新导出
export {
    CanvasProcessor,
    从Blob创建图像,
    加载图像,
    从SVG创建图像,
    从二进制数据创建图像,
    创建Canvas处理器,
    createImageFromBlob,
    loadImage,
    createImageFromSVG,
    createImageFromBinaryData,
    createProcessor
};

// 为保持向后兼容，导出一些原来直接声明在这个文件中的函数
export { createImageFromBlob as createImageFromBlob };
export { loadImage as loadImage };
export { createProcessor as createProcessor };

// 默认导出
export default {
    CanvasProcessor,
    createImageFromBlob,
    loadImage,
    createProcessor
};

// 弃用警告
console.warn('source/utils/canvas/index.js 已弃用，请直接从 src/toolBox 导入 Canvas 工具函数');

/**
 * Canvas图像处理链式调用类
 */
export class CanvasProcessor {
    constructor(canvas) {
        if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
            throw new Error('需要提供有效的canvas元素');
        }
        this.canvas = canvas;
        this.operations = [];
        this.hasError = false;
    }

    /**
     * 提取指定区域
     */
    extract(x, y, width, height) {
        this.operations.push(() => {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = width;
            tempCanvas.height = height;
            const ctx = tempCanvas.getContext('2d');
            ctx.drawImage(this.canvas, x, y, width, height, 0, 0, width, height);
            this.canvas = tempCanvas;
        });
        return this;
    }

    /**
     * 调整大小
     */
    resize(width, height, options = {}) {
        if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
            throw new Error('宽度和高度必须是有效的正数');
        }

        const { fit = 'contain', position = 'center' } = options;
        this.operations.push(async () => {
            try {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = width;
                tempCanvas.height = height;
                const ctx = tempCanvas.getContext('2d', { willReadFrequently: true });
                
                if (!ctx) {
                    throw new Error('无法获取 canvas 上下文');
                }

                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                const scale = Math.min(
                    width / this.canvas.width,
                    height / this.canvas.height
                );

                const scaledWidth = this.canvas.width * scale;
                const scaledHeight = this.canvas.height * scale;
                
                const x = (width - scaledWidth) / 2;
                const y = (height - scaledHeight) / 2;

                ctx.drawImage(this.canvas, x, y, scaledWidth, scaledHeight);
                this.canvas = tempCanvas;
            } catch (error) {
                this.hasError = true;
                throw error;
            }
        });
        return this;
    }

    /**
     * 旋转图像
     */
    rotate(angle) {
        this.operations.push(() => {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = this.canvas.width;
            tempCanvas.height = this.canvas.height;
            const ctx = tempCanvas.getContext('2d');
            
            ctx.translate(tempCanvas.width/2, tempCanvas.height/2);
            ctx.rotate(angle * Math.PI / 180);
            ctx.drawImage(this.canvas, -this.canvas.width/2, -this.canvas.height/2);
            
            this.canvas = tempCanvas;
        });
        return this;
    }

    /**
     * 执行处理并输出结果
     */
    async toImage(options = {}) {
        const { type = 'image/png', quality = 1 } = options;
        await this._process();
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = reject;
            image.src = this.canvas.toDataURL(type, quality);
        });
    }

    async toCanvas() {
        await this._process();
        return this.canvas;
    }

    async toBlob(options = {}) {
        const { type = 'image/png', quality = 1 } = options;
        await this._process();
        return new Promise((resolve) => {
            this.canvas.toBlob(resolve, type, quality);
        });
    }

    /**
     * 执行所有操作
     */
    async _process() {
        if (this.hasError) {
            throw new Error('处理过程中存在错误，无法继续执行');
        }

        try {
            for (const operation of this.operations) {
                await operation();
            }
        } catch (error) {
            this.hasError = true;
            throw error;
        } finally {
            this.operations = []; // 清空操作队列
        }
    }

    dispose() {
        this.operations = [];
        this.canvas = null;
    }

    /**
     * 导出为图片文件
     */
    async toFile(filename = 'image.png', options = {}) {
        const { type = 'image/png', quality = 1 } = options;
        const blob = await this.toBlob({ type, quality });
        return new File([blob], filename, { type });
    }

    /**
     * 导出为 base64 字符串
     */
    async toDataURL(options = {}) {
        const { type = 'image/png', quality = 1 } = options;
        await this._process();
        return this.canvas.toDataURL(type, quality);
    }

    /**
     * 下载图片到本地
     */
    async download(filename = 'image.png', options = {}) {
        const file = await this.toFile(filename, options);
        const url = URL.createObjectURL(file);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    }
}

/**
 * 工厂函数
 */
export async function createProcessor(input) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (input instanceof HTMLCanvasElement) {
        canvas.width = input.width;
        canvas.height = input.height;
        ctx.drawImage(input, 0, 0);
    } else if (input instanceof HTMLImageElement) {
        canvas.width = input.naturalWidth;
        canvas.height = input.naturalHeight;
        ctx.drawImage(input, 0, 0);
    } else if (input instanceof Blob || input instanceof File) {
        const image = await createImageFromBlob(input);
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        ctx.drawImage(image, 0, 0);
    } else if (input instanceof ImageData) {
        // 支持 ImageData
        canvas.width = input.width;
        canvas.height = input.height;
        ctx.putImageData(input, 0, 0);
    } else if (input instanceof ArrayBuffer || input instanceof Uint8Array) {
        // 支持二进制数据
        const blob = new Blob([input], { type: 'image/png' });
        const image = await createImageFromBlob(blob);
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        ctx.drawImage(image, 0, 0);
    } else if (typeof input === 'string') {
        // 处理 URL、base64 或 SVG 字符串
        if (input.startsWith('<svg')) {
            // 处理 SVG 字符串
            const blob = new Blob([input], { type: 'image/svg+xml' });
            const image = await createImageFromBlob(blob);
            canvas.width = image.naturalWidth || 300; // 设置默认宽度
            canvas.height = image.naturalHeight || 150; // 设置默认高度
            ctx.drawImage(image, 0, 0);
        } else {
            const image = await loadImage(input);
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            ctx.drawImage(image, 0, 0);
        }
    } else {
        throw new TypeError('不支持的输入类型');
    }

    return new CanvasProcessor(canvas);
}

/**
 * 从 Blob 创建图像
 */
function createImageFromBlob(blob) {
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
 */
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('图像加载失败'));
        img.src = src;
    });
}

