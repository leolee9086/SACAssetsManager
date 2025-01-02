import { shaders } from "./shaders.js";
import { makeTileable as  $Tileable } from "./makeTileable/HistogramPreservingBlendMakeTileable.js";
import { makeTileable as Tileable} from "./makeTileable/gputileable.js";
// 定义标准化的输入输出接口
/**
 * @typedef {Object} TextureGeneratorInput
 * @property {string} type - 纹理类型 ('noise'|'gradient'|...)
 * @property {Object} params - 纹理参数
 * @property {number} [width] - 可选的宽度覆盖
 * @property {number} [height] - 可选的高度覆盖
 */

/**
 * @typedef {Object} TextureGeneratorOutput
 * @property {HTMLCanvasElement} canvas - 生成的画布元素
 * @property {ArrayBuffer} buffer - 原始像素数据
 * @property {number} width - 纹理宽度
 * @property {number} height - 纹理高度
 * @property {string} type - 生成的纹理类型
 * @property {Object} params - 使用的参数
 */

class TextureGenerator {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.device = null;
    }

    async init() {
        if (!navigator.gpu) {
            throw new Error('WebGPU 不支持');
        }

        const adapter = await navigator.gpu.requestAdapter();
        this.device = await adapter.requestDevice();
        return true;
    }

    /**
     * 生成纹理并应用无缝化处理
     * @param {TextureGeneratorInput & { makeTileable?: boolean, borderSize?: number }} input
     * @returns {Promise<TextureGeneratorOutput>}
     */
    async generate(input) {
        const { type, params = {}, width, height, makeTileable = true, borderSize = 60} = input;

        // 定义需要无缝化的材质类型
       const tileableTypes = ['noise', 'wood', 'wood_02','wood_01', 'wood_procedural', 'quarter_sawn_wood', 'knottyWood','wood_fine','marble_royal_brown'];
      //  const tileableTypes = [];

        // 记录开始时间
        const startTime = performance.now();
        
        // 如果提供了新的尺寸，临时更新
        const originalWidth = this.width;
        const originalHeight = this.height;
        if (width) this.width = width;
        if (height) this.height = height;

        try {
            let result = await this.generateTexture(type, params);
            const generateTime = performance.now() - startTime;

            // 只对特定类型的材质进行无缝化处理
            if (makeTileable && tileableTypes.includes(type)) {
                const tileableStartTime = performance.now();
                
                const ctx = result.canvas.getContext('2d');
                const imageData = ctx.getImageData(0, 0, result.canvas.width, result.canvas.height);
                
                // 应用无缝化处理
                const tileableImageData = await Tileable(imageData, {borderWidthPercent:borderSize});
                
                // 更新 canvas 和 buffer
                ctx.putImageData(tileableImageData, 0, 0);
                result.buffer = await this._canvasToBuffer(result.canvas);
                
                const tileableTime = performance.now() - tileableStartTime;
                
                // 记录性能数据
                console.log(`纹理生成性能报告 - ${type}:`, {
                    生成时间: `${generateTime.toFixed(2)}ms`,
                    无缝化时间: `${tileableTime.toFixed(2)}ms`,
                    总时间: `${(generateTime + tileableTime).toFixed(2)}ms`
                });
            } else {
                // 对于不需要无缝化的材质，只记录生成时间
                console.log(`纹理生成性能报告 - ${type}:`, {
                    生成时间: `${generateTime.toFixed(2)}ms`,
                    无缝化: '不适用'
                });
            }

            return {
                ...result,
                width: this.width,
                height: this.height,
                type,
                params
            };
        } finally {
            // 恢复原始尺寸
            this.width = originalWidth;
            this.height = originalHeight;
        }
    }

    /**
     * @private
     */
    async generateTexture(shaderType, params = {}) {
        const shader = shaders[shaderType];
        if (!shader) {
            throw new Error(`未知的着色器类型: ${shaderType}`);
        }

        // 创建输出纹理
        const textureDesc = {
            size: { width: this.width, height: this.height },
            format: 'rgba8unorm',
            usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC
        };
        const outputTexture = this.device.createTexture(textureDesc);

        // 创建并设置 uniform buffer
        const bufferSize = this._calculateUniformBufferSize(shader.uniforms);
        const uniformBuffer = this.device.createBuffer({
            size: bufferSize,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.device.queue.writeBuffer(uniformBuffer, 0, this._prepareUniformData(shader.uniforms, params));

        // 创建绑定组布局
        const bindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    storageTexture: {
                        access: 'write-only',
                        format: 'rgba8unorm',
                    },
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'uniform' },
                },
            ],
        });

        // 创建计算管线
        const computePipeline = this.device.createComputePipeline({
            layout: this.device.createPipelineLayout({
                bindGroupLayouts: [bindGroupLayout],
            }),
            compute: {
                module: this.device.createShaderModule({
                    code: shader.code,
                }),
                entryPoint: 'main',
            },
        });

        // 创建绑定组
        const bindGroup = this.device.createBindGroup({
            layout: bindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: outputTexture.createView(),
                },
                {
                    binding: 1,
                    resource: { buffer: uniformBuffer },
                },
            ],
        });

        // 执行计算
        const commandEncoder = this.device.createCommandEncoder();
        const computePass = commandEncoder.beginComputePass();
        computePass.setPipeline(computePipeline);
        computePass.setBindGroup(0, bindGroup);
        computePass.dispatchWorkgroups(
            Math.ceil(this.width / 8),
            Math.ceil(this.height / 8)
        );
        computePass.end();

        this.device.queue.submit([commandEncoder.finish()]);

        const result = await this.textureToCanvas(outputTexture);
        outputTexture.destroy();
        uniformBuffer.destroy();

        return result;
    }

    _prepareUniformData(uniformLayout, params) {
        const bufferData = [];
        
        console.log('\n=== GPU Uniform 参数传递分析 ===');
        console.log('原始参数:', params);
        
        let reconstructedParams = {};
        let currentOffset = 0;
        
        for (const [name, type] of Object.entries(uniformLayout)) {
            const value = params[name] ?? this._getDefaultValue(type);
            
            console.log(`\n字段: ${name}`);
            console.log(`类型: ${type}`);
            console.log(`偏移: ${currentOffset}字节`);
            console.log(`原始值:`, value);
            
            // 处理显式填充字段
            if (name.startsWith('_pad')) {
                if (type === 'vec4f') {
                    bufferData.push(0.0, 0.0, 0.0, 0.0);
                    currentOffset += 16;
                } else if (type === 'vec2f') {
                    bufferData.push(0.0, 0.0);
                    currentOffset += 8;
                } else if (type === 'f32') {
                    bufferData.push(0.0);
                    currentOffset += 4;
                }
                console.log(`填充字段: ${name}, 大小: ${currentOffset - (bufferData.length - 1) * 4}字节`);
                continue;
            }

            // 处理实际数据字段
            switch (type) {
                case 'vec4f': {
                    const color = Array.isArray(value) ? value : [0, 0, 0, 1];
                    if (color.length < 4) color.push(1);
                    bufferData.push(...color);
                    reconstructedParams[name] = [...color];
                    currentOffset += 16;
                    break;
                }
                case 'vec3f': {
                    const vec = Array.isArray(value) ? value : [0, 0, 0];
                    bufferData.push(...vec);  // 只推送3个值，不自动填充
                    reconstructedParams[name] = [...vec];
                    currentOffset += 12;  // vec3f 实际只占用12字节
                    break;
                }
                case 'vec2f': {
                    const vec = Array.isArray(value) ? value : [0, 0];
                    bufferData.push(...vec);
                    reconstructedParams[name] = [...vec];
                    currentOffset += 8;
                    break;
                }
                case 'f32': {
                    bufferData.push(value);
                    reconstructedParams[name] = value;
                    currentOffset += 4;
                    break;
                }
                case 'i32': {
                    bufferData.push(value);
                    reconstructedParams[name] = value;
                    currentOffset += 4;
                    break;
                }
            }
            
            console.log(`写入值:`, reconstructedParams[name]);
            console.log(`当前偏移: ${currentOffset}`);
        }
        
        // 确保最终大小是16的倍数
        const finalSize = Math.ceil(currentOffset / 16) * 16;
        if (finalSize > currentOffset) {
            const paddingSize = (finalSize - currentOffset) / 4;
            for (let i = 0; i < paddingSize; i++) {
                bufferData.push(0.0);
            }
            console.log(`添加末尾填充: ${finalSize - currentOffset}字节`);
        }
        
        console.log('\n=== 最终数据 ===');
        console.log('Buffer 大小:', finalSize, '字节');
        console.log('数据项数:', bufferData.length);
        
        return new Float32Array(bufferData);
    }

    _getDefaultValue(type) {
        switch (type) {
            case 'f32': return 0.0;
            case 'i32': return 0;
            case 'vec4f': return [1, 1, 1, 1];
            case 'vec3f': return [0, 0, 0];
            case 'vec2f': return [0, 0];
            default: return 0;
        }
    }

    destroy() {
        // 清理资源
        if (this.device) {
            this.device = null;
        }
    }

    // 添加新的静态工厂方法
    static async create(width, height) {
        const generator = new TextureGenerator(width, height);
        await generator.init();
        return generator;
    }

    // 添加辅助方法将 GPU 纹理转换为 Canvas
    async textureToCanvas(texture) {
        const outputBuffer = this.device.createBuffer({
            size: this.width * this.height * 4,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });

        const commandEncoder = this.device.createCommandEncoder();
        commandEncoder.copyTextureToBuffer(
            { texture },
            { buffer: outputBuffer, bytesPerRow: this.width * 4 },
            { width: this.width, height: this.height }
        );

        this.device.queue.submit([commandEncoder.finish()]);

        await outputBuffer.mapAsync(GPUMapMode.READ);
        const data = new Uint8Array(outputBuffer.getMappedRange());
        const buffer = data.buffer.slice(0);  // 创建 buffer 的副本

        const canvas = document.createElement('canvas');
        canvas.width = this.width;
        canvas.height = this.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const imageData = new ImageData(
            new Uint8ClampedArray(data),
            this.width,
            this.height
        );
        ctx.putImageData(imageData, 0, 0);

        // 添加 Canvas 验证
        console.log('Canvas 尺寸:', canvas.width, 'x', canvas.height);
        console.log('Canvas 是否有内容:', ctx.getImageData(0, 0, 1, 1).data.some(v => v !== 0));

        outputBuffer.unmap();
        outputBuffer.destroy(); // 清理 buffer

        return { canvas, buffer };
    }

    /**
     * @private
     */
    async _canvasToBuffer(canvas) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        return imageData.data.buffer.slice(0);
    }

    _calculateUniformBufferSize(uniformLayout) {
        let size = 0;
        for (const [_, type] of Object.entries(uniformLayout)) {
            switch (type) {
                case 'f32':
                case 'i32':
                    size += 4;
                    break;
                case 'vec2f':
                    size += 8;
                    break;
                case 'vec3f':
                    size += 16; // vec3 需要 16 字节对齐
                    break;
                case 'vec4f':
                    size += 16;
                    break;
            }
        }
        // 确保总大小是 16 的倍数
        return Math.ceil(size / 16) * 16;
    }
}


