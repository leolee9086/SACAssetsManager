import { getHistogramFromSharp } from "../histogram.js";
import { fromBuffer } from "../../fromDeps/sharpInterface/useSharp/toSharp.js";
import { requirePluginDeps } from "../../module/requireDeps.js";
const sharp = requirePluginDeps('sharp')
class ResourcePool {
    constructor(device) {
        this.device = device;
        this.buffers = new Map();
        this.textures = new Map();
        this.mappedBuffers = new Set();
        this.registry = new FinalizationRegistry(this.cleanup.bind(this));
    }

    async getBuffer(size, usage, label = '') {
        const key = `${size}_${usage}_${label}`;
        let buffer;

        if (this.buffers.has(key)) {
            const bufferRef = this.buffers.get(key);
            buffer = bufferRef.deref();

            if (buffer) {
                // 如果缓冲区已映射，尝试取消映射
                if (this.mappedBuffers.has(buffer)) {
                    try {
                        buffer.unmap();
                        this.mappedBuffers.delete(buffer);
                    } catch (e) {
                        // 忽略未映射缓冲区的错误
                    }
                }
                return buffer;
            }
        }

        // 创建新的缓冲区
        buffer = this.device.createBuffer({
            size,
            usage,
            label: `pool_buffer_${label}`
        });

        this.buffers.set(key, new WeakRef(buffer));
        this.registry.register(buffer, {
            type: 'buffer',
            key
        });

        return buffer;
    }

    markBufferMapped(buffer) {
        this.mappedBuffers.add(buffer);
    }

    markBufferUnmapped(buffer) {
        this.mappedBuffers.delete(buffer);
    }

    getTexture(width, height, format, usage, label = '') {
        const key = `${width}_${height}_${format}_${usage}_${label}`;
        if (!this.textures.has(key)) {
            const texture = this.device.createTexture({
                size: [width, height],
                format,
                usage,
                label: `pool_texture_${label}`
            });
            this.textures.set(key, new WeakRef(texture));
            this.registry.register(texture, {
                type: 'texture',
                key
            });
        }
        const textureRef = this.textures.get(key);
        const texture = textureRef.deref();
        if (texture) return texture;

        // 如果原始texture已被回收，创建新的
        const newTexture = this.device.createTexture({
            size: [width, height],
            format,
            usage,
            label: `pool_texture_${label}`
        });
        this.textures.set(key, new WeakRef(newTexture));
        return newTexture;
    }

    cleanup({ type, key }) {
        if (type === 'buffer') {
            const bufferRef = this.buffers.get(key);
            if (bufferRef) {
                const buffer = bufferRef.deref();
                if (buffer && this.mappedBuffers.has(buffer)) {
                    try {
                        buffer.unmap();
                    } catch (e) {
                        // 忽略清理错误
                    }
                    this.mappedBuffers.delete(buffer);
                }
            }
            this.buffers.delete(key);
        } else if (type === 'texture') {
            this.textures.delete(key);
        }
    }
} const adapter = await navigator.gpu.requestAdapter();
const device = await adapter.requestDevice();
const autoExposureShader = `
struct Uniforms {
    width: u32,
    height: u32,
    strength: f32,
    targetExposure: f32,
    localAdjustFactor: f32,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var outputTexture: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(3) var<storage, read> histogram: array<u32, 256>;
@group(0) @binding(4) var<storage, read> cdf: array<f32, 256>;

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let pixel_coord = vec2<i32>(global_id.xy);
    if (pixel_coord.x >= i32(uniforms.width) || pixel_coord.y >= i32(uniforms.height)) {
        return;
    }

    let color = textureLoad(inputTexture, pixel_coord, 0);
    let luminance = dot(color.rgb, vec3<f32>(0.299, 0.587, 0.114));
    
    let luminanceDiff = abs(luminance - 0.5) * 2.0;
    let luminanceIndex = u32(luminance * 255.0);
    
    let protectionFactor = sqrt(luminanceDiff);
    let targetBaseLuminance = cdf[luminanceIndex];
    let targetLuminance = mix(targetBaseLuminance, luminance, protectionFactor);
    
    let sigmoid = 1.0 / (1.0 + exp(-8.0 * (luminance - 0.5)));
    let adjustmentStrength = 0.5 + sigmoid * 0.5;
    
    let baseLuminanceAdjust = uniforms.strength * (targetLuminance - luminance + uniforms.targetExposure);
    let luminanceAdjust = baseLuminanceAdjust * adjustmentStrength;
    
    let adjustmentFactor = 1.0 + (uniforms.localAdjustFactor * 0.2);
    let fineAdjust = luminanceAdjust * adjustmentFactor;
    
    let baseLimit = 45.0 / 255.0;
    let dynamicLimit = baseLimit * (1.0 - luminanceDiff * luminanceDiff);
    let limitedAdjust = clamp(fineAdjust, -dynamicLimit, dynamicLimit);
    
    let newColor = clamp(color.rgb + vec3<f32>(limitedAdjust), vec3<f32>(0.0), vec3<f32>(1.0));
    textureStore(outputTexture, pixel_coord, vec4<f32>(newColor, color.a));
}


`

