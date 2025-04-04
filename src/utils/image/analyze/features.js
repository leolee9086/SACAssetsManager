import { webGpuDevice as device } from "../../browser/gpu.js";
export class FeatureExtractor {
    constructor() {
        this.device = device;
        this.initialized = false;
        this.pipelines = {};
        this.features = {
            dehaze: {
                darkChannel: null,
                transmission: null
            },
            local: {
                edges: null
            },
            analysis: null  // 添加分析结果存储
        };
        this.sampler = device.createSampler({
            magFilter: 'linear',
            minFilter: 'linear',
            mipmapFilter: 'linear',
            addressModeU: 'clamp-to-edge',
            addressModeV: 'clamp-to-edge',
            addressModeW: 'clamp-to-edge'
        });
    }

    async init() {
        if (this.initialized) return;

        try {
            this.pipelines = {
                darkChannel: await this.device.createComputePipeline({
                    label: "Dark Channel Pipeline",
                    layout: 'auto',
                    compute: {
                        module: this.device.createShaderModule({
                            label: "Dark Channel Shader",
                            code: /* wgsl */`
                                @group(0) @binding(0) var inputTexture: texture_2d<f32>;
                                @group(0) @binding(1) var outputTexture: texture_storage_2d<rgba8unorm, write>;

                                @compute @workgroup_size(8, 8)
                                fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
                                    let dims = textureDimensions(inputTexture);
                                    let coords = vec2<i32>(global_id.xy);
                                    if (i32(global_id.x) >= i32(dims.x) || i32(global_id.y) >= i32(dims.y)) {
                                        return;
                                    }

                                    let windowSize = 15;  // 增大窗口大小以获取更好的暗通道估计
                                    let halfWindow = windowSize / 2;
                                    
                                    // 获取中心像素的暗通道值
                                    let centerPixel = textureLoad(inputTexture, coords, 0);
                                    var darkValue = min(min(centerPixel.r, centerPixel.g), centerPixel.b);
                                    
                                    // 在窗口内寻找最小值
                                    for(var i = -halfWindow; i <= halfWindow; i++) {
                                        for(var j = -halfWindow; j <= halfWindow; j++) {
                                            let newCoords = vec2<i32>(
                                                clamp(i32(coords.x + i), 0, i32(dims.x - 1)),
                                                clamp(i32(coords.y + j), 0, i32(dims.y - 1))
                                            );
                                            let pixel = textureLoad(inputTexture, newCoords, 0);
                                            darkValue = min(darkValue, min(min(pixel.r, pixel.g), pixel.b));
                                        }
                                    }
                                    
                                    textureStore(outputTexture, coords, 
                                                vec4<f32>(darkValue, darkValue, darkValue, 1.0));
                                }
                            `
                        }),
                        entryPoint: 'main'
                    }
                }),

                transmission: await this.device.createComputePipeline({
                    label: "Transmission Pipeline",
                    layout: 'auto',
                    compute: {
                        module: this.device.createShaderModule({
                            label: "Transmission Shader",
                            code: /* wgsl */`
                                @group(0) @binding(0) var darkChannel: texture_2d<f32>;
                                @group(0) @binding(1) var transmission: texture_storage_2d<rgba8unorm, write>;
                                @group(0) @binding(2) var<uniform> atmosphericLight: vec3<f32>;

                                @compute @workgroup_size(8, 8)
                                fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
                                    let dims = textureDimensions(darkChannel);
                                    let coords = vec2<i32>(global_id.xy);
                                    if (i32(global_id.x) >= i32(dims.x) || i32(global_id.y) >= i32(dims.y)) {
                                        return;
                                    }

                                    let omega = 0.98;  // 增加 omega 值以增强去雾效果
                                    let dark = textureLoad(darkChannel, coords, 0).r;
                                    
                                    // 基于大气散射模型计算透射率
                                    let t = 1.0 - omega * (dark / max(atmosphericLight.r, 
                                        max(atmosphericLight.g, atmosphericLight.b)));
                                    
                                    var smoothedT = t;
                                    var localVariance = 0.0;
                                    var meanT = 0.0;
                                    var count = 0.0;
                                    
                                    // 首先计算局部均值和方差
                                    for(var i = -1; i <= 1; i++) {
                                        for(var j = -1; j <= 1; j++) {
                                            let sampleCoords = vec2<i32>(
                                                clamp(i32(coords.x + i), 0, i32(dims.x - 1)),
                                                clamp(i32(coords.y + j), 0, i32(dims.y - 1))
                                            );
                                            let sampleDark = textureLoad(darkChannel, sampleCoords, 0).r;
                                            let sampleT = 1.0 - omega * (sampleDark / max(atmosphericLight.r,
                                                max(atmosphericLight.g, atmosphericLight.b)));
                                            meanT += sampleT;
                                            count += 1.0;
                                        }
                                    }
                                    meanT /= count;
                                    
                                    // 计算方差
                                    count = 0.0;
                                    for(var i = -1; i <= 1; i++) {
                                        for(var j = -1; j <= 1; j++) {
                                            let sampleCoords = vec2<i32>(
                                                clamp(i32(coords.x + i), 0, i32(dims.x - 1)),
                                                clamp(i32(coords.y + j), 0, i32(dims.y - 1))
                                            );
                                            let sampleDark = textureLoad(darkChannel, sampleCoords, 0).r;
                                            let sampleT = 1.0 - omega * (sampleDark / max(atmosphericLight.r,
                                                max(atmosphericLight.g, atmosphericLight.b)));
                                            localVariance += (sampleT - meanT) * (sampleT - meanT);
                                            count += 1.0;
                                        }
                                    }
                                    localVariance /= count;
                                    
                                    // 基于局部方差动态调整平滑半径
                                    let adaptiveRadius = max(2, min(4, i32(sqrt(localVariance) * 20.0)));
                                    
                                    // 使用自适应半径进行加权平滑
                                    smoothedT = 0.0;
                                    count = 0.0;
                                    for(var i = -adaptiveRadius; i <= adaptiveRadius; i++) {
                                        for(var j = -adaptiveRadius; j <= adaptiveRadius; j++) {
                                            let sampleCoords = vec2<i32>(
                                                clamp(i32(coords.x + i), 0, i32(dims.x - 1)),
                                                clamp(i32(coords.y + j), 0, i32(dims.y - 1))
                                            );
                                            let sampleDark = textureLoad(darkChannel, sampleCoords, 0).r;
                                            let sampleT = 1.0 - omega * (sampleDark / max(atmosphericLight.r,
                                                max(atmosphericLight.g, atmosphericLight.b)));
                                            
                                            // 使用高斯权重
                                            let weight = exp(-0.5 * (f32(i * i + j * j)) / f32(adaptiveRadius * adaptiveRadius));
                                            smoothedT += sampleT * weight;
                                            count += weight;
                                        }
                                    }
                                    
                                    smoothedT /= count;
                                    
                                    // 缩小透射率的范围以增强去雾效果
                                    let finalT = clamp(smoothedT, 0.2, 0.8);  // 修改范围以增强去雾效果
                                    
                                    textureStore(transmission, coords, 
                                                vec4<f32>(finalT, finalT, finalT, 1.0));
                                }
                            `
                        }),
                        entryPoint: 'main'
                    }
                }),

                edges: await this.device.createComputePipeline({
                    label: "Edge Detection Pipeline",
                    layout: 'auto',
                    compute: {
                        module: this.device.createShaderModule({
                            label: "Edge Detection Shader",
                            code: /* wgsl */`
                                @group(0) @binding(0) var input: texture_2d<f32>;
                                @group(0) @binding(1) var edges: texture_storage_2d<rgba8unorm, write>;

                                @compute @workgroup_size(8, 8)
                                fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
                                    let dims = textureDimensions(input);
                                    let coords = vec2<i32>(global_id.xy);
                                    if (i32(global_id.x) >= i32(dims.x) || i32(global_id.y) >= i32(dims.y)) {
                                        return;
                                    }

                                    var gx: f32 = 0.0;
                                    var gy: f32 = 0.0;
                                    
                                    for (var i = -1; i <= 1; i++) {
                                        for (var j = -1; j <= 1; j++) {
                                            let pos = vec2<i32>(
                                                clamp(i32(coords.x + i), 0, i32(dims.x - 1)),
                                                clamp(i32(coords.y + j), 0, i32(dims.y - 1))
                                            );
                                            
                                            let color = textureLoad(input, pos, 0).rgb;
                                            let intensity = dot(color, vec3<f32>(0.299, 0.587, 0.114));
                                            
                                            gx += intensity * f32(i);
                                            gy += intensity * f32(j);
                                        }
                                    }
                                    
                                    let edge = sqrt(gx * gx + gy * gy);
                                    textureStore(edges, coords, vec4<f32>(edge, edge, edge, 1.0));
                                }
                            `
                        }),
                        entryPoint: 'main'
                    }
                }),

                histogram: await this.device.createComputePipeline({
                    label: "Histogram Pipeline",
                    layout: 'auto',
                    compute: {
                        module: this.device.createShaderModule({
                            label: "Histogram Shader",
                            code: /* wgsl */`
                                @group(0) @binding(0) var input: texture_2d<f32>;
                                @group(0) @binding(1) var<storage, read_write> histogram: array<atomic<u32>>;

                                @compute @workgroup_size(8, 8)
                                fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
                                    let dims = textureDimensions(input);
                                    let coords = vec2<i32>(global_id.xy);
                                    if (i32(global_id.x) >= i32(dims.x) || i32(global_id.y) >= i32(dims.y)) {
                                        return;
                                    }

                                    let value = textureLoad(input, coords, 0).r;
                                    let binIndex = u32(value * 255.0);
                                    atomicAdd(&histogram[binIndex], 1u);
                                }
                            `
                        }),
                        entryPoint: 'main'
                    }
                }),

                brightnessAnalysis: await this.device.createComputePipeline({
                    label: "Brightness Analysis Pipeline",
                    layout: 'auto',
                    compute: {
                        module: this.device.createShaderModule({
                            label: "Brightness Analysis Shader",
                            code: /* wgsl */`
                                @group(0) @binding(0) var input: texture_2d<f32>;
                                @group(0) @binding(1) var<storage, read_write> stats: array<atomic<u32>>;

                                @compute @workgroup_size(8, 8)
                                fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
                                    let dims = textureDimensions(input);
                                    let coords = vec2<i32>(global_id.xy);
                                    if (i32(global_id.x) >= i32(dims.x) || i32(global_id.y) >= i32(dims.y)) {
                                        return;
                                    }

                                    let color = textureLoad(input, coords, 0).rgb;
                                    let brightness = dot(color, vec3<f32>(0.299, 0.587, 0.114));
                                    let binIndex = u32(brightness * 255.0);
                                    atomicAdd(&stats[binIndex], 1u);
                                }
                            `
                        }),
                        entryPoint: 'main'
                    }
                })
            };

            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize FeatureExtractor:', error);
            throw error;
        }
    }

