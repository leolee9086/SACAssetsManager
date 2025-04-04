import { requireWGSLCode } from "../../../../../src/utils/module/wgslModule.js";

export class DistancePass {
    constructor(gpuContext) {
        this.gpu = gpuContext;
        this.pipeline = null;
        this.bindGroupLayout = null;
    }

    async init() {
        try {
            this.shaderCode = await requireWGSLCode(import.meta.resolve('../shaders/distance.wgsl'));
            
            // 创建着色器模块并添加错误处理
            const shaderModule = await this.createShaderModule(this.shaderCode, 'distance.wgsl');
            
            // 创建绑定组布局
            this.bindGroupLayout = this.gpu.device.createBindGroupLayout({
                label: 'Distance Pass Bind Group Layout',
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

            if (!this.bindGroupLayout) {
                throw new Error('Failed to create bind group layout');
            }

            // 创建管线
            this.pipeline = await this.createRenderPipeline(shaderModule);

            if (!this.pipeline) {
                throw new Error('Failed to create render pipeline');
            }

            console.log('Distance Pass initialized successfully');
        } catch (error) {
            console.error('Distance Pass initialization failed:', error);
            throw error;
        }
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
                    
                    const color = message.type === 'error' ? '\x1b[31m' : '\x1b[33m';
                    console.warn(
                        `${color}[${severity}]\x1b[0m\n` +
                        `文件: ${label}\n` +
                        `位置: ${lineNum}:${linePos}\n` +
                        `信息: ${message.message}\n` +
                        `调用栈: ${new Error().stack.split('\n').slice(1).join('\n')}`+
                        `预处理后的代码:${this.shaderCode}`
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
                label: 'Distance Render Pipeline',
                layout: this.gpu.device.createPipelineLayout({
                    label: 'Distance Pipeline Layout',
                    bindGroupLayouts: [this.bindGroupLayout]
                }),
                vertex: {
                    module: shaderModule,
                    entryPoint: 'vertMain'
                },
                fragment: {
                    module: shaderModule,
                    entryPoint: 'fragMain',
                    targets: [{ 
                        format: this.gpu.format,
                        label: 'Distance Output'
                    }]
                },
                primitive: {
                    topology: 'triangle-list'
                }
            });
        } catch (error) {
            console.error('Distance Pipeline 创建失败:', {
                error,
                shaderModule,
                bindGroupLayout: this.bindGroupLayout
            });
            throw error;
        }
    }

    execute(commandEncoder, input, output, params) {
        if (!this.pipeline || !this.bindGroupLayout) {
            throw new Error('Pipeline or bind group layout not initialized');
        }

        try {
            const bindGroup = this.createBindGroup(input, params);
            
            const passEncoder = commandEncoder.beginRenderPass({
                colorAttachments: [{
                    view: output.createView({
                        label: 'Distance Pass Output View'
                    }),
                    clearValue: { r: 1.0, g: 1.0, b: 1.0, a: 1.0 },
                    loadOp: 'clear',
                    storeOp: 'store'
                }],
                label: 'Distance Pass Render Pass'
            });

            passEncoder.setPipeline(this.pipeline);
            passEncoder.setBindGroup(0, bindGroup);
            passEncoder.draw(6, 1, 0, 0);
            passEncoder.end();
        } catch (error) {
            console.error('Execute failed:', error);
            throw error;
        }
    }

    createBindGroup(inputTexture, params) {
        if (!this.bindGroupLayout) {
            throw new Error('Bind group layout not initialized');
        }

        try {
            const uniformBuffer = this.createUniformBuffer(params);
            const sampler = this.gpu.device.createSampler({
                label: 'Distance Pass Sampler',
                magFilter: 'linear',
                minFilter: 'linear',
                mipmapFilter: 'linear',
            });

            // 为视图添加标签
            const textureView = inputTexture.createView({
                label: 'Distance Pass Input View'
            });

            const bindGroup = this.gpu.device.createBindGroup({
                label: 'Distance Pass Bind Group',
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

            if (!bindGroup) {
                throw new Error('Failed to create bind group');
            }

            return bindGroup;
        } catch (error) {
            console.error('Failed to create bind group:', error, {
                bindGroupLayout: this.bindGroupLayout,
                params,
                inputTexture
            });
            throw error;
        }
    }

    createUniformBuffer(params) {
        // 添加默认参数
        const defaultParams = {
            tileSizeX: 2,
            tileSizeY: 2,
            rotation: 0,
            randomOffset: 0.1,
            seamWidth: 0.1,
            seamVariation: 0.3,
            seamProfile: 1,
            seamNoiseFrequency: 2.0,
            contrast: 1.0,
            edgeSharpness: 1.0,
            heightRangeMin: 0.2,
            heightRangeMax: 0.8,
            wearAmount: 0.3,
            wearDetail: 20,
            mortarVariation: 0.4,
            mortarFrequency: 8.0,
            // 边缘开裂参数
            crackWidth: 0.05,
            crackDepth: 0.3,
            crackRandomness: 0.5,
            crackFrequency: 3.0,
            // 角点损坏参数
            cornerDamage: 0.3,
            cornerNoiseScale: 5.0,
            cornerFalloff: 0.5
        };

        // 合并用户参数和默认参数
        const finalParams = {
            ...defaultParams,
            ...params
        };

        // 确保数组顺序与着色器中的结构体字段顺序一致
        const uniformData = new Float32Array([
            // 基础参数
            finalParams.tileSizeX,
            finalParams.tileSizeY,
            finalParams.rotation,
            finalParams.randomOffset,

            // 砖缝参数
            finalParams.seamWidth,
            finalParams.seamVariation,
            finalParams.seamProfile,
            finalParams.seamNoiseFrequency,

            // 外观控制参数
            finalParams.contrast,
            finalParams.edgeSharpness,
            finalParams.heightRangeMin,
            finalParams.heightRangeMax,

            // 磨损和砂浆参数
            finalParams.wearAmount,
            finalParams.wearDetail,
            finalParams.mortarVariation,
            finalParams.mortarFrequency,

            // 裂纹参数
            finalParams.crackWidth,
            finalParams.crackDepth,
            finalParams.crackRandomness,
            finalParams.crackFrequency,

            // 角点参数
            finalParams.cornerDamage,
            finalParams.cornerNoiseScale,
            finalParams.cornerFalloff,
            0.0, // 填充值
        ]);

        const buffer = this.gpu.device.createBuffer({
            label: 'Distance Pass Uniform Buffer',
            size: uniformData.byteLength,  // 现在总是 96 字节 (24 * 4)
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        this.gpu.device.queue.writeBuffer(buffer, 0, uniformData);
        return buffer;
    }
} 