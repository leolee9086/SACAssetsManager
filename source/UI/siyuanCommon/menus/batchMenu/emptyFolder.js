import { 打开任务控制对话框 } from '../../dialog/tasks.js';
import { 递归扫描文件夹并执行任务 } from '../../../../utils/fs/batch.js';
const fs = require('fs').promises;
const path = require('path')

const 是否为空文件夹 = async (folderPath) => {
    const fs = require('fs').promises;
    const items = await fs.readdir(folderPath);
    if (items.length === 0) return true;
    if (items.length === 1 && items[0].toLowerCase() === 'thumbs.db') return true;
    return false;
};

export const 执行扫描空文件夹 = async (localPath, $delete) => {
    return new Promise(async(resolve, reject) => {
        const emptyFolders = [];
        const taskController = 打开任务控制对话框('扫描空文件夹', '正在扫描空文件夹...');
        const 文件夹处理函数 = async (fullPath, dirName,controller, 添加任务) => {
            await 添加任务(async () => {
                if (await 是否为空文件夹(fullPath)) {
                    if (!$delete) {
                        emptyFolders.push(fullPath);
                        return {message:'发现空文件夹:'+fullPath}
                    } else {
                        try {
                            emptyFolders.push(fullPath);

                            await fs.rmdir(fullPath);
                            return {message:`已删除空文件夹: ${fullPath}`}
    
                        } catch (error) {
                            emptyFolders.push(fullPath);

                            return {message:`删除空文件夹失败: ${fullPath},${error}`}
                        }
                    }
                }
            }, `处理文件夹失败: ${fullPath}`);
        };
        try {
            await 递归扫描文件夹并执行任务(localPath, taskController, null, 文件夹处理函数);
            taskController.start();
            taskController.on('allTasksCompleted', async () => {
                const resultContent = 生成空文件夹结果内容(emptyFolders);
                await 保存结果到文件(localPath, resultContent);
                resolve('true')
            });
        } catch (error) {
            console.error('扫描空文件夹时发生错误:', error);
            resolve('false')

        }
    
    })
};

const 生成空文件夹结果内容 = (emptyFolders) => {
    return `发现的空文件夹：\n${emptyFolders.join('\n')}`;
};

const 保存结果到文件 = async (localPath, resultContent) => {
    const fileName = `空文件夹扫描结果.txt`;
    const filePath = path.join(localPath, fileName);
    try {
        await fs.writeFile(filePath, resultContent, 'utf8');
        console.log(`结果已保存到文件: ${filePath}`);
        // 可以在这里添加一个提示，告诉用户结果已保存
    } catch (error) {
        console.error('保存结果到文件时发生错误:', error);
    }
};
