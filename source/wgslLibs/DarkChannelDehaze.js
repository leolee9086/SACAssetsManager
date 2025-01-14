/**
 * 基于LAMP架构的暗通道去雾算法实现
 */


import { FeatureExtractor } from "./feautureExtractor.js";
// 特征系统

class LUTGenerator {
    constructor(device) {
        this.device = device;
        this.lutSize = 64;
        this.params = {
            atmosphere: [1.0, 1.0, 1.0],
            beta: 1.0,
            darkEnhance: {
                brightness: 30,
                contrast: 120,
                opacity: 0.1
            }
        };
    }

    async createBaseLUT(featureData) {
        // 估计大气光照
        const atmosphericLight = await this.estimateAtmosphericLight(featureData);
        const lutSize = this.lutSize;
        
        // 使用 WebGPU 计算 LUT
        const lutTexture = this.device.createTexture({
            size: [lutSize, lutSize, lutSize],
            format: 'rgba8unorm',
            dimension: '3d',
            usage: GPUTextureUsage.STORAGE_BINDING | 
                   GPUTextureUsage.TEXTURE_BINDING | 
                   GPUTextureUsage.COPY_DST
        });

        // 创建参数缓冲区
        const paramsBuffer = this.device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });

        // 写入大气光照参数
        new Float32Array(paramsBuffer.getMappedRange()).set([
            ...atmosphericLight,
            1.0  // 额外的参数，可用于调整
        ]);
        paramsBuffer.unmap();

        // 创建 LUT 计算着色器
        const computeShader = /* wgsl */`
            struct Params {
                atmosphericLight: vec3<f32>,
                reserved: f32
            }

            @group(0) @binding(0) var outputLUT: texture_storage_3d<rgba8unorm, write>;
            @group(0) @binding(1) var<uniform> params: Params;

            @compute @workgroup_size(4, 4, 4)
            fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
                let dims = textureDimensions(outputLUT);
                if (any(global_id >= dims)) {
                    return;
                }

                // 归一化坐标
                let normalizedCoords = vec3<f32>(global_id) / vec3<f32>(dims - 1u);
                
                // 转换到线性空间
                let linearR = srgbToLinear(normalizedCoords.r);
                let linearG = srgbToLinear(normalizedCoords.g);
                let linearB = srgbToLinear(normalizedCoords.b);

                // 计算暗通道
                let darkChannel = min(linearR, min(linearG, linearB));
                
                // 估算透射率
                let transmission = max(0.05, min(0.95, 1.0 - 0.95 * darkChannel));

                // 去雾计算
                let A = params.atmosphericLight;
                let dehazeR = (linearR - A.r) / transmission + A.r;
                let dehazeG = (linearG - A.g) / transmission + A.g;
                let dehazeB = (linearB - A.b) / transmission + A.b;

                // 转换回 sRGB
                let outputColor = vec4<f32>(
                    linearToSRGB(dehazeR),
                    linearToSRGB(dehazeG),
                    linearToSRGB(dehazeB),
                    1.0
                );

                textureStore(outputLUT, vec3<i32>(global_id), outputColor);
            }

            // sRGB 转线性空间
            fn srgbToLinear(srgb: f32) -> f32 {
                return select(
                    srgb / 12.92, 
                    pow((srgb + 0.055) / 1.055, 2.4), 
                    srgb > 0.04045
                );
            }

            // 线性空间转 sRGB
            fn linearToSRGB(linear: f32) -> f32 {
                return select(
                    linear * 12.92, 
                    1.055 * pow(linear, 1.0/2.4) - 0.055, 
                    linear > 0.0031308
                );
            }
        `;

        // 创建计算管线
        const computePipeline = await this.device.createComputePipeline({
            layout: 'auto',
            compute: {
                module: this.device.createShaderModule({
                    code: computeShader
                }),
                entryPoint: 'main'
            }
        });

        // 创建绑定组
        const bindGroup = this.device.createBindGroup({
            layout: computePipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: lutTexture.createView()
                },
                {
                    binding: 1,
                    resource: { buffer: paramsBuffer }
                }
            ]
        });

        // 执行计算
        const commandEncoder = this.device.createCommandEncoder();
        const passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(computePipeline);
        passEncoder.setBindGroup(0, bindGroup);
        
        // 使用更高效的工作组分配
        passEncoder.dispatchWorkgroups(
            Math.ceil(lutSize / 4), 
            Math.ceil(lutSize / 4), 
            Math.ceil(lutSize / 4)
        );
        
        passEncoder.end();
        this.device.queue.submit([commandEncoder.finish()]);

        return lutTexture;
    }

    async estimateAtmosphericLight(featureData) {
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

    findBrightestPixels(darkChannel, percentile) {
        // 添加数据验证
        if (!darkChannel || !darkChannel.width || !darkChannel.height) {
            console.warn('Invalid dark channel data:', darkChannel);
            return [];
        }

        // 获取暗通道的像素数据
        const width = darkChannel.width;
        const height = darkChannel.height;
        
        // 检查是否为 GPUTexture
        if (darkChannel instanceof GPUTexture) {
            return this.findBrightestPixelsFromTexture(darkChannel, percentile);
        }

        // 检查是否为 ImageData 或类似结构
        if (darkChannel.data) {
            return this.findBrightestPixelsFromImageData(darkChannel, percentile);
        }

        // 如果是 Canvas
        if (darkChannel.getContext) {
            const ctx = darkChannel.getContext('2d');
            const imageData = ctx.getImageData(0, 0, width, height);
            return this.findBrightestPixelsFromImageData(imageData, percentile);
        }

        console.warn('Unsupported dark channel format');
        return [];
    }

    findBrightestPixelsFromImageData(imageData, percentile) {
        const pixels = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const pixelInfo = [];

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;
                pixelInfo.push({
                    brightness: pixels[i],
                    x: x,
                    y: y
                });
            }
        }

        pixelInfo.sort((a, b) => b.brightness - a.brightness);
        const numPixels = Math.max(1, Math.floor(pixelInfo.length * percentile));
        return pixelInfo.slice(0, numPixels);
    }

    async findBrightestPixelsFromTexture(texture, percentile) {
        // 创建读取缓冲区
        const buffer = this.device.createBuffer({
            size: texture.width * texture.height * 4,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });

        const commandEncoder = this.device.createCommandEncoder();
        commandEncoder.copyTextureToBuffer(
            { texture },
            { buffer, bytesPerRow: texture.width * 4 },
            { width: texture.width, height: texture.height, depthOrArrayLayers: 1 }
        );

        this.device.queue.submit([commandEncoder.finish()]);
        await buffer.mapAsync(GPUMapMode.READ);
        const data = new Uint8Array(buffer.getMappedRange());

        const pixelInfo = [];
        for (let i = 0; i < data.length; i += 4) {
            pixelInfo.push({
                brightness: data[i],
                x: (i / 4) % texture.width,
                y: Math.floor((i / 4) / texture.width)
            });
        }

        buffer.unmap();

        pixelInfo.sort((a, b) => b.brightness - a.brightness);
        const numPixels = Math.max(1, Math.floor(pixelInfo.length * percentile));
        return pixelInfo.slice(0, numPixels);
    }

    selectBrightestFromOriginal(originalImage, brightestPixels) {
        const width = originalImage.width;
        const ctx = originalImage.getContext('2d');
        const imageData = ctx.getImageData(0, 0, originalImage.width, originalImage.height);
        const pixels = imageData.data;

        // 计算这些位置在原始图像中的平均RGB值
        let totalR = 0, totalG = 0, totalB = 0;
        let maxBrightness = 0;
        let brightestColor = [0, 0, 0];

        brightestPixels.forEach(pixel => {
            const i = (pixel.y * width + pixel.x) * 4;
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            
            // 计算亮度
            const brightness = (r + g + b) / 3;
            
            // 更新最亮的颜色
            if (brightness > maxBrightness) {
                maxBrightness = brightness;
                brightestColor = [r / 255, g / 255, b / 255];
            }

            totalR += r;
            totalG += g;
            totalB += b;
        });

        // 返回最亮的颜色值（归一化到0-1范围）
        return brightestColor;
    }

    // 添加 sRGB 和线性空间转换函数
    sRGBToLinear(value) {
        return value <= 0.04045 
            ? value / 12.92 
            : Math.pow((value + 0.055) / 1.055, 2.4);
    }

    linearToSRGB(value) {
        return value <= 0.0031308 
            ? value * 12.92 
            : 1.055 * Math.pow(value, 1/2.4) - 0.055;
    }
}

