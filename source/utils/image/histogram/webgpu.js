const adapter = await navigator.gpu.requestAdapter();
const device = await adapter.requestDevice();

/**
 * WebGPU 实现的直方图计算
 * @param {ImageBitmap|ImageData} bufferOBJ - 图像数据
 * @returns {Promise<Object>} 直方图数据
 */
export const getHistogramWebGPU = async (bufferOBJ) => {
 
    const { 
        data,
        width, 
        height,
        paddedPixels 
    } = adjustBufferDimensions(bufferOBJ);
    bufferOBJ={data,width,height}

    // 检查 WebGPU 支持
    if (!navigator.gpu) {
        throw new Error('WebGPU not supported');
    }

    // 修改输出缓冲区大小 (现在是4个通道: R,G,B,亮度)
    const outputBuffer = device.createBuffer({
        size: 256 * 4 * 4, // 4个通道，每个通道256个值，每个值4字节
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });

    const resultBuffer = device.createBuffer({
        size: 256 * 4 * 4,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });

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
    // 创建纹理
    const texture = device.createTexture({
        size: [bufferOBJ.width, bufferOBJ.height],
        format: 'rgba8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });
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
    // 读取结果
    await resultBuffer.mapAsync(GPUMapMode.READ);
    const results = new Uint32Array(resultBuffer.getMappedRange());
    const histogram = {
        r: Array.from(results.slice(0, 256)),
        g: Array.from(results.slice(256, 512)),
        b: Array.from(results.slice(512, 768)),
        brightness: Array.from(results.slice(768, 1024))
    };
    resultBuffer.unmap();
    texture.destroy();
    outputBuffer.destroy();
    resultBuffer.destroy();
    
   
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
    
    // 检查是否需要转换为RGBA格式
    const hasAlpha = data.length === width * height * 4;
    const sourceChannels = hasAlpha ? 4 : 3;
    
    // 如果尺寸已经合适且已经是RGBA格式，直接返回原数据
    if (width === targetWidth && height === targetHeight && hasAlpha) {
        return { 
            data, 
            width,
            height,
            paddedPixels: 0 
        };
    }
    
    // 创建新的RGBA数据缓冲区
    const newData = new Uint8Array(targetWidth * targetHeight * 4);
    newData.fill(0);
    
    // 按像素复制数据，同时转换为RGBA格式
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const srcIdx = (y * width + x) * sourceChannels;
            const dstIdx = (y * targetWidth + x) * 4;
            
            // 复制RGB通道
            newData[dstIdx] = data[srcIdx];     // R
            newData[dstIdx + 1] = data[srcIdx + 1]; // G
            newData[dstIdx + 2] = data[srcIdx + 2]; // B
            newData[dstIdx + 3] = hasAlpha ? data[srcIdx + 3] : 255; // A
        }
    }
    
    return {
        data: newData,
        width: targetWidth,
        height: targetHeight,
        paddedPixels: (targetWidth * targetHeight - width * height)
    };
};

/**
 * 修正直方图数据，去除填充像素的影响
 * @param {Object} histogram - 原始直方图数据
 * @param {number} originalPixels - 原始像素数量
 * @param {number} totalPixels - 总像素数量
 * @returns {Object} 修正后的直方图数据
 */
const correctHistogram = (histogram, paddedPixels) => {
    if (paddedPixels <= 0) return histogram;
    
    // 从0值中减去填充像素的数量
    histogram.r[0] -= paddedPixels/4;
    histogram.g[0] -= paddedPixels/4;
    histogram.b[0] -= paddedPixels/4;
    histogram.brightness[0] -= paddedPixels/4;
    return histogram;
};

