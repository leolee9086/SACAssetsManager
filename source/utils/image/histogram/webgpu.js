const adapter = await navigator.gpu.requestAdapter();
const device = await adapter.requestDevice();

/**
 * WebGPU 实现的直方图计算
 * @param {ImageBitmap|ImageData} bufferOBJ - 图像数据
 * @returns {Promise<Object>} 直方图数据
 */
export const getHistogramWebGPU = async (bufferOBJ) => {
    const performanceLogger = {};
    const mark = (name) => {
        performanceLogger[name] = performance.now();
        console.log(`[性能记录] ${name}: ${performanceLogger[name].toFixed(2)}ms`);
    };
    const measure = (end, start) => {
        const duration = performanceLogger[end] - performanceLogger[start];
        console.log(`[性能记录] ${start} -> ${end}: ${duration.toFixed(2)}ms`);
        return duration;
    };
    const { 
        data,
        width, 
        height,
        paddedPixels 
    } = adjustBufferDimensions(bufferOBJ);
    console.log(paddedPixels)
    bufferOBJ={data,width,height}
    mark('开始');

    // 检查 WebGPU 支持
    if (!navigator.gpu) {
        throw new Error('WebGPU not supported');
    }

    mark('请求适配器开始');
    mark('请求适配器完成');
    measure('请求适配器完成', '请求适配器开始');
    
    mark('请求设备开始');
    mark('请求设备完成');
    measure('请求设备完成', '请求设备开始');

    mark('创建缓冲区开始');
    // 修改输出缓冲区大小 (现在是4个通道: R,G,B,亮度)
    const outputBuffer = device.createBuffer({
        size: 256 * 4 * 4, // 4个通道，每个通道256个值，每个值4字节
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });

    const resultBuffer = device.createBuffer({
        size: 256 * 4 * 4,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    mark('创建缓冲区完成');

    // 更新计算着色器代码，添加亮度计算
    const computeShaderCode = `
        @group(0) @binding(0) var inputTexture: texture_2d<f32>;
        @group(0) @binding(1) var<storage, read_write> outputBuffer: array<atomic<u32>>;

        @compute @workgroup_size(16, 16)
        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
            let dims = textureDimensions(inputTexture);
            let coord = vec2<u32>(global_id.xy);
            
            if (coord.x >= u32(dims.x) || coord.y >= u32(dims.y)) {
                return;
            }

            let texCoord = vec2<i32>(coord);
            let color = textureLoad(inputTexture, texCoord, 0);
            
            // 将颜色值转换为 0-255 范围的索引
            let r_index = u32(color.r * 255.0);
            let g_index = u32(color.g * 255.0);
            let b_index = u32(color.b * 255.0);
            
            // 计算亮度 (使用标准RGB到亮度的转换公式)
            let brightness = u32((0.299 * color.r + 0.587 * color.g + 0.114 * color.b) * 255.0);
            
            // 原子操作增加计数 (注意偏移量的变化)
            atomicAdd(&outputBuffer[r_index], 1u);                    // R通道
            atomicAdd(&outputBuffer[g_index + 256u], 1u);            // G通道
            atomicAdd(&outputBuffer[b_index + 512u], 1u);            // B通道
            atomicAdd(&outputBuffer[brightness + 768u], 1u);         // 亮度通道
        }
    `;

    // 设置计算管线
    const pipeline = device.createComputePipeline({
        layout: 'auto',
        compute: {
            module: device.createShaderModule({
                code: computeShaderCode,
            }),
            entryPoint: 'main',
        },
    });
    mark('创建管线完成');
    measure('创建管线完成', '创建管线开始');

    mark('创建纹理开始');
    // 创建纹理
    const texture = device.createTexture({
        size: [bufferOBJ.width, bufferOBJ.height],
        format: 'rgba8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });
    mark('创建纹理完成');
    measure('创建纹理完成', '创建纹理开始');

    mark('上传图像数据开始');
    device.queue.writeTexture(
        { texture },
        bufferOBJ.data,
        { 
            bytesPerRow: bufferOBJ.width * 4,
            rowsPerImage: bufferOBJ.height
        },
        { 
            width: bufferOBJ.width,
            height: bufferOBJ.height,
            depthOrArrayLayers: 1
        }
    );
    mark('上传图像数据完成');
    measure('上传图像数据完成', '上传图像数据开始');

    mark('创建绑定组开始');
    // 创建绑定组
    const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            {
                binding: 0,
                resource: texture.createView(),
            },
            {
                binding: 1,
                resource: { buffer: outputBuffer },
            },
        ],
    });
    mark('创建绑定组完成');
    measure('创建绑定组完成', '创建绑定组开始');

    mark('执行计算开始');
    // 执行计算
    const commandEncoder = device.createCommandEncoder();
    const computePass = commandEncoder.beginComputePass();
    computePass.setPipeline(pipeline);
    computePass.setBindGroup(0, bindGroup);
    computePass.dispatchWorkgroups(
        Math.ceil(bufferOBJ.width / 16),
        Math.ceil(bufferOBJ.height / 16)
    );
    computePass.end();

    // 复制结果到可读取的缓冲区
    commandEncoder.copyBufferToBuffer(
        outputBuffer, 0,
        resultBuffer, 0,
        256 * 4 * 4
    );

    // 提交命令
    device.queue.submit([commandEncoder.finish()]);
    mark('执行计算完成');
    measure('执行计算完成', '执行计算开始');

    mark('读取结果开始');
    // 读取结果
    await resultBuffer.mapAsync(GPUMapMode.READ);
    const results = new Uint32Array(resultBuffer.getMappedRange());
    mark('读取结果完成');
    measure('读取结果完成', '读取结果开始');
    
    mark('整理结果开始');
    const histogram = {
        r: Array.from(results.slice(0, 256)),
        g: Array.from(results.slice(256, 512)),
        b: Array.from(results.slice(512, 768)),
        brightness: Array.from(results.slice(768, 1024))
    };
    mark('整理结果完成');
    measure('整理结果完成', '整理结果开始');

    mark('清理资源开始');
    resultBuffer.unmap();
    texture.destroy();
    outputBuffer.destroy();
    resultBuffer.destroy();
    mark('清理资源完成');
    measure('清理资源完成', '清理资源开始');

    mark('结束');
    
    // 输出总耗时和每个阶段的耗时统计
    measure('结束', '开始');
    
    // 输出所有阶段的耗时统计
    const stages = Object.keys(performanceLogger).filter(key => key.endsWith('开始'));
    stages.forEach(startKey => {
        const endKey = startKey.replace('开始', '完成');
        if (performanceLogger[endKey]) {
            measure(endKey, startKey);
        }
    });

    const correctedHistogram = correctHistogram(histogram, paddedPixels);
    
    return correctedHistogram;
};

/**
 * 调整buffer尺寸并记录填充信息
 * @param {Object} params
 * @returns {Object} 调整后的数据和填充信息
 */
const adjustBufferDimensions = ({ data, width, height }) => {
    const targetWidth = Math.ceil(width / 16) * 16;
    const targetHeight = Math.ceil(height / 16) * 16;
    
    // 如果尺寸已经合适，直接返回原数据
    if (width === targetWidth && height === targetHeight) {
        return { 
            data, 
            width: targetWidth, 
            height: targetHeight,
            originalPixels: width * height,
            paddedPixels: 0
        };
    }
    
    // 计算新的buffer大小 (RGBA格式，每个像素4字节)
    const newSize = targetWidth * targetHeight * 4;
    const newData = new Uint8Array(newSize);
    
    // 填充新buffer为透明黑色 (R=0,G=0,B=0,A=0)
    newData.fill(0);
    
    // 复制原始数据
    for (let y = 0; y < height; y++) {
        const oldRowStart = y * width * 4;
        const newRowStart = y * targetWidth * 4;
        newData.set(
            data.slice(oldRowStart, oldRowStart + width * 4),
            newRowStart
        );
    }
    
    return {
        data: newData,
        width: targetWidth,
        height: targetHeight,
        originalPixels: width * height,
        paddedPixels: (targetWidth * targetHeight) - (width * height)
    };
};

/**
 * 修正直方图数据，去除填充像素的影响
 * @param {Object} histogram - 原始直方图数据
 * @param {number} paddedPixels - 填充的像素数量
 * @returns {Object} 修正后的直方图数据
 */
const correctHistogram = (histogram, paddedPixels) => {
    if (paddedPixels === 0) return histogram;
    
    // 从0值中减去填充像素的数量
    histogram.r[0] -= paddedPixels;
    histogram.g[0] -= paddedPixels;
    histogram.b[0] -= paddedPixels;
    histogram.brightness[0] -= paddedPixels;
    
    return histogram;
};