// 创建全局资源池
const resourcePool = new ResourcePool(device);

async function 创建自动曝光GPU管线(device, 宽度, 高度) {
    if (!device) {
        throw new Error('GPU设备未初始化');
    }

    try {
        // 首先创建绑定组布局
        const bindGroupLayout = device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'uniform' }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    texture: { sampleType: 'float' }
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.COMPUTE,
                    storageTexture: {
                        access: 'write-only',
                        format: 'rgba8unorm'
                    }
                },
                {
                    binding: 3,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'read-only-storage' }
                },
                {
                    binding: 4,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'read-only-storage' }
                }
            ]
        });

        // 创建管线布局
        const pipelineLayout = device.createPipelineLayout({
            bindGroupLayouts: [bindGroupLayout]
        });

        // 使用显式布局创建管线
        const pipeline = await device.createComputePipelineAsync({
            layout: pipelineLayout,
            compute: {
                module: device.createShaderModule({
                    code: autoExposureShader
                }),
                entryPoint: 'main'
            }
        });

        const uniformBuffer = device.createBuffer({
            size: 20, // 5个32位值 (4字节 * 5)
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            mappedAtCreation: false
        });

        return { pipeline, uniformBuffer, bindGroupLayout };
    } catch (error) {
        console.error('创建GPU管线失败:', error);
        throw error;
    }
}

async function 创建输入纹理(device, sharpObj, width, height) {
    if (!device || !sharpObj || !width || !height) {
        throw new Error('无效的输入参数');
    }

    try {
        // 验证尺寸
        const metadata = await sharpObj.metadata();
        if (width > metadata.width || height > metadata.height) {
            throw new Error(`请求的尺寸 ${width}x${height} 超过了图像实际尺寸 ${metadata.width}x${metadata.height}`);
        }

        // 使用sharp转换为标准RGBA格式
        const standardizedData = await sharpObj
            .removeAlpha()        // 移除现有的alpha通道
            .ensureAlpha()        // 添加新的alpha通道
            .raw()                // 获取原始数据
            .toBuffer();          // 转换为buffer

        console.log('创建纹理 - 输入尺寸:', width, 'x', height, 'RGBA格式');

        const bytesPerPixel = 4; // RGBA格式
        const minBytesPerRow = width * bytesPerPixel;
        const alignedBytesPerRow = Math.ceil(minBytesPerRow / 256) * 256;

        // 创建纹理
        const texture = device.createTexture({
            size: [width, height],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
            dimension: '2d',
        });

        // 写入纹理
        device.queue.writeTexture(
            { texture },
            standardizedData,
            {
                bytesPerRow: minBytesPerRow,
                rowsPerImage: height
            },
            {
                width,
                height
            }
        );

        return texture;
    } catch (error) {
        console.error('创建输入纹理失败:', error, {
            requestedSize: `${width}x${height}`,
            sharpObjInfo: await sharpObj.metadata()
        });
        throw error;
    }
}