class DehazeLUTSystem {
    constructor(device) {
        this.device = device;
        this.initialized = false;
        this.generator = new LUTGenerator(device);
        this.featureExtractor = new FeatureExtractor(device);
        this.baseLUT = null;
        this.lastFeatures = null;
        this.pipelines = {};

        // 创建采样器
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
        // 初始化特征提取器
        await this.featureExtractor.init();
        this.initialized = true;
    }

    async warpLUT(baseLUT, features) {
        const warpedLUT = this.device.createTexture({
            size: [64, 64, 64],
            format: 'rgba8unorm',
            dimension: '3d',
            usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING
        });

        // 更新参数计算
        const { darkChannelStats } = features.analysis;
        const atmosphericLight = await this.generator.estimateAtmosphericLight(features);
        
        const paramsBuffer = this.device.createBuffer({
            size: 64,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });

        const paramsArray = new Float32Array([
            darkChannelStats.mean || 0,
            0.0,  // padding
            0.2,  // 最小透射率
            0.8,  // 最大透射率
            0.5,  // 边缘强度
            0.8,  // 自适应强度
            atmosphericLight[0],
            atmosphericLight[1],
            atmosphericLight[2],
            1.2,  // beta
            0.0,
            0.0
        ]);

        new Float32Array(paramsBuffer.getMappedRange()).set(paramsArray);
        paramsBuffer.unmap();

        // 定义计算着色器
        const computeShader = /* wgsl */`
            struct WarpParams {
                darkChannelMean: f32,
                padding: f32,
                transmissionRange: vec2<f32>,
                edgeStrength: f32,
                adaptiveStrength: f32,
                atmosphericLight: vec3<f32>,
                beta: f32,
                reserved: vec2<f32>,
            }

            @group(0) @binding(0) var baseLUT: texture_3d<f32>;
            @group(0) @binding(1) var outputLUT: texture_storage_3d<rgba8unorm, write>;
            @group(0) @binding(2) var<uniform> params: WarpParams;

            @compute @workgroup_size(4, 4, 4)
            fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
                let dims = textureDimensions(baseLUT);
                if (any(global_id.xy >= dims.xy) || global_id.z >= dims.z) {
                    return;
                }

                let coords = vec3<i32>(global_id);
                let normalizedCoords = vec3<f32>(coords) / vec3<f32>(dims - 1);
                
                // 计算暗通道值
                let darkChannel = min(
                    min(normalizedCoords.r, normalizedCoords.g),
                    normalizedCoords.b
                );
                
                // 增强透射率估计的对比度
                let transmission = clamp(
                    1 - 1* darkChannel,  // 增加 beta 参数来控制去雾强度
                    0.1,  // 降低最小透射率以增强去雾效果
                    0.95  // 提高最大透射率以保持亮部细节
                );

                // 修改：分别处理每个颜色通道的去雾
                let avgAtmLight = (params.atmosphericLight.r + params.atmosphericLight.g + params.atmosphericLight.b) / 3.0;
                var dehazeColor = vec3<f32>(
                    (normalizedCoords.r - avgAtmLight) / max(transmission, 0.1) + avgAtmLight,
                    (normalizedCoords.g - avgAtmLight) / max(transmission, 0.1) + avgAtmLight,
                    (normalizedCoords.b - avgAtmLight) / max(transmission, 0.1) + avgAtmLight
                );

                // 增强对比度和饱和度
                let luminance = dot(dehazeColor, vec3<f32>(0.299, 0.587, 0.114));
                let saturation = 1.5;  // 增加饱和度
                let contrast = 1.3;    // 增加对比度
                
                dehazeColor = mix(vec3<f32>(luminance), dehazeColor, saturation);
                dehazeColor = (dehazeColor - 0.5) * contrast + 0.5;

                // 修改混合逻辑，增加对有雾区域的影响
                var finalColor = dehazeColor;
                if (darkChannel < 0.382*transmission) {  // 提高阈值，增加对有雾区域的影响
                    finalColor = mix(
                        normalizedCoords,
                        dehazeColor,
                        smoothstep(0.0, 0.1, darkChannel/transmission)  // 调整 smoothstep 范围
                    );
                }

                // 确保颜色在有效范围内
                finalColor = clamp(finalColor, vec3<f32>(0.0), vec3<f32>(1.0));
                
                textureStore(
                    outputLUT, 
                    coords, 
                    vec4<f32>(finalColor, 1.0)
                );
            }
        `;

        // 创建计算管线
        const computePipeline = await this.device.createComputePipeline({
            layout: 'auto',
            compute: {
                module: this.device.createShaderModule({
                    code: computeShader
                }),
                entryPoint: 'main'
            }
        });

        // 创建绑定组
        const bindGroup = this.device.createBindGroup({
            layout: computePipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: baseLUT.createView()
                },
                {
                    binding: 1,
                    resource: warpedLUT.createView()
                },
                {
                    binding: 2,
                    resource: { buffer: paramsBuffer }
                }
            ]
        });

        // 执行计算
        const commandEncoder = this.device.createCommandEncoder();
        const passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(computePipeline);
        passEncoder.setBindGroup(0, bindGroup);
        passEncoder.dispatchWorkgroups(16, 16, 16);  // 64/4 = 16 workgroups in each dimension
        passEncoder.end();
        this.device.queue.submit([commandEncoder.finish()]);

        return warpedLUT;
    }

    async process(inputTexture) {
        if (!this.initialized) {
            await this.init();
        }

        // 添加预处理步骤
        const preprocessedTexture = await this.preprocessImage(inputTexture);
        
        // 提取特征
        const features = await this.featureExtractor.extract(preprocessedTexture);

        // 生成或更新基础 LUT
        if (!this.baseLUT || this.shouldUpdateBaseLUT(features)) {
            console.log('Generating new base LUT...');
            this.baseLUT = await this.generator.createBaseLUT(features);
            this.lastFeatures = features;
        }

        // 变形 LUT
        const warpedLUT = await this.warpLUT(this.baseLUT, features);
        console.log('Warped LUT generated');

        // 应用 LUT
        const outputTexture = await this.applyLUT(preprocessedTexture, warpedLUT, features);
        console.log('LUT applied');

        // 转换为图像
        const result = await this.textureToImage(outputTexture);

        // 返回结果和调试信息
        return {
            result,
            debug: {
                darkChannel: await this.textureToImage(features.dehaze.darkChannel),
                transmission: await this.textureToImage(features.dehaze.transmission),
                edges: await this.textureToImage(features.local.edges),
                features: features.analysis
            }
        };
    }

    shouldUpdateBaseLUT(features) {
        if (!this.lastFeatures) return true;

        // 比较特征差异
        const { darkChannelStats: current } = features.analysis;
        const { darkChannelStats: last } = this.lastFeatures.analysis;

        // 如果特征差异超过阈值，更新基础 LUT
        const meanDiff = Math.abs(current.mean - last.mean);
        const varianceDiff = Math.abs(current.variance - last.variance);

        return meanDiff > 0.1 || varianceDiff > 0.1;
    }

    async applyLUT(inputTexture, lut, features) {
        // 创建参数缓冲区
        const dehazeParamsBuffer = this.device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true,
            label: "Dehaze Params Buffer"
        });

        // 写入参数数据
        new Float32Array(dehazeParamsBuffer.getMappedRange()).set([
            1.0, 1.0, 1.0,  // atmosphericLight
            features.analysis.darkChannelStats.mean  // adaptiveStrength
        ]);
        dehazeParamsBuffer.unmap();

        const outputTexture = this.device.createTexture({
            size: [inputTexture.width, inputTexture.height],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.RENDER_ATTACHMENT |
                   GPUTextureUsage.COPY_SRC |
                   GPUTextureUsage.STORAGE_BINDING |
                   GPUTextureUsage.TEXTURE_BINDING
        });

        // 修改渲染管线配置
        const renderPipeline = await this.device.createRenderPipeline({
            label: "Apply LUT Pipeline",
            layout: 'auto',
            vertex: {
                module: this.device.createShaderModule({
                    label: "LUT Vertex Shader",
                    code: /* wgsl */`
                        struct VertexOutput {
                            @builtin(position) position: vec4<f32>,
                            @location(0) texCoord: vec2<f32>,
                        }

                        @vertex
                        fn main(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
                            var pos = array<vec2<f32>, 6>(
                                vec2<f32>(-1.0, -1.0),
                                vec2<f32>( 1.0, -1.0),
                                vec2<f32>(-1.0,  1.0),
                                vec2<f32>(-1.0,  1.0),
                                vec2<f32>( 1.0, -1.0),
                                vec2<f32>( 1.0,  1.0)
                            );
                            var texCoords = array<vec2<f32>, 6>(
                                vec2<f32>(0.0, 1.0),
                                vec2<f32>(1.0, 1.0),
                                vec2<f32>(0.0, 0.0),
                                vec2<f32>(0.0, 0.0),
                                vec2<f32>(1.0, 1.0),
                                vec2<f32>(1.0, 0.0)
                            );
                            
                            var output: VertexOutput;
                            output.position = vec4<f32>(pos[vertexIndex], 0.0, 1.0);
                            output.texCoord = texCoords[vertexIndex];
                            return output;
                        }
                    `
                }),
                entryPoint: 'main'
            },
            fragment: {
                module: this.device.createShaderModule({
                    label: "LUT Fragment Shader",
                    code: /* wgsl */`
                    @group(0) @binding(0) var inputTex: texture_2d<f32>;
                    @group(0) @binding(1) var lutTex: texture_3d<f32>;
                    @group(0) @binding(2) var texSampler: sampler;

                    @fragment
                    fn main(@location(0) texCoord: vec2<f32>) -> @location(0) vec4<f32> {
                        // 获取原始颜色并转换到线性空间
                        let srgbColor = textureSample(inputTex, texSampler, texCoord);
                        let color = vec4<f32>(
                            srgbToLinear(srgbColor.r),
                            srgbToLinear(srgbColor.g),
                            srgbToLinear(srgbColor.b),
                            srgbColor.a
                        );
                        
                        // 计算 LUT 采样坐标
                        let lutSize = 64.0;
                        let scale = (lutSize - 1.0) / lutSize;
                        let offset = 0.5 / lutSize;
                        
                        // 确保采样坐标在正确范围内
                        let lutCoord = color.rgb * scale + vec3<f32>(offset);
                        
                        // 采样 LUT
                        let lutColor = textureSample(lutTex, texSampler, lutCoord);
                        
                        // 将结果转换回 sRGB 空间
                        return vec4<f32>(
                            linearToSRGB(lutColor.r),
                            linearToSRGB(lutColor.g),
                            linearToSRGB(lutColor.b),
                            color.a
                        );
                    }

                    // sRGB 到线性空间的转换
                    fn srgbToLinear(srgb: f32) -> f32 {
                        if (srgb <= 0.04045) {
                            return srgb / 12.92;
                        } else {
                            return pow((srgb + 0.055) / 1.055, 2.4);
                        }
                    }

                    // 线性到 sRGB 空间的转换
                    fn linearToSRGB(linear: f32) -> f32 {
                        if (linear <= 0.0031308) {
                            return linear * 12.92;
                        } else {
                            return 1.055 * pow(linear, 1.0/2.4) - 0.055;
                        }
                    }
                    `
                }),
                entryPoint: 'main',
                targets: [{
                    format: 'rgba8unorm',
                    blend: {
                        color: {
                            srcFactor: 'one',
                            dstFactor: 'zero',
                            operation: 'add',
                        },
                        alpha: {
                            srcFactor: 'one',
                            dstFactor: 'zero',
                            operation: 'add',
                        },
                    },
                }]
            },
            primitive: {
                topology: 'triangle-list',
                cullMode: 'none',
            },
        });

        // 创建绑定组
        const bindGroup = this.device.createBindGroup({
            layout: renderPipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: inputTexture.createView({
                        label: "Input Texture View"
                    })
                },
                {
                    binding: 1,
                    resource: lut.createView({
                        label: "LUT Texture View",
                        dimension: '3d'
                    })
                },
                {
                    binding: 2,
                    resource: this.sampler
                }
            ]
        });

        // 执行渲染
        const commandEncoder = this.device.createCommandEncoder();
        const passEncoder = commandEncoder.beginRenderPass({
            colorAttachments: [{
                view: outputTexture.createView(),
                clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
                loadOp: 'clear',
                storeOp: 'store'
            }]
        });

        passEncoder.setPipeline(renderPipeline);
        passEncoder.setBindGroup(0, bindGroup);
        passEncoder.draw(6, 1, 0, 0);
        passEncoder.end();

        this.device.queue.submit([commandEncoder.finish()]);

        return outputTexture;
    }

    async textureToImage(texture) {
        // 创建 canvas
        const canvas = document.createElement('canvas');
        canvas.width = texture.width;
        canvas.height = texture.height;

        // 计算对齐的字节数每行
        const bytesPerRow = Math.ceil(texture.width * 4 / 256) * 256;
        const bufferSize = bytesPerRow * texture.height;

        // 创建临时缓冲区
        const outputBuffer = this.device.createBuffer({
            size: bufferSize,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });

        // 创建命令编码器
        const commandEncoder = this.device.createCommandEncoder();

        // 复制纹理到缓冲区
        commandEncoder.copyTextureToBuffer(
            {
                texture: texture
            },
            {
                buffer: outputBuffer,
                bytesPerRow: bytesPerRow,
                rowsPerImage: texture.height
            },
            {
                width: texture.width,
                height: texture.height,
                depthOrArrayLayers: 1
            }
        );

        // 提交命令
        this.device.queue.submit([commandEncoder.finish()]);

        // 等待缓冲区映射
        await outputBuffer.mapAsync(GPUMapMode.READ);
        const mappedRange = new Uint8Array(outputBuffer.getMappedRange());

        // 创建最终的像素数据数组
        const data = new Uint8ClampedArray(texture.width * texture.height * 4);

        // 复制数据，处理对齐问题
        for (let y = 0; y < texture.height; y++) {
            const srcOffset = y * bytesPerRow;
            const dstOffset = y * texture.width * 4;
            data.set(
                mappedRange.subarray(srcOffset, srcOffset + texture.width * 4),
                dstOffset
            );
        }

        outputBuffer.unmap();

        // 将数据绘制到 canvas
        const ctx = canvas.getContext('2d');
        const imageData = new ImageData(data, texture.width, texture.height);
        ctx.putImageData(imageData, 0, 0);

        return canvas;
    }

    // 添加预处理方法
    async preprocessImage(input) {
        // 创建输入纹理
        const inputTexture = this.device.createTexture({
            size: [input.width, input.height],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING | 
                   GPUTextureUsage.COPY_DST |
                   GPUTextureUsage.STORAGE_BINDING  // 添加存储绑定使用权限
        });

        // 将输入图像数据复制到纹理
        const imageData = input.getContext('2d').getImageData(0, 0, input.width, input.height);
        this.device.queue.writeTexture(
            { texture: inputTexture },
            imageData.data,
            { bytesPerRow: input.width * 4, rowsPerImage: input.height },
            { width: input.width, height: input.height }
        );

        // 创建输出纹理
        const outputTexture = this.device.createTexture({
            size: [input.width, input.height],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.STORAGE_BINDING | 
                   GPUTextureUsage.TEXTURE_BINDING | 
                   GPUTextureUsage.COPY_SRC
        });

        // 创建预处理管线
        const preprocessPipeline = await this.device.createComputePipeline({
            layout: 'auto',
            compute: {
                module: this.device.createShaderModule({
                    code: /* wgsl */`
                        @group(0) @binding(0) var inputTex: texture_2d<f32>;
                        @group(0) @binding(1) var outputTex: texture_storage_2d<rgba8unorm, write>;

                        @compute @workgroup_size(8, 8)
                        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
                            let dims = textureDimensions(inputTex);
                            if(any(global_id.xy >= dims)) {
                                return;
                            }

                            // 直接使用 textureLoad 而不是 textureSample
                            let color = textureLoad(inputTex, vec2<i32>(global_id.xy), 0);
                            
                            // 增强对比度和亮度
                            let enhanced = pow(color.rgb, vec3<f32>(0.9));
                            let contrast = mix(enhanced, vec3<f32>(0.5), 0.2);
                            
                            textureStore(outputTex, vec2<i32>(global_id.xy), vec4<f32>(contrast, color.a));
                        }
                    `
                }),
                entryPoint: 'main'
            }
        });

        // 创建绑定组 (移除了采样器，因为不再需要)
        const bindGroup = this.device.createBindGroup({
            layout: preprocessPipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: inputTexture.createView()
                },
                {
                    binding: 1,
                    resource: outputTexture.createView()
                }
            ]
        });

        // 执行预处理
        const commandEncoder = this.device.createCommandEncoder();
        const passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(preprocessPipeline);
        passEncoder.setBindGroup(0, bindGroup);

        const workgroupsX = Math.ceil(input.width / 8);
        const workgroupsY = Math.ceil(input.height / 8);
        passEncoder.dispatchWorkgroups(workgroupsX, workgroupsY);
        passEncoder.end();

        this.device.queue.submit([commandEncoder.finish()]);

        // 清理输入纹理
        inputTexture.destroy();

        return outputTexture;
    }
}

