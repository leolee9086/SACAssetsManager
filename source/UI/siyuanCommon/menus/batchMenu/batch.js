import { 打开任务控制对话框 } from '../../dialog/tasks.js'
import { 递归扫描文件夹并执行任务 } from '../../../../utils/fs/batch.js'
import { confirmAsPromise } from '../../../../utils/siyuanUI/confirm.js'

import { 执行删除所有ThumbsDB } from './removeThumbsDb.js'
export const 删除所有ThumbsDB = (options) => {
    return {
        label: '删除所有Thumbs.db',
        click: async () => {
            const localPath = options.tab.data.localPath;
            if (!localPath) {
                console.error('无法获取本地路径');
                return;
            }
            let confirm = await confirmAsPromise(
                `确认开始删除?`,
                `开始后所有${localPath}中的Thumbs.db文件将会被永久删除,无法恢复`
            )
            if (!confirm) {
                return
            }
            await 执行删除所有ThumbsDB(localPath)
        }
    }
}

import { 执行按扩展名分组 } from './flatWithExtend.js'
export const 展平并按扩展名分组 = (options) => {
    return {
        label: '按扩展名展平并分组到子文件夹',
        click: async () => {
            const localPath = options.tab.data.localPath;
            if (!localPath) {
                console.error('无法获取本地路径');
                return;
            }
            let confirm = await confirmAsPromise(
                `确认开始删除?`,
                `开始后所有${localPath}中的文件将会被移动按照扩展名移动到对应的文件夹,无法恢复`
            )
            if (!confirm) {
                return
            }
            await 执行按扩展名分组(localPath)
        }
    }
}
import { 执行归集纯色图片 } from './getPureColorImages.js'
export const 整理纯色和接近纯色的图片 = (options) => {
    return {
        label: '整理纯色和接近纯色的图片',
        click: async () => {
            const localPath = options.tab.data.localPath;
            if (!localPath) {
                console.error('无法获取本地路径');
                return;
            }
            let confirm = await confirmAsPromise(
                `确认开始删除?`,
                `开始后所有${localPath}中的纯色图片文件将会被移动到"待删除_纯色图片"文件夹,无法恢复`
            )
            if (!confirm) {
                return
            }
            await 执行归集纯色图片(localPath)
        }
    }
};

import { 执行扫描重复文件 } from './duplicateScanner.js'
export const 扫描重复文件 = (options) => {
    return {
        label: '扫描重复文件（严格）',
        click: async () => {
            const localPath = options.tab.data.localPath;
            if (!localPath) {
                console.error('无法获取本地路径');
                return;
            }
            let confirm = await confirmAsPromise(
                `确认开始扫描?`,
                `<p>开始后,将会开始查找${localPath}中的重复文件</p>
                <p>可能会有大量读取文件操作并需要一定时间执行</p>
                <p>文件扫描结果将被写入"重复文件扫描结果.txt"中</p>
                <p>超过100MB的文件将会被跳过</p>
                `
            )
            if (confirm) {
                await 执行扫描重复文件(localPath, false)
            }
        }
    }
};
export const 快速扫描重复文件 = (options) => {
    return {
        label: '扫描重复文件(宽松)',
        click: async () => {
            const localPath = options.tab.data.localPath;
            if (!localPath) {
                console.error('无法获取本地路径');
                return;
            }
            let confirm = await confirmAsPromise(
                `确认开始扫描?`,
                `<p>开始后,将会开始查找${localPath}中的重复文件</p>
                <p>可能会有大量读取文件操作并需要一定时间执行</p>
                <p>文件扫描结果将被写入"重复文件扫描结果.txt"中</p>
                `
            )
            if (confirm) {
                await 执行扫描重复文件(localPath, true)
            }
        }
    }
};
import { 执行扫描空文件夹 } from './emptyFolder.js'
export const 扫描空文件夹 = (options) => {
    return {
        label: '扫描空文件夹(非向上递归的)',
        click: async () => {
            const localPath = options.tab.data.localPath;
            if (!localPath) {
                console.error('无法获取本地路径');
                return;
            }
            let confirm = await confirmAsPromise(
                `确认开始扫描?`,
                `<p>开始后,将会开始查找${localPath}中的空文件夹</p>
                <p>可能会有大量读取文件操作并需要一定时间执行</p>
                <p>文件扫描结果将被写入"空文件夹扫描结果.txt"中</p>
                <p>内部仅包含文件夹的文件夹不会被视为空文件夹,可能需要多次执行才能删除它们</p>
                `
            )
            if (confirm) {
                await 执行扫描空文件夹(localPath)
            }
            let confirm1 = await confirmAsPromise(
                `是否确认删除?`,
                `<p>开始后,将会开始删除${localPath}中的空文件夹</p>
                <p>可能会有大量读取文件操作并需要一定时间执行</p>
                <p>内部仅包含文件夹的文件夹不会被视为空文件夹,可能需要多次执行才能删除它们</p>
                <p>删除操作无法恢复</p>
                `
            )
            if (confirm1) {
                await 执行扫描空文件夹(localPath, true)

            }
        }
    }
};

