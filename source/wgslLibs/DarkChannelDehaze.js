// LUT构建器类
class LUTBuilder {
    constructor() {
        this.params = {
            atmosphere: [1.0, 1.0, 1.0],
            beta: 1.0,
            darkEnhance: {
                brightness: 30,
                contrast: 120,
                opacity: 0.1
            }
        };
    }

    createContext(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        return canvas.getContext('2d');
    }

    // 移动原始类中的暗通道、大气光、透射率等计算方法
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

        // 添加边缘感知的权重计算
        const edgeWeights = this.calculateEdgeWeights(imageData);
        
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
                
                const edgeWeight = edgeWeights[y * width + x];
                paddedDark[y * width + x] = valueSum / weightSum * (1 + edgeWeight * 0.2);
            }
        }
    
    

        return paddedDark;
    }

    // 添加新方法：计算边缘权重
    calculateEdgeWeights(imageData) {
        const { width, height, data } = imageData;
        const weights = new Float32Array(width * height);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const edge = this.detectEdgeStrength(imageData, x, y, width, height);
                weights[y * width + x] = edge.strength;
            }
        }

        return weights;
    }

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

    getTransmission(darkChannel) {
        const omega = 0.95;
        const minTransmission = 0.12;
        const maxTransmission = 0.99;
        
        return darkChannel.map(dc => {
            // 使用更激进的非线性omega调整
            const adaptiveOmega = omega * (1 + 0.35 * Math.pow(dc, 1.6));
            const rawTransmission = 1.0 - adaptiveOmega * dc;
            
            // 改进的深度因子计算
            const depthFactor = Math.pow(dc, 0.55);
            const enhancedDepth = depthFactor * (1 + 0.25 * Math.pow(1 - depthFactor, 1.2));
            
            // 更激进的透射率混合
            const adjustedTransmission = 
                rawTransmission * 0.55 + 
                enhancedDepth * 0.35 + 
                Math.pow(1 - dc, 1.0) * 0.10;
            
            return Math.max(minTransmission, Math.min(maxTransmission, adjustedTransmission));
        });
    }

    guidedFilter(imageData, src, radius, eps) {
        const width = imageData.width;
        const height = imageData.height;
        const size = width * height;
        
        // 直接使用输入的 ImageData
        const I = imageData.data;
        
        // 计算均值
        const meanI = new Float32Array(size);
        const meanP = new Float32Array(size);
        const corrI = new Float32Array(size);
        const corrIP = new Float32Array(size);
        
        // 使用盒式滤波计算局部均值
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let sumI = 0, sumP = 0, sumII = 0, sumIP = 0;
                let count = 0;
                
                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const nx = Math.min(Math.max(x + dx, 0), width - 1);
                        const ny = Math.min(Math.max(y + dy, 0), height - 1);
                        const idx = (ny * width + nx);
                        
                        const i = (I[idx * 4] + I[idx * 4 + 1] + I[idx * 4 + 2]) / (3 * 255);
                        const p = src[idx];
                        
                        sumI += i;
                        sumP += p;
                        sumII += i * i;
                        sumIP += i * p;
                        count++;
                    }
                }
                
                const idx = y * width + x;
                meanI[idx] = sumI / count;
                meanP[idx] = sumP / count;
                corrI[idx] = sumII / count;
                corrIP[idx] = sumIP / count;
            }
        }
        
        // 计算协方差和方差
        const a = new Float32Array(size);
        const b = new Float32Array(size);
        
        for (let i = 0; i < size; i++) {
            const varI = corrI[i] - meanI[i] * meanI[i];
            const covIP = corrIP[i] - meanI[i] * meanP[i];
            
            a[i] = covIP / (varI + eps);
            b[i] = meanP[i] - a[i] * meanI[i];
        }
        
        // 应用滤波
        const output = new Float32Array(size);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let sumA = 0, sumB = 0;
                let count = 0;
                
                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const nx = Math.min(Math.max(x + dx, 0), width - 1);
                        const ny = Math.min(Math.max(y + dy, 0), height - 1);
                        const idx = ny * width + nx;
                        
                        sumA += a[idx];
                        sumB += b[idx];
                        count++;
                    }
                }
                
                const idx = y * width + x;
                const i = (I[idx * 4] + I[idx * 4 + 1] + I[idx * 4 + 2]) / (3 * 255);
                output[idx] = (sumA / count) * i + (sumB / count);
            }
        }
        
        return output;
    }

    // 添加完整的边缘检测方法
    detectEdgeStrength(imageData, x, y, width, height) {
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

    // 构建LUT数据
    buildLUT(imageData) {
        const width = imageData.width;
        const height = imageData.height;

        // 计算必要的中间数据
        const darkChannel = this.getDarkChannel(imageData, 4);
        const atmosphere = this.estimateAtmosphericLight(darkChannel, imageData);
        const transmission = this.getTransmission(darkChannel);
        const refinedTransmission = this.guidedFilter(imageData, transmission, 8, 0.0001);

        // 返回LUT所需的所有数据
        return {
            darkChannel,
            atmosphere,
            transmission: refinedTransmission,
            dimensions: { width, height }
        };
    }
}

