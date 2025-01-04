import { requireWGSLCode } from '../utils/module/wgslModule.js';
export class DarkChannelDehaze {
    static WORKGROUP_SIZE = 16;

    constructor(device) {
        this.device = device;
        this.pipeline = null;
        this.bindGroup = null;
        this.paramsBuffer = null;
    }

    async initialize() {
        // 加载着色器代码
        const shaderModule = this.device.createShaderModule({
            label: "Dark Channel Dehaze",
            code: (await requireWGSLCode(import.meta.resolve('./dark_channel_dehaze.wgsl')))
        });

        // 创建参数缓冲区
        this.paramsBuffer = this.device.createBuffer({
            size: 16, // vec3 (12 bytes) + float (4 bytes)
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            mappedAtCreation: false,
        });

        // 创建管线
        this.pipeline = this.device.createComputePipeline({
            label: "Dark Channel Dehaze Pipeline",
            layout: 'auto',
            compute: {
                module: shaderModule,
                entryPoint: 'main',
            }
        });
    }

    // 更新参数
    updateParams(atmosphere, beta) {
        // 添加参数验证
        if (!Array.isArray(atmosphere) || atmosphere.length !== 3) {
            throw new Error('Atmosphere must be a vec3 array');
        }
        if (typeof beta !== 'number' || beta < 0) {
            throw new Error('Beta must be a positive number');
        }

        const paramsData = new Float32Array([
            atmosphere[0], atmosphere[1], atmosphere[2],
            beta
        ]);
        this.device.queue.writeBuffer(this.paramsBuffer, 0, paramsData);
    }

    // 创建绑定组
    createBindGroup(inputTexture, outputTexture) {
        if (outputTexture.format !== 'rgba8unorm') {
            throw new Error('Output texture must be in rgba8unorm format');
        }
        
        this.bindGroup = this.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: inputTexture.createView()
                },
                {
                    binding: 1,
                    resource: outputTexture.createView()
                },
                {
                    binding: 2,
                    resource: { buffer: this.paramsBuffer }
                }
            ]
        });
    }

    // 执行去雾处理
    process(commandEncoder, inputTexture, outputTexture) {
        // 确保已经创建了绑定组
        if (!this.bindGroup) {
            this.createBindGroup(inputTexture, outputTexture);
        }

        const textureSize = {
            width: inputTexture.width,
            height: inputTexture.height
        };

        // 创建计算通道
        const computePass = commandEncoder.beginComputePass();
        computePass.setPipeline(this.pipeline);
        computePass.setBindGroup(0, this.bindGroup);

        // 计算工作组数量
        const workgroupsX = Math.ceil(textureSize.width / DarkChannelDehaze.WORKGROUP_SIZE);
        const workgroupsY = Math.ceil(textureSize.height / DarkChannelDehaze.WORKGROUP_SIZE);
        
        computePass.dispatchWorkgroups(workgroupsX, workgroupsY);
        computePass.end();
    }

    // 使用示例
    static async createDehazeEffect(device) {
        const dehazer = new DarkChannelDehaze(device);
        await dehazer.initialize();
        return dehazer;
    }

    // 添加销毁方法
    destroy() {
        if (this.paramsBuffer) {
            this.paramsBuffer.destroy();
        }
        this.bindGroup = null;
        this.pipeline = null;
    }
}