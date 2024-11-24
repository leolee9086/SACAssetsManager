const fs = require('fs').promises;
const path = require('path');
const THUMBNAIL_SIZE = 32; // 用于比较的缩略图大小
const BATCH_SIZE = 100; // 每批处理的图片数量
export async function 执行图片去重_后处理(localPath, taskController, mode = 'simple') {
    const targetFolder = path.join(localPath, '待删除_重复图片');
    await fs.mkdir(targetFolder, { recursive: true });
    const imageFiles = await 获取图片文件列表(localPath);
    const totalFiles = imageFiles.length;
    let processedFiles = 0;
    const imageHashes = new Map();

    // 扫描阶段
    for (let i = 0; i < totalFiles; i += BATCH_SIZE) {
        const batch = imageFiles.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async (file) => {
            await taskController.addTask(async () => {
                try {
                    const hash = await 计算图片哈希(file, mode);
                    if (hash) {
                        if (!imageHashes.has(hash)) {
                            imageHashes.set(hash, []);
                        }
                        imageHashes.get(hash).push({
                            src: file,
                            label: file,
                            hash
                        });
                    }
                    return { message: `处理图片: ${file}` };
                } catch (error) {
                    return { message: `处理图片失败: ${file}`, error: error };
                } finally {
                    processedFiles++;
                }
            });
        }));
    }

    // 文件选择和移动阶段
    let movedFiles = 0;
    taskController.on('allTasksCompleted',async () => {
        for (const [hash, images] of imageHashes.entries()) {
            console.log(images)
            if (images.length > 1) {
                const pickResult = await filePickPromise(
                    '选择需要保留的图片',
                    images,
                    `点击选择要保留的图片，其他图片将被移动到${targetFolder}，键盘数字按键选中相应图片`
                );

                if (pickResult) {
                    const resultPath = images[pickResult.index].src;
                    const unPicked = images.filter(item => item.src !== resultPath);
                    for (const imageItem of unPicked) {
                        const newPath = path.join(targetFolder, path.basename(imageItem.src));
                        await fs.rename(imageItem.src, newPath);
                        movedFiles++;
                    }
                }
            }
        }
    })

    return `处理完成。共处理 ${processedFiles} 个文件，发现 ${imageHashes.size} 个唯一图片，移动了 ${movedFiles} 个重复文件。`;
}
export async function 执行图片去重(localPath, taskController, mode = 'simple') {
    const targetFolder = path.join(localPath, '待删除_重复图片');
    await fs.mkdir(targetFolder, { recursive: true });
    const imageFiles = await 获取图片文件列表(localPath);
    const totalFiles = imageFiles.length;
    let processedFiles = 0;
    const imageHashes = new Map();
    for (let i = 0; i < totalFiles; i += BATCH_SIZE) {
        const batch = imageFiles.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async (file) => {
            await taskController.addTask(async () => {
                try {
                    const hash = await 计算图片哈希(file, mode);
                    if (hash && imageHashes.has(hash)) {
                        // 移动重复图片
                        const originalFiles = imageHashes.get(hash);
                        //  const confirm= await 显示重复图片确认对话框(file, originalFile, targetFolder)
                        const images = originalFiles.concat([
                            {
                                src: file,
                                label: file,
                                hash
                            }
                        ])
                        const pickResult = await filePickPromise(
                            '选择需要保留的图片',
                            images,
                            '点击选择要保留的图片,其他图片将被移动到' + targetFolder + ",键盘数字按键选中相应图片"

                        )
                        console.log(pickResult)
                        if (pickResult) {
                            const resultPath = images[pickResult.index].src
                            const unPicked = images.filter(
                                item => item.src !== resultPath
                            )
                            imageHashes.set(hash, [
                                {
                                    src: resultPath,
                                    label: resultPath,
                                    hash
                                }
                            ])
                            for await (let imageItem of unPicked) {
                                let newPath = path.join(targetFolder, path.basename(imageItem.src))
                                await fs.rename(imageItem.src, newPath)
                            }
                        } else {
                            imageHashes.set(hash, images)
                        }
                        // confirm&&await fs.rename(file, newPath);
                        return { message: `发现重复图片: ${file}` };
                    } else {
                        imageHashes.set(hash, [{
                            src: file,
                            label: file,
                            hash
                        }]);
                        return { message: `处理图片: ${file}` };
                    }
                } catch (error) {
                    return { message: `处理图片失败: ${file}`, error: error };
                } finally {
                    processedFiles++;
                }
            });
        }));
    }

    return `处理完成。共处理 ${processedFiles} 个文件，发现 ${imageHashes.size} 个唯一图片。`;
}
async function 获取图片文件列表(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(entries.map((entry) => {
        const res = path.resolve(dir, entry.name);
        return entry.isDirectory() ? 获取图片文件列表(res) : res;
    }));
    return files.flat().filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file));
}


import { 计算图像感知哈希 } from '../../../../utils/image/pHash.js';
import { 计算灰度图像数据哈希 } from '../../../../utils/image/greyScaleHash.js';
import { filePickPromise } from '../../dialog/fileDiffAndPick.js';
async function 计算图片哈希(filePath, mode = 'simple') {
    try {
        // 直接读取文件
        const fileData = await fs.readFile(filePath);
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = THUMBNAIL_SIZE;
                canvas.height = THUMBNAIL_SIZE;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, THUMBNAIL_SIZE, THUMBNAIL_SIZE);
                const imageData = ctx.getImageData(0, 0, THUMBNAIL_SIZE, THUMBNAIL_SIZE);
                let hash;
                if (mode === 'simple') {
                    hash = 计算灰度图像数据哈希(imageData.data);
                } else if (mode === 'feature') {
                    hash = 计算图像感知哈希(imageData.data, THUMBNAIL_SIZE);
                } else {
                    throw new Error('不支持的哈希计算模式');
                }
                resolve(hash);

            };
            img.onerror = reject;
            // 使用 Buffer 创建 Blob
            const blob = new Blob([fileData.buffer], { type: 'image/jpeg' });
            img.src = URL.createObjectURL(blob);
        });
    } catch (error) {
        console.error(`处理文件 ${filePath} 时出错:`, error);
        throw error;
    }
}


