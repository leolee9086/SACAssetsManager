import { JSZip } from '../../../../utils/zip/modify.js'
import { confirmAsPromise } from '../../../../utils/siyuanUI/confirm.js';
import { kernelApi, plugin } from '../../../../asyncModules.js';
const fs = require('fs').promises;
const path = require('path');
const generateUniqueZipName = async (baseName, localPath) => {
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, -5);
    let zipName = `${baseName}_${timestamp}.zip`;
    let zipPath = path.join(localPath, zipName);
    let counter = 1;

    while (await fs.access(zipPath).then(() => true).catch(() => false)) {
        zipName = `${baseName}_${timestamp}_${counter}.zip`;
        zipPath = path.join(localPath, zipName);
        counter++;
    }

    return { zipName, zipPath };
};


export async function 执行批量打包文件(localPath, taskController) {
    try {
        const files = await fs.readdir(localPath);
        const compressedExtensions = ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2'];
        const nonCompressedFiles = files.filter(file => !compressedExtensions.some(ext => file.toLowerCase().endsWith(ext)));
        const fileGroups = [];

        for (let i = 0; i < nonCompressedFiles.length; i += 10) {
            fileGroups.push(nonCompressedFiles.slice(i, i + 10));
        }

        for (let i = 0; i < fileGroups.length; i++) {
            const group = fileGroups[i];
            const { zipName, zipPath } = await generateUniqueZipName(`batch_${i + 1}`, localPath);

            await taskController.addTask(async () => {
                const zip = new JSZip();

                for (const file of group) {
                    const filePath = path.join(localPath, file);
                    const stat = await fs.stat(filePath);
                    if (stat.isFile()) {
                        kernelApi.pushMsg({ msg: `检测到文件${filePath},加入压缩包中` });
                        const content = await fs.readFile(filePath);
                        zip.file(file, content);
                    }
                }

                const zipContent = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 9 } });
                await fs.writeFile(zipPath, zipContent);
                kernelApi.pushMsg({ msg: `写入zip文件${zipPath}` });

                // 弹出确认对话框
                const confirmDelete = await confirmAsPromise('确认删除', `已创建 ${zipName}。是否删除原始文件？\n请注意删除文件操作不可恢复`);

                if (confirmDelete) {
                    for (const file of group) {
                        const filePath = path.join(localPath, file);
                        await fs.unlink(filePath);
                    }
                    return { message: `已创建: ${zipName} 并删除原始文件` };
                } else {
                    return { message: `已创建: ${zipName}，保留原始文件` };
                }
            });
        }

        taskController.start();
        taskController.on('allTasksCompleted', () => {
            kernelApi.pushMsg({ msg: `批量打包完成，共创建 ${fileGroups.length} 个zip文件。` });
            taskController.close();

        });
    } catch (error) {
        console.error('批量打包文件时发生错误:', error);
        kernelApi.pushMsg({ msg: `批量打包文件时发生错误` });
        taskController.close();
    }
}