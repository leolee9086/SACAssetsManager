import { fromBuffer } from "../../fromDeps/sharpInterface/useSharp/toSharp.js";
import { getHistogramFromSharp } from "../histogram.js";
import { getHistogramWebGPU } from "../histogram/webgpu.js";
//const 亮度调整 = 亮度调整基础 * (0.8 + 0.4 * Math.sin(Math.PI * x));

// 1. 首先添加 GPU 相关的工具函数
const initGPU = async () => {
    if (!navigator.gpu) {
        throw new Error('WebGPU not supported');
    }
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
        throw new Error('Couldn\'t request WebGPU adapter');
    }
    const device = await adapter.requestDevice();
    return { adapter, device };
};

// 2. 创建 GPU 缓冲区的辅助函数
const createBuffer = (device, data, usage) => {
    const buffer = device.createBuffer({
        size: data.byteLength,
        usage: usage,
        mappedAtCreation: true,
    });
    new Uint8Array(buffer.getMappedRange()).set(data);
    buffer.unmap();
    return buffer;
};

// 3. GPU 版本的亮度调整实现
async function 应用亮度调整GPU(buffer, 宽度, 高度, 累积分布函数, 参数) {
    try {
        const { device } = await initGPU();

        // 调试输出
        console.log('输入参数:', {
            宽度, 
            高度, 
            bufferLength: buffer.length,
            参数,
            '累积分布函数前几个值': 累积分布函数.slice(0, 5)
        });

        const shaderCode = `
            struct Params {
                strength: f32,
                total_pixels: u32,
                cdf_min: u32,
                dynamic_range: f32,
                local_adjustment: f32,
                width: u32,
                height: u32,
            }

            @group(0) @binding(0) var<storage, read> input: array<u32>;
            @group(0) @binding(1) var<storage, read> cdf: array<u32>;
            @group(0) @binding(2) var<uniform> params: Params;
            @group(0) @binding(3) var<storage, read_write> output: array<u32>;

            @compute @workgroup_size(16, 16)
            fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
                let x = global_id.x;
                let y = global_id.y;
                
                if (x >= params.width || y >= params.height) {
                    return;
                }

                let pixel_idx = (y * params.width + x) * 4u;
                if (pixel_idx >= arrayLength(&input)) {
                    return;
                }

                // 读取原始像素值
                var r = f32(input[pixel_idx]);
                var g = f32(input[pixel_idx + 1u]);
                var b = f32(input[pixel_idx + 2u]);
                let a = f32(input[pixel_idx + 3u]);

                // 计算亮度
                let brightness = u32(0.299 * r + 0.587 * g + 0.114 * b);
                
                // 计算目标亮度
                let cdf_value = f32(cdf[brightness] - params.cdf_min);
                let total_range = f32(params.total_pixels - params.cdf_min);
                let target_brightness = (cdf_value / total_range) * 255.0;
                
                // 计算亮度调整量
                let adjustment = params.strength * (target_brightness - f32(brightness));
                
                // 应用调整并确保值在0-255范围内
                r = clamp(r + adjustment, 0.0, 255.0);
                g = clamp(g + adjustment, 0.0, 255.0);
                b = clamp(b + adjustment, 0.0, 255.0);

                // 存储调整后的值
                output[pixel_idx] = u32(r);
                output[pixel_idx + 1u] = u32(g);
                output[pixel_idx + 2u] = u32(b);
                output[pixel_idx + 3u] = u32(a);  // 保持透明度不变
            }
        `;

        // 创建着色器模块
        const shaderModule = device.createShaderModule({
            code: shaderCode
        });

        // 创建输入缓冲区 - 需要转换为 Uint32Array
        const inputU32 = new Uint32Array(buffer.length);
        for (let i = 0; i < buffer.length; i++) {
            inputU32[i] = buffer[i];
        }
        
        // 调试输出
        console.log('输入数据前几个值:', Array.from(inputU32.slice(0, 16)));

        const inputBuffer = device.createBuffer({
            size: inputU32.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
            mappedAtCreation: true
        });
        new Uint32Array(inputBuffer.getMappedRange()).set(inputU32);
        inputBuffer.unmap();

        // 创建累积分布函数缓冲区
        const cdfU32 = new Uint32Array(累积分布函数);
        const cdfBuffer = device.createBuffer({
            size: cdfU32.byteLength,
            usage: GPUBufferUsage.STORAGE,
            mappedAtCreation: true
        });
        new Uint32Array(cdfBuffer.getMappedRange()).set(cdfU32);
        cdfBuffer.unmap();

        // 创建参数缓冲区
        const paramsData = new Float32Array([
            参数.strength,
            宽度 * 高度,
            累积分布函数[0],
            参数.dynamic_range || 1.0,
            参数.local_adjustment || 1.0,
            宽度,
            高度,
        ]);
        const paramsBuffer = device.createBuffer({
            size: paramsData.byteLength,
            usage: GPUBufferUsage.UNIFORM,
            mappedAtCreation: true
        });
        new Float32Array(paramsBuffer.getMappedRange()).set(paramsData);
        paramsBuffer.unmap();

        // 创建输出缓冲区
        const outputBuffer = device.createBuffer({
            size: buffer.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
        });

        // 创建绑定组布局
        const bindGroupLayout = device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'read-only-storage' }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'read-only-storage' }
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'uniform' }
                },
                {
                    binding: 3,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'storage' }
                }
            ]
        });

        // 创建计算管线
        const computePipeline = device.createComputePipeline({
            layout: device.createPipelineLayout({
                bindGroupLayouts: [bindGroupLayout]
            }),
            compute: {
                module: shaderModule,
                entryPoint: 'main'
            }
        });

        // 创建绑定组
        const bindGroup = device.createBindGroup({
            layout: bindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: inputBuffer } },
                { binding: 1, resource: { buffer: cdfBuffer } },
                { binding: 2, resource: { buffer: paramsBuffer } },
                { binding: 3, resource: { buffer: outputBuffer } }
            ]
        });

        // 创建命令编码器
        const commandEncoder = device.createCommandEncoder();
        const passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(computePipeline);
        passEncoder.setBindGroup(0, bindGroup);
        passEncoder.dispatchWorkgroups(Math.ceil(宽度 / 16), Math.ceil(高度 / 16));
        passEncoder.end();

        // 创建结果缓冲区
        const resultBuffer = device.createBuffer({
            size: buffer.byteLength,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });

        // 复制结果
        commandEncoder.copyBufferToBuffer(
            outputBuffer, 0,
            resultBuffer, 0,
            buffer.byteLength
        );

        // 提交命令
        device.queue.submit([commandEncoder.finish()]);

        // 等待结果并返回
        await resultBuffer.mapAsync(GPUMapMode.READ);
        const resultArray = new Uint8Array(resultBuffer.getMappedRange());
        
        // 调试输出
        console.log('输出数据前几个值:', Array.from(resultArray.slice(0, 16)));
        
        const finalResult = new Uint8Array(resultArray);
        resultBuffer.unmap();

        // 清理资源
        inputBuffer.destroy();
        cdfBuffer.destroy();
        paramsBuffer.destroy();
        outputBuffer.destroy();
        resultBuffer.destroy();
        console.log(finalResult)
        return finalResult;
    } catch (error) {
        console.error('GPU处理失败:', error);
        throw error;
    }
}

