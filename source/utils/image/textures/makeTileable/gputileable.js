import { requireWGSLCode } from "../../../module/wgslModule.js";

export const tileableTexture = {
    code: await requireWGSLCode(import.meta.resolve('./gputileable.wgsl')),
    uniforms: {
        // 基础参数
        input_texture: 'texture_2d<f32>',
        input_sampler: 'sampler',
        t_input: 'texture_2d<f32>',    // 高斯输入纹理
        t_inv: 'texture_2d<f32>',      // 逆变换纹理
        t_sampler: 'sampler',           // 纹理采样器
        // 添加混合宽度参数
        borderWidthPercent: 'f32'
    },
 
    
    // 创建处理管线
    async createPipeline(device, format) {
        // 创建两个不同的绑定组布局
        const computeBindGroupLayout = device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    texture: { sampleType: 'float' }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    sampler: { type: 'filtering' }
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.COMPUTE,
                    texture: { sampleType: 'float' }
                },
                {
                    binding: 3,
                    visibility: GPUShaderStage.COMPUTE,
                    texture: { sampleType: 'float' }
                },
                {
                    binding: 4,
                    visibility: GPUShaderStage.COMPUTE,
                    sampler: { type: 'filtering' }
                },
                {
                    binding: 5,
                    visibility: GPUShaderStage.COMPUTE,
                    storageTexture: {
                        access: 'write-only',
                        format: 'rgba8unorm'
                    }
                },
                {
                    binding: 6,
                    visibility: GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,
                    buffer: { type: 'uniform' }
                }
            ]
        });

        const renderBindGroupLayout = device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: { sampleType: 'float' }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: { type: 'filtering' }
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: { sampleType: 'float' }
                },
                {
                    binding: 3,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: { sampleType: 'float' }
                },
                {
                    binding: 4,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: { type: 'filtering' }
                }
            ]
        });

        // 创建渲染管线
        const renderPipeline = device.createRenderPipeline({
            layout: device.createPipelineLayout({
                bindGroupLayouts: [renderBindGroupLayout]
            }),
            vertex: {
                module: device.createShaderModule({
                    code: this.code
                }),
                entryPoint: 'vertexMain'
            },
            fragment: {
                module: device.createShaderModule({
                    code: this.code
                }),
                entryPoint: 'fragmentMain',
                targets: [{ format }]
            }
        });

        // 创建计算管线
        const computePipeline = device.createComputePipeline({
            layout: device.createPipelineLayout({
                bindGroupLayouts: [computeBindGroupLayout]
            }),
            compute: {
                module: device.createShaderModule({
                    code: this.code
                }),
                entryPoint: 'computeTransform'
            }
        });

        return { 
            renderPipeline, 
            computePipeline, 
            computeBindGroupLayout, 
            renderBindGroupLayout 
        };
    },

    // 处理纹理使其无缝化
    async process(device, inputTexture, width, height, borderWidthPercent = 15) {
        // 验证并限制百分比范围
        borderWidthPercent = Math.max(1, Math.min(49, borderWidthPercent));
        
        // 创建 uniform buffer 来存储混合宽度
        const uniformBuffer = device.createBuffer({
            size: 4, // 一个 f32
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true,
        });
        
        // 将百分比转换为 0-1 范围的值
        new Float32Array(uniformBuffer.getMappedRange())[0] = borderWidthPercent / 100;
        uniformBuffer.unmap();

        // 获取管线和布局
        const { renderPipeline, computePipeline, computeBindGroupLayout, renderBindGroupLayout } = 
            await this.createPipeline(device, 'rgba8unorm');

        // 创建采样器
        const sampler = device.createSampler({
            magFilter: 'linear',
            minFilter: 'linear',
            mipmapFilter: 'linear',
            addressModeU: 'repeat',
            addressModeV: 'repeat'
        });

        // 创建高斯变换纹理和逆变换纹理
        const gaussianTexture = this.createGaussianTexture(device, width, height);
        const inverseTexture = this.createInverseTexture(device, width, height);

        // 创建输出纹理，添加 COPY_SRC 使用权限
        const outputTexture = device.createTexture({
            size: [width, height],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.RENDER_ATTACHMENT | 
                   GPUTextureUsage.COPY_SRC |
                   GPUTextureUsage.TEXTURE_BINDING  // 添加这个权限
        });

        // 创建中间存储纹理
        const intermediateTexture = device.createTexture({
            size: [width, height],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.STORAGE_BINDING | 
                   GPUTextureUsage.TEXTURE_BINDING |
                   GPUTextureUsage.COPY_SRC
        });

        // 创建绑定组
        const computeBindGroup = device.createBindGroup({
            layout: computeBindGroupLayout,
            entries: [
                { binding: 0, resource: inputTexture.createView() },
                { binding: 1, resource: sampler },
                { binding: 2, resource: gaussianTexture.createView() },
                { binding: 3, resource: inverseTexture.createView() },
                { binding: 4, resource: sampler },
                { binding: 5, resource: intermediateTexture.createView() },
                { binding: 6, resource: { buffer: uniformBuffer } }
            ]
        });

        const renderBindGroup = device.createBindGroup({
            layout: renderBindGroupLayout,
            entries: [
                { binding: 0, resource: intermediateTexture.createView() },
                { binding: 1, resource: sampler },
                { binding: 2, resource: gaussianTexture.createView() },
                { binding: 3, resource: inverseTexture.createView() },
                { binding: 4, resource: sampler }
            ]
        });

        // 创建最终输出纹理
        const finalOutputTexture = device.createTexture({
            size: [width, height],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.RENDER_ATTACHMENT | 
                   GPUTextureUsage.COPY_SRC |
                   GPUTextureUsage.TEXTURE_BINDING
        });

        // 执行命令
        const commandEncoder = device.createCommandEncoder();

        // 计算通道
        const computePass = commandEncoder.beginComputePass();
        computePass.setPipeline(computePipeline);
        computePass.setBindGroup(0, computeBindGroup);
        computePass.dispatchWorkgroups(Math.ceil(width / 8), Math.ceil(height / 8));
        computePass.end();

        // 渲染通道 - 确保渲染到最终输出纹理
        const renderPass = commandEncoder.beginRenderPass({
            colorAttachments: [{
                view: finalOutputTexture.createView(),  // 使用最终输出纹理
                clearValue: { r: 0, g: 0, b: 0, a: 1 },
                loadOp: 'clear',
                storeOp: 'store'
            }]
        });

        renderPass.setPipeline(renderPipeline);
        renderPass.setBindGroup(0, renderBindGroup);
        renderPass.draw(6, 1, 0, 0);
        renderPass.end();

        // 提交命令
        device.queue.submit([commandEncoder.finish()]);

        // 等待 GPU 完成
        await device.queue.onSubmittedWorkDone();

        // 清理临时纹理
        intermediateTexture.destroy();
        gaussianTexture.destroy();
        inverseTexture.destroy();

        // 返回最终处理后的纹理
        return finalOutputTexture;
    },

    // 创建高斯变换纹理
    createGaussianTexture(device, width, height) {
        this.sampler = device.createSampler({
            magFilter: 'linear',
            minFilter: 'linear',
            mipmapFilter: 'linear',
            addressModeU: 'repeat',
            addressModeV: 'repeat'
        });

        const texture = device.createTexture({
            size: [width, height],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING | 
                   GPUTextureUsage.COPY_DST |
                   GPUTextureUsage.STORAGE_BINDING
        });

        const outputTexture = device.createTexture({
            size: [width, height],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.STORAGE_BINDING | 
                   GPUTextureUsage.TEXTURE_BINDING
        });

        // 创建专用的计算管线布局
        const computeBindGroupLayout = device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    texture: { sampleType: 'float' }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    sampler: { type: 'filtering' }
                },
                {
                    binding: 5,
                    visibility: GPUShaderStage.COMPUTE,
                    storageTexture: {
                        access: 'write-only',
                        format: 'rgba8unorm'
                    }
                }
            ]
        });

        const computeBindGroup = device.createBindGroup({
            layout: computeBindGroupLayout,
            entries: [
                { binding: 0, resource: texture.createView() },
                { binding: 1, resource: this.sampler },
                { binding: 5, resource: outputTexture.createView() }
            ]
        });

        // 创建计算管线
        const computePipeline = device.createComputePipeline({
            layout: device.createPipelineLayout({
                bindGroupLayouts: [computeBindGroupLayout]
            }),
            compute: {
                module: device.createShaderModule({
                    code: this.code
                }),
                entryPoint: 'computeTransform'
            }
        });

        // 执行计算
        const commandEncoder = device.createCommandEncoder();
        const computePass = commandEncoder.beginComputePass();
        computePass.setPipeline(computePipeline);
        computePass.setBindGroup(0, computeBindGroup);
        
        const workgroupsX = Math.ceil(width / 8);
        const workgroupsY = Math.ceil(height / 8);
        computePass.dispatchWorkgroups(workgroupsX, workgroupsY);
        computePass.end();
        
        device.queue.submit([commandEncoder.finish()]);

        return outputTexture;
    },

    // 创建逆变换纹理
    createInverseTexture(device, width, height) {
        // 创建1D查找表纹理用于逆变换
        const texture = device.createTexture({
            size: [256, 1], // 使用256个采样点
            format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
        });

        // 生成逆变换查找表数据
        const data = new Uint8Array(256 * 4);
        for (let i = 0; i < 256; i++) {
            const U = (i + 0.5) / 256;
            // 使用与着色器中相同的参数
            const mu = 0.5;
            const sigma = 0.15;
            const sqrt2 = Math.sqrt(2);
            
            // 计算逆高斯CDF
            const x = sigma * sqrt2 * this.erfInv(2 * U - 1) + mu;
            
            // 将值映射到0-255范围
            const value = Math.max(0, Math.min(255, Math.round(x * 255)));
            
            data[i * 4] = value;     // R
            data[i * 4 + 1] = value; // G
            data[i * 4 + 2] = value; // B
            data[i * 4 + 3] = 255;   // A
        }

        // 上传数据到纹理
        device.queue.writeTexture(
            { texture },
            data,
            { bytesPerRow: 256 * 4 },
            { width: 256, height: 1 }
        );

        return texture;
    },

    // 辅助函数：误差函数的逆
    erfInv(x) {
        // 使用近似算法计算误差函数的逆
        const a = 0.147;
        const sign = x >= 0 ? 1 : -1;
        const omx = 1 - x * x;
        
        if (omx === 0) {
            return sign * Infinity;
        }
        
        const ln = Math.log(omx);
        const t = 2 / (Math.PI * a) + ln / 2;
        return sign * Math.sqrt(-t + Math.sqrt(t * t - ln / a));
    }
};

