export class GPUContext {
    constructor() {
        this.device = null;
        this.format = null;
    }

    async init() {
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) throw new Error('No appropriate GPUAdapter found');

        this.device = await adapter.requestDevice();
        if (!this.device) throw new Error('Unable to create GPUDevice');

        this.format = navigator.gpu.getPreferredCanvasFormat();
        return this;
    }

    createTexture(width, height, label = 'Unnamed Texture') {
        const usage = 
            GPUTextureUsage.TEXTURE_BINDING |    // 用于采样
            GPUTextureUsage.COPY_DST |          // 用于复制目标
            GPUTextureUsage.COPY_SRC |          // 用于复制源
            GPUTextureUsage.RENDER_ATTACHMENT;   // 用于渲染附件

        return this.device.createTexture({
            label,
            size: [width, height],
            format: this.format,
            usage,
            sampleCount: 1,
            mipLevelCount: 1,
            dimension: '2d'
        });
    }
} 