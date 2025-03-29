/**
 * Canvas图像处理链式调用类
 * 提供链式操作Canvas元素的功能
 */

/**
 * Canvas处理器类
 * 支持链式调用的Canvas图像处理器
 */
export class CanvasProcessor {
    /**
     * 创建Canvas处理器实例
     * @param {HTMLCanvasElement} canvas - 要处理的canvas元素
     */
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
     * @param {number} x - 起始X坐标
     * @param {number} y - 起始Y坐标
     * @param {number} width - 宽度
     * @param {number} height - 高度
     * @returns {CanvasProcessor} 当前处理器实例
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
     * @param {number} width - 目标宽度
     * @param {number} height - 目标高度
     * @param {Object} options - 选项
     * @param {string} [options.fit='contain'] - 适应方式
     * @param {string} [options.position='center'] - 位置
     * @returns {CanvasProcessor} 当前处理器实例
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
     * @param {number} angle - 旋转角度（度）
     * @returns {CanvasProcessor} 当前处理器实例
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
     * 执行处理并转换为Image对象
     * @param {Object} options - 选项
     * @param {string} [options.type='image/png'] - 图像类型
     * @param {number} [options.quality=1] - 图像质量
     * @returns {Promise<HTMLImageElement>} 图像元素
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

    /**
     * 执行处理并返回Canvas元素
     * @returns {Promise<HTMLCanvasElement>} Canvas元素
     */
    async toCanvas() {
        await this._process();
        return this.canvas;
    }

    /**
     * 执行处理并转换为Blob对象
     * @param {Object} options - 选项
     * @param {string} [options.type='image/png'] - 图像类型
     * @param {number} [options.quality=1] - 图像质量
     * @returns {Promise<Blob>} Blob对象
     */
    async toBlob(options = {}) {
        const { type = 'image/png', quality = 1 } = options;
        await this._process();
        return new Promise((resolve) => {
            this.canvas.toBlob(resolve, type, quality);
        });
    }

    /**
     * 执行所有操作
     * @private
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

    /**
     * 释放资源
     */
    dispose() {
        this.operations = [];
        this.canvas = null;
    }

    /**
     * 导出为图片文件
     * @param {string} [filename='image.png'] - 文件名
     * @param {Object} options - 选项
     * @param {string} [options.type='image/png'] - 图像类型
     * @param {number} [options.quality=1] - 图像质量
     * @returns {Promise<File>} 文件对象
     */
    async toFile(filename = 'image.png', options = {}) {
        const { type = 'image/png', quality = 1 } = options;
        const blob = await this.toBlob({ type, quality });
        return new File([blob], filename, { type });
    }

    /**
     * 导出为 base64 字符串
     * @param {Object} options - 选项
     * @param {string} [options.type='image/png'] - 图像类型
     * @param {number} [options.quality=1] - 图像质量
     * @returns {Promise<string>} base64 字符串
     */
    async toDataURL(options = {}) {
        const { type = 'image/png', quality = 1 } = options;
        await this._process();
        return this.canvas.toDataURL(type, quality);
    }

    /**
     * 下载图片到本地
     * @param {string} [filename='image.png'] - 文件名
     * @param {Object} options - 选项
     * @param {string} [options.type='image/png'] - 图像类型
     * @param {number} [options.quality=1] - 图像质量
     * @returns {Promise<void>}
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