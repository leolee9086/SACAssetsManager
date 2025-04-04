const sharp = require('sharp')
import { 创建变换预设 } from '../../../../../src/utils/fromDeps/sharpInterface/useSharp/transform.js'

/**
 * 处理图像缓冲区，将图像缩放到32x32像素
 * @param {Buffer} buffer - 图像的缓冲区
 * @returns {Promise<Buffer>} 处理后的图像缓冲区
 */
export async function 缩放图像到32(buffer) {
    const 缩略图预设 = 创建变换预设({
        尺寸: [32, 32],
        选项: {
            适应: 'inside',
            禁止放大: true
        }
    })
    
    return await 缩略图预设(sharp(buffer)).raw().toBuffer()
}
