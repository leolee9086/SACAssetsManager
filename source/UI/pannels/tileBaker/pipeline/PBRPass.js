import { requireWGSLCode } from "../../../../utils/module/wgslModule.js";

export class PBRPass {
    constructor(gpuContext) {
        this.gpu = gpuContext;
        this.pipeline = null;
        this.bindGroupLayout = null;
    }

    async init() {
        const shaderCode = await requireWGSLCode(import.meta.resolve('../shaders/pbr.wgsl'));
        
        // 创建着色器模块并添加错误处理
        const shaderModule = await this.createShaderModule(shaderCode, 'pbr.wgsl');
        
        // 创建绑定组布局
        this.bindGroupLayout = this.gpu.device.createBindGroupLayout({
            label: 'PBR Pass Bind Group Layout',
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    buffer: { type: 'uniform' }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: { sampleType: 'float' }
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: { type: 'filtering' }
                }
            ]
        });

        // 创建管线
        this.pipeline = await this.createRenderPipeline(shaderModule);
    }

    async createShaderModule(code, label) {
        try {
            const module = this.gpu.device.createShaderModule({
                label: label,
                code: code
            });

            // 获取编译信息
            const compilationInfo = await module.getCompilationInfo();
            if (compilationInfo.messages.length > 0) {
                console.group(`着色器编译信息 (${label}):`);
                compilationInfo.messages.forEach(message => {
                    const severity = message.type.toUpperCase();
                    const lineNum = message.lineNum || '未知行号';
                    const linePos = message.linePos || '未知位置';
                    
                    // 使用不同颜色区分警告级别
                    const color = message.type === 'error' ? '\x1b[31m' : '\x1b[33m';
                    console.warn(
                        `${color}[${severity}]\x1b[0m\n` +
                        `文件: ${label}\n` +
                        `位置: ${lineNum}:${linePos}\n` +
                        `信息: ${message.message}\n` +
                        `调用栈: ${new Error().stack.split('\n').slice(1).join('\n')}`
                    );
                });
                console.groupEnd();
            }

            return module;
        } catch (error) {
            console.error(`着色器 "${label}" 编译失败:`, error);
            throw new Error(`着色器编译失败: ${label}\n${error.message}`);
        }
    }

    async createRenderPipeline(shaderModule) {
        try {
            return await this.gpu.device.createRenderPipeline({
                label: 'PBR Render Pipeline',
                layout: this.gpu.device.createPipelineLayout({
                    label: 'PBR Pipeline Layout',
                    bindGroupLayouts: [this.bindGroupLayout]
                }),
                vertex: {
                    module: shaderModule,
                    entryPoint: 'vertMain'
                },
                fragment: {
                    module: shaderModule,
                    entryPoint: 'fragMain',
                    targets: [
                        { format: this.gpu.format, label: 'Albedo Output' },
                        { format: this.gpu.format, label: 'Normal Output' },
                        { format: this.gpu.format, label: 'Roughness Output' },
                        { format: this.gpu.format, label: 'Height Output' }
                    ]
                },
                primitive: {
                    topology: 'triangle-list'
                }
            });
        } catch (error) {
            console.error('PBR Pipeline 创建失败:', {
                error,
                shaderModule,
                bindGroupLayout: this.bindGroupLayout
            });
            throw error;
        }
    }

    execute(commandEncoder, distanceTexture, outputs, params) {
        const bindGroup = this.createBindGroup(distanceTexture, params);
        
        // 为所有视图添加标签
        const colorAttachments = [
            {
                view: outputs.albedo.createView({
                    label: 'Albedo View'
                }),
                clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
                loadOp: 'clear',
                storeOp: 'store'
            },
            {
                view: outputs.normal.createView({
                    label: 'Normal View'
                }),
                clearValue: { r: 0.5, g: 0.5, b: 1.0, a: 1.0 },
                loadOp: 'clear',
                storeOp: 'store'
            },
            {
                view: outputs.roughness.createView({
                    label: 'Roughness View'
                }),
                clearValue: { r: 0.5, g: 0.5, b: 0.5, a: 1.0 },
                loadOp: 'clear',
                storeOp: 'store'
            },
            {
                view: outputs.height.createView({
                    label: 'Height View'
                }),
                clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
                loadOp: 'clear',
                storeOp: 'store'
            }
        ];

        const passEncoder = commandEncoder.beginRenderPass({
            colorAttachments,
            label: 'PBR Pass Render Pass'
        });

        passEncoder.setPipeline(this.pipeline);
        passEncoder.setBindGroup(0, bindGroup);
        passEncoder.draw(6, 1, 0, 0);
        passEncoder.end();
    }

    createBindGroup(distanceTexture, params) {
        const uniformBuffer = this.createUniformBuffer(params);
        const sampler = this.gpu.device.createSampler({
            label: 'PBR Pass Sampler',
            magFilter: 'linear',
            minFilter: 'linear',
            mipmapFilter: 'linear',
        });

        // 为视图添加标签
        const textureView = distanceTexture.createView({
            label: 'Distance Texture View for PBR Pass'
        });

        return this.gpu.device.createBindGroup({
            label: 'PBR Pass Bind Group',
            layout: this.bindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: { buffer: uniformBuffer }
                },
                {
                    binding: 1,
                    resource: textureView
                },
                {
                    binding: 2,
                    resource: sampler
                }
            ]
        });
    }

    createUniformBuffer(params) {
        // 根据 common.wgsl 中的 Params 结构体定义计算缓冲区大小
        const uniformBufferSize = 
            4 * 2 + // tileSize: vec2<f32>
            4 * 1 + // seamWidth: f32
            4 * 1 + // rotation: f32
            4 * 1 + // seamProfile: i32
            4 * 1 + // seamVariation: f32
            4 * 1 + // seamNoiseFrequency: f32
            4 * 1 + // padding
            4 * 3 + // albedoColor: vec3<f32>
            4 * 1 + // padding
            4 * 2 + // roughnessRange: vec2<f32>
            4 * 2 + // heightRange: vec2<f32>
            4 * 1 + // normalStrength: f32
            4 * 1;  // edgeSharpness: f32

        const buffer = this.gpu.device.createBuffer({
            label: 'PBR Pass Uniform Buffer',
            size: Math.ceil(uniformBufferSize / 16) * 16, // 确保16字节对齐
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        // 创建一个包含所有参数的 Float32Array，保持与 WGSL 结构体相同的内存布局
        const uniformData = new Float32Array([
            params.tileSize.x, params.tileSize.y,    // vec2 tileSize
            params.seamWidth,                         // f32 seamWidth
            params.rotation,                          // f32 rotation
            params.seamProfile,                       // i32 seamProfile
            params.seamVariation,                     // f32 seamVariation
            params.seamNoiseFrequency,               // f32 seamNoiseFrequency
            0.0,                                     // padding
            params.albedoColor[0],                   // vec3 albedoColor
            params.albedoColor[1], 
            params.albedoColor[2],
            0.0,                                     // padding
            params.roughnessRange.x,                 // vec2 roughnessRange
            params.roughnessRange.y,
            params.heightRange.x,                    // vec2 heightRange
            params.heightRange.y,
            params.normalStrength,                   // f32 normalStrength
            params.edgeSharpness                     // f32 edgeSharpness
        ]);

        this.gpu.device.queue.writeBuffer(buffer, 0, uniformData);
        return buffer;
    }
} 