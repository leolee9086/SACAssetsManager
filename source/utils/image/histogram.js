import { showHistogramDialog } from '../../UI/siyuanCommon/dialog/image/histogram.js';
import { 创建经典直方图配置 } from '../fromDeps/echarts/presets.js';
import { fromFilePath } from '../fromDeps/sharpInterface/useSharp/toSharp.js';
import { getHistogramGPUjs } from './histogram/cpu.js';
const adapter = await navigator.gpu.requestAdapter();
const device = await adapter.requestDevice();


/**
 * 转换为像素直方图
 * @param {Uint8Array|Uint8ClampedArray} buffer - 图像buffer数据
 * @returns {Object} 直方图数据
 */
const getHistogramFromBuffer = (buffer) => {
    // 确保输入数据有效
    if (!buffer || !buffer.length) {
        throw new Error('无效的图像数据');
    }
    
    // 检查数据长度是否为4的倍数（RGBA）
    if (buffer.length % 4 !== 0) {
        throw new Error('图像数据长度必须是4的倍数');
    }

    // 初始化直方图数组
    const histogram = {
        r: new Array(256).fill(0),
        g: new Array(256).fill(0),
        b: new Array(256).fill(0),
        a: new Array(256).fill(0),
        brightness: new Array(256).fill(0)
    };

    // 遍历像素数据
    for (let i = 0; i < buffer.length; i += 4) {
        const r = buffer[i];
        const g = buffer[i + 1];
        const b = buffer[i + 2];
        const a = buffer[i + 3];

        // 计算亮度
        const brightness = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

        // 添加范围检查
        if (r >= 0 && r < 256) histogram.r[r]++;
        if (g >= 0 && g < 256) histogram.g[g]++;
        if (b >= 0 && b < 256) histogram.b[b]++;
        if (a >= 0 && a < 256) histogram.a[a]++;
        if (brightness >= 0 && brightness < 256) histogram.brightness[brightness]++;
    }

    return histogram;
};
/**
 * WebGPU 实现的直方图计算
 * @param {ImageBitmap|ImageData} imageData - 图像数据
 * @returns {Promise<Object>} 直方图数据
 */
 const getHistogramWebGPU = async (imageData) => {
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
        size: [imageData.width, imageData.height],
        format: 'rgba8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });
    mark('创建纹理完成');
    measure('创建纹理完成', '创建纹理开始');

    mark('上传图像数据开始');
    device.queue.writeTexture(
        { texture },
        imageData.data,
        { 
            bytesPerRow: imageData.width * 4,
            rowsPerImage: imageData.height
        },
        { 
            width: imageData.width,
            height: imageData.height,
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
        Math.ceil(imageData.width / 16),
        Math.ceil(imageData.height / 16)
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

    return histogram;
};
/**
 * 统一的直方图计算接口
 * @param {ImageBitmap|ImageData|Buffer} imageData - 图像数据
 * @returns {Promise<Object>} 直方图数据
 */
export const calculateHistogram = async (imageData, options = {}) => {
    const { useGPU = true, onProgress } = options;
    
    try {
        // 只在明确指定且支持的情况下使用GPU
        if (useGPU && navigator?.gpu) {
            return await getHistogramWebGPU(imageData);
        }
        
        // 处理 ImageBitmap
        if (imageData instanceof ImageBitmap) {
            // 转换 ImageBitmap 为 ImageData
            const canvas = new OffscreenCanvas(imageData.width, imageData.height);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(imageData, 0, 0);
            const imgData = ctx.getImageData(0, 0, imageData.width, imageData.height);
            return getHistogramFromBuffer(imgData.data);
        }
        
        // 现有的降级处理逻辑
        if (imageData instanceof ImageData) {
            return getHistogramFromBuffer(imageData.data);
        } else if (imageData instanceof Buffer || imageData instanceof Uint8Array) {
            return getHistogramFromBuffer(imageData);
        }
        
        throw new Error('不持的图像数据格式');
    } catch (error) {
        console.warn('直方图计算失败，尝试降级处理:', error);
        // 降级处理
        if (imageData instanceof ImageData) {
            return getHistogramFromBuffer(imageData.data);
        }
        throw error;
    }
};


export const getHistogramFromPath =async (imagePath)=>{
        // 使用 sharp 读取图像数据
        const image = fromFilePath(imagePath);
        const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
        
        console.log('图片大小:', (info.size / 1024 / 1024).toFixed(2), 'MB');
        console.log('ImageData信息:');
        console.log('- 宽度:', info.width);
        console.log('- 高度:', info.height);
        console.log('- 数据类型:', data.constructor.name);
        console.log('- 数据长度:', data.length);
        console.log('- 前10个像素值:', Array.from(data.slice(0, 40)));

        // 测试CPU版本
        console.time('直方图计算时间');
        const histogram = await getHistogramWebGPU({data,width,height}, { useGPU: false });
        console.timeEnd('直方图计算时间');
        return {
            data,
            info,
            histogram,
            imagePath
        }
}
export const getHistogramFromSharp =async (sharpObj)=>{
    // 使用 sharp 读取图像数据
    const { data, info } =await sharpObj.raw().toBuffer({ resolveWithObject: true });
    const {width,height}=info
    
    // 测试CPU版本
    console.time('直方图计算时间');
   const histogram = await getHistogramWebGPU({data,width,height}, { useGPU: false });

   console.timeEnd('直方图计算时间');
    return {
        data,
        info,
        histogram,
    }
}



async function testHistogram() {
    console.log('开始测试直方图计算...');
    
    try {
        // 读取测试图片
        const imagePath = "C:\\Users\\al765\\Downloads\\D5_场景 7 2_20240122_061651.png";        
        showHistogramDialog({imagePath});

    } catch (error) {
        console.error('测试失败:', error);
        if (error.stack) {
            console.error('错误堆栈:', error.stack);
        }
    }
}

window.testHistogram=testHistogram