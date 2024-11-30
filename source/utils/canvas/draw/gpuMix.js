import { requireWGSLCode } from "../../module/wgslModule.js";
const adapter = await navigator.gpu.requestAdapter();
// 请求设备时设置限制
const device = await adapter.requestDevice({
    requiredLimits: {
        maxBufferSize: 256 * 1024 * 1024, // 256MB
        maxStorageBufferBindingSize: 128 * 1024 * 1024, // 128MB
    }
});
const wgsl = await requireWGSLCode(import.meta.resolve('./mixer.wgsl'))
class TextureManager {
    constructor() {
        this.device = device;
        this.textureCache = new Map();
        this.maxCacheSize = 100; // 可根据需要调整缓存大小
    }

    // 创建纹理
    createTexture(width, height, options = {}) {
        const {
            format = 'rgba8unorm',
            usage = GPUTextureUsage.TEXTURE_BINDING | 
                    GPUTextureUsage.COPY_DST | 
                    GPUTextureUsage.RENDER_ATTACHMENT,
            label = ''
        } = options;

        return this.device.createTexture({
            size: { width, height, depthOrArrayLayers: 1 },
            format,
            usage,
            label
        });
    }

    // 从 ImageData 创建纹理
    async createTextureFromImageData(imageData, options = {}) {
        const { width, height } = imageData;
        const texture = this.createTexture(width, height, options);

        this.device.queue.writeTexture(
            { texture },
            imageData.data,
            { bytesPerRow: width * 4 },
            { width, height }
        );

        return texture;
    }

    // 从 Canvas/Image/ImageBitmap 创建纹理
    async createTextureFromImage(source, options = {}) {
        const texture = this.createTexture(
            source.width,
            source.height,
            options
        );

        this.device.queue.copyExternalImageToTexture(
            { source },
            { texture },
            { width: source.width, height: source.height }
        );

        return texture;
    }

    // 清理纹理
    destroyTexture(texture) {
        if (texture) {
            texture.destroy();
        }
    }
}

// 在 WebGPUMixer 类的开始添加 BufferPool 类
class BufferPool {
    constructor(device, maxSize = 10) {
        this.device = device;
        this.pools = new Map();
        this.maxSize = maxSize;
    }

    getBuffer(size, usage) {
        const key = `${size}_${usage}`;
        if (!this.pools.has(key)) {
            this.pools.set(key, []);
        }
        const pool = this.pools.get(key);
        if (pool.length > 0) {
            const buffer = pool.pop();
            // 如果是需要映射的缓冲区，确保它处于映射状态
            if (usage & GPUBufferUsage.MAP_WRITE) {
                return this.device.createBuffer({
                    size,
                    usage,
                    mappedAtCreation: true
                });
            }
            return buffer;
        }
        return this.createBuffer(size, usage);
    }

    returnBuffer(buffer) {
        // 如果缓冲区是可映射的，我们不重用它
        if (buffer.usage & GPUBufferUsage.MAP_WRITE) {
            buffer.destroy();
            return;
        }

        const key = `${buffer.size}_${buffer.usage}`;
        const pool = this.pools.get(key) || [];
        if (pool.length < this.maxSize) {
            pool.push(buffer);
            this.pools.set(key, pool);
        } else {
            buffer.destroy();
        }
    }

    createBuffer(size, usage) {
        return this.device.createBuffer({
            size,
            usage,
            // 如果是需要映射的缓冲区，创建时就进行映射
            mappedAtCreation: !!(usage & GPUBufferUsage.MAP_WRITE)
        });
    }

    clear() {
        for (const pool of this.pools.values()) {
            pool.forEach(buffer => buffer.destroy());
        }
        this.pools.clear();
    }
}

export class WebGPUMixer {
    constructor() {
        this.device = device;
        this.pipeline = null;
        this.bindGroupLayout = null;
        this.sampler = null;
        this.initialized = false;
        this.paramsBuffer = null;

        // 添加资源池
        this.texturePool = new Map();
        this.bufferPool = null; // 将在 init 方法中初始化

        // 初始化离屏canvas
        this.offscreenCanvas = new OffscreenCanvas(1, 1);
        this.offscreenCtx = this.offscreenCanvas.getContext('2d', {
            willReadFrequently: true
        });

        // 预分配固定大小的缓冲区
        this.stagingBuffer = null;
        this.maxTextureSize = 2048; // 最大纹理尺寸
        this.initStagingBuffer();

        // 添加 WebGPU canvas 和 context
        this.gpuCanvas = new OffscreenCanvas(1, 1);
        this.gpuContext = null;

        // 添加新的参数
        this.pigmentParams = {
            scatteringCoeff: 10.0,
            thicknessScale: 1.5,
            alphaExponent: 1.8,
            ditherStrength: 0.02,
            maxOpacity: 0.1,
            canvasWeight: 0.3,
            viscosity: 0.7,    // 新增: 稠度参数 (0-1)
            dragStrength: 0.4  // 新增: 拖动强度
        
        };

        this.paramUpdateQueue = Promise.resolve(); // 添加参数更新队列
        this.textureCache = new Map(); // 添加纹理缓存
        this.pendingOperations = Promise.resolve(); // 添加操作队列


    }

