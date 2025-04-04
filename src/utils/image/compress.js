import { plugin } from '../../../source/asyncModules.js'
const workspaceDir = window.siyuan.config.system.workspaceDir
const sharpPath = require('path').join(workspaceDir, 'data', 'plugins', plugin.name, 'node_modules', 'sharp')
const sharp = require(sharpPath)

export const 压缩单个图片 = async (inputPath, outputPath, 压缩质量, 压缩级别, 文件格式) => {
    try {
        let sharpInstance = sharp(inputPath);
        
        switch (文件格式) {
            case 'jpg':
            case 'jpeg':
                sharpInstance = sharpInstance.jpeg({ quality: 压缩质量 });
                break;
            case 'webp':
                sharpInstance = sharpInstance.webp({ quality: 压缩质量 });
                break;
            case 'png':
            default:
                sharpInstance = sharpInstance.png({
                    compressionLevel: 压缩级别,
                    quality: 压缩质量
                });
                break;
        }

        await sharpInstance.toFile(outputPath);
        console.log(`图片 ${inputPath} 压缩完成，保存为 ${outputPath}`);
        return outputPath;
    } catch (error) {
        console.error(`压缩图片 ${inputPath} 时出错: ${error}`);
        return ''
    }
}
/**
 * 调整图片尺寸
 */
export const 调整图片尺寸 = async (inputPath, outputPath, options = {}) => {
    try {
        const { width, height, fit = 'cover' } = options;
        await sharp(inputPath)
            .resize(width, height, { fit })
            .toFile(outputPath);
        return outputPath;
    } catch (error) {
        console.error(`调整图片尺寸失败: ${error}`);
        return '';
    }
}

/**
 * 添加水印
 */
export const 添加水印 = async (inputPath, outputPath, watermarkText, options = {}) => {
    try {
        const {
            fontSize = 48,
            color = 'rgba(255, 255, 255, 0.5)',
            position = 'southeast'
        } = options;

        const svg = `
            <svg width="500" height="100">
                <text x="50%" y="50%" font-family="sans-serif" 
                    font-size="${fontSize}" fill="${color}" 
                    text-anchor="middle" dominant-baseline="middle">
                    ${watermarkText}
                </text>
            </svg>
        `;

        await sharp(inputPath)
            .composite([{
                input: Buffer.from(svg),
                gravity: position
            }])
            .toFile(outputPath);
        return outputPath;
    } catch (error) {
        console.error(`添加水印失败: ${error}`);
        return '';
    }
}

/**
 * 图片格式转换
 */
export const 转换格式 = async (inputPath, outputPath, targetFormat) => {
    try {
        const image = sharp(inputPath);
        switch (targetFormat.toLowerCase()) {
            case 'webp':
                await image.webp().toFile(outputPath);
                break;
            case 'png':
                await image.png().toFile(outputPath);
                break;
            case 'jpeg':
            case 'jpg':
                await image.jpeg().toFile(outputPath);
                break;
            default:
                throw new Error('不支持的格式');
        }
        return outputPath;
    } catch (error) {
        console.error(`格式转换失败: ${error}`);
        return '';
    }
}

/**
 * 图片旋转和翻转
 */
export const 旋转图片 = async (inputPath, outputPath, options = {}) => {
    try {
        const { angle = 0, flip = false, flop = false } = options;
        let image = sharp(inputPath).rotate(angle);
        
        if (flip) image = image.flip();
        if (flop) image = image.flop();
        
        await image.toFile(outputPath);
        return outputPath;
    } catch (error) {
        console.error(`旋转图片失败: ${error}`);
        return '';
    }
}

/**
 * 图片裁剪
 */
export const 裁剪图片 = async (inputPath, outputPath, region) => {
    try {
        const { left, top, width, height } = region;
        await sharp(inputPath)
            .extract({ left, top, width, height })
            .toFile(outputPath);
        return outputPath;
    } catch (error) {
        console.error(`裁剪图片失败: ${error}`);
        return '';
    }
}