export const 处理重复文件 = (options) => {
    return {
        label: '处理重复文件（保留较新）',
        click: async () => {
            const localPath = options.tab.data.localPath;
            if (!localPath) {
                console.error('无法获取本地路径');
                return;
            }
            const fs = require('fs').promises;
            const path = require('path');

            const duplicateListPath = path.join(localPath, '重复文件扫描结果.json');
            const targetFolder = path.join(localPath, '待删除_重复文件');
            const taskController = 打开任务控制对话框('处理重复文件', '正在处理重复文件...');
            try {
                // 读取重复文件列表
                const content = await fs.readFile(duplicateListPath, 'utf-8');
                const { duplicates } = JSON.parse(content);

                // 创建目标文件夹
                await fs.mkdir(targetFolder, { recursive: true });
                let movedCount = 0;
                let errorCount = 0;

                // 处理每组重复文件
                for (const [, files] of Object.entries(duplicates)) {
                    if (files.length < 2) continue; // 跳过不是重复的文件

                    await taskController.addTask(async () => {
                        try {
                            // 获取所有文件的状态
                            const fileStats = await Promise.all(files.map(async file => ({
                                path: file,
                                stat: await fs.stat(file)
                            })));

                            // 按修改时间排序，保留最新的文件
                            fileStats.sort((a, b) => b.stat.mtime - a.stat.mtime);

                            const [keepFile, ...moveFiles] = fileStats;

                            // 移动其他文件
                            for (const file of moveFiles) {
                                const newPath = path.join(targetFolder, path.basename(file.path));
                                await fs.rename(file.path, newPath);
                                movedCount++;
                            }

                            return { message: `已保留: ${keepFile.path}\n已移动: ${moveFiles.map(f => f.path).join(', ')}` };
                        } catch (err) {
                            errorCount++;
                            return { message: `处理文件时出错: ${err.message}`, error: true };
                        }
                    });
                }

                taskController.start();
                taskController.on('allTasksCompleted', async () => {
                    const openFolder = await confirmAsPromise(
                        `处理完成,是否打开目标文件夹?`,
                        `处理完成。已移动 ${movedCount} 个文件到 ${targetFolder}。${errorCount} 个文件处理失败。`
                    )
                    if (openFolder) {
                        const { shell } = require('@electron/remote')
                        shell.openPath(targetFolder);
                    }
                });
            } catch (error) {
                const openFolder = await confirmAsPromise(
                    `处理出错?`,
                    `处理重复文件时发生错误: ${error} `
                )
                if (openFolder) {
                    const { shell } = require('@electron/remote')
                    shell.openPath(targetFolder);
                }

                taskController.close();
            }
        }
    }
};
export const 归集图片文件 = (options) => {
    return {
        label: '归集图片文件',
        click: async () => {
            const localPath = options.tab.data.localPath;
            if (!localPath) {
                console.error('无法获取本地路径');
                return;
            }

            // 创建确认对话框
            const confirmDialog = document.createElement('div');
            confirmDialog.innerHTML = `
                <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                            background: white; padding: 20px; border-radius: 5px; 
                            box-shadow: 0 0 10px rgba(0,0,0,0.1); z-index: 1000;
                            color: var(--b3-theme-primary);">
                    <h3>归集图片文件</h3>
                    <p>
                        <label>
                            <input type="checkbox" id="includeSubfolders" checked> 
                            包括子文件夹
                        </label>
                    </p>
                    <button id="confirmButton">确认</button>
                    <button id="cancelButton">取消</button>
                </div>
            `;
            document.body.appendChild(confirmDialog);

            // 等待用户确认
            const userConfirmed = await new Promise((resolve) => {
                document.getElementById('confirmButton').onclick = () => resolve(true);
                document.getElementById('cancelButton').onclick = () => resolve(false);
            });

            // 移除确认对话框
            document.body.removeChild(confirmDialog);

            if (!userConfirmed) return;

            const includeSubfolders = document.getElementById('includeSubfolders').checked;

            // 创建进度对话框
            const progressDialog = document.createElement('div');
            progressDialog.innerHTML = `
                <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                            background: white; padding: 20px; border-radius: 5px; 
                            box-shadow: 0 0 10px rgba(0,0,0,0.1); z-index: 1000;
                            color: var(--b3-theme-primary);">
                    <h3>正在归集图片文件</h3>
                    <p id="progressText">已处理: 0 个文件</p>
                    <progress id="progressBar" value="0" max="100" style="width: 100%;"></progress>
                </div>
            `;
            document.body.appendChild(progressDialog);

            const updateProgress = (processed, total) => {
                const progressText = document.getElementById('progressText');
                const progressBar = document.getElementById('progressBar');
                const percentage = total ? Math.round((processed / total) * 100) : 0;
                progressText.textContent = `已处理: ${processed} / ${total} 个文件`;
                progressBar.value = percentage;
            };

            try {
                const fs = require('fs').promises;
                const path = require('path');

                const isImage = (file) => {
                    const ext = path.extname(file).toLowerCase();
                    return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext);
                };

                const targetFolder = path.join(localPath, '归集的图片');
                await fs.mkdir(targetFolder, { recursive: true });

                let processedFiles = 0;
                let totalFiles = 0;

                const collectImages = async (dir) => {
                    const entries = await fs.readdir(dir, { withFileTypes: true });
                    for (const entry of entries) {
                        const fullPath = path.join(dir, entry.name);
                        if (entry.isDirectory() && includeSubfolders) {
                            await collectImages(fullPath);
                        } else if (entry.isFile() && isImage(entry.name)) {
                            totalFiles++;
                            const newPath = path.join(targetFolder, entry.name);
                            await fs.rename(fullPath, newPath);
                            processedFiles++;
                            updateProgress(processedFiles, totalFiles);
                        }
                    }
                };

                await collectImages(localPath);

                clientApi.showMessage(`归集完成，共处理 ${processedFiles} 个图片文件。`, 'info');
            } catch (error) {
                console.error('归集图片文件时发生错误:', error);
                clientApi.showMessage('归集图片文件时发生错误', 'error');
            } finally {
                // 移除进度对话框
                document.body.removeChild(progressDialog);
            }
        }
    }
};



import { 执行复制文档树结构 } from './copyFileTree.js'
export const 复制文档树结构 = (options) => {
    const localPath = options.tab.data.localPath;

    return {
        label: '复制文件夹结构(markdown)',
        submenu: [
            {
                label: "复制文档树结构 (按名称升序)",
                click: () => 执行复制文档树结构(localPath, 'name', 'asc')
            },
            {
                label: "复制文档树结构 (按名称降序)",
                click: () => 执行复制文档树结构(localPath, 'name', 'desc')
            },
            {
                label: "复制文档树结构 (按大小升序)",
                click: () => 执行复制文档树结构(localPath, 'size', 'asc')
            },
            {
                label: "复制文档树结构 (按大小降序)",
                click: () => 执行复制文档树结构(localPath, 'size', 'desc')
            },
            {
                label: "复制文档树结构 (按修改时间升序)",
                click: () => 执行复制文档树结构(localPath, 'mtime', 'asc')
            },
            {
                label: "复制文档树结构 (按修改时间降序)",
                click: () => 执行复制文档树结构(localPath, 'mtime', 'desc')
            }
        ]
    }
}
