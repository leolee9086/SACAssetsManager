import { shaders } from "./shaders.js";
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
        const ctx = canvas.getContext('2d');
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
     * 生成纹理
     * @param {TextureGeneratorInput} input
     * @returns {Promise<TextureGeneratorOutput>}
     */
    async generate(input) {
        const { type, params = {}, width, height } = input;

        // 如果提供了新的尺寸，临时更新
        const originalWidth = this.width;
        const originalHeight = this.height;
        if (width) this.width = width;
        if (height) this.height = height;

        try {
            const result = await this.generateTexture(type, params);
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
            if (name === '_padding') {
                // 添加填充数据
                bufferData.push(0.0, 0.0);
                continue;
            }

            const value = params[name] ?? this._getDefaultValue(type);
            
            if (type === 'vec4f') {
                const color = Array.isArray(value) ? value : [0, 0, 0, 1];
                if (color.length < 4) {
                    color.push(1);
                }
                console.log(`处理颜色 ${name}:`, color);
                bufferData.push(...color);
            } else if (type === 'vec2f') {
                const vec = Array.isArray(value) ? value : [0, 0];
                bufferData.push(...vec);
            } else {
                console.log(`处理标量 ${name}:`, value);
                bufferData.push(value);
            }
        }

        console.log('最终 uniform buffer 数据:', bufferData);
        
        return new Float32Array(bufferData);
    }

    _getDefaultValue(type) {
        switch (type) {
            case 'f32': return 0.0;
            case 'i32': return 0;
            case 'vec4f': return [1, 1, 1, 1];
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
        const ctx = canvas.getContext('2d');
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
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        return imageData.data.buffer.slice(0);
    }
}


// 使用示例:
async function testTextureGenerator() {
    const generator = await TextureGenerator.create(512, 512);
    
    try {
        // 测试噪声纹理
        const noiseTests = [
            {
                name: '标准噪声',
                params: {
                    scale: 8.0,
                    seed: Math.random() * 1000,
                    octaves: 6,
                    persistence: 0.5,
                    lacunarity: 2.0,
                    frequency: 1.0,
                    amplitude: 1.0,
                    offset_x: 0.0,
                    offset_y: 0.0,
                    contrast: 1.0,
                    brightness: 0.0,
                    detail_scale: 2.0,
                    master_scale: 1.0,
                    detail_weight: 0.3
                }
            },
            {
                name: '细致噪声',
                params: {
                    scale: 16.0,
                    seed: Math.random() * 1000,
                    octaves: 8,
                    persistence: 0.7,
                    lacunarity: 2.5,
                    frequency: 2.0,
                    amplitude: 1.0,
                    offset_x: 0.0,
                    offset_y: 0.0,
                    contrast: 1.2,
                    brightness: 0.0,
                    detail_scale: 4.0,
                    master_scale: 1.0,
                    detail_weight: 0.5
                }
            }
        ];

        // 测试渐变纹理
        const gradientTests = [
            {
                name: '红蓝渐变',
                params: {
                    color1: [1.0, 0.0, 0.0, 1.0],
                    color2: [0.0, 0.0, 1.0, 1.0],
                    angle: 0.0,
                    offset: 0.0
                }
            },
            {
                name: '彩虹渐变',
                params: {
                    color1: [1.0, 0.0, 1.0, 1.0],
                    color2: [0.0, 1.0, 0.0, 1.0],
                    angle: Math.PI / 2,
                    offset: 0.0
                }
            }
        ];

        // 测试棋盘格纹理
        const checkerboardTests = [
            {
                name: '标准棋盘',
                params: {
                    color1: [1, 1, 1, 1],
                    color2: [0, 0, 0, 1],
                    size: 8.0,
                    rotation: 0.0,
                    offset_x: 0.0,
                    offset_y: 0.0
                }
            },
            {
                name: '旋转棋盘',
                params: {
                    color1: [0.9, 0.1, 0.1, 1],
                    color2: [0.1, 0.1, 0.9, 1],
                    size: 16.0,
                    rotation: Math.PI / 4,
                    offset_x: 0.5,
                    offset_y: 0.5
                }
            }
        ];

        // 测试点阵纹理
        const dotsTests = [
            {
                name: '标准点阵',
                params: {
                    background: [0, 0, 0, 1],
                    dot_color: [1, 1, 1, 1],
                    size: 10.0,
                    dot_radius: 0.3,
                    softness: 0.1,
                    rotation: 0.0
                }
            },
            {
                name: '柔和点阵',
                params: {
                    background: [0.1, 0.1, 0.1, 1],
                    dot_color: [1, 0.8, 0.2, 1],
                    size: 15.0,
                    dot_radius: 0.4,
                    softness: 0.3,
                    rotation: Math.PI / 6
                }
            }
        ];

        // 测试细胞噪声
        const cellularTests = [
            {
                name: '标准细胞',
                params: {
                    scale: 5.0,
                    seed: Math.random() * 1000,
                    intensity: 1.0,
                    jitter: 1.0,
                    falloff: 1.0
                }
            },
            {
                name: '有机细胞',
                params: {
                    scale: 8.0,
                    seed: Math.random() * 1000,
                    intensity: 1.5,
                    jitter: 0.8,
                    falloff: 2.0
                }
            }
        ];

        const results = {
            noise: {},
            gradient: {},
            checkerboard: {},
            dots: {},
            cellular: {}
        };

        // 执行所有测试
        for (const test of noiseTests) {
            results.noise[test.name] = await generator.generate({
                type: 'noise',
                params: test.params
            });
        }

        for (const test of gradientTests) {
            results.gradient[test.name] = await generator.generate({
                type: 'gradient',
                params: test.params
            });
        }

        for (const test of checkerboardTests) {
            results.checkerboard[test.name] = await generator.generate({
                type: 'checkerboard',
                params: test.params
            });
        }

        for (const test of dotsTests) {
            results.dots[test.name] = await generator.generate({
                type: 'dots',
                params: test.params
            });
        }

        for (const test of cellularTests) {
            results.cellular[test.name] = await generator.generate({
                type: 'cellular',
                params: test.params
            });
        }
        return results;

    } catch (error) {
        console.error('纹理生成测试失败:', error);
        throw error;
    } finally {
        generator.destroy();
    }
}

// 
export { TextureGenerator, testTextureGenerator };
import './pattern.js'