    initStagingBuffer() {
        const maxSize = this.maxTextureSize * this.maxTextureSize * 4;
        const alignedSize = Math.ceil(maxSize / 256) * 256;

        this.stagingBuffer = this.device.createBuffer({
            size: alignedSize,
            usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.MAP_WRITE,
            mappedAtCreation: true
        });
    }

    async init() {
        if (!navigator.gpu) {
            throw new Error('WebGPU not supported');
        }

        try {
            // 初始化 WebGPU context
            this.textureManager = new TextureManager();

            this.gpuContext = this.gpuCanvas.getContext('webgpu');
            if (!this.gpuContext) {
                throw new Error('Failed to get WebGPU context');
            }

            // 配置 context
            this.gpuContext.configure({
                device: this.device,
                format: 'bgra8unorm',
                usage: GPUTextureUsage.RENDER_ATTACHMENT |
                    GPUTextureUsage.COPY_SRC |
                    GPUTextureUsage.COPY_DST,
                alphaMode: 'premultiplied'
            });

            if (!adapter) {
                throw new Error('No adapter found');
            }


            // 创建采样器
            this.sampler = this.device.createSampler({
                magFilter: 'linear',
                minFilter: 'linear',
                mipmapFilter: 'linear',
            });
            const shader = this.device.createShaderModule({code:wgsl})
            // 首先创建绑定组布局
            this.bindGroupLayout = this.device.createBindGroupLayout({
                entries: [
                    {
                        binding: 0,
                        visibility: GPUShaderStage.FRAGMENT,
                        texture: { sampleType: 'float' }
                    },
                    {
                        binding: 1,
                        visibility: GPUShaderStage.FRAGMENT,
                        texture: { sampleType: 'float' }
                    },
                    {
                        binding: 2,
                        visibility: GPUShaderStage.FRAGMENT,
                        sampler: { type: 'filtering' }
                    },
                    {
                        binding: 3,
                        visibility: GPUShaderStage.FRAGMENT,
                        buffer: {
                            type: 'uniform',
                            minBindingSize: 32
                        }
                    }
                ]
            });

            // 创建管线布局
            this.pipelineLayout = this.device.createPipelineLayout({
                bindGroupLayouts: [this.bindGroupLayout]
            });

            // 修改渲染管线的创建配置
            this.pipeline = this.device.createRenderPipeline({
                layout: this.pipelineLayout,
                vertex: {
                    module: shader,
                    entryPoint: 'vertexMain',
                    buffers: [{
                        arrayStride: 8,
                        attributes: [{
                            shaderLocation: 0,
                            offset: 0,
                            format: 'float32x2'
                        }]
                    }]
                },
                fragment: {
                    module: shader,
                    entryPoint: 'fragmentMain',
                    targets: [{
                        format: 'bgra8unorm',
                        // 修改混合模式配置
                        blend: {
                            color: {
                                srcFactor: 'src-alpha',
                                dstFactor: 'one-minus-src-alpha',
                                operation: 'add'
                            },
                            alpha: {
                                srcFactor: 'one',
                                dstFactor: 'one-minus-src-alpha',
                                operation: 'add'
                            }
                        }
                    }],
                },
                primitive: {
                    topology: 'triangle-list',
                    cullMode: 'none'
                },
                // 确保多重采样配置正确
                multisample: {
                    count: 1
                }
            });

            // 确保在使用管线之前等待其完成创建
            await this.device.queue.onSubmittedWorkDone();

            // 创建固定的顶点缓冲区
            const vertices = new Float32Array([
                -1, -1,
                1, -1,
                1, 1,
                -1, -1,
                1, 1,
                -1, 1
            ]);

            this.vertexBuffer = this.device.createBuffer({
                size: vertices.byteLength,
                usage: GPUBufferUsage.VERTEX,
                mappedAtCreation: true
            });
            new Float32Array(this.vertexBuffer.getMappedRange()).set(vertices);
            this.vertexBuffer.unmap();

            this.initialized = true;

            // 添加设备丢失处理
            this.device.lost.then((info) => {
                console.error('WebGPU device lost:', info);
                this.handleDeviceLost();
            });

            // 创建参数缓冲区 - 修改使用标志
            this.paramsBuffer = this.device.createBuffer({
                size: 32, // 6个32位浮点数
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            });

            // 创建暂存缓冲区 - 用于写入数据
            this.stagingBuffer = this.device.createBuffer({
                size: 32,
                usage: GPUBufferUsage.MAP_WRITE | GPUBufferUsage.COPY_SRC,
            });

            // 更新参数缓冲区
            this.updateParams(this.pigmentParams);

            this.bufferPool = new BufferPool(this.device);

        } catch (error) {
            console.error('WebGPU initialization failed:', error);
            throw error;
        }
    }

