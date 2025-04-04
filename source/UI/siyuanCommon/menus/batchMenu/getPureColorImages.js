import { 打开任务控制对话框 } from '../../dialog/tasks.js';
import { isImage } from '../../../../../src/utils/image/isImage.js';
import { isPureColor } from '../../../../../src/utils/image/pureColor.js';
import { confirmAsPromise } from '../../../../../src/utils/siyuanUI/confirm.js';
const path = require('path')
const fs = require('fs').promises

export const 执行归集纯色图片 = async(localPath)=>{
    let movedCount = 0;
    const targetFolder = path.join(localPath, '待删除_纯色图片');

    const taskController = await 打开任务控制对话框('整理纯色图片', '正在处理图片...');

    const 处理图片 = async (fullPath, fileName, controller, 添加任务) => {
        if (isImage(fileName)) {
            await 添加任务(async () => {
                try {
                    if (await isPureColor(fullPath)) {
                        if (!require('fs').existsSync(targetFolder)) {
                            await fs.mkdir(targetFolder, { recursive: true });
                        }
                        const newPath = path.join(targetFolder, fileName);
                        await fs.rename(fullPath, newPath);
                        movedCount++;
                        return { message: `已移动纯色图片: ${fullPath} -> ${newPath}` };
                    }
                    return { message: `处理图片: ${fullPath}` };
                } catch (err) {
                    return { message: `处理图片失败: ${fullPath}, 错误: ${err.message}`, error: true };
                }
            });
        }
    };

    const 处理目录 = async (dirPath, controller, 添加任务) => {
        await 添加任务(async () => {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);
                if (entry.isDirectory() && fullPath !== targetFolder) {
                    await 处理目录(fullPath, controller, 添加任务);
                } else if (entry.isFile()) {
                    await 处理图片(fullPath, entry.name, controller, 添加任务);
                }
            }
            return { message: `处理完成目录: ${dirPath}` };
        });
    };

    try {
        await 处理目录(localPath, taskController, taskController.addTask.bind(taskController));
        taskController.start();
        taskController.on('allTasksCompleted',async () => {
            const openFolder= await confirmAsPromise(
                `处理完成,是否打开目标文件夹?`,
                `整理完成，共移动 ${movedCount} 个纯色或接近纯色的图片到 "${targetFolder}" 文件夹。`
            )
            if (openFolder) {
                const {shell} =require('@electron/remote') 
                shell.openPath(targetFolder);
            }

        });
    } catch (error) {
        const openFolder= await confirmAsPromise(
            `处理完成,是否打开目标文件夹?`,
            `整理完成，共移动 ${movedCount} 个纯色或接近纯色的图片到 "${targetFolder}" 文件夹。`
        )
        if (openFolder) {
            const {shell} =require('@electron/remote') 
            shell.openPath(targetFolder);
        }
        console.error('处理纯色图片时发生错误:', error);
        taskController.close();
    }

}