function 创建输出纹理(device, width, height) {
    if (!device || width < 1 || height < 1) {
        throw new Error('无效的参数');
    }

    return device.createTexture({
        size: [width, height],
        format: 'rgba8unorm',
        usage: GPUTextureUsage.STORAGE_BINDING |
            GPUTextureUsage.COPY_SRC |
            GPUTextureUsage.COPY_DST |
            GPUTextureUsage.TEXTURE_BINDING,
        dimension: '2d',
        label: 'output_texture'
    });
}

function 创建绑定组(device, bindGroupLayout, uniformBuffer, inputTexture, outputTexture, histogramBuffer, cdfBuffer) {
    return device.createBindGroup({
        layout: bindGroupLayout,
        entries: [
            { binding: 0, resource: { buffer: uniformBuffer } },
            { binding: 1, resource: inputTexture.createView() },
            { binding: 2, resource: outputTexture.createView() },
            { binding: 3, resource: { buffer: histogramBuffer } },
            { binding: 4, resource: { buffer: cdfBuffer } }
        ]
    });
}

export async function 自动曝光(sharpObj, 强度 = 1.0) {
    if (!device) {
        throw new Error('GPU设备未初始化');
    }

    try {
        const { data, info, histogram } = await getHistogramFromSharp(sharpObj);
        const { width, height } = info;

        // 定义常量
        const MAX_TEXTURE_SIZE = 2048;
        const OVERLAP_SIZE = 64; // 重叠区域大小
        // 如果图像足够小，直接处理
        if (width <= MAX_TEXTURE_SIZE && height <= MAX_TEXTURE_SIZE) {
            return await 处理单个块(sharpObj, 强度, histogram);
        }

        // 计算分块数量
        const blocksX = Math.ceil(width / (MAX_TEXTURE_SIZE - OVERLAP_SIZE));
        const blocksY = Math.ceil(height / (MAX_TEXTURE_SIZE - OVERLAP_SIZE));

        // 计算参数
        const params = await 计算参数(histogram.brightness, 分析直方图特征(histogram.brightness));
        console.log(params)

        // 并行处理所有块
        const processedBlocks = await Promise.all(
            Array.from({ length: blocksY }, async (_, y) => {
                return await Promise.all(
                    Array.from({ length: blocksX }, async (_, x) => {
                        const [blockInfo, extractOptions] = 计算块位置和大小({
                            x, y, width, height,
                            maxSize: MAX_TEXTURE_SIZE,
                            overlap: OVERLAP_SIZE,
                            blocksX, blocksY
                        });
                        console.log(blockInfo, extractOptions)
                        // 处理块
                        const processedBlock = await 处理单个块(
                            sharpObj,
                            强度,
                            histogram,
                            params,
                            {
                                blockInfo,
                                ...extractOptions
                            }

                        );

                        return {
                            image: processedBlock,
                            ...blockInfo
                        };
                    })
                );
            })
        ).then(rows => rows.flat());

        // 合并处理后的块
        return await 合并图像块(processedBlocks, {
            width,
            height,
            channels: info.channels,
            overlapSize: OVERLAP_SIZE
        });

    } catch (error) {
        console.error('自动曝光处理失败:', error);
        throw error;
    }
}

