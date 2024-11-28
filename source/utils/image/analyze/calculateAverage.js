class GPU图像平均颜色分析器 {
    constructor() {
        this.设备 = null
        this.队列 = null
        this.初始化Promise = this.初始化WebGPU()
    }

    // 初始化 WebGPU
    async 初始化WebGPU() {
        if (!navigator.gpu) {
            throw new Error('WebGPU 不可用')
        }

        // 获取适配器和设备
        const 适配器 = await navigator.gpu.requestAdapter()
        if (!适配器) {
            throw new Error('无法获取 GPU 适配器')
        }

        this.设备 = await 适配器.requestDevice()
        this.队列 = this.设备.queue
    }

    // 创建计算管线
    async 创建计算管线() {
        await this.初始化Promise

        const 计算着色器代码 = `
            @group(0) @binding(0) var input_texture : texture_2d<f32>;
            @group(0) @binding(1) var<storage, read_write> output_buffer : array<f32>;

            struct Params {
                alpha_threshold : f32,
                width : u32,
                height : u32,
                padding : u32,
            }
            @group(0) @binding(2) var<uniform> params : Params;

            @compute @workgroup_size(16, 16)
            fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {
                if (global_id.x >= params.width || global_id.y >= params.height) {
                    return;
                }

                let coords = vec2<i32>(global_id.xy);
                let texel = textureLoad(input_texture, coords, 0);
                
                let pixel_index = (global_id.y * params.width + global_id.x) * 4u;
                
                if (texel.a > params.alpha_threshold) {
                    output_buffer[pixel_index] = texel.r;
                    output_buffer[pixel_index + 1u] = texel.g;
                    output_buffer[pixel_index + 2u] = texel.b;
                    output_buffer[pixel_index + 3u] = texel.a;
                } else {
                    output_buffer[pixel_index] = 0.0;
                    output_buffer[pixel_index + 1u] = 0.0;
                    output_buffer[pixel_index + 2u] = 0.0;
                    output_buffer[pixel_index + 3u] = 0.0;
                }
            }
        `

        // 创建计算管线
        return await this.设备.createComputePipelineAsync({
            layout: 'auto',
            compute: {
                module: this.设备.createShaderModule({
                    code: 计算着色器代码
                }),
                entryPoint: 'main'
            }
        })
    }

    // 创建纹理
    创建纹理(图像数据, 宽度, 高度) {
        const 纹理 = this.设备.createTexture({
            size: { width: 宽度, height: 高度 },
            format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
        })

        this.队列.writeTexture(
            { texture: 纹理 },
            图像数据,
            { bytesPerRow: 宽度 * 4 },
            { width: 宽度, height: 高度 }
        )

        return 纹理
    }

    // 计算图像的平均颜色
    async 计算平均颜色(图像数据, 宽度, 高度) {
        await this.初始化Promise

        // 创建计算管线
        const 计算管线 = await this.创建计算管线()

        // 创建输入纹理
        const 输入纹理 = this.创建纹理(图像数据, 宽度, 高度)

        // 创建输出缓冲区
        const 输出缓冲区 = this.设备.createBuffer({
            size: 宽度 * 高度 * 4 * 4, // RGBA * float32
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
        })

        // 创建参数缓冲区并写入参数
        const 参数缓冲区 = this.设备.createBuffer({
            size: 16, // float + 2 * uint32 + padding
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        })

        // 获取一次完整的映射范围
        const 映射数据 = new ArrayBuffer(参数缓冲区.getMappedRange())
        const float32View = new Float32Array(映射数据)
        const uint32View = new Uint32Array(映射数据)
        
        // 写入所有参数
        float32View[0] = 0.1  // alpha threshold
        uint32View[1] = 宽度
        uint32View[2] = 高度
        参数缓冲区.unmap()

        // 创建绑定组
        const 绑定组 = this.设备.createBindGroup({
            layout: 计算管线.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: 输入纹理.createView()
                },
                {
                    binding: 1,
                    resource: { buffer: 输出缓冲区 }
                },
                {
                    binding: 2,
                    resource: { buffer: 参数缓冲区 }
                }
            ]
        })

        // 创建命令编码器
        const 命令编码器 = this.设备.createCommandEncoder()
        const 计算通道 = 命令编码器.beginComputePass()
        计算通道.setPipeline(计算管线)
        计算通道.setBindGroup(0, 绑定组)
        计算通道.dispatchWorkgroups(
            Math.ceil(宽度 / 16),
            Math.ceil(高度 / 16)
        )
        计算通道.end()

        // 创建结果缓冲区
        const 结果缓冲区 = this.设备.createBuffer({
            size: 宽度 * 高度 * 4 * 4,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        })

        // 复制结果
        命令编码器.copyBufferToBuffer(
            输出缓冲区, 0,
            结果缓冲区, 0,
            宽度 * 高度 * 4 * 4
        )

        // 提交命令
        this.队列.submit([命令编码器.finish()])
        await 结果缓冲区.mapAsync(GPUMapMode.READ)
        const 结果数据 = new Float32Array(结果缓冲区.getMappedRange())
        const 处理结果 = this.处理计算结果(结果数据)
        结果缓冲区.unmap()
        输入纹理.destroy()
        return 处理结果
    }

    // 处理计算结果
    处理计算结果(像素数据) {
        let 红色总和 = 0, 绿色总和 = 0, 蓝色总和 = 0, 透明度总和 = 0
        let 有效像素数 = 0

        for (let i = 0; i < 像素数据.length; i += 4) {
            const 透明度 = 像素数据[i + 3]
            if (透明度 > 0) {
                红色总和 += 像素数据[i]
                绿色总和 += 像素数据[i + 1]
                蓝色总和 += 像素数据[i + 2]
                透明度总和 += 透明度
                有效像素数++
            }
        }
        if (有效像素数 === 0) {
            return {
                平均颜色: { r: 0, g: 0, b: 0, a: 0 },
                平均透明度: 0
            }
        }

        return {
            平均颜色: {
                r: Math.round(红色总和 / 有效像素数 * 255),
                g: Math.round(绿色总和 / 有效像素数 * 255),
                b: Math.round(蓝色总和 / 有效像素数 * 255),
                a: 透明度总和 / 有效像素数
            },
            平均透明度: 透明度总和 / 有效像素数
        }
    }
    释放资源() {
        this.设备?.destroy()
        this.设备 = null
        this.队列 = null
    }
}
export { GPU图像平均颜色分析器 }
