const MAX_TEXTURE_SIZE = 2048; // WebGPU 最大纹理尺寸

/**
 * WebGPU 实现的直方图计算
 * @param {ImageBitmap|ImageData} bufferOBJ - 图像数据
 * @returns {Promise<Object>} 直方图数据
 */
export const getHistogramWebGPU = async (bufferOBJ) => {
    // 检查 WebGPU 支持
    if (!navigator.gpu) {
        throw new Error('WebGPU not supported');
    }

    const adjustedData = adjustBufferDimensions(bufferOBJ);
    
    if (adjustedData.needsSplit) {
        let result = await processLargeImage(adjustedData);
        console.error('正在处理超大图像')

        console.error(result)
        return result
    }
    
    return await processHistogramBlock(adjustedData);
};

/**
 * 处理大尺寸图像
 * @param {Object} adjustedData - 调整后的图像数据
 */
const processLargeImage = async (adjustedData) => {
    const { width, height, data, blocks } = adjustedData;
    const { numBlocksX, numBlocksY, maxSize } = blocks;
    
    // 创建累积直方图
    const totalHistogram = {
        r: new Array(256).fill(0),
        g: new Array(256).fill(0),
        b: new Array(256).fill(0),
        brightness: new Array(256).fill(0)
    };
    
    // 分块处理
    for (let blockY = 0; blockY < numBlocksY; blockY++) {
        for (let blockX = 0; blockX < numBlocksX; blockX++) {
            const blockWidth = Math.min(maxSize, width - blockX * maxSize);
            const blockHeight = Math.min(maxSize, height - blockY * maxSize);
            
            // 提取块数据
            const blockData = extractBlock(data, width, height, blockX, blockY, blockWidth, blockHeight);
            
            // 处理单个块
            const blockHistogram = await processHistogramBlock({
                data: blockData,
                width: blockWidth,
                height: blockHeight
            });
            
            // 合并直方图数据
            mergeHistograms(totalHistogram, blockHistogram);
        }
    }
    
    return totalHistogram;
};

/**
 * 处理单个图像块的直方图计算
 * @param {Object} blockData - 图像块数据
 */
const processHistogramBlock = async (blockData) => {
    const adapter = await navigator.gpu.requestAdapter();
    const device = await adapter.requestDevice();

    const { data, width, height, paddedPixels } = blockData;

    // 创建输出缓冲区
    const outputBuffer = device.createBuffer({
        size: 256 * 4 * 4,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });

    const resultBuffer = device.createBuffer({
        size: 256 * 4 * 4,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });

    // 创建纹理
    const texture = device.createTexture({
        size: [width, height],
        format: 'rgba8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });

    // 写入纹理数据
    device.queue.writeTexture(
        { texture },
        data,
        { bytesPerRow: width * 4, rowsPerImage: height },
        { width, height, depthOrArrayLayers: 1 }
    );

    // 创建计算管线
    const pipeline = device.createComputePipeline({
        layout: 'auto',
        compute: {
            module: device.createShaderModule({
                code: getComputeShaderCode(),
            }),
            entryPoint: 'main',
        },
    });

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
        Math.ceil(width / 16),
        Math.ceil(height / 16)
    );
    computePass.end();

    // 复制结果
    commandEncoder.copyBufferToBuffer(
        outputBuffer, 0,
        resultBuffer, 0,
        256 * 4 * 4
    );

    // 提交并获取结果
    device.queue.submit([commandEncoder.finish()]);
    await resultBuffer.mapAsync(GPUMapMode.READ);
    const results = new Uint32Array(resultBuffer.getMappedRange());
    
    const histogram = {
        r: Array.from(results.slice(0, 256)),
        g: Array.from(results.slice(256, 512)),
        b: Array.from(results.slice(512, 768)),
        brightness: Array.from(results.slice(768, 1024))
    };

    // 清理资源
    resultBuffer.unmap();
    texture.destroy();
    outputBuffer.destroy();
    resultBuffer.destroy();

    return paddedPixels ? correctHistogram(histogram, paddedPixels) : histogram;
};

/**
 * 获取计算着色器代码
 */
const getComputeShaderCode = () => `
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
        
        let r_index = u32(color.r * 255.0);
        let g_index = u32(color.g * 255.0);
        let b_index = u32(color.b * 255.0);
        let brightness = u32((0.299 * color.r + 0.587 * color.g + 0.114 * color.b) * 255.0);
        
        atomicAdd(&outputBuffer[r_index], 1u);
        atomicAdd(&outputBuffer[g_index + 256u], 1u);
        atomicAdd(&outputBuffer[b_index + 512u], 1u);
        atomicAdd(&outputBuffer[brightness + 768u], 1u);
    }
`;

/**
 * 提取图像块
 */
const extractBlock = (data, fullWidth, fullHeight, blockX, blockY, blockWidth, blockHeight) => {
    const blockData = new Uint8Array(blockWidth * blockHeight * 4);
    const startX = blockX * MAX_TEXTURE_SIZE;
    const startY = blockY * MAX_TEXTURE_SIZE;
    
    for (let y = 0; y < blockHeight; y++) {
        for (let x = 0; x < blockWidth; x++) {
            const srcIdx = ((startY + y) * fullWidth + (startX + x)) * 4;
            const dstIdx = (y * blockWidth + x) * 4;
            blockData[dstIdx] = data[srcIdx];
            blockData[dstIdx + 1] = data[srcIdx + 1];
            blockData[dstIdx + 2] = data[srcIdx + 2];
            blockData[dstIdx + 3] = data[srcIdx + 3];
        }
    }
    
    return blockData;
};

/**
 * 合并直方图数据
 */
const mergeHistograms = (total, block) => {
    ['r', 'g', 'b', 'brightness'].forEach(channel => {
        for (let i = 0; i < 256; i++) {
            total[channel][i] += block[channel][i];
        }
    });
};

/**
 * 调整buffer尺寸并记录填充信息
 * @param {ImageBitmap|ImageData} bufferOBJ - 输入图像对象
 * @returns {Object} 调整后的数据和填充信息
 */
const adjustBufferDimensions = (bufferOBJ) => {
    // 获取图像数据
    let width, height, data;
    if (bufferOBJ instanceof ImageBitmap) {
        width = bufferOBJ.width;
        height = bufferOBJ.height;
        // 从 ImageBitmap 获取像素数据
        const canvas = new OffscreenCanvas(width, height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(bufferOBJ, 0, 0);
        const imageData = ctx.getImageData(0, 0, width, height);
        data = imageData.data;
    } else {
        // ImageData 对象
        width = bufferOBJ.width;
        height = bufferOBJ.height;
        data = bufferOBJ.data;
    }

    // 检查是否需要分块处理（超过最大纹理尺寸）
    if (width > MAX_TEXTURE_SIZE || height > MAX_TEXTURE_SIZE) {
        return {
            data,
            width,
            height,
            needsSplit: true,
            blocks: {
                numBlocksX: Math.ceil(width / MAX_TEXTURE_SIZE),
                numBlocksY: Math.ceil(height / MAX_TEXTURE_SIZE),
                maxSize: MAX_TEXTURE_SIZE
            }
        };
    }

    // 对于不需要分块的图像，进行16的倍数对齐处理
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
            needsSplit: false,
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
        needsSplit: false,
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