    async extract(inputTexture) {
        if (!this.initialized) {
            await this.init();
        }

        // 提取基础特征
        const darkChannel = await this.extractDarkChannel(inputTexture);
        this.features.dehaze.darkChannel = darkChannel;

        // 直接分析暗通道特征
        const darkChannelStats = await this.analyzeDarkChannel(darkChannel);

        // 计算并分析透射率
        const atmosphericLight = await this.extractAtmosphericLight(darkChannel, inputTexture);
        const transmission = await this.computeTransmission(darkChannel, atmosphericLight);
        this.features.dehaze.transmission = transmission;
        const transmissionStats = await this.analyzeTransmission(transmission);

        // 提取并分析边缘特征
        const edges = await this.extractEdges(inputTexture);
        this.features.local.edges = edges;
        const edgeStats = await this.analyzeEdges(edges);

        // 存储分析结果
        this.features.analysis = {
            darkChannelStats,
            transmissionStats,
            edgeStats
        };

        return this.features;
    }

    async analyzeDarkChannel(darkChannel) {
        // 创建分析缓冲区
        const histogramBuffer = this.device.createBuffer({
            size: 256 * 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
        });

        // 创建参数缓冲区，使用默认值
        const paramsBuffer = this.device.createBuffer({
            size: 24,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });

        // 使用默认值初始化参数
        new Float32Array(paramsBuffer.getMappedRange()).set([
            0.5,    // 默认mean
            0.0,    // padding
            0.1,    // 默认最小值
            0.9,    // 默认最大值
            0.5,    // 默认edge strength
            0.7     // 默认adaptive strength
        ]);
        paramsBuffer.unmap();

        // 创建并执行分析计算管线
        const computePipeline = await this.device.createComputePipeline({
            layout: 'auto',
            compute: {
                module: this.device.createShaderModule({
                    code: /* wgsl */`
                        @group(0) @binding(0) var darkChannel: texture_2d<f32>;
                        @group(0) @binding(1) var<storage, read_write> histogram: array<atomic<u32>>;

                        @compute @workgroup_size(8, 8)
                        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
                            let coords = vec2<u32>(global_id.xy);
                            let dims = textureDimensions(darkChannel);
                            
                            if(coords.x >= u32(dims.x) || coords.y >= u32(dims.y)) {
                                return;
                            }

                            let value = textureLoad(darkChannel, coords, 0).r;
                            let bin = u32(value * 255.0);
                            atomicAdd(&histogram[bin], 1u);
                        }
                    `
                }),
                entryPoint: 'main'
            }
        });

        // 执行计算
        const commandEncoder = this.device.createCommandEncoder();
        const passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(computePipeline);
        passEncoder.setBindGroup(0, this.device.createBindGroup({
            layout: computePipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: darkChannel.createView()
                },
                {
                    binding: 1,
                    resource: { buffer: histogramBuffer }
                }
            ]
        }));

        const workgroupsX = Math.ceil(darkChannel.width / 8);
        const workgroupsY = Math.ceil(darkChannel.height / 8);
        passEncoder.dispatchWorkgroups(workgroupsX, workgroupsY);
        passEncoder.end();
        this.device.queue.submit([commandEncoder.finish()]);

        // 读取直方图数据
        const histogram = await this.readHistogram(histogramBuffer);

        // 计算统计数据
        const mean = this.calculateMean(histogram);
        const variance = this.calculateVariance(histogram, mean);
        const distribution = this.analyzeDistribution(histogram);

        return {
            histogram,
            mean,
            variance,
            distribution
        };
    }

    async extractDarkChannel(inputTexture) {
        // 确保输入纹理是 GPUTexture
        const sourceTexture = this.ensureGPUTexture(inputTexture);

        const darkChannelTexture = this.device.createTexture({
            size: [sourceTexture.width, sourceTexture.height],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.STORAGE_BINDING |
                GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_SRC
        });

        const commandEncoder = this.device.createCommandEncoder();
        const passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(this.pipelines.darkChannel);
        passEncoder.setBindGroup(0, this.device.createBindGroup({
            layout: this.pipelines.darkChannel.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: sourceTexture.createView()
                },
                {
                    binding: 1,
                    resource: darkChannelTexture.createView()
                }
            ]
        }));

        const workgroupsX = Math.ceil(sourceTexture.width / 8);
        const workgroupsY = Math.ceil(sourceTexture.height / 8);
        passEncoder.dispatchWorkgroups(workgroupsX, workgroupsY);
        passEncoder.end();
        this.device.queue.submit([commandEncoder.finish()]);

        return darkChannelTexture;
    }

    ensureGPUTexture(input) {
        if (input instanceof GPUTexture) {
            return input;
        }

        // 如果是 ImageBitmap
        if (input instanceof ImageBitmap) {
            return this.createTextureFromImageBitmap(input);
        }

        // 如果是 HTMLImageElement 或其他
        if (input instanceof HTMLImageElement || input instanceof HTMLCanvasElement) {
            // 先创建 ImageBitmap
            return createImageBitmap(input)
                .then(bitmap => this.createTextureFromImageBitmap(bitmap));
        }

        throw new Error('Unsupported input type for texture creation');
    }

    createTextureFromImageBitmap(bitmap) {
        const texture = this.device.createTexture({
            size: [bitmap.width, bitmap.height],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_DST |
                GPUTextureUsage.RENDER_ATTACHMENT |
                GPUTextureUsage.COPY_SRC
        });

        this.device.queue.copyExternalImageToTexture(
            { source: bitmap },
            { texture: texture },
            [bitmap.width, bitmap.height]
        );

        return texture;
    }

    async computeTransmission(darkChannel, atmosphericLight) {
        // 创建大气光值的GPU缓冲区
        const atmosphericLightBuffer = this.device.createBuffer({
            size: 16, // vec3<f32> + padding
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });

        // 写入大气光值
        new Float32Array(atmosphericLightBuffer.getMappedRange()).set([
            atmosphericLight[0],
            atmosphericLight[1],
            atmosphericLight[2],
            1.0  // padding
        ]);
        atmosphericLightBuffer.unmap();

        const transmissionTexture = this.device.createTexture({
            size: [darkChannel.width, darkChannel.height],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.STORAGE_BINDING |
                GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_SRC
        });

        const commandEncoder = this.device.createCommandEncoder();
        const passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(this.pipelines.transmission);
        passEncoder.setBindGroup(0, this.device.createBindGroup({
            layout: this.pipelines.transmission.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: darkChannel.createView()
                },
                {
                    binding: 1,
                    resource: transmissionTexture.createView()
                },
                {
                    binding: 2,
                    resource: { buffer: atmosphericLightBuffer }
                }
            ]
        }));

        const workgroupsX = Math.ceil(darkChannel.width / 8);
        const workgroupsY = Math.ceil(darkChannel.height / 8);
        passEncoder.dispatchWorkgroups(workgroupsX, workgroupsY);
        passEncoder.end();
        this.device.queue.submit([commandEncoder.finish()]);

        return transmissionTexture;
    }

    async extractEdges(inputTexture) {
        const edgesTexture = this.device.createTexture({
            size: [inputTexture.width, inputTexture.height],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.STORAGE_BINDING |
                GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_SRC
        });

        const commandEncoder = this.device.createCommandEncoder();
        const passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(this.pipelines.edges);
        passEncoder.setBindGroup(0, this.device.createBindGroup({
            layout: this.pipelines.edges.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: inputTexture.createView()
                },
                {
                    binding: 1,
                    resource: edgesTexture.createView()
                }
            ]
        }));

        const workgroupsX = Math.ceil(inputTexture.width / 8);
        const workgroupsY = Math.ceil(inputTexture.height / 8);
        passEncoder.dispatchWorkgroups(workgroupsX, workgroupsY);
        passEncoder.end();
        this.device.queue.submit([commandEncoder.finish()]);

        return edgesTexture;
    }

    async readHistogram(histogramBuffer) {
        const readBuffer = this.device.createBuffer({
            size: histogramBuffer.size,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });

        const commandEncoder = this.device.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(
            histogramBuffer, 0,
            readBuffer, 0,
            histogramBuffer.size
        );
        this.device.queue.submit([commandEncoder.finish()]);

        await readBuffer.mapAsync(GPUMapMode.READ);
        const data = new Uint32Array(readBuffer.getMappedRange());
        const histogram = Array.from(data);
        readBuffer.unmap();

        return histogram;
    }

    calculateMean(histogram) {
        let sum = 0;
        let count = 0;
        for (let i = 0; i < histogram.length; i++) {
            sum += i * histogram[i];
            count += histogram[i];
        }
        return count > 0 ? sum / (count * 255) : 0;
    }

    calculateVariance(histogram, mean = null) {
        if (mean === null) {
            mean = this.calculateMean(histogram);
        }

        let sum = 0;
        let count = 0;
        for (let i = 0; i < histogram.length; i++) {
            const diff = i / 255 - mean;
            sum += diff * diff * histogram[i];
            count += histogram[i];
        }
        return count > 0 ? sum / count : 0;
    }

    analyzeDistribution(histogram) {
        const total = histogram.reduce((a, b) => a + b, 0);
        let cumSum = 0;
        let percentiles = {
            p10: 0,
            p50: 0,
            p90: 0
        };

        for (let i = 0; i < histogram.length; i++) {
            cumSum += histogram[i];
            const percent = cumSum / total;

            if (percent >= 0.1 && percentiles.p10 === 0) {
                percentiles.p10 = i / 255;
            }
            if (percent >= 0.5 && percentiles.p50 === 0) {
                percentiles.p50 = i / 255;
            }
            if (percent >= 0.9 && percentiles.p90 === 0) {
                percentiles.p90 = i / 255;
                break;
            }
        }

        return percentiles;
    }

    async analyzeTransmission(transmission) {
        // 创建直方图缓冲区
        const histogramBuffer = this.device.createBuffer({
            size: 256 * 4,  // 256 bins * 4 bytes per bin
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
        });

        // 修改参数缓冲区大小
        const paramsBuffer = this.device.createBuffer({
            size: 24,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });

        // 使用默认值初始化参数
        new Float32Array(paramsBuffer.getMappedRange()).set([
            0.5,    // 默认mean
            0.0,    // padding
            0.1,    // 默认最小值
            0.9,    // 默认最大值
            0.5,    // 默认edge strength
            0.7     // 默认adaptive strength
        ]);
        paramsBuffer.unmap();

        // 创建并执行分析计算管线
        const computePipeline = await this.device.createComputePipeline({
            layout: 'auto',
            compute: {
                module: this.device.createShaderModule({
                    code: /* wgsl */`
                        @group(0) @binding(0) var transmission: texture_2d<f32>;
                        @group(0) @binding(1) var<storage, read_write> histogram: array<atomic<u32>>;

                        @compute @workgroup_size(8, 8)
                        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
                            let coords = vec2<u32>(global_id.xy);
                            let dims = textureDimensions(transmission);
                            
                            if(coords.x >= u32(dims.x) || coords.y >= u32(dims.y)) {
                                return;
                            }

                            let value = textureLoad(transmission, coords, 0).r;
                            let bin = u32(value * 255.0);
                            atomicAdd(&histogram[bin], 1u);
                        }
                    `
                }),
                entryPoint: 'main'
            }
        });

        // 执行计算
        const commandEncoder = this.device.createCommandEncoder();
        const passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(computePipeline);
        passEncoder.setBindGroup(0, this.device.createBindGroup({
            layout: computePipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: transmission.createView()
                },
                {
                    binding: 1,
                    resource: { buffer: histogramBuffer }
                }
            ]
        }));

        const workgroupsX = Math.ceil(transmission.width / 8);
        const workgroupsY = Math.ceil(transmission.height / 8);
        passEncoder.dispatchWorkgroups(workgroupsX, workgroupsY);
        passEncoder.end();
        this.device.queue.submit([commandEncoder.finish()]);

        // 读取直方图数据
        const histogram = await this.readHistogram(histogramBuffer);

        // 计算统计数据
        const mean = this.calculateMean(histogram);
        const variance = this.calculateVariance(histogram, mean);
        const distribution = this.analyzeDistribution(histogram);

        // 计算透射率范围
        const range = this.calculateTransmissionRange(histogram);

        return {
            histogram,
            mean,
            variance,
            distribution,
            range
        };
    }

    async analyzeEdges(edges) {
        // 创建直方图缓冲区
        const histogramBuffer = this.device.createBuffer({
            size: 256 * 4,  // 256 bins * 4 bytes per bin
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
        });

        // 修改参数缓冲区大小
        const paramsBuffer = this.device.createBuffer({
            size: 24,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });

        // 使用默认值初始化参数
        new Float32Array(paramsBuffer.getMappedRange()).set([
            0.5,    // 默认mean
            0.0,    // padding
            0.1,    // 默认最小值
            0.9,    // 默认最大值
            0.5,    // 默认edge strength
            0.7     // 默认adaptive strength
        ]);
        paramsBuffer.unmap();

        // 创建并执行分析计算管线
        const computePipeline = await this.device.createComputePipeline({
            layout: 'auto',
            compute: {
                module: this.device.createShaderModule({
                    code: /* wgsl */`
                        @group(0) @binding(0) var edges: texture_2d<f32>;
                        @group(0) @binding(1) var<storage, read_write> histogram: array<atomic<u32>>;

                        @compute @workgroup_size(8, 8)
                        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
                            let coords = vec2<u32>(global_id.xy);
                            let dims = textureDimensions(edges);
                            
                            if(coords.x >= u32(dims.x) || coords.y >= u32(dims.y)) {
                                return;
                            }

                            let value = textureLoad(edges, coords, 0).r;
                            let bin = u32(value * 255.0);
                            atomicAdd(&histogram[bin], 1u);
                        }
                    `
                }),
                entryPoint: 'main'
            }
        });

        // 执行计算
        const commandEncoder = this.device.createCommandEncoder();
        const passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(computePipeline);
        passEncoder.setBindGroup(0, this.device.createBindGroup({
            layout: computePipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: edges.createView()
                },
                {
                    binding: 1,
                    resource: { buffer: histogramBuffer }
                }
            ]
        }));

        const workgroupsX = Math.ceil(edges.width / 8);
        const workgroupsY = Math.ceil(edges.height / 8);
        passEncoder.dispatchWorkgroups(workgroupsX, workgroupsY);
        passEncoder.end();
        this.device.queue.submit([commandEncoder.finish()]);

        // 读取直方图数据
        const histogram = await this.readHistogram(histogramBuffer);

        // 计算统计数据
        const mean = this.calculateMean(histogram);
        const variance = this.calculateVariance(histogram, mean);
        const distribution = this.analyzeDistribution(histogram);

        return {
            histogram,
            mean,
            variance,
            distribution
        };
    }

    calculateTransmissionRange(histogram) {
        const total = histogram.reduce((a, b) => a + b, 0);
        let cumSum = 0;
        let min = 0;
        let max = 1;

        // 找到包含 95% 数据的范围
        for (let i = 0; i < histogram.length; i++) {
            cumSum += histogram[i];
            const percent = cumSum / total;

            if (percent >= 0.025 && min === 0) {
                min = i / 255;
            }
            if (percent >= 0.975) {
                max = i / 255;
                break;
            }
        }

        return { min, max };
    }

    async extractAtmosphericLight(darkChannel, inputTexture) {
        // 创建存储缓冲区用于亮度值排序
        const brightnessBuffer = this.device.createBuffer({
            size: darkChannel.width * darkChannel.height * 4, // vec4<f32>
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
        });

        // 创建计算管线来找到最亮的像素
        const computePipeline = await this.device.createComputePipeline({
            layout: 'auto',
            compute: {
                module: this.device.createShaderModule({
                    code: /* wgsl */`
                        struct PixelInfo {
                            brightness: f32,
                            color: vec3<f32>,
                        }

                        @group(0) @binding(0) var darkChannel: texture_2d<f32>;
                        @group(0) @binding(1) var inputTexture: texture_2d<f32>;
                        @group(0) @binding(2) var<storage, read_write> brightnessArray: array<PixelInfo>;

                        @compute @workgroup_size(8, 8)
                        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
                            let dims = textureDimensions(darkChannel);
                            let coords = vec2<i32>(global_id.xy);
                            
                            if(coords.x >= i32(dims.x) || coords.y >= i32(dims.y)) {
                                return;
                            }

                            let index = i32(coords.y) * i32(dims.x) + i32(coords.x);
                            let dark = textureLoad(darkChannel, coords, 0).r;
                            let color = textureLoad(inputTexture, coords, 0).rgb;
                            
                            // 计算亮度值
                            let brightness = dot(color, vec3<f32>(0.299, 0.587, 0.114));
                            
                            // 存储像素信息
                            brightnessArray[index] = PixelInfo(
                                brightness,
                                color
                            );
                        }
                    `
                }),
                entryPoint: 'main'
            }
        });

        // 创建排序和聚合管线
        const aggregatePipeline = await this.device.createComputePipeline({
            layout: 'auto',
            compute: {
                module: this.device.createShaderModule({
                    code: /* wgsl */`
                        struct PixelInfo {
                            brightness: f32,
                            color: vec3<f32>,
                        }

                        struct AtmosphericLight {
                            color: vec3<f32>,
                        }

                        @group(0) @binding(0) var<storage, read> brightnessArray: array<PixelInfo>;
                        @group(0) @binding(1) var<storage, read_write> atmosphericLight: AtmosphericLight;

                        @compute @workgroup_size(256)
                        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
                            let arraySize = arrayLength(&brightnessArray);
                            if(global_id.x >= arraySize) {
                                return;
                            }

                            // 选择前0.1%最亮的像素
                            let topPixelCount = max(1u, arrayLength(&brightnessArray) / 1000u);
                            
                            var maxBrightness: f32 = 0.0;
                            var brightestColor: vec3<f32> = vec3<f32>(0.0);
                            
                            // 在工作组内找到最亮的像素
                            for(var i = 0u; i < topPixelCount; i = i + 1u) {
                                let pixelInfo = brightnessArray[i];
                                if(pixelInfo.brightness > maxBrightness) {
                                    maxBrightness = pixelInfo.brightness;
                                    brightestColor = pixelInfo.color;
                                }
                            }

                            // 存储结果
                            atmosphericLight.color = brightestColor;
                        }
                    `
                }),
                entryPoint: 'main'
            }
        });

        // 创建结果缓冲区
        const atmosphericLightBuffer = this.device.createBuffer({
            size: 16, // vec3<f32> + padding
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
        });

        // 执行计算
        const commandEncoder = this.device.createCommandEncoder();

        // 第一步：收集亮度信息
        {
            const passEncoder = commandEncoder.beginComputePass();
            passEncoder.setPipeline(computePipeline);
            passEncoder.setBindGroup(0, this.device.createBindGroup({
                layout: computePipeline.getBindGroupLayout(0),
                entries: [
                    {
                        binding: 0,
                        resource: darkChannel.createView()
                    },
                    {
                        binding: 1,
                        resource: inputTexture.createView()
                    },
                    {
                        binding: 2,
                        resource: { buffer: brightnessBuffer }
                    }
                ]
            }));

            const workgroupsX = Math.ceil(darkChannel.width / 8);
            const workgroupsY = Math.ceil(darkChannel.height / 8);
            passEncoder.dispatchWorkgroups(workgroupsX, workgroupsY);
            passEncoder.end();
        }

        // 第二步：聚合结果
        {
            const passEncoder = commandEncoder.beginComputePass();
            passEncoder.setPipeline(aggregatePipeline);
            passEncoder.setBindGroup(0, this.device.createBindGroup({
                layout: aggregatePipeline.getBindGroupLayout(0),
                entries: [
                    {
                        binding: 0,
                        resource: { buffer: brightnessBuffer }
                    },
                    {
                        binding: 1,
                        resource: { buffer: atmosphericLightBuffer }
                    }
                ]
            }));

            const workgroupCount = Math.ceil(darkChannel.width * darkChannel.height / 256);
            passEncoder.dispatchWorkgroups(workgroupCount);
            passEncoder.end();
        }

        this.device.queue.submit([commandEncoder.finish()]);

        // 读取结果
        const readBuffer = this.device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });

        const copyEncoder = this.device.createCommandEncoder();
        copyEncoder.copyBufferToBuffer(
            atmosphericLightBuffer, 0,
            readBuffer, 0,
            16
        );
        this.device.queue.submit([copyEncoder.finish()]);

        await readBuffer.mapAsync(GPUMapMode.READ);
        const mappedRange = readBuffer.getMappedRange();
        // 在unmap之前复制数据
        const atmosphericLight = new Float32Array(mappedRange).slice(0, 3);
        readBuffer.unmap();

        // 创建新的Float32Array来存储结果
        const result = new Float32Array(3);
        result.set(atmosphericLight);

        return result; // 返回新的数组，而不是从已分离的ArrayBuffer中切片
    }
}


export const estimateAtmosphericLight=async (featureData) =>{
    // 检查是否有 analysis 数据
    if (featureData.analysis && featureData.analysis.darkChannelStats) {
        const darkChannelMean = featureData.analysis.darkChannelStats.mean;
        const variance = featureData.analysis.darkChannelStats.variance;

        // 使用更复杂的估计方法
        const baseLight = Math.min(0.9, Math.max(0.4, darkChannelMean - variance * 0.5));

        return [
            baseLight * 0.95,
            baseLight,
            baseLight * 0.97
        ];
    }
    return [0.8, 0.8, 0.8];
}