/*import { requirePluginBased } from "../../../../../source/utils/module/createRequire.js";
const JSZip = requirePluginBased('jszip')*/
import * as JSZip from '../../../../../static/jszip.js'
console.log(JSZip)
const fs = require('fs').promises
export { JSZip }
export async function addFileToZip(zipFilePath, fileToAddPath, fileNameInZip) {
    try {
        // 读取现有的zip文件
        const zipData = await fs.readFile(zipFilePath);
        const zip = await JSZip.loadAsync(zipData);

        // 读取要添加的文件
        const fileData = await fs.readFile(fileToAddPath);

        // 将文件添加到zip中
        zip.file(fileNameInZip, fileData);

        // 生成新的zip文件内容
        const updatedZipContent = await zip.generateAsync({ type: 'nodebuffer' });

        // 将更新后的内容写回原文件
        await fs.writeFile(zipFilePath, updatedZipContent);

        console.log(`成功将 ${fileToAddPath} 添加到 ${zipFilePath}`);
    } catch (error) {
        console.error(`向zip文件添加文件时出错:`, error);
        throw error; // 将错误抛出,以便调用者可以处理
    }
}

/**
 * 创建新的ZIP文件
 * @param {string} outputPath 输出ZIP文件路径
 * @param {Object} files 要添加的文件对象，格式: {文件名: 文件内容}
 * @returns {Promise<void>}
 */
export async function createZip(outputPath, files = {}) {
    try {
        const zip = new JSZip();
        
        // 添加所有文件到zip
        Object.entries(files).forEach(([fileName, content]) => {
            zip.file(fileName, content);
        });
        
        // 生成ZIP内容并写入文件
        const zipContent = await zip.generateAsync({ type: 'nodebuffer' });
        await fs.writeFile(outputPath, zipContent);
        
        console.log(`成功创建ZIP文件: ${outputPath}`);
    } catch (error) {
        console.error('创建ZIP文件时出错:', error);
        throw error;
    }
}

/**
 * 从ZIP文件提取特定文件
 * @param {string} zipFilePath ZIP文件路径
 * @param {string} fileNameInZip ZIP中的文件名
 * @param {string} outputPath 输出路径
 * @returns {Promise<void>}
 */
export async function extractFileFromZip(zipFilePath, fileNameInZip, outputPath) {
    try {
        const zipData = await fs.readFile(zipFilePath);
        const zip = await JSZip.loadAsync(zipData);
        
        const fileData = await zip.file(fileNameInZip)?.async('nodebuffer');
        if (!fileData) {
            throw new Error(`ZIP文件中不存在: ${fileNameInZip}`);
        }
        
        await fs.writeFile(outputPath, fileData);
        console.log(`成功从${zipFilePath}提取文件${fileNameInZip}到${outputPath}`);
    } catch (error) {
        console.error('从ZIP提取文件时出错:', error);
        throw error;
    }
}

/**
 * 提取ZIP文件的所有内容到指定目录
 * @param {string} zipFilePath ZIP文件路径
 * @param {string} outputDir 输出目录
 * @returns {Promise<void>}
 */
export async function extractAllFromZip(zipFilePath, outputDir) {
    try {
        const zipData = await fs.readFile(zipFilePath);
        const zip = await JSZip.loadAsync(zipData);
        
        // 确保输出目录存在
        await fs.mkdir(outputDir, { recursive: true });
        
        // 提取所有文件
        const promises = [];
        zip.forEach((relativePath, zipEntry) => {
            if (!zipEntry.dir) {
                const outputPath = `${outputDir}/${relativePath}`;
                // 确保父目录存在
                const parentDir = outputPath.substring(0, outputPath.lastIndexOf('/'));
                if (parentDir) {
                    promises.push(
                        fs.mkdir(parentDir, { recursive: true })
                            .then(() => zipEntry.async('nodebuffer'))
                            .then(content => fs.writeFile(outputPath, content))
                    );
                } else {
                    promises.push(
                        zipEntry.async('nodebuffer')
                            .then(content => fs.writeFile(outputPath, content))
                    );
                }
            }
        });
        
        await Promise.all(promises);
        console.log(`成功提取${zipFilePath}的所有内容到${outputDir}`);
    } catch (error) {
        console.error('提取ZIP所有内容时出错:', error);
        throw error;
    }
}