function 计算块位置和大小({ x, y, width, height, maxSize, overlap, blocksX, blocksY }) {
    // 确保所有输入参数都是整数
    width = Math.floor(width);
    height = Math.floor(height);
    maxSize = Math.floor(maxSize);
    overlap = Math.floor(overlap);

    // 计算有效块大小
    const effectiveMaxSize = maxSize - overlap;
    const baseWidth = Math.floor((width - overlap * (blocksX - 1)) / blocksX);
    const baseHeight = Math.floor((height - overlap * (blocksY - 1)) / blocksY);

    // 计算当前块的位置和大小
    let left = x * (baseWidth + overlap);
    let top = y * (baseHeight + overlap);
    let blockWidth = baseWidth + (x < blocksX - 1 ? overlap : 0);
    let blockHeight = baseHeight + (y < blocksY - 1 ? overlap : 0);

    // 处理最后一块的边界情况
    if (x === blocksX - 1) {
        blockWidth = width - left;
    }
    if (y === blocksY - 1) {
        blockHeight = height - top;
    }

    // 确保所有值都是有效的正整数
    left = Math.max(0, Math.floor(left));
    top = Math.max(0, Math.floor(top));
    blockWidth = Math.min(width - left, Math.floor(blockWidth));
    blockHeight = Math.min(height - top, Math.floor(blockHeight));

    // 验证计算结果
    if (blockWidth <= 0 || blockHeight <= 0) {
        throw new Error(`无效的块尺寸: ${blockWidth}x${blockHeight}`);
    }
    if (blockWidth >= 8192 || blockHeight >= 8192) {
        throw new Error(`无效的块尺寸: ${blockWidth}x${blockHeight}`);
    }

    return [{
        originalX: left,
        originalY: top,
        width: blockWidth,
        height: blockHeight,
        isFirstX: x === 0,
        isLastX: x === blocksX - 1,
        isFirstY: y === 0,
        isLastY: y === blocksY - 1
    }, {
        left,
        top,
        width: blockWidth,
        height: blockHeight
    }];
}

async function 合并图像块(blocks, {width, height, channels}) {
    try {
        // 创建背景画布
        let composite = sharp({
            create: {
                width,
                height,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            }
        });

        // 简单的直接拼接
        const compositeOperations = await Promise.all(
            blocks.map(async block => {
                // 确保图像是RGBA格式
                const normalizedImage = await block.image
                    .ensureAlpha()
                    .raw()
                    .toBuffer();

                return {
                    input: normalizedImage,
                    raw: {
                        width: block.width,
                        height: block.height,
                        channels: 4
                    },
                    left: block.originalX,
                    top: block.originalY,
                    blend: 'over'  // 使用简单的覆盖模式
                };
            })
        );

        // 执行合并操作
        let result = await composite
            .composite(compositeOperations)
            .png();

        return result;

    } catch (error) {
        console.error('合并图像块失败:', error, {
            totalBlocks: blocks.length,
            imageSize: `${width}x${height}`
        });
        throw error;
    }
}

async function 处理单个块(sharpObj, 强度, 原始直方图, 预计算参数, blockInfo) {
    const resources = new Set();

    try {
        let processSharp = blockInfo ?
            sharpObj.clone().extract({
                left: Math.max(0, Math.floor(blockInfo.left)),
                top: Math.max(0, Math.floor(blockInfo.top)),
                width: Math.floor(blockInfo.width),
                height: Math.floor(blockInfo.height)
            }) :
            sharpObj;
        console.log(processSharp)
        const metadata = await processSharp.metadata();
        const { width, height } = blockInfo || metadata;
        console.log(width, height)

        // 创建资源
        const { pipeline, uniformBuffer, bindGroupLayout } = await 创建自动曝光GPU管线(device, width, height);
        const inputTexture = await 创建输入纹理(device, processSharp, width, height);
        const outputTexture = 创建输出纹理(device, width, height);

        resources.add(uniformBuffer);
        resources.add(inputTexture);
        resources.add(outputTexture);

        const params = 预计算参数 || await 计算参数(原始直方图.brightness, 分析直方图特征(原始直方图.brightness));
        const { histogramBuffer, cdfBuffer } = await 创建并设置缓冲区(device, 原始直方图.brightness, params.cdf);

        resources.add(histogramBuffer);
        resources.add(cdfBuffer);

        // 更新 uniform buffer
        device.queue.writeBuffer(
            uniformBuffer,
            0,
            new Float32Array([
                width,
                height,
                强度,
                params.targetExposure,
                params.localAdjustFactor
            ])
        );

        return await 执行GPU计算(
            device,
            pipeline,
            bindGroupLayout,
            uniformBuffer,
            inputTexture,
            outputTexture,
            histogramBuffer,
            cdfBuffer,
            width,
            height
        );

    } catch (error) {
        console.error('处理图像块失败:', error);
        throw error;
    } finally {
        // 清理所有资源
        for (const resource of resources) {
            if (resource && !resource.destroyed) {
                try {
                    resource.destroy();
                } catch (e) {
                    console.warn('资源清理警告:', e);
                }
            }
        }
    }
}

