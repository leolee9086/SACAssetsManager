import { plugin } from '../../../../pluginSymbolRegistry.js'
import { isImagePath } from '../../../../utils/fs/pathType.js'
import { confirmAsPromise } from '../../../../utils/siyuanUI/confirm.js'
const workspaceDir = window.siyuan.config.system.workspaceDir
const sharpPath = require('path').join(workspaceDir, 'data', 'plugins', plugin.name, 'node_modules', 'sharp')
const sharp = require(sharpPath)

const 生成压缩目标文件名 = (imagePath, 压缩质量, 文件格式) => {
    return imagePath.replace(/\.[^.]+$/, '') + `_sac_${压缩质量}.${文件格式}`
}
const 过滤图片资源 = (assets) => {
    return assets.filter(item => item.type === 'local' && item.path && isImagePath(item.path));
}
const 生成确认压缩信息 = (imageAssets, 压缩质量) => {
    return `
    确认压缩${imageAssets.length}个文件?
    压缩文件以<原文件名>_${压缩质量}.png的形式保存在原文件同目录\n
    ${imageAssets.map(item => 生成压缩目标文件名(item.path, 压缩质量, 'png')).join('\n')}
    `;
}
const 压缩单个图片 = async (inputPath, outputPath, 压缩质量, 压缩级别, 文件格式) => {
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
const 压缩所有图片 = async (imageAssets, 压缩质量, 压缩级别, 文件格式) => {
    const compressionPromises = imageAssets.map(asset => {
        const inputPath = asset.path;
        const outputPath = 生成压缩目标文件名(inputPath, 压缩质量, 文件格式);
        return 压缩单个图片(inputPath, outputPath, 压缩质量, 压缩级别, 文件格式);
    });


    try {
        let result = await Promise.all(compressionPromises);
        console.log('所有图片压缩完成');
        return result
    } catch (error) {
        console.error('图片压缩过程中发生错误:', error);
    }
}

export const 压缩图片为png菜单项 = (assets, 压缩质量 = 80, 压缩级别 = 9) => {
    const imageAssets = 过滤图片资源(assets)
    return {
        label: `生成${imageAssets.length}个图片文件的png压缩(质量:${压缩质量})`,
        click: async () => {
            const result = await confirmAsPromise('确认压缩', 生成确认压缩信息(imageAssets, 压缩质量));
            if (result) {
                let outputPathArray = await 压缩所有图片(imageAssets, 压缩质量, 压缩级别);
                console.log(outputPathArray)
                if (outputPathArray[0]) {
                    const openResult = await confirmAsPromise('压缩完成', '是否打开压缩后的文件夹？');
                    if (openResult) {
                        批量打开文件夹(outputPathArray);
                    }

                }
            } else {
                console.log('用户取消操作');
            }
        }
    }
}
export const 压缩图片菜单项 = (assets, 压缩质量 = 80, 压缩级别 = 9, 文件格式 = 'png') => {
    const imageAssets = 过滤图片资源(assets)
    return {
        label: `生成${imageAssets.length}个图片文件的${文件格式}压缩(质量:${压缩质量})`,
        click: async () => {
            const result = await confirmAsPromise('确认压缩', 生成确认压缩信息(imageAssets, 压缩质量, 文件格式));
            if (result) {
                let outputPathArray = await 压缩所有图片(imageAssets, 压缩质量, 压缩级别, 文件格式);
                if (outputPathArray[0]) {
                    const openResult = await confirmAsPromise('压缩完成', '是否打开压缩后的文件夹？');
                    if (openResult) {
                        批量打开文件夹(outputPathArray);
                    }

                }
            } else {
                console.log('用户取消操作');
            }
        }
    }
}

export const 压缩菜单组 = (assets,格式) => {
    const 常用压缩质量 = [40, 50, 60, 70, 80, 90]
    return    常用压缩质量.map(质量 => 压缩图片菜单项(assets, 质量, 9, 格式))
    
}
const 打开文件夹 = (path) => {
    const { shell } = require('@electron/remote');
    shell.showItemInFolder(path);
}
const 批量打开文件夹 = (pathArray) => {
    pathArray.forEach(element => {
        打开文件夹(element)
    });
}