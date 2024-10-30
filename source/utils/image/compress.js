import { plugin } from '../../pluginSymbolRegistry.js'
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