async function 执行GPU计算(device, pipeline, bindGroupLayout, uniformBuffer, inputTexture, outputTexture, histogramBuffer, cdfBuffer, width, height) {
    try {
        const workgroupSize = 16;
        const bytesPerPixel = 4;
        const alignedBytesPerRow = Math.ceil(width * bytesPerPixel / 256) * 256;
        const bufferSize = alignedBytesPerRow * height;

        // 创建 staging buffer
        const stagingBuffer = device.createBuffer({
            size: bufferSize,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
            label: 'staging_buffer'
        });

        // 创建一个临时的输出缓冲区
        const outputBuffer = device.createBuffer({
            size: bufferSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
            label: 'output_buffer'
        });

        // 第一个命令编码器：执行计算
        const computeEncoder = device.createCommandEncoder({
            label: 'compute_encoder'
        });

        const bindGroup = device.createBindGroup({
            layout: bindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: uniformBuffer } },
                { binding: 1, resource: inputTexture.createView() },
                { binding: 2, resource: outputTexture.createView() },
                { binding: 3, resource: { buffer: histogramBuffer } },
                { binding: 4, resource: { buffer: cdfBuffer } }
            ],
            label: 'auto_exposure_bind_group'
        });

        const computePass = computeEncoder.beginComputePass({
            label: 'compute_pass'
        });
        computePass.setPipeline(pipeline);
        computePass.setBindGroup(0, bindGroup);
        computePass.dispatchWorkgroups(
            Math.ceil(width / workgroupSize),
            Math.ceil(height / workgroupSize)
        );
        computePass.end();

        // 提交计算命令
        device.queue.submit([computeEncoder.finish()]);
        await device.queue.onSubmittedWorkDone();

        // 第二个命令编码器：复制数据
        const copyEncoder = device.createCommandEncoder({
            label: 'copy_encoder'
        });

        // 从输出纹理复制到输出缓冲区
        copyEncoder.copyTextureToBuffer(
            { texture: outputTexture },
            {
                buffer: outputBuffer,
                bytesPerRow: alignedBytesPerRow,
                rowsPerImage: height,
            },
            { width, height, depthOrArrayLayers: 1 }
        );

        // 从输出缓冲区复制到暂存缓冲区
        copyEncoder.copyBufferToBuffer(
            outputBuffer, 0,
            stagingBuffer, 0,
            bufferSize
        );

        // 提交复制命令
        device.queue.submit([copyEncoder.finish()]);
        await device.queue.onSubmittedWorkDone();

        // 映射暂存缓冲区
        await stagingBuffer.mapAsync(GPUMapMode.READ);
        const mappedRange = new Uint8Array(stagingBuffer.getMappedRange());

        // 创建最终结果数组
        const finalResult = new Uint8Array(width * height * bytesPerPixel);

        // 复制数据，处理对齐问题
        for (let y = 0; y < height; y++) {
            const sourceOffset = y * alignedBytesPerRow;
            const targetOffset = y * width * bytesPerPixel;
            finalResult.set(
                mappedRange.subarray(
                    sourceOffset,
                    sourceOffset + width * bytesPerPixel
                ),
                targetOffset
            );
        }

        // 清理资源
        stagingBuffer.unmap();
        stagingBuffer.destroy();
        outputBuffer.destroy();

        // 返回 Sharp 对象
        return sharp(Buffer.from(finalResult), {
            raw: {
                width,
                height,
                channels: 4
            }
        });

    } catch (error) {
        console.error('GPU计算执行失败:', error, {
            width,
            height,
            details: error.stack
        });
        throw error;
    }
}

