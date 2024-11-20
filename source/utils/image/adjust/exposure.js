import { getHistogramFromSharp } from "../histogram.js";
import { fromBuffer } from "../../fromDeps/sharpInterface/useSharp/toSharp.js";
class ResourcePool {
    constructor(device) {
        this.device = device;
        this.buffers = new Map();
        this.textures = new Map();
        this.registry = new FinalizationRegistry(this.cleanup.bind(this));
    }

    getBuffer(size, usage, label = '') {
        const key = `${size}_${usage}_${label}`;
        if (!this.buffers.has(key)) {
            const buffer = this.device.createBuffer({
                size,
                usage,
                label: `pool_buffer_${label}`
            });
            this.buffers.set(key, new WeakRef(buffer));
            this.registry.register(buffer, {
                type: 'buffer',
                key
            });
        }
        const bufferRef = this.buffers.get(key);
        const buffer = bufferRef.deref();
        if (buffer) return buffer;

        // 如果原始buffer已被回收，创建新的
        const newBuffer = this.device.createBuffer({
            size,
            usage,
            label: `pool_buffer_${label}`
        });
        this.buffers.set(key, new WeakRef(newBuffer));
        return newBuffer;
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

async function 创建输入纹理(device, sharpObj, 宽度, 高度) {
    if (!device || !sharpObj || !宽度 || !高度) {
        throw new Error('无效的输入参数');
    }

    try {
        // 使用sharp转换为标准RGBA格式
        const standardizedData = await sharpObj
            .ensureAlpha()  // 确保有alpha通道
            .raw()          // 获取原始数据
            .toBuffer();    // 转换为buffer

        console.log('创建纹理 - 输入尺寸:', 宽度, 'x', 高度, 'RGBA格式');

        const bytesPerPixel = 4; // RGBA格式
        const minBytesPerRow = 宽度 * bytesPerPixel;
        const alignedBytesPerRow = Math.ceil(minBytesPerRow / 256) * 256;

        // 创建纹理
        const texture = device.createTexture({
            size: [宽度, 高度],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
            dimension: '2d',
        });

        // 写入纹理
        device.queue.writeTexture(
            { texture },
            standardizedData,
            {
                bytesPerRow: minBytesPerRow,  // 使用实际的行宽度
                rowsPerImage: 高度
            },
            {
                width: 宽度,
                height: 高度
            }
        );

        return texture;
    } catch (error) {
        console.error('创建输入纹理失败:', error);
        throw error;
    }
}

function 创建输出纹理(device, 宽度, 高度) {
    // 检查尺寸
    if (宽度 < 1 || 高度 < 1) {
        throw new Error('无效的纹理尺寸');
    }

    return device.createTexture({
        size: [宽度, 高度],
        format: 'rgba8unorm',
        usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC,
        dimension: '2d',
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
        // 首先获取图像信息
        const { data, info, histogram } = await getHistogramFromSharp(sharpObj);
        const { width, height, channels } = info;

        // 验证设备限制
        const maxWorkgroupSize = device.limits?.maxComputeWorkgroupSize?.[0] ?? 256;
        const workgroupSize = Math.min(16, maxWorkgroupSize);

        // 然后并行处理管线创建和参数计算
        const [
            { pipeline, uniformBuffer, bindGroupLayout },
            params
        ] = await Promise.all([
            创建自动曝光GPU管线(device, width, height),
            计算参数(histogram.brightness, 分析直方图特征(histogram.brightness))
        ]);

        // 验证输入数据
        验证图像数据(data, width, height, channels);

        // 创建输入纹理
        const inputTexture = await 创建输入纹理(device, sharpObj, width, height);

        // 使用资源池获取缓冲区和纹理
        const outputTexture = resourcePool.getTexture(
            width, 
            height, 
            'rgba8unorm',
            GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC,
            'autoExposure_output'
        );

        const histogramBuffer = resourcePool.getBuffer(
            256 * 4,
            GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            'histogram'
        );

        const cdfBuffer = resourcePool.getBuffer(
            256 * 4,
            GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            'cdf'
        );

        // 批量更新缓冲区
        const commandEncoder = device.createCommandEncoder();
        device.queue.writeBuffer(histogramBuffer, 0, new Uint32Array(histogram.brightness));
        device.queue.writeBuffer(cdfBuffer, 0, new Float32Array(params.cdf));
        device.queue.writeBuffer(uniformBuffer, 0, new Float32Array([
            width,
            height,
            强度,
            params.targetExposure,
            params.localAdjustFactor
        ]));

        // 创建绑定组并执行计算
        const bindGroup = 创建绑定组(
            device,
            bindGroupLayout,
            uniformBuffer,
            inputTexture,
            outputTexture,
            histogramBuffer,
            cdfBuffer
        );

        const computePass = commandEncoder.beginComputePass();
        computePass.setPipeline(pipeline);
        computePass.setBindGroup(0, bindGroup);

        // 计算工作组数量
        const workgroupsX = Math.ceil(width / workgroupSize);
        const workgroupsY = Math.ceil(height / workgroupSize);
        
        // 验证工作组数量
        if (workgroupsX === 0 || workgroupsY === 0) {
            throw new Error(`无效的工作组大小: ${workgroupsX}x${workgroupsY}`);
        }

        computePass.dispatchWorkgroups(workgroupsX, workgroupsY);
        computePass.end();

        device.queue.submit([commandEncoder.finish()]);

        // 等待GPU完成并读取结果
        await device.queue.onSubmittedWorkDone();
        const result = await 读取结果纹理(device, outputTexture);

        // 清理临时资源
        inputTexture.destroy();

        // 转换结果
        const newSharpObj = await fromBuffer(result, {
            raw: {
                width,
                height,
                channels: 4
            }
        });

        return channels !== 4 
            ? await newSharpObj.toColorspace(channels === 1 ? 'b-w' : 'srgb')
            : newSharpObj;

    } catch (error) {
        console.error('自动曝光处理失败:', error);
        throw error;
    }
}

async function 读取结果纹理(device, texture) {
    const width = texture.width;
    const height = texture.height;
    const bytesPerPixel = 4;
    const minBytesPerRow = width * bytesPerPixel;
    const alignedBytesPerRow = Math.ceil(minBytesPerRow / 256) * 256;
    
    // 使用资源池获取缓冲区
    const resultBuffer = resourcePool.getBuffer(
        alignedBytesPerRow * height,
        GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        'readback'
    );

    const commandEncoder = device.createCommandEncoder();
    commandEncoder.copyTextureToBuffer(
        { texture },
        { 
            buffer: resultBuffer,
            bytesPerRow: alignedBytesPerRow,
            rowsPerImage: height 
        },
        { width, height }
    );

    device.queue.submit([commandEncoder.finish()]);
    await resultBuffer.mapAsync(GPUMapMode.READ);
    
    // 直接使用映射的内存
    const mappedRange = new Uint8Array(resultBuffer.getMappedRange());
    const finalResult = new Uint8Array(width * height * bytesPerPixel);
    
    // 使用更高效的数据拷贝
    if (alignedBytesPerRow === minBytesPerRow) {
        finalResult.set(mappedRange.subarray(0, width * height * bytesPerPixel));
    } else {
        for (let y = 0; y < height; y++) {
            const sourceOffset = y * alignedBytesPerRow;
            const targetOffset = y * minBytesPerRow;
            finalResult.set(
                mappedRange.subarray(sourceOffset, sourceOffset + minBytesPerRow),
                targetOffset
            );
        }
    }
    
    resultBuffer.unmap();
    return finalResult;
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