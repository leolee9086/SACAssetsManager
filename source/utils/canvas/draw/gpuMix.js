const adapter = await navigator.gpu.requestAdapter();
// 请求设备时设置限制
const device = await adapter.requestDevice({
    requiredLimits: {
        maxBufferSize: 256 * 1024 * 1024, // 256MB
        maxStorageBufferBindingSize: 128 * 1024 * 1024, // 128MB
    }
});

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
        this.bufferPool = new Map();
        this.maxPoolSize = 10; // 限制池大小

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
            thicknessScale: 1.0,
            alphaExponent: 1.5,
            ditherStrength: 0.001
        };

        this.paramUpdateQueue = Promise.resolve(); // 添加参数更新队列
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

            // 创建着色器
            const shader = this.device.createShaderModule({
                code: `
                // 常量定义
                const PI: f32 = 3.14159265359;
                const EPSILON: f32 = 0.0001;

                // 结构体定义
                struct VertexOutput {
                    @builtin(position) position: vec4f,
                    @location(0) texCoord: vec2f,
                }

                struct KMCoefficients {
                    K: vec3f,  // 吸收系数
                    S: vec3f   // 散射系数
                }

                struct PigmentParams {
                    scatteringCoeff: f32,    // 散射系数基准值
                    thicknessScale: f32,     // 厚度缩放因子
                    alphaExponent: f32,      // alpha 通道指数
                    ditherStrength: f32,     // 抖动强度
                    maxOpacity: f32,         // 最大不透明度
                    canvasWeight: f32        // 画布颜色权重
                }

                // 绑定组声明
                @group(0) @binding(0) var inputTexture: texture_2d<f32>;
                @group(0) @binding(1) var outputTexture: texture_2d<f32>;
                @group(0) @binding(2) var textureSampler: sampler;
                @group(0) @binding(3) var<uniform> params: PigmentParams;

                // 顶点着色器
                @vertex
                fn vertexMain(@location(0) position: vec2f) -> VertexOutput {
                    var output: VertexOutput;
                    output.position = vec4f(position, 0.0, 1.0);
                    output.texCoord = position * 0.5 + 0.5;
                    return output;
                }

                // 色彩空间转换函数
                fn sRGBToLinear(srgb: vec3f) -> vec3f {
                    let cutoff = vec3f(0.04045);
                    let slope = vec3f(1.0 / 12.92);
                    let a = vec3f(0.055);
                    let gamma = vec3f(2.4);
                    let scale = vec3f(1.0 / 1.055);
                    
                    return select(
                        pow((srgb + a) * scale, gamma),
                        srgb * slope,
                        srgb <= cutoff
                    );
                }

                fn linearToSRGB(linear: vec3f) -> vec3f {
                    let cutoff = vec3f(0.0031308);
                    let slope = vec3f(12.92);
                    let a = vec3f(0.055);
                    let gamma = vec3f(1.0 / 2.4);
                    
                    return select(
                        (1.0 + a) * pow(linear, gamma) - a,
                        linear * slope,
                        linear <= cutoff
                    );
                }

                // 改进的 RGB 到 KM 系数转换
                fn RGBToKM(color: vec3f, S: vec3f) -> KMCoefficients {
                    let R = clamp(color, vec3f(EPSILON), vec3f(1.0 - EPSILON));
                    let K_over_S = pow(1.0 - R, vec3f(2.0)) / (2.0 * R);
                    let K = K_over_S * S;
                    
                    return KMCoefficients(K, S);
                }

                // 改进的 KM 系数到 RGB 转换
                fn KMToRGB(km: KMCoefficients) -> vec3f {
                    let K_over_S = km.K / km.S;
                    let a = (1.0 + K_over_S);
                    let root = sqrt(max(a * a - 1.0, vec3f(0.0)));
                    let R = (a - root) / (a + root);
                    
                    return clamp(R, vec3f(0.0), vec3f(1.0));
                }

                // 添加 alpha 混合函数
                fn blendAlpha(a1: f32, a2: f32) -> f32 {
                    // Porter-Duff alpha 合成
                    return a1 + a2 * (1.0 - a1);
                }

                // 改进的颜料混合函数
                fn mixPigmentsKM(color1: vec4f, color2: vec4f, params: PigmentParams) -> vec4f {
                    // 转换到线性空间
                    let c1 = sRGBToLinear(color1.rgb);
                    let c2 = sRGBToLinear(color2.rgb);
                    
                    // 为每个颜色通道调整散射系数
                    let S = vec3f(
                        params.scatteringCoeff * 1.0,  // Red
                        params.scatteringCoeff * 1.2,  // Green
                        params.scatteringCoeff * 1.4   // Blue
                    );
                    
                    // 转换为 KM 系数
                    let km1 = RGBToKM(c1, S);
                    let km2 = RGBToKM(c2, S);
                    
                    // 调整 alpha 和混合权重
                    let alpha = min(color1.a, params.maxOpacity);  // 限制最大不透明度
                    let brushWeight = pow(alpha, params.alphaExponent);
                    
                    // 调整画布权重
                    let canvasWeight = 1.0 + params.canvasWeight;  // 增加画布颜色的影响
                    let thickness = brushWeight * params.thicknessScale;
                    var t1 = thickness;
                    var t2 = (1.0 - thickness) * canvasWeight;
                    let total = t1 + t2;
                    
                    // 归一化权重
                    t1 = t1 / total;
                    t2 = t2 / total;
                    
                    // 使用对数空间混合以获得更准确的颜料混合效果
                    let mixed_km = KMCoefficients(
                        exp(log(km1.K + vec3f(1.0)) * t1 + 
                            log(km2.K + vec3f(1.0)) * t2) - vec3f(1.0),
                        exp(log(km1.S + vec3f(1.0)) * t1 + 
                            log(km2.S + vec3f(1.0)) * t2) - vec3f(1.0)
                    );
                    
                    // 转换回 RGB
                    let mixed_linear = KMToRGB(mixed_km);
                    let mixed_srgb = linearToSRGB(mixed_linear);
                    
                    // 计算最终的 alpha 值，考虑最大不透明度
                    let final_alpha = min(blendAlpha(alpha, color2.a), params.maxOpacity);
                    
                    return vec4f(mixed_srgb, final_alpha);
                }

                // 改进的色彩校正函数
                fn correctColor(mixed: vec4f, target_alpha: f32) -> vec4f {
                    if (target_alpha < EPSILON) {
                        return vec4f(0.0);
                    }
                    
                    var adjusted = mixed.rgb;
                    let luminance = dot(adjusted, vec3f(0.299, 0.587, 0.114));
                    
                    // 保持高亮度颜色的细微差异
                    if (luminance > 0.85) {
                        let preserveFactor = 1.0 - pow(luminance - 0.85, 2.0);
                        adjusted = mix(adjusted, mixed.rgb, preserveFactor);
                    }
                    
                    // 改进的透明度处理
                    if (target_alpha > EPSILON) {
                        let alphaFactor = smoothstep(0.0, 0.15, target_alpha);
                        adjusted = mix(adjusted, mixed.rgb, alphaFactor);
                    }
                    
                    return vec4f(adjusted, target_alpha);
                }

                // 添加噪声函数
                fn hash2D(p: vec2f) -> f32 {
                    let k = vec2f(0.3183099, 0.3678794);
                    let kp = p * k;
                    return fract(16.0 * k.x * k.y * fract(kp.x + kp.y));
                }

                // 添加抖动函数
                fn getDither(pos: vec2f, strength: f32) -> f32 {
                    // 使用像素位置生成伪随机值
                    let rand = hash2D(pos);
                    // 将随机值映射到 [-strength, strength] 范围
                    return (rand * 2.0 - 1.0) * strength;
                }

                // 片段着色器
                @fragment
                fn fragmentMain(
                    @location(0) texCoord: vec2f,
                    @builtin(position) fragCoord: vec4f,
                ) -> @location(0) vec4f {
                    let brush = textureSample(inputTexture, textureSampler, texCoord);
                    let canvas = textureSample(outputTexture, textureSampler, texCoord);
                    
                    var mixed = mixPigmentsKM(brush, canvas, params);
                    mixed = correctColor(mixed, mixed.a);
                    
                    // 微弱的抖动以减少色带
                    let dither = getDither(fragCoord.xy, params.ditherStrength * 0.25);
                    
                    return vec4f(mixed.rgb + vec3f(dither), mixed.a);
                }
                `
            });

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
                            minBindingSize: 24
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
                size: 24, // 6个32位浮点数
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            });

            // 创建暂存缓冲区 - 用于写入数据
            this.stagingBuffer = this.device.createBuffer({
                size: 24,
                usage: GPUBufferUsage.MAP_WRITE | GPUBufferUsage.COPY_SRC,
            });

            // 更新参数缓冲区
            this.updateParams(this.pigmentParams);

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
    async mixColors(ctx, brushImage, x, y, width, height) {
        if (!this.initialized) {
            await this.init();
        }

        try {
            // 确保尺寸为正整数
            width = Math.max(1, Math.ceil(width));
            height = Math.max(1, Math.ceil(height));

            // 调整 GPU canvas 大小
            if (this.gpuCanvas.width !== width || this.gpuCanvas.height !== height) {
                this.gpuCanvas.width = width;
                this.gpuCanvas.height = height;
                this.offscreenCanvas.width = width;
                this.offscreenCanvas.height = height;
            }

            // 在离屏canvas上绘制笔刷图像
            this.offscreenCtx.clearRect(0, 0, width, height);
            this.offscreenCtx.drawImage(brushImage, 0, 0, width, height);
            const imageData = this.offscreenCtx.getImageData(0, 0, width, height);

            // 计算对齐的行跨度
            const bytesPerRow = Math.ceil((width * 4) / 256) * 256;

            // 创建源数据缓冲区
            const sourceBuffer = this.device.createBuffer({
                size: bytesPerRow * height,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
            });

            const stagingBuffer = this.device.createBuffer({
                size: bytesPerRow * height,
                usage: GPUBufferUsage.MAP_WRITE | GPUBufferUsage.COPY_SRC,
                mappedAtCreation: true
            });

            // 写入数据到暂存缓冲区
            const arrayBuffer = stagingBuffer.getMappedRange();
            const sourceArray = new Uint8Array(arrayBuffer);
            for (let y = 0; y < height; y++) {
                const sourceStart = y * width * 4;
                const destStart = y * bytesPerRow;
                for (let x = 0; x < width; x++) {
                    const sourceOffset = sourceStart + x * 4;
                    const destOffset = destStart + x * 4;
                    // 转换为 BGRA 顺序
                    sourceArray[destOffset] = imageData.data[sourceOffset + 2]; // B
                    sourceArray[destOffset + 1] = imageData.data[sourceOffset + 1]; // G
                    sourceArray[destOffset + 2] = imageData.data[sourceOffset]; // R
                    sourceArray[destOffset + 3] = imageData.data[sourceOffset + 3]; // A
                }
            }
            stagingBuffer.unmap();

            // 从暂存缓冲区复制到源缓冲区
            const copyCommandEncoder = this.device.createCommandEncoder();
            copyCommandEncoder.copyBufferToBuffer(
                stagingBuffer,
                0,
                sourceBuffer,
                0,
                bytesPerRow * height
            );
            this.device.queue.submit([copyCommandEncoder.finish()]);

            // 创建理时使用 bgra8unorm 格式
            const texture = this.device.createTexture({
                size: { width, height, depthOrArrayLayers: 1 },
                format: 'bgra8unorm',
                usage: GPUTextureUsage.TEXTURE_BINDING |
                    GPUTextureUsage.COPY_DST |
                    GPUTextureUsage.RENDER_ATTACHMENT |
                    GPUTextureUsage.COPY_SRC
            });

            // 复制数据到纹理
            const commandEncoder = this.device.createCommandEncoder();
            commandEncoder.copyBufferToTexture(
                {
                    buffer: sourceBuffer,
                    bytesPerRow,
                    rowsPerImage: height,
                },
                {
                    texture: texture,
                },
                {
                    width,
                    height,
                    depthOrArrayLayers: 1,
                }
            );

            // 使用与管线布局匹配的绑定组
            const bindGroup = this.device.createBindGroup({
                layout: this.bindGroupLayout,
                entries: [
                    {
                        binding: 0,
                        resource: texture.createView()
                    },
                    {
                        binding: 1,
                        resource: texture.createView()
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
                            size: 24
                        }
                    }
                ]
            });

            // 更新参数
            await this.updateParams({
                scatteringCoeff: 10.0,       // 散射系数
                thicknessScale: 0.9,         // 略微降低厚度缩放
                alphaExponent: 1.5,          // alpha 指数
                ditherStrength: 0.001,       // 抖动强度
                maxOpacity: 0.95,            // 最大不透明度（水彩效果）
                canvasWeight: 0.2            // 画布颜色权重增加 20%
            });

            // 设置渲染通道
            const renderPassDescriptor = {
                colorAttachments: [{
                    view: this.gpuContext.getCurrentTexture().createView(),
                    clearValue: { r: 0, g: 0, b: 0, a: 0 },
                    loadOp: 'clear',
                    storeOp: 'store'
                }]
            };

            // 确保在使用管线之前检查其是否有效
            if (!this.pipeline) {
                throw new Error('Pipeline not initialized');
            }

            const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
            passEncoder.setPipeline(this.pipeline);
            passEncoder.setBindGroup(0, bindGroup);
            passEncoder.setVertexBuffer(0, this.vertexBuffer);
            passEncoder.draw(6, 1, 0, 0);
            passEncoder.end();

            // 提交命令
            this.device.queue.submit([commandEncoder.finish()]);

            // 等待 GPU 完成
            await this.device.queue.onSubmittedWorkDone();

            // 清理临时缓冲区
            stagingBuffer.destroy();
            sourceBuffer.destroy();

            // 从 GPU canvas 复制到 2D context
            ctx.drawImage(this.gpuCanvas, x, y);

        } catch (error) {
            console.error('WebGPU operation failed:', error);
            this.fallbackMixColors(ctx, brushImage, x, y, width, height);
        }
    }

    // 添加降级实现
    fallbackMixColors(ctx, brushImage, x, y, width, height) {
        // 创建临时画布进行混合计算
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');

        // 获取当前画布内容
        const currentContent = ctx.getImageData(x, y, width, height);
        tempCtx.putImageData(currentContent, 0, 0);

        // 获取笔刷图像数据
        tempCtx.drawImage(brushImage, 0, 0);
        const brushData = tempCtx.getImageData(0, 0, width, height);

        // 手动计算混合结果
        const result = new ImageData(width, height);
        for (let i = 0; i < brushData.data.length; i += 4) {
            const brush = {
                r: brushData.data[i] / 255,
                g: brushData.data[i + 1] / 255,
                b: brushData.data[i + 2] / 255,
                a: brushData.data[i + 3] / 255
            };

            const canvas = {
                r: currentContent.data[i] / 255,
                g: currentContent.data[i + 1] / 255,
                b: currentContent.data[i + 2] / 255,
                a: currentContent.data[i + 3] / 255
            };

            // 简化的颜料混合
            const mixed = this.simpleMixColors(brush, canvas);

            // 计算所需的颜色值
            const required = this.calculateRequiredColor(mixed, canvas);

            result.data[i] = required.r * 255;
            result.data[i + 1] = required.g * 255;
            result.data[i + 2] = required.b * 255;
            result.data[i + 3] = required.a * 255;
        }

        ctx.putImageData(result, x, y);
    }

    // 简化的颜料混合算法（用于降级实现）
    simpleMixColors(color1, color2) {
        const t = color1.a;
        return {
            r: color1.r * t + color2.r * (1 - t),
            g: color1.g * t + color2.g * (1 - t),
            b: color1.b * t + color2.b * (1 - t),
            a: color1.a + color2.a * (1 - color1.a)
        };
    }

    calculateRequiredColor(target, background) {
        if (target.a < 0.001) return target;

        // 计算所需的基础颜色值
        const required = {
            r: (target.r - background.r * (1 - target.a)) / target.a,
            g: (target.g - background.g * (1 - target.a)) / target.a,
            b: (target.b - background.b * (1 - target.a)) / target.a,
            a: target.a
        };

        // 应用平滑过渡
        const smoothness = this.smoothstep(0, 0.3, target.a);
        const adjusted = {
            r: this.lerp(target.r, required.r, smoothness),
            g: this.lerp(target.g, required.g, smoothness),
            b: this.lerp(target.b, required.b, smoothness),
            a: target.a
        };

        // 处理浅色和高透明度
        const luminance = 
            0.299 * adjusted.r + 
            0.587 * adjusted.g + 
            0.114 * adjusted.b;
        const saturation = this.smoothstep(0, 0.1, target.a);

        adjusted.r = this.lerp(luminance, adjusted.r, saturation);
        adjusted.g = this.lerp(luminance, adjusted.g, saturation);
        adjusted.b = this.lerp(luminance, adjusted.b, saturation);

        // 裁剪到有效范围
        adjusted.r = Math.max(0, Math.min(1, adjusted.r));
        adjusted.g = Math.max(0, Math.min(1, adjusted.g));
        adjusted.b = Math.max(0, Math.min(1, adjusted.b));

        return adjusted;
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

    // 清理资源
    clearResources() {
        // 理纹理池
        for (const pool of this.texturePool.values()) {
            pool.forEach(texture => texture.destroy());
        }
        this.texturePool.clear();

        // 清理其他资源
        if (this.vertexBuffer) {
            this.vertexBuffer.destroy();
            this.vertexBuffer = null;
        }
    }

    // 析构函数
    destroy() {
        this.clearResources();
        this.device = null;
        this.initialized = false;
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

    // 更新参数方法
    async updateParams(params) {
        // 使用队列确保参数更新的顺序执行
        this.paramUpdateQueue = this.paramUpdateQueue.then(async () => {
            try {
                // 更新存储的参数
                Object.assign(this.pigmentParams, params);

                // 创建新的参数数组
                const paramArray = new Float32Array([
                    this.pigmentParams.scatteringCoeff,
                    this.pigmentParams.thicknessScale,
                    this.pigmentParams.alphaExponent,
                    this.pigmentParams.ditherStrength,
                    this.pigmentParams.maxOpacity,
                    this.pigmentParams.canvasWeight
                ]);

                // 直接使用 writeBuffer 而不是 mapping
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

        // 等待更新完成
        await this.paramUpdateQueue;
    }

    // 添加辅助函数
    smoothstep(edge0, edge1, x) {
        x = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
        return x * x * (3 - 2 * x);
    }

    lerp(a, b, t) {
        return a + (b - a) * t;
    }
}

export const mixer = new WebGPUMixer();