function 计算参数(直方图, 特征) {
    const totalPixels = 直方图.reduce((sum, count) => sum + count, 0);

    // 计算CDF
    const cdf = new Float32Array(256);
    let sum = 0;
    for (let i = 0; i < 256; i++) {
        sum += 直方图[i];
        cdf[i] = sum / totalPixels;
    }

    // 计算平均亮度
    let weightedSum = 0;
    for (let i = 0; i < 256; i++) {
        weightedSum += (i / 255.0) * 直方图[i];
    }
    const averageLuminance = weightedSum / totalPixels;

    // 根据特征调整目标曝光值
    let targetExposure = 0.5 - averageLuminance;

    // 如果有明显的峰值，向该方向适当调整
    if (特征.peakBin < 0.3) {
        // 暗部有峰值，增加曝光补偿
        targetExposure *= 1.2;
    } else if (特征.peakBin > 0.7) {
        // 亮部有峰值，减少曝光补偿
        targetExposure *= 0.8;
    }

    // 计算局部调整因子
    const variance = calculateVariance(直方图, averageLuminance, totalPixels);
    let localAdjustFactor = calculateLocalAdjustFactor(variance);

    // 根据特征调整局部因子
    if (特征.darkRatio > 0.4 || 特征.brightRatio > 0.4) {
        // 在极端情况下减少局部调整以避免过度处理
        localAdjustFactor *= 0.8;
    }

    return {
        cdf,
        targetExposure,
        localAdjustFactor
    };
}

function calculateVariance(直方图, mean, totalPixels) {
    let variance = 0;
    for (let i = 0; i < 256; i++) {
        const normalizedValue = i / 255.0;
        const diff = normalizedValue - mean;
        variance += (diff * diff) * 直方图[i];
    }
    return variance / totalPixels;
}

function calculateLocalAdjustFactor(variance) {
    // 基于方差调整局部因子
    // 方差越大，说明图像对比度越高，需要更温和的调整
    const baseAdjustment = 1.0;
    const varianceWeight = Math.min(variance * 4.0, 1.0);
    return baseAdjustment * (1.0 - varianceWeight * 0.5);
}

// 添加直方图分析功能
function 分析直方图特征(直方图) {
    const totalPixels = 直方图.reduce((sum, count) => sum + count, 0);

    // 找到最大值和最小值的位置
    let maxBin = 0;
    let maxCount = 0;
    let darkPixels = 0;
    let brightPixels = 0;

    for (let i = 0; i < 256; i++) {
        if (直方图[i] > maxCount) {
            maxCount = 直方图[i];
            maxBin = i;
        }

        if (i < 64) {
            darkPixels += 直方图[i];
        }
        if (i > 192) {
            brightPixels += 直方图[i];
        }
    }

    return {
        peakBin: maxBin / 255.0,
        darkRatio: darkPixels / totalPixels,
        brightRatio: brightPixels / totalPixels
    };
}

// 添加辅助函数用于验证图像数据
function 验证图像数据(data, width, height, channels) {
    if (!data || !data.length) {
        throw new Error('无效的图像数据');
    }

    if (width < 1 || height < 1) {
        throw new Error(`无效的图像尺寸: ${width}x${height}`);
    }

    const expectedLength = width * height * channels;
    if (data.length !== expectedLength) {
        throw new Error(`数据长度不匹配: 期望 ${expectedLength}, 实际 ${data.length}`);
    }

    return true;
}

async function 创建并设置缓冲区(device, histogram, cdf) {
    // 创建直方图缓冲区
    const histogramBuffer = device.createBuffer({
        size: 256 * 4, // 256个uint32值
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true
    });

    // 写入直方图数据
    new Uint32Array(histogramBuffer.getMappedRange()).set(histogram);
    histogramBuffer.unmap();

    // 创建CDF缓冲区
    const cdfBuffer = device.createBuffer({
        size: 256 * 4, // 256个float32值
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true
    });

    // 写入CDF数据
    new Float32Array(cdfBuffer.getMappedRange()).set(cdf);
    cdfBuffer.unmap();

    return { histogramBuffer, cdfBuffer };
}

// 添加一个辅助函数来等待 GPU 操作完成
async function 等待GPU操作完成(device) {
    const fence = device.createFence();
    const fenceValue = 1;
    device.queue.signal(fence, fenceValue);
    await fence.onCompletion(fenceValue);
}