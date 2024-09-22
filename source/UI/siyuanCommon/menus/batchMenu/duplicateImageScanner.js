import { confirmAsPromise } from '../../../../utils/siyuanUI/confirm.js';

const fs = require('fs').promises;
const path = require('path');
const THUMBNAIL_SIZE = 32; // 用于比较的缩略图大小
const BATCH_SIZE = 100; // 每批处理的图片数量
export async function 执行图片去重(localPath, taskController,mode='simple') {
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
                    const hash = await 计算图片哈希(file,mode);
                    if (hash&&imageHashes.has(hash)) {
                        // 移动重复图片
                        const newPath = path.join(targetFolder, path.basename(file));
                        const originalFile = imageHashes.get(hash);
                        const confirm= await 显示重复图片确认对话框(file, originalFile, targetFolder)
                        confirm&&await fs.rename(file, newPath);
                        return { message: `发现重复图片: ${file}` };
                    } else {
                        imageHashes.set(hash, file);
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
async function 显示重复图片确认对话框(file, originalFile, targetFolder) {
    return confirmAsPromise(
        '找到重复文件',
        `
        <div style="display: flex; justify-content: space-around; align-items: center;">
            <div>
                <p>原始图片:</p>
                <img src="${originalFile}" style="max-width: 200px; max-height: 200px;">
                <p>${originalFile}</p>
            </div>
            <div>
                <p>重复图片:</p>
                <img src="${file}" style="max-width: 200px; max-height: 200px;">
                <p>${file}</p>
            </div>
        </div>
        <p>是否移动重复图片到 "${targetFolder}"?</p>
        `
    );
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
async function 计算图片哈希(filePath,mode='simple') {
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
                    hash = 计算图像感知哈希(imageData.data,THUMBNAIL_SIZE);
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


