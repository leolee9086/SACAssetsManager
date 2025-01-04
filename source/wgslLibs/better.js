export class DarkChannelDehaze {
    constructor() {
        this.params = {
            atmosphere: [1.0, 1.0, 1.0], // 大气光值
            beta: 1.0,                   // 散射系数
        };
        
        // 确保 darkEnhance 参数存在
        if (!this.params.darkEnhance) {
            this.params.darkEnhance = {
                brightness: 30,         // 亮度百分比
                contrast: 120,          // 对比度百分比
                opacity: 0.3           // 叠加透明度
            };
        }
    }

    // 创建 Canvas 上下文
    createContext(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        return canvas.getContext('2d');
    }

    // 获取暗通道值
    getDarkChannel(imageData, radius) {
        const { width, height, data } = imageData;
        const darkChannel = new Float32Array(width * height);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                // 计算当前像素的暗通道值
                const darkValue = Math.min(
                    data[idx] / 255,     // R
                    data[idx + 1] / 255, // G
                    data[idx + 2] / 255  // B
                );
                darkChannel[y * width + x] = darkValue;
            }
        }

        // 进行最小值滤波
        const paddedDark = new Float32Array(width * height);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let minVal = darkChannel[y * width + x];
                let weightSum = 1.0;
                let valueSum = minVal;
    
                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        
                        const ny = Math.min(Math.max(y + dy, 0), height - 1);
                        const nx = Math.min(Math.max(x + dx, 0), width - 1);
                        
                        // 添加距离权重
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        const weight = 1.0 / (1.0 + dist);
                        
                        weightSum += weight;
                        valueSum += darkChannel[ny * width + nx] * weight;
                    }
                }
                
                paddedDark[y * width + x] = valueSum / weightSum;
            }
        }
    
    

        return paddedDark;
    }

    // 估算大气光值
    estimateAtmosphericLight(darkChannel, imageData) {
        const { width, height, data } = imageData;
        const numPixels = width * height;
        const threshold = 0.95;
        
        // 找到暗通道值最高的像素
        const pixelInfo = [];
        for (let i = 0; i < numPixels; i++) {
            pixelInfo.push({
                dark: darkChannel[i],
                idx: i
            });
        }
        
        pixelInfo.sort((a, b) => b.dark - a.dark);
        
        // 取前 0.1% 的像素
        const topPixels = pixelInfo.slice(0, Math.max(Math.floor(numPixels * 0.001), 1));
        
        let sumR = 0, sumG = 0, sumB = 0;
        topPixels.forEach(({ idx }) => {
            const i = idx * 4;
            sumR += data[i];
            sumG += data[i + 1];
            sumB += data[i + 2];
        });
        
        return [
            sumR / topPixels.length / 255,
            sumG / topPixels.length / 255,
            sumB / topPixels.length / 255
        ];
    }

    // 计算透射率
    getTransmission(darkChannel) {
        const omega = 0.88;  // 保持基础omega不变
        const minTransmission = 0.18;  // 略微降低最小透射率
        const maxTransmission = 0.96;
        
        const smoothedTransmission = darkChannel.map(dc => {
            // 使用非线性omega调整，强雾区获得更强的去雾效果
            const adaptiveOmega = omega * (1 + 0.15 * Math.pow(dc, 2));
            const rawTransmission = 1.0 - adaptiveOmega * dc;
            
            // 改进的深度因子计算
            const depthFactor = Math.pow(dc, 0.75);
            const enhancedDepth = depthFactor * (1 + 0.12 * Math.pow(1 - depthFactor, 1.5));
            
            // 更复杂的透射率混合
            const adjustedTransmission = 
                rawTransmission * 0.65 + 
                enhancedDepth * 0.25 + 
                Math.pow(1 - dc, 1.2) * 0.10;  // 添加非线性补偿项
            
            return Math.max(minTransmission, Math.min(maxTransmission, adjustedTransmission));
        });

        return smoothedTransmission;
    }

    // 主处理函数
    process(inputImage) {
        return new Promise((resolve) => {
            const width = inputImage.width;
            const height = inputImage.height;

            // 创建输入输出 context
            const inputCtx = this.createContext(width, height);
            const outputCtx = this.createContext(width, height);

            // 绘制输入图像
            inputCtx.drawImage(inputImage, 0, 0);
            const imageData = inputCtx.getImageData(0, 0, width, height);

            // 计算暗通道
            const darkChannel = this.getDarkChannel(imageData, 4);

            // 估算大气光值
            const atmosphere = this.estimateAtmosphericLight(darkChannel, imageData);

            // 计算透射率
            const transmission = this.getTransmission(darkChannel);

            // 恢复图像
            const outputImageData = outputCtx.createImageData(width, height);
            for (let i = 0; i < width * height; i++) {
                // 使用空间平滑的透射率
                const t = Math.max(transmission[i], 0.001);
                
                // 改进的散射系数，减小差异以降低色彩偏差
                const scatteringFactors = [0.95, 0.975, 1.0];  // 更温和的散射系数差异
                
                for (let c = 0; c < 3; c++) {
                    const original = imageData.data[i * 4 + c] / 255;
                    const A = atmosphere[c];
                    
                    // 添加边缘感知的透射率调整
                    const channelT = t * (
                        1.0 - (1.0 - scatteringFactors[c]) * Math.pow(1.0 - t, 0.5)
                    );
                    
                    const invT = 1.0 / Math.max(channelT, 0.001);
                    
                    // 统一的gamma校正
                    const gamma = 0.9;  // 使用统一的gamma值避免通道间的突变
                    
                    let result = Math.pow(
                        (original * invT - A * invT + A),
                        gamma
                    );
                    
                    result = Math.max(0, Math.min(1, result));
                    outputImageData.data[i * 4 + c] = result * 255;
                }
                outputImageData.data[i * 4 + 3] = 255;
            }

            outputCtx.putImageData(outputImageData, 0, 0);

            // 添加智能暗部细节增强
            const enhanceCtx = this.createContext(width, height);
            enhanceCtx.drawImage(inputImage, 0, 0);
            
            // 创建一个新的 Canvas 用于混合
            const blendCtx = this.createContext(width, height);
            const blendData = inputCtx.getImageData(0, 0, width, height);
            
            // 首先计算图像亮度直方图
            const histogramBins = new Float32Array(256).fill(0);
            for (let i = 0; i < width * height; i++) {
                const r = imageData.data[i * 4];
                const g = imageData.data[i * 4 + 1];
                const b = imageData.data[i * 4 + 2];
                const luminance = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
                histogramBins[luminance]++;
            }

            // 计算累积分布函数(CDF)
            const cdf = new Float32Array(256);
            cdf[0] = histogramBins[0];
            for (let i = 1; i < 256; i++) {
                cdf[i] = cdf[i-1] + histogramBins[i];
            }
            // 归一化CDF
            const cdfMin = cdf[0];
            const cdfMax = cdf[255];
            for (let i = 0; i < 256; i++) {
                cdf[i] = (cdf[i] - cdfMin) / (cdfMax - cdfMin);
            }

            // 在process方法中添加直方图分析和调整函数
            function calculateChannelHistogram(data, channel, width, height) {
                const histogram = new Float32Array(256).fill(0);
                for (let i = 0; i < width * height; i++) {
                    const value = Math.round(data[i * 4 + channel]);
                    histogram[value]++;
                }
                return histogram;
            }

            function calculateAdaptiveCDF(histogram) {
                const total = histogram.reduce((a, b) => a + b, 0);
                const cdf = new Float32Array(256);
                let sum = 0;
                
                // 使用S形曲线增强对比度，同时保护暗部细节
                for (let i = 0; i < 256; i++) {
                    sum += histogram[i];
                    // 使用sigmoid函数调整CDF曲线
                    const x = sum / total;
                    const sigmoid = 1 / (1 + Math.exp(-12 * (x - 0.5)));
                    cdf[i] = sigmoid;
                }
                return cdf;
            }

            // 在process方法中的混合步骤部分
            const channelHistograms = [
                calculateChannelHistogram(imageData.data, 0, width, height), // R
                calculateChannelHistogram(imageData.data, 1, width, height), // G
                calculateChannelHistogram(imageData.data, 2, width, height)  // B
            ];

            const channelCDFs = channelHistograms.map(calculateAdaptiveCDF);

            // 修改局部特征分析函数
            function analyzeLocalFeatures(imageData, x, y, width, height) {
                const patchSize = 3;
                const halfPatch = Math.floor(patchSize / 2);
                let contrast = 0;
                let structureness = 0;
                let darkness = 1.0;
                
                // 分析局部patch
                for (let dy = -halfPatch; dy <= halfPatch; dy++) {
                    for (let dx = -halfPatch; dx <= halfPatch; dx++) {
                        const nx = Math.min(Math.max(x + dx, 0), width - 1);
                        const ny = Math.min(Math.max(y + dy, 0), height - 1);
                        const idx = (ny * width + nx) * 4;
                        
                        // 计算局部暗度
                        const pixelDark = Math.min(
                            imageData.data[idx] / 255,
                            imageData.data[idx + 1] / 255,
                            imageData.data[idx + 2] / 255
                        );
                        darkness = Math.min(darkness, pixelDark);
                        
                        // 计算结构性（梯度）
                        if (dx === 0 && dy === 0) continue;
                        const gradient = Math.abs(
                            (imageData.data[idx] + imageData.data[idx + 1] + imageData.data[idx + 2]) / 3 -
                            (imageData.data[(y * width + x) * 4] + 
                             imageData.data[(y * width + x) * 4 + 1] + 
                             imageData.data[(y * width + x) * 4 + 2]) / 3
                        ) / 255;
                        
                        contrast = Math.max(contrast, gradient);
                        structureness += gradient;
                    }
                }
                
                structureness /= (patchSize * patchSize - 1);
                
                return {
                    contrast,
                    structureness,
                    darkness
                };
            }

            // 添加频率分析函数
            function analyzeFrequencyFeatures(imageData, x, y, width, height) {
                const patchSize = 5;  // 增加patch大小以获取更好的频率特征
                const halfPatch = Math.floor(patchSize / 2);
                let highFreqEnergy = 0;
                let totalEnergy = 0;
                
                // Sobel算子
                const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
                const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
                
                // 计算中心像素的梯度能量
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const nx = Math.min(Math.max(x + dx, 0), width - 1);
                        const ny = Math.min(Math.max(y + dy, 0), height - 1);
                        const idx = (ny * width + nx) * 4;
                        
                        const pos = (dy + 1) * 3 + (dx + 1);
                        const luminance = (
                            imageData.data[idx] + 
                            imageData.data[idx + 1] + 
                            imageData.data[idx + 2]
                        ) / 3;
                        
                        highFreqEnergy += Math.abs(luminance * sobelX[pos]) + Math.abs(luminance * sobelY[pos]);
                        totalEnergy += luminance;
                    }
                }
                
                // 归一化频率特征
                const freqRatio = highFreqEnergy / (totalEnergy + 1e-6);
                return Math.min(1, freqRatio * 2);  // 将频率特征映射到[0,1]
            }

            // 改进边缘检测函数
            function detectEdgeStrength(imageData, x, y, width, height) {
                const patchSize = 5;  // 增加检测范围
                const halfPatch = Math.floor(patchSize / 2);
                
                let maxGradient = 0;
                let avgLuminance = 0;
                let luminanceVariance = 0;
                let sampleCount = 0;
                
                // 首先计算局部平均亮度
                for (let dy = -halfPatch; dy <= halfPatch; dy++) {
                    for (let dx = -halfPatch; dx <= halfPatch; dx++) {
                        const nx = Math.min(Math.max(x + dx, 0), width - 1);
                        const ny = Math.min(Math.max(y + dy, 0), height - 1);
                        const idx = (ny * width + nx) * 4;
                        
                        const luminance = (
                            imageData.data[idx] + 
                            imageData.data[idx + 1] + 
                            imageData.data[idx + 2]
                        ) / 3;
                        
                        avgLuminance += luminance;
                        sampleCount++;
                    }
                }
                avgLuminance /= sampleCount;
                
                // 计算方差和最大梯度
                for (let dy = -halfPatch; dy <= halfPatch; dy++) {
                    for (let dx = -halfPatch; dx <= halfPatch; dx++) {
                        const nx = Math.min(Math.max(x + dx, 0), width - 1);
                        const ny = Math.min(Math.max(y + dy, 0), height - 1);
                        const idx = (ny * width + nx) * 4;
                        
                        const luminance = (
                            imageData.data[idx] + 
                            imageData.data[idx + 1] + 
                            imageData.data[idx + 2]
                        ) / 3;
                        
                        luminanceVariance += Math.pow(luminance - avgLuminance, 2);
                        
                        if (dx !== 0 || dy !== 0) {
                            const gradient = Math.abs(luminance - avgLuminance);
                            maxGradient = Math.max(maxGradient, gradient);
                        }
                    }
                }
                
                luminanceVariance = Math.sqrt(luminanceVariance / sampleCount) / 255;
                maxGradient = maxGradient / 255;
                
                // 综合边缘强度
                const edgeStrength = Math.pow(
                    Math.max(maxGradient, luminanceVariance),
                    0.8  // 使用更敏感的指数
                );
                
                return {
                    strength: Math.min(1, edgeStrength),
                    variance: luminanceVariance,
                    gradient: maxGradient
                };
            }

            // 在process方法中的混合步骤
            for (let i = 0; i < width * height; i++) {
                const x = i % width;
                const y = Math.floor(i / width);
                
                // 获取特征
                const features = analyzeLocalFeatures(imageData, x, y, width, height);
                const freqFeature = analyzeFrequencyFeatures(imageData, x, y, width, height);
                
                // 增强的暗部检测
                const r = imageData.data[i * 4] / 255;
                const g = imageData.data[i * 4 + 1] / 255;
                const b = imageData.data[i * 4 + 2] / 255;
                const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
                
                // 改进的暗部判定
                const darkThreshold = 0.35;
                const isDarkArea = luminance < darkThreshold;
                const darknessFactor = isDarkArea ? 
                    Math.pow((darkThreshold - luminance) / darkThreshold, 1.2) : 0;
                
                // 获取增强的边缘信息
                const edge = detectEdgeStrength(imageData, x, y, width, height);
                
                // 计算边缘保护因子
                const edgeProtection = Math.pow(edge.strength, 1.2);
                const varianceProtection = Math.pow(edge.variance, 0.8);
                
                for (let c = 0; c < 3; c++) {
                    const originalVal = imageData.data[i * 4 + c];
                    const dehazeVal = outputImageData.data[i * 4 + c];
                    
                    const normalizedValue = originalVal / 255;
                    const cdfValue = channelCDFs[c][Math.round(originalVal)];
                    
                    // 改进的纹理权重计算，考虑边缘强度
                    const textureWeight = Math.pow(features.structureness, 0.85) * 
                        (1 + freqFeature * 0.45) *  // 降低频率特征影响
                        (1 + 0.12 * (1 - normalizedValue)) *  // 进一步降低暗部增强
                        (1 - edge.strength * 0.3);  // 在强边缘处降低纹理增强
                    
                    // 更平滑的暗部保护计算
                    const darkProtection = isDarkArea ? 
                        (0.28 + 0.32 * darknessFactor) * 
                        (1 + textureWeight * 0.7) *  // 进一步降低纹理影响
                        (1 + 0.1 * (1 - normalizedValue)) * 
                        (1 + edge.strength * 0.25) : 0;  // 在边缘处增加保护
                    
                    // 优化自适应混合权重
                    let adaptiveWeight = Math.max(
                        0.28,  // 进一步提高最小保护
                        Math.min(0.8,
                            0.4 + 
                            0.2 * textureWeight +   // 降低纹理权重
                            0.15 * darkProtection + // 降低暗部保护影响
                            0.1 * (1 - cdfValue) +
                            0.08 * (1 - normalizedValue) -
                            0.15 * edge.strength    // 在强边缘处降低去雾强度
                        )
                    );
                    
                    const t = transmission[i];
                    
                    // 更平滑的散射因子计算
                    const scatteringFactor = Math.pow(1 - t, 
                        0.94 + 
                        0.12 * freqFeature +    // 进一步降低频率特征影响
                        0.1 * darknessFactor +  // 降低暗部因子影响
                        0.06 * (1 - normalizedValue) -
                        0.15 * edge.strength    // 在边缘处降低散射效果
                    );
                    
                    // 更平滑的gamma校正
                    const gamma = 0.92 + 
                        0.06 * textureWeight +  // 进一步降低纹理影响
                        0.05 * darkProtection +
                        0.03 * (1 - cdfValue);
                    
                    // 大幅增强边缘保护
                    const edgeAdjustedWeight = adaptiveWeight * (1 - edgeProtection * 0.5);
                    
                    // 在边缘处使用更保守的散射因子
                    const edgeAdjustedScattering = scatteringFactor * (1 - edgeProtection * 0.6);
                    
                    // 计算基础混合因子
                    const blendFactor = Math.min(1,
                        edgeAdjustedWeight * (1 - t) * (1 - edgeAdjustedScattering)
                    );
                    
                    // 在边缘处使用更平滑的gamma
                    const edgeAdjustedGamma = gamma * (1 + edgeProtection * 0.2);
                    
                    // 改进的三段式过渡函数
                    const x = Math.pow(blendFactor, edgeAdjustedGamma);
                    let weight;
                    if (x < 0.4) {  // 扩大暗部过渡区间
                        // 使用更平滑的曲线
                        weight = 0.85 * Math.pow(x / 0.4, 1.5);
                    } else if (x < 0.8) {  // 扩大中间过渡区间
                        // 使用更平缓的sigmoid
                        const normalized = (x - 0.4) / 0.4;
                        weight = 0.85 + (1 / (1 + Math.exp(-7 * (normalized - 0.5)))) * 0.1;
                    } else {
                        // 更平滑的亮部过渡
                        weight = 0.95 + (x - 0.8) * 0.05 / 0.2;
                    }
                    
                    // 边缘感知的最终权重
                    const finalWeight = weight * (
                        0.97 + 
                        0.03 * darkProtection -
                        0.15 * edgeProtection -  // 显著增加边缘保护
                        0.1 * varianceProtection // 考虑局部方差
                    );
                    
                    // 在边缘处使用更保守的混合
                    const edgeBlend = Math.max(0.5, 1 - edgeProtection);
                    blendData.data[i * 4 + c] = 
                        dehazeVal * (1 - finalWeight) * edgeBlend +
                        originalVal * (1 - (1 - finalWeight) * edgeBlend);
                }
                blendData.data[i * 4 + 3] = 255;
            }
            
            // 应用混合结果
            blendCtx.putImageData(blendData, 0, 0);
            
            // 最终输出
            outputCtx.globalCompositeOperation = 'source-over';
            outputCtx.globalAlpha = 1.0;
            outputCtx.drawImage(blendCtx.canvas, 0, 0);

            resolve(outputCtx.canvas);
        });
    }
}