/**
 * 从ZIP文件中删除指定文件
 * @param {string} zipFilePath ZIP文件路径
 * @param {string} fileNameInZip 要删除的文件名
 * @returns {Promise<void>}
 */
export async function removeFileFromZip(zipFilePath, fileNameInZip) {
    try {
        const zipData = await fs.readFile(zipFilePath);
        const zip = await JSZip.loadAsync(zipData);
        
        if (!zip.file(fileNameInZip)) {
            throw new Error(`ZIP文件中不存在: ${fileNameInZip}`);
        }
        
        zip.remove(fileNameInZip);
        
        const updatedZipContent = await zip.generateAsync({ type: 'nodebuffer' });
        await fs.writeFile(zipFilePath, updatedZipContent);
        
        console.log(`成功从${zipFilePath}删除文件${fileNameInZip}`);
    } catch (error) {
        console.error('从ZIP删除文件时出错:', error);
        throw error;
    }
}

/**
 * 列出ZIP文件中的所有文件
 * @param {string} zipFilePath ZIP文件路径
 * @returns {Promise<string[]>} 文件名数组
 */
export async function listFilesInZip(zipFilePath) {
    try {
        const zipData = await fs.readFile(zipFilePath);
        const zip = await JSZip.loadAsync(zipData);
        
        const fileNames = [];
        zip.forEach((relativePath, zipEntry) => {
            if (!zipEntry.dir) {
                fileNames.push(relativePath);
            }
        });
        
        return fileNames;
    } catch (error) {
        console.error('列出ZIP文件内容时出错:', error);
        throw error;
    }
}

/**
 * 将文件夹添加到ZIP文件中
 * @param {string} zipFilePath ZIP文件路径
 * @param {string} folderPath 要添加的文件夹路径
 * @param {string} folderNameInZip ZIP中的文件夹名称
 * @returns {Promise<void>}
 */
export async function addFolderToZip(zipFilePath, folderPath, folderNameInZip = '') {
    try {
        // 读取现有的zip文件
        let zip;
        try {
            const zipData = await fs.readFile(zipFilePath);
            zip = await JSZip.loadAsync(zipData);
        } catch (error) {
            // 如果ZIP文件不存在，创建新的
            zip = new JSZip();
        }
        
        // 递归添加文件夹内容
        async function addFolderContents(folderPath, zipFolderPath) {
            const items = await fs.readdir(folderPath, { withFileTypes: true });
            
            for (const item of items) {
                const sourcePath = `${folderPath}/${item.name}`;
                const targetPath = zipFolderPath ? `${zipFolderPath}/${item.name}` : item.name;
                
                if (item.isDirectory()) {
                    // 递归处理子文件夹
                    await addFolderContents(sourcePath, targetPath);
                } else {
                    // 添加文件
                    const fileData = await fs.readFile(sourcePath);
                    zip.file(targetPath, fileData);
                }
            }
        }
        
        // 添加文件夹
        await addFolderContents(folderPath, folderNameInZip);
        
        // 生成并保存更新后的ZIP文件
        const updatedZipContent = await zip.generateAsync({ type: 'nodebuffer' });
        await fs.writeFile(zipFilePath, updatedZipContent);
        
        console.log(`成功将文件夹 ${folderPath} 添加到 ${zipFilePath}`);
    } catch (error) {
        console.error('添加文件夹到ZIP时出错:', error);
        throw error;
    }
}

/**
 * 检查ZIP文件是否包含指定文件
 * @param {string} zipFilePath ZIP文件路径
 * @param {string} fileNameInZip 要检查的文件名
 * @returns {Promise<boolean>} 文件是否存在
 */
export async function hasFileInZip(zipFilePath, fileNameInZip) {
    try {
        const zipData = await fs.readFile(zipFilePath);
        const zip = await JSZip.loadAsync(zipData);
        
        return zip.file(fileNameInZip) !== null;
    } catch (error) {
        console.error('检查ZIP文件内容时出错:', error);
        throw error;
    }
}