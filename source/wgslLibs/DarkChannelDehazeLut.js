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

        // 首先计算每个像素的暗通道值
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                // 计算RGB通道的最小值作为暗通道值
                darkChannel[y * width + x] = Math.min(
                    data[idx] / 255,     // R
                    data[idx + 1] / 255, // G
                    data[idx + 2] / 255  // B
                );
            }
        }

        // 最小值滤波，使用简单的滑动窗口
        const paddedDark = new Float32Array(width * height);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let minVal = 1.0;
                
                // 在radius范围内寻找最小值
                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const ny = Math.min(Math.max(y + dy, 0), height - 1);
                        const nx = Math.min(Math.max(x + dx, 0), width - 1);
                        minVal = Math.min(minVal, darkChannel[ny * width + nx]);
                    }
                }
                
                paddedDark[y * width + x] = minVal;
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
        
        // 构建像素信息数组
        const pixelInfo = [];
        for (let i = 0; i < numPixels; i++) {
            pixelInfo.push({
                dark: darkChannel[i],
                idx: i
            });
        }
        
        // 按暗通道值降序排序
        pixelInfo.sort((a, b) => b.dark - a.dark);
        
        // 取前0.1%最亮的像素
        const topPixels = pixelInfo.slice(0, Math.max(Math.floor(numPixels * 0.001), 1));
        
        // 计算这些像素的RGB均值作为大气光估计值
        let sumR = 0, sumG = 0, sumB = 0;
        topPixels.forEach(({ idx }) => {
            const i = idx * 4;
            sumR += data[i];
            sumG += data[i + 1];
            sumB += data[i + 2];
        });
        
        const numTop = topPixels.length;
        return [
            sumR / numTop / 255,
            sumG / numTop / 255,
            sumB / numTop / 255
        ];
    }

    getTransmission(darkChannel) {
        // 透射率计算的关键参数
        const omega = 0.95;  // 去雾程度参数
        const minTransmission = 0.12;  // 最小透射率阈值
        const maxTransmission = 0.99;  // 最大透射率阈值
        
        if (!darkChannel || darkChannel.length === 0) {
            throw new Error('Invalid dark channel input');
        }

        return darkChannel.map(dc => {
            // 基于暗通道先验的透射率估计
            // t(x) = 1 - omega * dc(x)
            const transmission = 1.0 - omega * dc;
            
            // 限制透射率范围，避免过度去雾或欠去雾
            return Math.max(minTransmission, 
                          Math.min(maxTransmission, transmission));
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

        // 验证输入
        if (!imageData || !imageData.data || width <= 0 || height <= 0) {
            throw new Error('Invalid image data');
        }

        // 1. 计算暗通道
        const darkChannel = this.getDarkChannel(imageData, 4);
        if (!darkChannel || darkChannel.some(v => isNaN(v) || v < 0 || v > 1)) {
            throw new Error('Invalid dark channel calculation');
        }
        
        // 2. 估计大气光
        const atmosphere = this.estimateAtmosphericLight(darkChannel, imageData);
        if (!atmosphere || atmosphere.length !== 3 || 
            atmosphere.some(v => isNaN(v) || v < 0 || v > 1)) {
            throw new Error('Invalid atmospheric light estimation');
        }
        
        // 3. 估计透射率
        const transmission = this.getTransmission(darkChannel);
        if (!transmission || transmission.some(v => isNaN(v) || v < 0 || v > 1)) {
            throw new Error('Invalid transmission calculation');
        }
        
        // 4. 使用导向滤波细化透射率
        const refinedTransmission = this.guidedFilter(imageData, transmission, 8, 0.0001);
        if (!refinedTransmission || refinedTransmission.some(v => isNaN(v))) {
            throw new Error('Invalid refined transmission');
        }

        // 修改 LUT 构建
        const lutSize = 64;
        const numLUTs = 4;
        const lutDataArray = new Array(numLUTs);
        
        // 基于场景深度的透射率范围
        const depthLevels = [0.2, 0.4, 0.6, 0.8]; // 从近到远的场景深度
        
        for (let level = 0; level < numLUTs; level++) {
            const lutData = new Float32Array(lutSize * lutSize * lutSize * 4);
            const depth = depthLevels[level];
            
            for(let b = 0; b < lutSize; b++) {
                for(let g = 0; g < lutSize; g++) {
                    for(let r = 0; r < lutSize; r++) {
                        const idx = (b * lutSize * lutSize + g * lutSize + r) * 4;
                        const normalizedR = r / (lutSize - 1);
                        const normalizedG = g / (lutSize - 1);
                        const normalizedB = b / (lutSize - 1);

                        // 基于物理模型的去雾映射
                        const t = Math.exp(-depth); // 基于深度的透射率
                        lutData[idx] = (normalizedR - atmosphere[0]) / t + atmosphere[0];
                        lutData[idx + 1] = (normalizedG - atmosphere[1]) / t + atmosphere[1];
                        lutData[idx + 2] = (normalizedB - atmosphere[2]) / t + atmosphere[2];
                        lutData[idx + 3] = 1.0;

                        // 限制范围
                        lutData[idx] = Math.min(1, Math.max(0, lutData[idx]));
                        lutData[idx + 1] = Math.min(1, Math.max(0, lutData[idx + 1]));
                        lutData[idx + 2] = Math.min(1, Math.max(0, lutData[idx + 2]));
                    }
                }
            }
            
            lutDataArray[level] = lutData;
        }

        // 修改强度图计算
        const intensityMaps = new Array(numLUTs);
        
        for (let level = 0; level < numLUTs; level++) {
            const intensityMap = new Float32Array(width * height);
            const targetDepth = depthLevels[level];
            
            for(let i = 0; i < width * height; i++) {
                const t = refinedTransmission[i];
                const estimatedDepth = -Math.log(t); // 从透射率估计深度
                
                // 基于深度差异的高斯权重
                const sigma = 0.3;
                const depthWeight = Math.exp(-Math.pow(estimatedDepth - targetDepth, 2) / (2 * sigma * sigma));
                
                // 考虑边缘保持
                const x = i % width;
                const y = Math.floor(i / width);
                const edge = this.detectEdgeStrength(imageData, x, y, width, height);
                const edgeWeight = 1 - edge.strength;
                
                intensityMap[i] = depthWeight * (0.8 + 0.2 * edgeWeight);
            }
            
            intensityMaps[level] = {
                data: intensityMap,
                width,
                height
            };
        }

        return {
            luts: lutDataArray.map(data => ({
                data,
                size: lutSize
            })),
            intensityMaps,
            atmosphere
        };
    }

    // 添加安全的数学运算辅助函数
    safePow(base, exp) {
        if (base < 0) return 0;
        const result = Math.pow(base, exp);
        return isNaN(result) ? 0 : result;
    }

    safeDiv(a, b) {
        if (b === 0) return 0;
        const result = a / b;
        return isNaN(result) ? 0 : result;
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
        const { luts, intensityMaps, atmosphere } = lutData;
        const outputData = new Uint8ClampedArray(width * height * 4);
        
        // 验证数据
        if (!luts || !luts.length || !intensityMaps || !intensityMaps.length) {
            throw new Error('Invalid LUT data structure');
        }

        const numLUTs = luts.length;
        const lutSize = luts[0].size;

        for (let i = 0; i < width * height; i++) {
            const x = i % width;
            const y = Math.floor(i / width);

            // 获取原始颜色
            const r = imageData.data[i * 4] / 255;
            const g = imageData.data[i * 4 + 1] / 255;
            const b = imageData.data[i * 4 + 2] / 255;
            const a = imageData.data[i * 4 + 3] / 255;

            if (isNaN(r) || isNaN(g) || isNaN(b)) {
                throw new Error(`Invalid color values at pixel (${x}, ${y})`);
            }

            // 计算每个LUT的结果
            const results = new Array(numLUTs);
            for (let level = 0; level < numLUTs; level++) {
                const lut = luts[level];
                
                // 计算LUT索引
                const rx = Math.min(Math.floor(r * (lutSize - 1)), lutSize - 2);
                const gx = Math.min(Math.floor(g * (lutSize - 1)), lutSize - 2);
                const bx = Math.min(Math.floor(b * (lutSize - 1)), lutSize - 2);
                
                // 计算插值因子
                const rf = r * (lutSize - 1) - rx;
                const gf = g * (lutSize - 1) - gx;
                const bf = b * (lutSize - 1) - bx;

                // 三线性插值
                results[level] = this.trilinearInterpolation(
                    lut.data, lutSize, rx, gx, bx, rf, gf, bf
                );
            }

            // 获取每个级别的强度
            const intensities = intensityMaps.map(map => map.data[i]);
            
            // 混合不同级别的结果
            let finalR = 0, finalG = 0, finalB = 0;
            let totalWeight = 0;
            
            for (let level = 0; level < numLUTs; level++) {
                const intensity = Math.max(0, intensities[level]); // 允许负值但不参与计算
                totalWeight += intensity;
                
                finalR += results[level][0] * intensity;
                finalG += results[level][1] * intensity;
                finalB += results[level][2] * intensity;
            }

            // 如果总权重为0，使用原始颜色
            if (totalWeight <= 0) {
                finalR = r;
                finalG = g;
                finalB = b;
            } else {
                // 归一化结果
                finalR /= totalWeight;
                finalG /= totalWeight;
                finalB /= totalWeight;
            }

            // 存储结果
            outputData[i * 4] = Math.min(255, Math.max(0, Math.round(finalR * 255)));
            outputData[i * 4 + 1] = Math.min(255, Math.max(0, Math.round(finalG * 255)));
            outputData[i * 4 + 2] = Math.min(255, Math.max(0, Math.round(finalB * 255)));
            outputData[i * 4 + 3] = Math.round(a * 255);
        }

        return outputData;
    }

    trilinearInterpolation(lutData, lutSize, rx, gx, bx, rf, gf, bf) {
        const result = [0, 0, 0];
        let totalWeight = 0;

        // 对8个相邻点进行插值
        for (let i = 0; i < 2; i++) {
            for (let j = 0; j < 2; j++) {
                for (let k = 0; k < 2; k++) {
                    const idx = ((bx + i) * lutSize * lutSize + 
                               (gx + j) * lutSize + 
                               (rx + k)) * 4;
                    
                    const weight = ((i === 0 ? (1 - bf) : bf) *
                                  (j === 0 ? (1 - gf) : gf) *
                                  (k === 0 ? (1 - rf) : rf));
                    
                    totalWeight += weight;
                    result[0] += lutData[idx] * weight;
                    result[1] += lutData[idx + 1] * weight;
                    result[2] += lutData[idx + 2] * weight;
                }
            }
        }

        // 归一化结果
        if (totalWeight > 0) {
            result[0] /= totalWeight;
            result[1] /= totalWeight;
            result[2] /= totalWeight;
        }

        return result;
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
