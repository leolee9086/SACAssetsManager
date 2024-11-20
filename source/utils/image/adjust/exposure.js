import { getHistogramFromSharp } from "../histogram.js";
import { fromBuffer } from "../../fromDeps/sharpInterface/useSharp/toSharp.js";
const adapter = await navigator.gpu.requestAdapter();
const device = await adapter.requestDevice();
const autoExposureShader =`
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

    // 读取原始像素值
    let color = textureLoad(inputTexture, pixel_coord, 0);
    
    // 计算亮度
    let luminance = dot(color.rgb, vec3<f32>(0.299, 0.587, 0.114));
    let normalizedLuminance = luminance;
    
    // 获取CDF调整后的目标亮度
    let luminanceIndex = u32(luminance * 255.0);
    let targetBaseLuminance = cdf[luminanceIndex];
    
    // 保护系数计算
    let protectionFactor = pow(abs(normalizedLuminance - 0.5) * 2.0, 0.5);
    let targetLuminance = mix(targetBaseLuminance, luminance, protectionFactor);
    
    // S曲线调整
    let x = luminance;
    let sigmoid = 1.0 / (1.0 + exp(-8.0 * (x - 0.5)));
    
    // 计算亮度调整量
    let baseLuminanceAdjust = uniforms.strength * (targetLuminance - luminance + uniforms.targetExposure);
    let luminanceAdjust = baseLuminanceAdjust * (0.5 + sigmoid * 0.5);
    
    // 应用局部调整系数
    let adjustmentFactor = 1.0 + (uniforms.localAdjustFactor * 0.2);
    let fineAdjust = luminanceAdjust * adjustmentFactor;
    
    // 限制调整范围
    let baseLimit = 45.0 / 255.0;
    let dynamicLimit = baseLimit * (1.0 - pow(abs(luminance - 0.5) * 2.0, 2.0));
    let limitedAdjust = clamp(fineAdjust, -dynamicLimit, dynamicLimit);
    
    // 应用调整
    let newColor = clamp(color.rgb + vec3<f32>(limitedAdjust), vec3<f32>(0.0), vec3<f32>(1.0));
    
    // 输出结果
    textureStore(outputTexture, pixel_coord, vec4<f32>(newColor, color.a));
}


`


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

function 创建输入纹理(device, 图像数据, 宽度, 高度) {
    const texture = device.createTexture({
        size: [宽度, 高度],
        format: 'rgba8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
        dimension: '2d',
    });

    // 计算对齐的行跨度
    const bytesPerRow = Math.ceil(宽度 * 4 / 256) * 256;
    
    // 创建临时缓冲区存储对齐的数据
    const paddedData = new Uint8Array(bytesPerRow * 高度);
    
    // 复制数据到对齐的缓冲区
    for (let row = 0; row < 高度; row++) {
        const sourceOffset = row * 宽度 * 4;
        const targetOffset = row * bytesPerRow;
        paddedData.set(
            new Uint8Array(图像数据.buffer, sourceOffset, 宽度 * 4),
            targetOffset
        );
    }

    device.queue.writeTexture(
        { texture },
        paddedData,
        { bytesPerRow, rowsPerImage: 高度 },
        { width: 宽度, height: 高度 }
    );

    return texture;
}

function 创建输出纹理(device, 宽度, 高度) {
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
    const { data, info, histogram } = await getHistogramFromSharp(sharpObj);
    const { width, height,channels } = info;
    
    try {
        // 获取管线和布局
        const { pipeline, uniformBuffer, bindGroupLayout } = await 创建自动曝光GPU管线(device, width, height);
        
        // 创建纹理
        const inputTexture = 创建输入纹理(device, data, width, height);
        const outputTexture = 创建输出纹理(device, width, height);
        
        // 创建直方图和CDF缓冲区
        const histogramBuffer = device.createBuffer({
            size: 256 * 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        
        const cdfBuffer = device.createBuffer({
            size: 256 * 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });

        // 计算参数
        const { cdf, targetExposure, localAdjustFactor } = 计算参数(histogram.brightness);
        
        // 更新缓冲区
        device.queue.writeBuffer(histogramBuffer, 0, new Uint32Array(histogram.brightness));
        device.queue.writeBuffer(cdfBuffer, 0, new Float32Array(cdf));
        device.queue.writeBuffer(uniformBuffer, 0, new Float32Array([
            width,
            height,
            强度,
            targetExposure,
            localAdjustFactor
        ]));

        // 使用新的bindGroupLayout创建绑定组
        const bindGroup = 创建绑定组(
            device,
            bindGroupLayout,
            uniformBuffer,
            inputTexture,
            outputTexture,
            histogramBuffer,
            cdfBuffer
        );

        // 执行计算
        const commandEncoder = device.createCommandEncoder();
        const computePass = commandEncoder.beginComputePass();
        computePass.setPipeline(pipeline);
        computePass.setBindGroup(0, bindGroup);
        
        const workgroupsX = Math.ceil(width / 16);
        const workgroupsY = Math.ceil(height / 16);
        computePass.dispatchWorkgroups(workgroupsX, workgroupsY);
        computePass.end();

        device.queue.submit([commandEncoder.finish()]);
        const result = await 读取结果纹理(device, outputTexture);
        inputTexture.destroy();
        outputTexture.destroy();
        histogramBuffer.destroy();
        cdfBuffer.destroy();
        uniformBuffer.destroy();
        const newSharpObj = await fromBuffer(result, {
            raw: {
                width: width,
                height: height,
                channels: channels
            }
        });
        return newSharpObj
    
    } catch (error) {
        console.error('自动曝光处理失败:', error);
        throw error;
    }
}

async function 读取结果纹理(device, texture) {
    const width = texture.width;
    const height = texture.height;
    
    // 计算对齐到256字节的行跨度
    const bytesPerRow = Math.ceil(width * 4 / 256) * 256;
    
    // 创建足够大的缓冲区来容纳对齐后的数据
    const resultBuffer = device.createBuffer({
        size: bytesPerRow * height,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });

    const commandEncoder = device.createCommandEncoder();
    commandEncoder.copyTextureToBuffer(
        { texture },
        { 
            buffer: resultBuffer,
            bytesPerRow: bytesPerRow,
            rowsPerImage: height 
        },
        { width, height }
    );

    device.queue.submit([commandEncoder.finish()]);

    // 等待GPU完成
    await resultBuffer.mapAsync(GPUMapMode.READ);
    const mappedRange = resultBuffer.getMappedRange();
    
    // 创建最终结果数组
    const finalResult = new Uint8Array(width * height * 4);
    
    // 复制每一行，跳过填充字节
    for (let row = 0; row < height; row++) {
        const sourceOffset = row * bytesPerRow;
        const targetOffset = row * width * 4;
        finalResult.set(
            new Uint8Array(mappedRange, sourceOffset, width * 4),
            targetOffset
        );
    }
    
    // 清理资源
    resultBuffer.unmap();
    resultBuffer.destroy();
    
    return finalResult;
}

function 计算参数(直方图) {
    // 计算总像素数
    const totalPixels = 直方图.reduce((sum, count) => sum + count, 0);
    
    // 计算CDF（累积分布函数）
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

    // 计算目标曝光值
    // 目标是使平均亮度接近0.5
    const targetExposure = 0.5 - averageLuminance;

    // 计算局部调整因子
    // 基于直方图的分布特征来调整
    const variance = calculateVariance(直方图, averageLuminance, totalPixels);
    const localAdjustFactor = calculateLocalAdjustFactor(variance);

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