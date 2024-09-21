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
            console.log(file)
            await taskController.addTask(async () => {
                try {
                    const hash = await 计算图片哈希(file,mode);
                    console.log(hash)
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
                    hash = 计算图像特征哈希(imageData.data);
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

function 计算灰度图像数据哈希(data) {
    let hash = 0;
    for (let i = 0; i < data.length; i += 4) {
        const gray = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) | 0;
        hash = ((hash << 5) - hash + gray) | 0;
    }
    return hash.toString(16);
}

function 计算图像特征哈希(data) {
    const size = THUMBNAIL_SIZE;
    const dctSize = 8; // DCT 的大小

    // 转换为灰度图像
    const grayData = new Float64Array(size * size);
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
        grayData[j] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    }

    // 计算 DCT
    const dct = 应用离散余弦变换(grayData, size);

    // 提取低频部分
    const dctLow = new Float64Array(dctSize * dctSize);
    for (let i = 0; i < dctSize; i++) {
        for (let j = 0; j < dctSize; j++) {
            dctLow[i * dctSize + j] = dct[i * size + j];
        }
    }

    // 计算平均值（不包括第一个元素，因为它代表直流分量）
    const avg = dctLow.slice(1).reduce((sum, val) => sum + val, 0) / (dctSize * dctSize - 1);

    // 生成哈希
    let hash = '';
    for (let i = 0; i < dctLow.length; i++) {
        hash += dctLow[i] > avg ? '1' : '0';
    }

    return hash;
}

function 应用离散余弦变换(data, N) {
    const output = new Float64Array(N * N);
    for (let u = 0; u < N; u++) {
        for (let v = 0; v < N; v++) {
            let sum = 0;
            for (let i = 0; i < N; i++) {
                for (let j = 0; j < N; j++) {
                    sum += data[i * N + j] * 
                           Math.cos(((2 * i + 1) * u * Math.PI) / (2 * N)) * 
                           Math.cos(((2 * j + 1) * v * Math.PI) / (2 * N));
                }
            }
            sum *= (2 / N) * (u === 0 ? 1 / Math.sqrt(2) : 1) * (v === 0 ? 1 / Math.sqrt(2) : 1);
            output[u * N + v] = sum;
        }
    }
    return output;
}