async function testTextureGenerator() {
    const generator = await TextureGenerator.create(1024,512 );
    
    try {
        const results = {};
        
        // 遍历所有着色器及其预设
        for (const [shaderType, shader] of Object.entries(shaders)) {
            if (!shader.presets) {
                console.log(`跳过 ${shaderType}: 没有预设配置`);
                continue;
            }

            console.log(`开始生成 ${shaderType} 纹理...`);
            results[shaderType] = {};
            
            for (const [presetName, params] of Object.entries(shader.presets)) {
                console.log(`生成 ${shaderType} - ${presetName} 纹理...`);
                
                // 如果着色器需要随机种子，则添加随机种子
                const finalParams = {
                    ...params,
                    ...(shader.uniforms.seed ? { seed: Math.random() * 1000 } : {})
                };
                
                try {
                    results[shaderType][presetName] = await generator.generate({
                        type: shaderType,
                        params: finalParams
                    });
                    
                    console.log(`${shaderType} - ${presetName} 纹理生成完成`);
                } catch (error) {
                    console.error(`生成 ${shaderType} - ${presetName} 纹理失败:`, error);
                    results[shaderType][presetName] = null;
                }
            }
            
            console.log(`${shaderType} 纹理全部生成完成`);
        }
        
        return results;

    } catch (error) {
        console.error('纹理生成测试失败:', error);
        throw error;
    } finally {
        generator.destroy();
    }
}


export { TextureGenerator, testTextureGenerator };

