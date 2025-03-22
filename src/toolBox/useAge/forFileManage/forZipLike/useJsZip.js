import { requirePluginBased } from "../../../../../source/utils/module/createRequire.js";
const JSZip = requirePluginBased('jszip')
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