// LUT应用器类
class LUTApplier {
    constructor() {
        this.params = {
            atmosphere: [1.0, 1.0, 1.0],
            beta: 1.0
        };
    }

    createContext(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        return canvas.getContext('2d');
    }

    // 移动原始类中的图像增强和混合相关方法
    analyzeLocalFeatures(imageData, x, y, width, height) {
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

    analyzeFrequencyFeatures(imageData, x, y, width, height) {
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

    detectEdgeStrength(imageData, x, y, width, height) {
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

    // 应用LUT并处理图像
    applyLUT(imageData, lutData) {
        const { width, height } = imageData;
        const { darkChannel, atmosphere, transmission } = lutData;
        const outputData = new Uint8ClampedArray(width * height * 4);

        // 计算直方图
        const histogramBins = new Float32Array(256).fill(0);
        for (let i = 0; i < width * height; i++) {
            const r = imageData.data[i * 4];
            const g = imageData.data[i * 4 + 1];
            const b = imageData.data[i * 4 + 2];
            const luminance = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
            histogramBins[luminance]++;
        }

        // 计算CDF
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

        // 计算每个通道的直方图和CDF
        const channelHistograms = [
            this.calculateChannelHistogram(imageData.data, 0, width, height),
            this.calculateChannelHistogram(imageData.data, 1, width, height),
            this.calculateChannelHistogram(imageData.data, 2, width, height)
        ];
        const channelCDFs = channelHistograms.map(this.calculateAdaptiveCDF);

        for (let i = 0; i < width * height; i++) {
            const x = i % width;
            const y = Math.floor(i / width);
            
            // 获取特征
            const features = this.analyzeLocalFeatures(imageData, x, y, width, height);
            const freqFeature = this.analyzeFrequencyFeatures(imageData, x, y, width, height);
            const edge = this.detectEdgeStrength(imageData, x, y, width, height);

            // 计算基础颜色值
            const r = imageData.data[i * 4] / 255;
            const g = imageData.data[i * 4 + 1] / 255;
            const b = imageData.data[i * 4 + 2] / 255;
            const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

            // 改进的暗部判定
            const darkThreshold = 0.40;
            const isDarkArea = luminance < darkThreshold;
            const darknessFactor = isDarkArea ? 
                Math.pow((darkThreshold - luminance) / darkThreshold, 1.1) : 0;

            // 计算边缘保护因子
            const edgeProtection = Math.pow(edge.strength, 1.2);
            const varianceProtection = Math.pow(edge.variance, 0.8);

            const t = transmission[i];
            const finalColor = [0, 0, 0];

            for (let c = 0; c < 3; c++) {
                const originalVal = imageData.data[i * 4 + c];
                const normalizedValue = originalVal / 255;
                const cdfValue = channelCDFs[c][Math.round(originalVal)];

                // 改进的纹理权重计算
                const textureWeight = Math.pow(features.structureness, 0.85) * 
                    (1 + freqFeature * 0.45) * 
                    (1 + 0.12 * (1 - normalizedValue)) * 
                    (1 - edge.strength * 0.3);

                // 更平滑的暗部保护计算
                const darkProtection = isDarkArea ? 
                    (0.45 + 0.45 * darknessFactor) * 
                    (1 + textureWeight * 0.9) * 
                    (1 + 0.20 * (1 - normalizedValue)) * 
                    (1 + edge.strength * 0.35) : 0;

                // 优化自适应混合权重
                let adaptiveWeight = Math.max(
                    0.35,
                    Math.min(0.88,
                        0.48 + 
                        0.28 * textureWeight +   
                        0.25 * darkProtection + 
                        0.15 * (1 - cdfValue) +
                        0.12 * (1 - normalizedValue) -
                        0.10 * edge.strength    
                    )
                );

                // 更平滑的散射因子计算
                const scatteringFactor = Math.pow(1 - t, 
                    0.94 + 
                    0.12 * freqFeature +    
                    0.1 * darknessFactor +  
                    0.06 * (1 - normalizedValue) -
                    0.15 * edge.strength    
                );

                // 更平滑的gamma校正
                const gamma = 0.92 + 
                    0.06 * textureWeight +  
                    0.05 * darkProtection +
                    0.03 * (1 - cdfValue);

                // 大幅增强边缘保护
                const edgeAdjustedWeight = adaptiveWeight * (1 - edgeProtection * 0.5);
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
                if (x < 0.4) {
                    weight = 0.85 * Math.pow(x / 0.4, 1.5);
                } else if (x < 0.8) {
                    const normalized = (x - 0.4) / 0.4;
                    weight = 0.85 + (1 / (1 + Math.exp(-7 * (normalized - 0.5)))) * 0.1;
                } else {
                    weight = 0.95 + (x - 0.8) * 0.05 / 0.2;
                }

                // 边缘感知的最终权重
                const finalWeight = weight * (
                    0.97 + 
                    0.03 * darkProtection -
                    0.15 * edgeProtection -
                    0.1 * varianceProtection
                );

                // 计算去雾结果
                const dehazeVal = (normalizedValue - atmosphere[c]) / Math.max(t, 0.1) + atmosphere[c];

                // 在边缘处使用更保守的混合
                const edgeBlend = Math.max(0.5, 1 - edgeProtection);
                finalColor[c] = dehazeVal * (1 - finalWeight) * edgeBlend +
                               normalizedValue * (1 - (1 - finalWeight) * edgeBlend);
            }

            // 应用最终的混合结果
            for (let c = 0; c < 3; c++) {
                outputData[i * 4 + c] = Math.round(finalColor[c] * 255);
            }
            outputData[i * 4 + 3] = 255;
        }

        return outputData;
    }

    // 辅助方法：计算通道直方图
    calculateChannelHistogram(data, channel, width, height) {
        const histogram = new Float32Array(256).fill(0);
        for (let i = 0; i < width * height; i++) {
            const value = Math.round(data[i * 4 + channel]);
            histogram[value]++;
        }
        return histogram;
    }

    // 辅助方法：计算自适应CDF
    calculateAdaptiveCDF(histogram) {
        const total = histogram.reduce((a, b) => a + b, 0);
        const cdf = new Float32Array(256);
        let sum = 0;
        
        for (let i = 0; i < 256; i++) {
            sum += histogram[i];
            const x = sum / total;
            const sigmoid = 1 / (1 + Math.exp(-12 * (x - 0.5)));
            cdf[i] = sigmoid;
        }
        return cdf;
    }
}

// 保持原始类作为外观类
export class DarkChannelDehaze {
    constructor() {
        this.lutBuilder = new LUTBuilder();
        this.lutApplier = new LUTApplier();
    }

    // 创建 Canvas 上下文
    createContext(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        return canvas.getContext('2d');
    }

    // 修改 process 方法
    process(inputImage) {
        return new Promise((resolve) => {
            // 创建输入输出 context
            const inputCtx = this.createContext(inputImage.width, inputImage.height);
            const outputCtx = this.createContext(inputImage.width, inputImage.height);

            // 绘制输入图像
            inputCtx.drawImage(inputImage, 0, 0);
            const imageData = inputCtx.getImageData(0, 0, inputImage.width, inputImage.height);

            // 构建LUT数据
            const lutData = this.lutBuilder.buildLUT(imageData);

            // 应用LUT并获取结果
            const processedData = this.lutApplier.applyLUT(imageData, lutData);

            // 创建新的 ImageData 并绘制到输出 canvas
            const outputImageData = new ImageData(
                processedData,
                inputImage.width,
                inputImage.height
            );
            outputCtx.putImageData(outputImageData, 0, 0);

            // 返回处理后的 canvas
            resolve(outputCtx.canvas);
        });
    }
}
