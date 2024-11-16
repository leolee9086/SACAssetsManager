import { 打开任务控制对话框 } from '../../dialog/tasks.js';
import { 递归扫描文件夹并执行任务 } from '../../../../utils/fs/batch.js';
import { 全量计算文件MD5,宽松计算文件MD5 } from '../../../../utils/hash/simple.js';
import { UltraFastFingerprint } from '../../../../utils/hash/fastBlake.js';
const fingerprinter = new UltraFastFingerprint();


const 处理单个文件 = async (fullPath, fileHashes, duplicates, skippedFiles, loose) => {
    const fs = require('fs').promises;
    const stats = await fs.stat(fullPath);
    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
    console.log(await fingerprinter.calculateFingerprint(fullPath))

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
            if (sizeGroup.has('placeholder')) {
                // 如果存在占位符，先计算占位符文件的哈希
                const placeholderPath = sizeGroup.get('placeholder');
                const placeholderHash = loose ? await 宽松计算文件MD5(placeholderPath) : await 全量计算文件MD5(placeholderPath);
                sizeGroup.delete('placeholder');
                sizeGroup.set(placeholderHash, placeholderPath);
            }
            const hash = loose ? await 宽松计算文件MD5(fullPath) : await 全量计算文件MD5(fullPath);
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