    // 资源管理方法
    getTextureFromPool(width, height) {
        // 确保尺寸有效
        width = Math.max(1, Math.ceil(width));
        height = Math.max(1, Math.ceil(height));

        const key = `${width}x${height}`;
        if (!this.texturePool.has(key)) {
            this.texturePool.set(key, []);
        }

        const pool = this.texturePool.get(key);
        return pool.pop() || this.createNewTexture(width, height);
    }

    returnTextureToPool(texture, width, height) {
        const key = `${width}x${height}`;
        const pool = this.texturePool.get(key) || [];

        if (pool.length < this.maxPoolSize) {
            pool.push(texture);
            this.texturePool.set(key, pool);
        } else {
            texture.destroy();
        }
    }

    createNewTexture(width, height) {
        // 确保尺寸有效
        width = Math.max(1, Math.ceil(width));
        height = Math.max(1, Math.ceil(height));

        return this.device.createTexture({
            size: {
                width,
                height,
                depthOrArrayLayers: 1
            },
            format: 'bgra8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_DST |
                GPUTextureUsage.RENDER_ATTACHMENT |
                GPUTextureUsage.COPY_SRC
        });
    }

    // 优化后的混合方法
    //brushImage中有bitmap和buffer数据
    async mixColors(ctx, brushImage, x, y, width, height) {
        if (!this.initialized) {
            await this.init();
        }
        try {
            width = Math.max(1, Math.ceil(width));
            height = Math.max(1, Math.ceil(height));
            if (this.gpuCanvas.width !== width || this.gpuCanvas.height !== height) {
                this.gpuCanvas.width = width;
                this.gpuCanvas.height = height;
                this.offscreenCanvas.width = width;
                this.offscreenCanvas.height = height;
            }
            this.offscreenCtx.clearRect(0, 0, width, height);
            this.offscreenCtx.drawImage(brushImage, 0, 0, width, height);
            const commandEncoder = this.device.createCommandEncoder();
            const [brushTexture, canvasTexture] = await Promise.all([
                this.textureManager.createTextureFromImageData(
                    this.offscreenCtx.getImageData(0, 0, width, height)
                ),
                this.textureManager.createTextureFromImageData(
                    ctx.getImageData(x, y, width, height)
                )
            ]);
            const bindGroup = this.device.createBindGroup({
                layout: this.bindGroupLayout,
                entries: [
                    {
                        binding: 0,
                        resource: brushTexture.createView()
                    },
                    {
                        binding: 1,
                        resource: canvasTexture.createView()
                    },
                    {
                        binding: 2,
                        resource: this.sampler
                    },
                    {
                        binding: 3,
                        resource: {
                            buffer: this.paramsBuffer,
                            offset: 0,
                            size: 32
                        }
                    }
                ]
            });
            await this.updateParams({
                scatteringCoeff: 10.0,       // 散射系数
                thicknessScale: 0.9,         // 略微降低厚度缩放
                alphaExponent: 1.5,          // alpha 指数
                ditherStrength: 0.001,       // 抖动强度
                maxOpacity: 1,            // 最大不透明度（水彩效果）
                canvasWeight: 2,           // 画布颜色权重增加 20%
                viscosity: 1,     // 较高的稠度
                dragStrength: 0.5   // 中等的拖动强度
            
            });
            const renderPassDescriptor = {
                colorAttachments: [{
                    view: this.gpuContext.getCurrentTexture().createView(),
                    clearValue: { r: 0, g: 0, b: 0, a: 0 },
                    loadOp: 'clear',
                    storeOp: 'store'
                }]
            };
            const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
            passEncoder.setPipeline(this.pipeline);
            passEncoder.setBindGroup(0, bindGroup);
            passEncoder.setVertexBuffer(0, this.vertexBuffer);
            passEncoder.draw(6, 1, 0, 0);
            passEncoder.end();
            this.device.queue.submit([commandEncoder.finish()]);
            this.device.queue.onSubmittedWorkDone();
            const bitmap = this.gpuCanvas.transferToImageBitmap();
            ctx.drawImage(bitmap, x, y);
        } catch (error) {
            console.error('WebGPU operation failed:', error);
        }
    }
    // 设备丢失处理
    async handleDeviceLost() {
        this.initialized = false;
        this.clearResources();
        try {
            await this.init();
        } catch (error) {
            console.error('Failed to reinitialize WebGPU:', error);
        }
    }
    clearResources() {
        // 理纹理池
        for (const pool of this.texturePool.values()) {
            pool.forEach(texture => texture.destroy());
        }
        this.texturePool.clear();
        if (this.vertexBuffer) {
            this.vertexBuffer.destroy();
            this.vertexBuffer = null;
        }
    }
    destroy() {
        this.clearResources();
        this.device = null;
        this.initialized = false;
        if (this.bufferPool) {
            this.bufferPool.clear();
            this.bufferPool = null;
        }
    }
    createTextureFromBitmap(bitmap) {
        const texture = this.device.createTexture({
            size: {
                width: bitmap.width,
                height: bitmap.height,
                depthOrArrayLayers: 1
            },
            format: 'bgra8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_DST |
                GPUTextureUsage.RENDER_ATTACHMENT |
                GPUTextureUsage.COPY_SRC
        });

        this.device.queue.copyExternalImageToTexture(
            { source: bitmap },
            { texture },
            { width: bitmap.width, height: bitmap.height, depthOrArrayLayers: 1 }
        );
        return texture;
    }
    async updateParams(params) {
        this.paramUpdateQueue = this.paramUpdateQueue.then(async () => {
            try {
                // 更新存储的参数
                Object.assign(this.pigmentParams, params);
                const paramArray = new Float32Array([
                    this.pigmentParams.scatteringCoeff,
                    this.pigmentParams.thicknessScale,
                    this.pigmentParams.alphaExponent,
                    this.pigmentParams.ditherStrength,
                    this.pigmentParams.maxOpacity,
                    this.pigmentParams.canvasWeight
                ]);
                this.device.queue.writeBuffer(
                    this.paramsBuffer,
                    0,
                    paramArray.buffer,
                    paramArray.byteOffset,
                    paramArray.byteLength
                );
            } catch (error) {
                console.error('Failed to update parameters:', error);
            }
        });
        await this.paramUpdateQueue;
    }
    smoothstep(edge0, edge1, x) {
        x = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
        return x * x * (3 - 2 * x);
    }
    lerp(a, b, t) {
        return a + (b - a) * t;
    }
}

