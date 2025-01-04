export class DarkChannelDehaze {
    constructor() {
        this.params = {
            atmosphere: [1.0, 1.0, 1.0], // 大气光值
            beta: 1.0,                   // 散射系数
        };
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
                let minVal = 1.0;
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
        const omega = 0.95;
        const minTransmission = 0.1;
        const maxTransmission = 0.9;
        
        return darkChannel.map(dc => {
            const rawTransmission = 1.0 - omega * dc;
            const depthFactor = Math.pow(dc, 0.8);
            const adjustedTransmission = (rawTransmission + depthFactor) * 0.5;
            return Math.max(minTransmission, Math.min(maxTransmission, adjustedTransmission));
        });
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
                const t = Math.max(transmission[i], 0.001);
                const invT = 1.0 / t;

                for (let c = 0; c < 3; c++) {
                    const original = imageData.data[i * 4 + c] / 255;
                    const A = atmosphere[c];
                    
                    let result = Math.pow(
                        (original * invT - A * invT + A),
                        0.9
                    );
                    
                    result = Math.max(0, Math.min(1, result));
                    outputImageData.data[i * 4 + c] = result * 255;
                }
                outputImageData.data[i * 4 + 3] = 255; // Alpha 通道
            }

            outputCtx.putImageData(outputImageData, 0, 0);
            resolve(outputCtx.canvas);
        });
    }
}
