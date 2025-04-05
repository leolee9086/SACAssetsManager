import { 打开任务控制对话框 } from '../../dialog/tasks.js';
import { 递归扫描文件夹并执行任务 } from '../../../../../src/utils/fs/batch.js';
import { 全量计算文件MD5,宽松计算文件MD5 } from '../../../../../src/toolBox/useAge/forFileManage/forHash/useSimpleMd5.js';
const fs = require('fs').promises;
const path = require('path');

// 文件大小检查
const forFileSize = async (filePath, options = {}) => {
    const { maxSize = 100 * 1024 * 1024, skippedFiles = [] } = options;
    
    try {
        const stats = await fs.stat(filePath);
        const isOversize = stats.size > maxSize;
        
        if (isOversize) {
            skippedFiles.push(filePath);
        }
        
        return {
            skip: isOversize,
            message: isOversize ? `已跳过大文件: ${filePath}` : null,
            size: stats.size
        };
    } catch (error) {
        return {
            skip: true,
            message: `读取文件大小失败: ${filePath}`,
            error
        };
    }
};

// 计算哈希值
const forFileHash = async (filePath, options = {}) => {
    const { useLooseHash = false } = options;
    
    try {
        // 使用宽松或全量哈希算法
        const hash = useLooseHash 
            ? await 宽松计算文件MD5(filePath) 
            : await 全量计算文件MD5(filePath);
            
        return { hash, success: true };
    } catch (error) {
        return {
            success: false,
            error,
            message: `计算文件哈希失败: ${filePath}`
        };
    }
};

// 分组处理
const withSizeGroup = (context, options) => {
    const { fileHashes, fileSize } = context;
    const sizeKey = `${fileSize}`;
    
    if (!fileHashes.has(sizeKey)) {
        fileHashes.set(sizeKey, new Map());
    }
    
    return {
        ...context,
        sizeKey,
        sizeGroup: fileHashes.get(sizeKey)
    };
};

// 处理占位符文件
const withPlaceholderHandling = async (context, options) => {
    const { sizeGroup, useLooseHash = false } = context;
    
    if (sizeGroup.has('placeholder')) {
        const placeholderPath = sizeGroup.get('placeholder');
        const { hash } = await forFileHash(placeholderPath, { useLooseHash });
        
        sizeGroup.delete('placeholder');
        sizeGroup.set(hash, placeholderPath);
    }
    
    return context;
};

// 重复检查
const forDuplicateCheck = async (context, options) => {
    const { filePath, sizeGroup, fileHash, duplicates = [] } = context;
    
    if (sizeGroup.has(fileHash)) {
        duplicates.push({ 
            original: sizeGroup.get(fileHash), 
            duplicate: filePath 
        });
        
        return {
            isDuplicate: true,
            message: `发现重复文件: ${filePath}`
        };
    }
    
    sizeGroup.set(fileHash, filePath);
    return { isDuplicate: false };
};

// 单个文件处理
const withFileProcessing = async (context, options = {}) => {
    const { filePath, fileHashes, duplicates = [], skippedFiles = [], useLooseHash = false } = context;
    const maxFileSize = options.maxFileSize || 100 * 1024 * 1024; // 100MB
    
  
    // 文件大小检查
    const sizeCheck = await forFileSize(filePath, { 
        maxSize: maxFileSize, 
        skippedFiles 
    });
    
    if (sizeCheck.skip && !useLooseHash) {
        return { message: sizeCheck.message };
    }
    
    // 分组处理
    const groupContext = withSizeGroup({
        ...context,
        fileSize: sizeCheck.size,
        fileHashes,
    });
    
    // 处理占位符
    if (groupContext.sizeGroup.size > 0) {
        await withPlaceholderHandling({ 
            ...groupContext, 
            useLooseHash 
        });
        
        // 计算当前文件哈希
        const { hash, success } = await forFileHash(filePath, { useLooseHash });
        
        if (!success) {
            return { message: `哈希计算失败: ${filePath}` };
        }
        
        // 检查重复
        const dupCheck = await forDuplicateCheck({
            ...groupContext,
            filePath,
            fileHash: hash,
            duplicates
        });
        
        if (dupCheck.isDuplicate) {
            return { message: dupCheck.message };
        }
    } else {
        // 如果是首个文件，标记为占位符
        groupContext.sizeGroup.set('placeholder', filePath);
    }
    
    return { 
        message: `已处理文件: ${filePath} (${sizeCheck.size} 字节)` 
    };
};

// 生成结果内容
const forResultGeneration = (duplicates, skippedFiles) => {
    const result = {
        duplicates: {},
        skippedFiles
    };
    
    duplicates.forEach(({ original, duplicate }) => {
        if (!result.duplicates[original]) {
            result.duplicates[original] = [original];
        }
        result.duplicates[original].push(duplicate);
    });
    
    return JSON.stringify(result, null, 2);
};

// 保存结果
const withResultSaving = async (context, options) => {
    const { localPath, resultContent } = context;
    const resultPath = path.join(localPath, '重复文件扫描结果.json');
    
    try {
        await fs.writeFile(resultPath, resultContent, 'utf-8');
        return {
            success: true,
            message: '扫描完成，结果已保存到JSON文件',
            resultPath
        };
    } catch (error) {
        return {
            success: false,
            error,
            message: `保存结果失败: ${error.message}`
        };
    }
};

// 主扫描函数
export const 执行扫描重复文件 = async (localPath, useLooseHash = false) => {
    const fileHashes = new Map();
    const duplicates = [];
    const skippedFiles = [];
    
    const taskController = await 打开任务控制对话框('扫描重复文件', '正在扫描重复文件...');
    
    const 文件处理函数 = async (filePath, fileName, controller, 添加任务) => {
        await 添加任务(async () => {
            return await withFileProcessing(
                { 
                    filePath, 
                    fileHashes, 
                    duplicates, 
                    skippedFiles, 
                    useLooseHash 
                }
            );
        }, `处理文件失败: ${filePath}`);
    };
    
    try {
        await 递归扫描文件夹并执行任务(localPath, taskController, 文件处理函数);
        taskController.start();
        
        taskController.on('allTasksCompleted', async () => {
            const resultContent = forResultGeneration(duplicates, skippedFiles);
            
            await withResultSaving(
                { localPath, resultContent },
                { logProcess: true }
            );
        });
    } catch (error) {
        console.error('扫描重复文件时发生错误:', error);
    }
};