// 4. 修改主函数以使用 GPU 版本
async function 应用自动曝光与强度(buffer, 直方图, 宽度, 高度, 通道数, 强度 = 1.0, 迭代次数 = 1) {
    try {
        const 总像素 = 宽度 * 高度;
        const 累积分布函数 = new Array(256).fill(0);
        累积分布函数[0] = 直方图[0];
        for (let i = 1; i < 256; i++) {
            累积分布函数[i] = 累积分布函数[i - 1] + 直方图[i];
        }

        // 使用 GPU 处理
        return await 应用亮度调整GPU(buffer, 宽度, 高度, 累积分布函数, {
            strength: 强度,
            total_pixels: 总像素,
            cdf_min: 累积分布函数[0],
            dynamic_range: 评估动态范围(直方图),
            local_adjustment: 1.0
        });
    } catch (error) {
        console.warn('GPU处理失败，回退到CPU处理:', error);
        // 这里可以添加原来的 CPU 处理逻辑作为回退
        return buffer;
    }
}

// 其他辅助函数
function 评估动态范围(直方图, 采样置信度 = 0.95) {
    const 采样阈值 = Math.max(1, Math.floor(直方图.reduce((a, b) => a + b, 0) * (1 - 采样置信度)));
    
    let 累积计数 = 0;
    let 最小亮度 = 0;
    for (let i = 0; i < 直方图.length; i++) {
        累积计数 += 直方图[i];
        if (累积计数 > 采样阈值) {
            最小亮度 = i;
            break;
        }
    }
    
    累积计数 = 0;
    let 最大亮度 = 255;
    for (let i = 直方图.length - 1; i >= 0; i--) {
        累积计数 += 直方图[i];
        if (累积计数 > 采样阈值) {
            最大亮度 = i;
            break;
        }
    }
    
    return 最大亮度 - 最小亮度;
}

