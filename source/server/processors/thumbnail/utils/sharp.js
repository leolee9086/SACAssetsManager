const sharp = require('sharp')

/**
 * 处理图像缓冲区
 * @param {Buffer} buffer - 图像的缓冲区
 * @param {string} filePath - 图像文件的路径
 * @returns {Promise<Buffer>} 处理后的图像缓冲区
 */
export async function processImageBuffer(buffer, filePath) {
    try {
        return await sharp(buffer).resize(32, 32, {
            fit: 'inside',
            withoutEnlargement: true // 防止放大图像
        }).raw().toBuffer()
    } catch (e) {
        console.log(buffer, filePath)
        return null
    }
}