// MixerPool 类管理多个 WebGPUMixer 实例
class MixerPool {
    constructor(poolSize = 3) { // 默认创建3个混合器
        this.mixers = [];
        this.currentIndex = 0;
        this.poolSize = poolSize;
        this.initialized = false;
        this.initPromise = this.initialize();
    }

    async initialize() {
        try {
            // 并行初始化所有混合器
            const initPromises = Array(this.poolSize).fill(0).map(() => {
                const mixer = new WebGPUMixer();
                this.mixers.push(mixer);
                return mixer.init();
            });

            await Promise.all(initPromises);
            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize mixer pool:', error);
            throw error;
        }
    }

    // 获取下一个可用的混合器
    getNextMixer() {
        const mixer = this.mixers[this.currentIndex];
        this.currentIndex = (this.currentIndex + 1) % this.poolSize;
        return mixer;
    }

    // 代理方法：混色操作
    async mixColors(ctx, brushImage, x, y, width, height) {
        if (!this.initialized) {
            await this.initPromise;
        }

        const mixer = this.getNextMixer();
        return mixer.mixColors(ctx, brushImage, x, y, width, height);
    }

    // 清理所有资源
    destroy() {
        this.mixers.forEach(mixer => mixer.destroy());
        this.mixers = [];
        this.initialized = false;
    }
}

// 创建代理对象
class MixerProxy {
    constructor() {
        // 根据设备性能确定池大小
        const poolSize = this.determineOptimalPoolSize();
        this.pool = new MixerPool(poolSize);
    }

    // 根据设备性能确定最佳池大小
    determineOptimalPoolSize() {
        const hardwareConcurrency = navigator.hardwareConcurrency || 4;
        // 使用处理器核心数的一半作为混合器数量，但不少于2个，不多于6个
        return hardwareConcurrency
    }

    // 代理混色方法
    async mixColors(ctx, brushImage, x, y, width, height) {
        return this.pool.mixColors(ctx, brushImage, x, y, width, height);
    }

    // 代理销毁方法
    destroy() {
        return this.pool.destroy();
    }
}

// 导出单例代理对象
export const mixer = new MixerProxy();