// 主类
class DarkChannelDehaze {
    constructor(device = null) {
        this.device = device;
        this.initialized = false;
        this.lutSystem = null;
    }

    async init() {
        if (this.initialized) return;

        try {
            // 初始化设备
            if (!this.device) {
                const adapter = await navigator.gpu.requestAdapter();
                if (!adapter) throw new Error('No GPU adapter found');
                this.device = await adapter.requestDevice();
                if (!this.device) throw new Error('Failed to create GPU device');
            }

            // 初始化 LUT 系统
            this.lutSystem = new DehazeLUTSystem(this.device);
            await this.lutSystem.init();

            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize DarkChannelDehaze:', error);
            throw error;
        }
    }

    async process(input) {
        if (!this.initialized) {
            await this.init();
        }

        try {
            const { result, debug } = await this.lutSystem.process(input);

            // 获取输入和输出的像素数据进行比较
            const inputCtx = input.getContext('2d');
            const inputData = inputCtx.getImageData(0, 0, input.width, input.height).data;

            const resultCtx = result.getContext('2d');
            const resultData = resultCtx.getImageData(0, 0, result.width, result.height).data;

            // 比较前几个像素的值
            console.log('Comparing first 5 pixels:');
            for (let i = 0; i < 20; i += 4) {
                console.log(`Pixel ${i / 4}:`);
                console.log(`Input: R=${inputData[i]}, G=${inputData[i + 1]}, B=${inputData[i + 2]}, A=${inputData[i + 3]}`);
                console.log(`Result: R=${resultData[i]}, G=${resultData[i + 1]}, B=${resultData[i + 2]}, A=${resultData[i + 3]}`);
            }

            // 检查是否所有像素都相同
            let identical = true;
            let differences = 0;
            for (let i = 0; i < inputData.length; i++) {
                if (inputData[i] !== resultData[i]) {
                    identical = false;
                    differences++;
                }
            }

            console.log('Images are identical:', identical);
            if (!identical) {
                console.log(`Number of different pixels: ${differences / 4}`);
                console.log(`Percentage different: ${(differences / inputData.length * 100).toFixed(2)}%`);
            }

            this.debugInfo = debug;
            return result;
        } catch (error) {
            console.error('Error processing image:', error);
            throw error;
        }
    }

    // 添加获取调试信息的方法
    getDebugInfo() {
        return this.debugInfo;
    }
}

// 导出所有需要的类
export {
    DarkChannelDehaze,
};

