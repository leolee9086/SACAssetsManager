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
        this.useFallback = false;
    }

    async init() {
        try {
            if (!navigator.gpu) {
                throw new Error('WebGPU 不支持');
            }

            const adapter = await navigator.gpu.requestAdapter();
            this.device = await adapter.requestDevice();
            return true;
        } catch (error) {
            console.warn('WebGPU 初始化失败，切换到 Canvas 2D 降级方案:', error);
            this.useFallback = true;
            return false;
        }
    }

    // 添加降级方案的噪声生成函数
    generateNoiseCanvas(params = {}) {
        const {
            scale = 4.0,
            seed = Math.random() * 1000,
            octaves = 6,
            persistence = 0.5,
            lacunarity = 2.0
        } = params;

        const canvas = document.createElement('canvas');
        canvas.width = this.width;
        canvas.height = this.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const imageData = ctx.createImageData(this.width, this.height);
        const data = imageData.data;

        // 简单的伪随机函数
        const noise2D = (x, y) => {
            const X = Math.floor(x) & 255;
            const Y = Math.floor(y) & 255;
            const value = Math.sin(X * 12.9898 + Y * 78.233 + seed) * 43758.5453123;
            return value - Math.floor(value);
        };

        // 生成噪声
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                let amplitude = 1.0;
                let frequency = 1.0;
                let noiseValue = 0;
                let amplitudeSum = 0;

                // 分形叠加
                for (let o = 0; o < octaves; o++) {
                    const sampleX = (x * frequency * scale) / this.width;
                    const sampleY = (y * frequency * scale) / this.height;
                    noiseValue += noise2D(sampleX, sampleY) * amplitude;
                    amplitudeSum += amplitude;
                    amplitude *= persistence;
                    frequency *= lacunarity;
                }

                // 归一化
                noiseValue = (noiseValue / amplitudeSum) * 255;

                const i = (y * this.width + x) * 4;
                data[i] = noiseValue;     // R
                data[i + 1] = noiseValue; // G
                data[i + 2] = noiseValue; // B
                data[i + 3] = 255;        // A
            }
        }

        ctx.putImageData(imageData, 0, 0);
        return canvas;
    }

    /**
     * 生成纹理并应用无缝化处理
     * @param {TextureGeneratorInput & { makeTileable?: boolean, borderSize?: number }} input
     * @returns {Promise<TextureGeneratorOutput>}
     */
    async generate(input) {
        const { type, params = {}, width, height, makeTileable = true, borderSize = 60} = input;

        // 定义需要无缝化的材质类型
       const tileableTypes = ['noise', 'wood', 'wood_01', 'wood_procedural', 'quarter_sawn_wood', 'knottyWood','wood_fine','marble_royal_brown'];
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
                const tileableImageData = await Tileable(imageData, borderSize);
                
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
        if (this.useFallback) {
            if (shaderType === 'noise') {
                const canvas = this.generateNoiseCanvas(params);
                return {
                    canvas,
                    buffer: await this._canvasToBuffer(canvas)
                };
            }
            throw new Error(`${shaderType} 生成在降级模式下不支持`);
        }

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
        const uniformData = this._prepareUniformData(shader.uniforms, params);
        const uniformBuffer = this.device.createBuffer({
            size: uniformData.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        this.device.queue.writeBuffer(uniformBuffer, 0, uniformData);

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
        
        console.log('准备 uniform 数据:', {
            layout: uniformLayout,
            params: params
        });
        
        for (const [name, type] of Object.entries(uniformLayout)) {
            // 处理填充字段
            if (name.startsWith('_pad')) {
                if (type === 'vec4f') {
                    bufferData.push(0.0, 0.0, 0.0, 0.0); // 16字节填充
                } else if (type === 'vec2f') {
                    bufferData.push(0.0, 0.0); // 8字节填充
                } else if (type === 'f32') {
                    bufferData.push(0.0); // 4字节填充
                }
                continue;
            }

            const value = params[name] ?? this._getDefaultValue(type);
            
            if (type === 'vec4f') {
                const color = Array.isArray(value) ? value : [0, 0, 0, 1];
                if (color.length < 4) {
                    color.push(1);
                }
                bufferData.push(...color);
            } else if (type === 'vec3f') {
                const vec = Array.isArray(value) ? value : [0, 0, 0];
                bufferData.push(...vec);
                // vec3f 后必须添加填充以保持 16 字节对齐
                bufferData.push(0.0);
            } else if (type === 'vec2f') {
                const vec = Array.isArray(value) ? value : [0, 0];
                bufferData.push(...vec);
            } else {
                bufferData.push(value);
            }
        }

        console.log('最终 uniform buffer 数据:', bufferData);
        console.log('Buffer 大小(字节):', bufferData.length * 4);
        
        // 确保缓冲区大小是 16 的倍数
        while (bufferData.length % 4 !== 0) {
            bufferData.push(0.0);
        }
        
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
}


async function testTextureGenerator() {
    const generator = await TextureGenerator.create(2048,2048 );
    
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