function 检测高光和阴影(直方图) {
    const 高光阈值 = 240;
    const 阴影阈值 = 15;
    let 高光 = 0;
    let 阴影 = 0;
    for (let i = 高光阈值; i < 直方图.length; i++) {
        高光 += 直方图[i];
    }
    for (let i = 0; i <= 阴影阈值; i++) {
        阴影 += 直方图[i];
    }
    return { 高光, 阴影 };
}

function 计算平均亮度(buffer) {
    // 使用蒙特卡洛采样代替全像素计算
    const 采样数量 = Math.min(1000000, Math.floor(buffer.length / 4 * 0.1)); // 采样10%的像素或最多10000个点
    const 采样点 = 蒙特卡洛采样(buffer, 采样数量, 4);
    
    let 总亮度 = 0;
    for (const 点 of 采样点) {
        const 亮度 = Math.round(0.299 * 点.r + 0.587 * 点.g + 0.114 * 点.b);
        总亮度 += 亮度;
    }
    
    return 总亮度 / 采样点.length;
}

function 设定目标曝光(平均亮度, 动态范围, 高光, 阴影) {
    const 理想平均值 = 128;
    const 理想标准差 = 55; // 增加标准差以允许更大的动态范围

    const 亮度偏差 = 理想平均值 - 平均亮度;
    
    // 更温和的正态分布权重
    const 正态分布权重 = Math.exp(-Math.pow(平均亮度 - 理想平均值, 2) / (2 * Math.pow(理想标准差, 2)));
    
    // 更保守的基础曝光调整
    let 目标曝光 = 亮度偏差 * 0.3 * (1 - 正态分布权重);

    // 更宽松的动态范围要求
    const 理想动态范围 = 200; // 增加理想动态范围
    if (动态范围 < 理想动态范围) {
        目标曝光 += (理想动态范围 - 动态范围) * 0.05; // 降低调整强度
    }

    // 更温和的高光阴影平衡
    const 高光阴影比 = 高光 / (阴影 + 1);
    if (高光阴影比 > 2) {
        目标曝光 -= Math.log(高光阴影比) * 0.3;
    } else if (高光阴影比 < 0.5) {
        目标曝光 += Math.log(1/高光阴影比) * 0.3;
    }

    return 目标曝光;
}

// 添加蒙特卡洛采样辅助函数
function 蒙特卡洛采样(buffer, 采样数量, 通道数) {
    const 采样点 = [];
    const 总像素数 = buffer.length / 通道数;
    
    for (let i = 0; i < 采样数量; i++) {
        const 随机索引 = Math.floor(Math.random() * 总像素数) * 通道数;
        采样点.push({
            r: buffer[随机索引],
            g: buffer[随机索引 + 1],
            b: buffer[随机索引 + 2]
        });
    }
    return 采样点;
}

// 新增辅助函数
function 评估局部动态范围(局部亮度统计) {
    const 总采样数 = 局部亮度统计.reduce((a, b) => a + b, 0);
    const 有效区间阈值 = 总采样数 * 0.02; // 2%的采样点作为有效区间的判断标准
    
    let 最小区间 = 0;
    let 最大区间 = 15;
    
    for (let i = 0; i < 局部亮度统计.length; i++) {
        if (局部亮度统计[i] > 有效区间阈值) {
            最小区间 = i;
            break;
        }
    }
    
    for (let i = 局部亮度统计.length - 1; i >= 0; i--) {
        if (局部亮度统计[i] > 有效区间阈值) {
            最大区间 = i;
            break;
        }
    }
    
    return (最大区间 - 最小区间) * 16; // 转换回亮度范围
}

function 计算局部调整系数(局部动态范围) {
    // 根据局部动态范围调整系数
    const 基准动态范围 = 128;
    return Math.min(1.5, Math.max(0.5, 基准动态范围 / 局部动态范围));
}

export const 自动曝光 = async (sharpObj, 强度) => {
    const { data, info, histogram } = await getHistogramFromSharp(sharpObj);
    const { width, height, channels } = info;
    console.log(width, height, channels)
    // 应用自动曝光调整
    const newData =await 应用自动曝光与强度(data, histogram.brightness, width, height, channels, 强度);
    
    // 将调整后的数据转换回 sharp 对象
    const newSharpObj = await fromBuffer(newData, {
        raw: {
            width: width,
            height: height,
            channels: channels
        }
    });

    return newSharpObj;
}