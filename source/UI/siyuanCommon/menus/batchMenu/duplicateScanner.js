import { 打开任务控制对话框 } from '../../dialog/tasks.js';
import { 递归扫描文件夹并执行任务 } from '../../../../utils/fs/batch.js';
const 全量计算文件MD5=async (filePath) => {
    const fs = require('fs').promises;
    const crypto = require('crypto');
    const data = await fs.readFile(filePath);
    return crypto.createHash('md5').update(data).digest('hex');
};
const 宽松计算文件MD5 = async (filePath) => {
    const fs = require('fs').promises;
    const crypto = require('crypto');
    const hash = crypto.createHash('md5');
    const fd = await fs.open(filePath, 'r');
    
    try {
        const { size: fileSize } = await fd.stat();

        const chunkSize = 4096;
        const samplesCount = Math.min(10, Math.ceil(fileSize / chunkSize));
        const step = Math.floor(fileSize / samplesCount);

        // 生成随机种子，这里使用文件大小和当前时间戳
        const seed = fileSize 
        const randomOffset = crypto.createHash('md5').update(seed.toString()).digest('hex');
        const offsetMultiplier = parseInt(randomOffset, 16) % samplesCount;

        for (let i = 0; i < samplesCount; i++) {
            // 计算每个样本的起始位置，加上随机偏移量
            const position = (i * step + offsetMultiplier) % fileSize;
            const buffer = Buffer.alloc(chunkSize);
            await fd.read(buffer, 0, chunkSize, position);
            hash.update(buffer);
        }

        return hash.digest('hex');
    } finally {
        await fd.close();
    }

};




const 处理单个文件 = async (fullPath, fileHashes, duplicates, skippedFiles, loose) => {
    const fs = require('fs').promises;
    const stats = await fs.stat(fullPath);
    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

    if (!loose && stats.size > MAX_FILE_SIZE) {
        skippedFiles.push(fullPath);
        return { message: `已跳过大文件: ${fullPath}` };
    } else {
        const sizeKey = `${stats.size}`;
        if (!fileHashes.has(sizeKey)) {
            fileHashes.set(sizeKey, new Map());
        }
        const sizeGroup = fileHashes.get(sizeKey);

        if (sizeGroup.size > 0) {
            const hash = loose ? await 宽松计算文件MD5(fullPath) : await 计算文件MD5(fullPath);
            if (sizeGroup.has(hash)) {
                duplicates.push({ original: sizeGroup.get(hash), duplicate: fullPath });
                return { message: `发现重复文件: ${fullPath}` };
            } else {
                sizeGroup.set(hash, fullPath);
            }
        } else {
            sizeGroup.set('placeholder', fullPath);
        }
        return { message: `已处理文件: ${fullPath} ${sizeKey}` };
    }
};
export const 执行扫描重复文件 = async(localPath,loose=false)=>{
    const fileHashes = new Map();
    const duplicates = [];
    const skippedFiles = [];
    const taskController = 打开任务控制对话框('扫描重复文件', '正在扫描重复文件...');
    const 文件处理函数 = async (fullPath, fileName, controller, 添加任务) => {
        await 添加任务(async () => {
            return await 处理单个文件(fullPath, fileHashes, duplicates, skippedFiles,loose);
        }, `处理文件失败: ${fullPath}`);

    };
    try {
        await 递归扫描文件夹并执行任务(localPath, taskController, 文件处理函数);
        taskController.start();
        taskController.on('allTasksCompleted', async () => {
            const resultContent = 生成结果内容(duplicates, skippedFiles);
            await 保存结果到文件(localPath, resultContent);
        });
    } catch (error) {
        console.error('扫描重复文件时发生错误:', error);
    }
}

const 生成结果内容 = (duplicates, skippedFiles) => {
    const result = {
        duplicates: {},
        skippedFiles: skippedFiles
    };

    duplicates.forEach(({ original, duplicate }) => {
        if (!result.duplicates[original]) {
            result.duplicates[original] = [original];
        }
        result.duplicates[original].push(duplicate);
    });

    return JSON.stringify(result, null, 2);
};

const 保存结果到文件 = async (localPath, resultContent) => {
    const fs = require('fs').promises;
    const path = require('path');
    const resultPath = path.join(localPath, '重复文件扫描结果.json');
    await fs.writeFile(resultPath, resultContent, 'utf-8');
    console.log('扫描完成，结果已保存到JSON文件');
};