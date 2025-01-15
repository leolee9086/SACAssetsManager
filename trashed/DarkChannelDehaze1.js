export class DarkChannelDehaze {
    constructor() {
        this.params = {
            atmosphere: [1.0, 1.0, 1.0],
            beta: 1.0,
        };
    }

    createContext(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        return canvas.getContext('2d');
    }

    getDarkChannel(imageData, radius) {
        const { width, height, data } = imageData;
        const darkChannel = new Float32Array(width * height);

        // 计算初始暗通道
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const darkValue = Math.min(
                    data[idx] / 255,
                    data[idx + 1] / 255,
                    data[idx + 2] / 255
                );
                darkChannel[y * width + x] = darkValue;
            }
        }

        // 使用改进的引导滤波
        const epsilon = 0.1;
        return this.guidedFilter(darkChannel, darkChannel, width, height, radius, epsilon);
    }

    estimateAtmosphericLight(darkChannel, imageData) {
        const { width, height, data } = imageData;
        const numPixels = width * height;
        
        // 增加采样比例
        const sampleRatio = 0.2;
        const numSamples = Math.floor(numPixels * sampleRatio);
        const samples = new Set();
        
        while (samples.size < numSamples) {
            const idx = Math.floor(Math.random() * numPixels);
            samples.add(idx);
        }
        
        const pixelInfo = Array.from(samples).map(idx => {
            const i = idx * 4;
            const r = data[i] / 255;
            const g = data[i + 1] / 255;
            const b = data[i + 2] / 255;
            
            const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const saturation = max === 0 ? 0 : (max - min) / max;
            
            // 调整权重计算
            const weight = brightness * (1 - saturation * 0.5);
            
            return {
                dark: darkChannel[idx],
                idx: idx,
                weight: weight
            };
        });
        
        // 取前10%最亮的点
        pixelInfo.sort((a, b) => b.dark - a.dark);
        const brightestPixels = pixelInfo.slice(0, Math.floor(pixelInfo.length * 0.1));
        
        let totalWeight = 0;
        let sumR = 0, sumG = 0, sumB = 0;
        
        brightestPixels.forEach(({ idx, weight }) => {
            const i = idx * 4;
            totalWeight += weight;
            sumR += data[i] * weight;
            sumG += data[i + 1] * weight;
            sumB += data[i + 2] * weight;
        });
        
        if (totalWeight === 0) {
            totalWeight = brightestPixels.length;
            brightestPixels.forEach(({ idx }) => {
                const i = idx * 4;
                sumR += data[i];
                sumG += data[i + 1];
                sumB += data[i + 2];
            });
        }
        
        return [
            sumR / (totalWeight * 255),
            sumG / (totalWeight * 255),
            sumB / (totalWeight * 255)
        ];
    }

    getTransmission(darkChannel) {
        const minTransmission = 0.1;
        const maxTransmission = 0.9;
        
        const adaptiveOmega = (dc) => {
            // 调整阈值，降低亮部阈值以增强效果
            const thresholds = [0.35, 0.65];
            const strengths = [0.65, 0.8, 0.9];
            
            const smoothstep = (edge0, edge1, x) => {
                const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
                return t * t * (3 - 2 * t);
            };
            
            let finalStrength = strengths[0];
            for (let i = 0; i < thresholds.length; i++) {
                const t = smoothstep(
                    Math.max(0, thresholds[i] - 0.1),
                    thresholds[i] + 0.1,
                    dc
                );
                finalStrength = (1 - t) * finalStrength + t * strengths[i + 1];
            }
            
            return finalStrength;
        };
        
        return darkChannel.map(dc => {
            const omega = adaptiveOmega(dc);
            let transmission = 1.0 - omega * dc;
            
            // 调整深度影响，减小亮部的透射率
            const depthAdjustment = Math.pow(dc, 0.5);
            transmission = transmission * 0.75 + depthAdjustment * 0.25;
            
            return Math.max(minTransmission, Math.min(maxTransmission, transmission));
        });
    }

    process(inputImage) {
        return new Promise((resolve) => {
            const width = inputImage.width;
            const height = inputImage.height;

            const inputCtx = this.createContext(width, height);
            const outputCtx = this.createContext(width, height);

            inputCtx.drawImage(inputImage, 0, 0);
            const imageData = inputCtx.getImageData(0, 0, width, height);

            const darkChannel = this.getDarkChannel(imageData, 15); // 增加半径
            const atmosphere = this.estimateAtmosphericLight(darkChannel, imageData);
            const transmission = this.getTransmission(darkChannel);

            const outputImageData = outputCtx.createImageData(width, height);
            for (let i = 0; i < width * height; i++) {
                const t = Math.max(transmission[i], 0.08);
                const invT = 1.0 / t;

                for (let c = 0; c < 3; c++) {
                    const original = imageData.data[i * 4 + c] / 255;
                    const A = atmosphere[c];
                    
                    // 调整伽马值以增强亮部细节
                    let result = Math.pow(
                        (original * invT - A * invT + A),
                        0.65
                    );
                    
                    result = Math.max(0, Math.min(1, result));
                    outputImageData.data[i * 4 + c] = result * 255;
                }
                outputImageData.data[i * 4 + 3] = 255;
            }

            outputCtx.putImageData(outputImageData, 0, 0);
            resolve(outputCtx.canvas);
        });
    }

    // 修复的引导滤波实现
    guidedFilter(I, p, width, height, radius, epsilon) {
        const size = width * height;
        const meanI = this.boxFilter(I, width, height, radius);
        const meanP = this.boxFilter(p, width, height, radius);
        
        const corrI = this.boxFilter(I.map(x => x * x), width, height, radius);
        const corrIp = this.boxFilter(I.map((x, i) => x * p[i]), width, height, radius);
        
        const varI = corrI.map((x, i) => Math.max(x - meanI[i] * meanI[i], 0));
        const covIp = corrIp.map((x, i) => x - meanI[i] * meanP[i]);
        
        const a = covIp.map((x, i) => x / (varI[i] + epsilon));
        const b = meanP.map((x, i) => x - a[i] * meanI[i]);
        
        const meanA = this.boxFilter(a, width, height, radius);
        const meanB = this.boxFilter(b, width, height, radius);
        
        return I.map((x, i) => meanA[i] * x + meanB[i]);
    }

    // 修复的盒式滤波实现
    boxFilter(data, width, height, radius) {
        const result = new Float32Array(data.length);
        const integral = new Float32Array((width + 1) * (height + 1));
        
        // 计算积分图
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                const iidx = (y + 1) * (width + 1) + (x + 1);
                integral[iidx] = data[idx] + 
                               integral[iidx - 1] + 
                               integral[iidx - (width + 1)] - 
                               integral[iidx - (width + 2)];
            }
        }
        
        // 使用积分图计算均值
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const x1 = Math.max(x - radius, 0);
                const x2 = Math.min(x + radius, width - 1);
                const y1 = Math.max(y - radius, 0);
                const y2 = Math.min(y + radius, height - 1);
                const count = (x2 - x1 + 1) * (y2 - y1 + 1);
                
                const sum = integral[(y2 + 1) * (width + 1) + (x2 + 1)] -
                           integral[y1 * (width + 1) + (x2 + 1)] -
                           integral[(y2 + 1) * (width + 1) + x1] +
                           integral[y1 * (width + 1) + x1];
                           
                result[y * width + x] = sum / count;
            }
        }
        
        return result;
    }
}