import { requirePluginDeps } from "../../../../module/requireDeps.js";
const sharp = requirePluginDeps('sharp')

/**
 * 基于暗通道先验的去雾算法
 * @param {Sharp} img Sharp实例
 * @param {number} 强度 去雾强度，默认1.0
 * @returns {Promise<Sharp>} 处理后的Sharp实例
 */
export async function 去雾滤镜(img, 强度 = 1.0) {
        // 加载原始图像
        const image = img.clone();

        // 获取图像的元数据（尺寸等）
        const metadata = await image.metadata();
    
        // 计算高斯模糊图像，代表环境光照分量 L(x, y)
        const blurredImage = await image.clone().blur(100).raw().toBuffer();
    
           // 计算 S(x, y) * G(x, y)
    const originalData = await image.raw().toBuffer();
    const illumination = Buffer.from(originalData.map((value, index) => value * blurredImage[index] / 255/255));

    // 计算 log(R(x, y)) = log(S(x, y)) - log(G(x, y) * S(x, y))
    const logR = Buffer.from(originalData.map((value, index) => {
        const S = value;
        const G = illumination[index];
        return Math.log(S +1) - Math.log(G+1 );
    }));
    console.log(logR)

    // 指数变换恢复 R(x, y)
    const enhancedData = Buffer.from(logR.map(value => Math.exp(value)));
    console.log(enhancedData)
        // 使用迭代方法找到最大值和最小值
       let maxVal = 0;
        let minVal = Infinity;
        for (let i = 0; i < enhancedData.length; i++) {
            if (enhancedData[i] > maxVal) maxVal = enhancedData[i];
            if (enhancedData[i] < minVal) minVal = enhancedData[i];
        }
        
        // 归一化到0-255范围
        const normalizedData = Buffer.from(enhancedData.map(value => {
            return ((value - minVal) / (maxVal - minVal)) * 255;
        }));
    
        // 创建增强后的图像
        return sharp(normalizedData, {
            raw: {
                width: metadata.width,
                height: metadata.height,
                channels: metadata.channels
            }
        }).ensureAlpha()
        .normalise()
        .png()



}
export const 去雾滤镜1=    async(img, 强度 = 1.0) =>{

const metadata = await img.metadata();
console.log(metadata)
// 分通道处理图像
const channels = [0,1, 2].map(async (channel, index) => {
    // 提取单个通道并计算暗通道
    const channelData = await img.clone()
    .extractChannel(index)
    .raw()
    .toBuffer();

// 估计该通道的全局大气光A
const sortedChannelData = Array.from(channelData).sort((a, b) => b - a);
const topPixels = sortedChannelData.slice(0, Math.ceil(channelData.length * 0.001));
const A = topPixels.reduce((sum, val) => sum + val, 0) / topPixels.length;
console.log(sortedChannelData,topPixels,A)

// 计算该通道的透射率t
const tChannel = channelData.map(v => 1 - v / A);
    console.log(tChannel,A )
// 调整该通道的像素值，并确保值在0-255范围内
return channelData.map((v, i) => {
    const newValue = v * tChannel[i] * 强度 + A * (1 - tChannel[i]);
    return Math.min(255, Math.max(0, newValue)); // 确保像素值在0到255之间
});

});
console.log(channels)

// 等待所有通道处理完成
const processedChannels = await Promise.all(channels);
console.log(processedChannels)

// 加权整合
const finalImage = await sharp(processedChannels[0],{
    raw: {
        ... metadata,
         channels:1,
         background:{r:0,g:0,b:0}
     }
}).joinChannel(
        [
            processedChannels[1],
            processedChannels[2]
        ]
    , { 
        raw: {
           ... metadata,
            channels:1
        }
    } 
    ).toColorspace('srgb').ensureAlpha()
    .png()
    console.log(await finalImage.raw().toBuffer())
return finalImage;
}