// 使用示例
export async function makeTileable(inputData, options = {}) {
    if (!navigator.gpu) {
        throw new Error('WebGPU is not supported');
    }
    
    const adapter = await navigator.gpu.requestAdapter();
    const device = await adapter.requestDevice();

    let sourceCanvas;
    if (inputData instanceof ImageData) {
        sourceCanvas = document.createElement('canvas');
        sourceCanvas.width = inputData.width;
        sourceCanvas.height = inputData.height;
        const ctx = sourceCanvas.getContext('2d');
        ctx.putImageData(inputData, 0, 0);
    } else if (inputData instanceof HTMLCanvasElement) {
        sourceCanvas = inputData;
    } else {
        throw new Error('Input must be either ImageData or HTMLCanvasElement');
    }

    const imageBitmap = await createImageBitmap(sourceCanvas);
    const { width, height } = imageBitmap;
    
    const inputTexture = device.createTexture({
        size: [width, height],
        format: 'rgba8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING | 
               GPUTextureUsage.COPY_DST | 
               GPUTextureUsage.RENDER_ATTACHMENT |
               GPUTextureUsage.STORAGE_BINDING |
               GPUTextureUsage.COPY_SRC
    });

    device.queue.copyExternalImageToTexture(
        { source: imageBitmap },
        { texture: inputTexture },
        [width, height]
    );

    // 处理纹理
    const outputTexture = await tileableTexture.process(
        device, 
        inputTexture, 
        width, 
        height, 
        options.borderWidthPercent
    );

    // 创建输出缓冲区
    const outputBuffer = device.createBuffer({
        size: width * height * 4,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });

    // 复制输出纹理数据
    const commandEncoder = device.createCommandEncoder();
    commandEncoder.copyTextureToBuffer(
        { texture: outputTexture },
        { buffer: outputBuffer, bytesPerRow: width * 4 },
        [width, height]
    );
    device.queue.submit([commandEncoder.finish()]);

    await outputBuffer.mapAsync(GPUMapMode.READ);
    const outputArray = new Uint8Array(outputBuffer.getMappedRange());
    const finalArray = new Uint8ClampedArray(outputArray.length);
    finalArray.set(outputArray);

    outputBuffer.unmap();

    // 清理资源
    inputTexture.destroy();
    outputTexture.destroy();
    device.destroy();

    return new ImageData(finalArray, width, height);
}