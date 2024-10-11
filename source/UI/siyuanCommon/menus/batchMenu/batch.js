import { plugin } from '../../../../pluginSymbolRegistry.js'
import { 打开任务控制对话框 } from '../../dialog/tasks.js'
import { confirmAsPromise } from '../../../../utils/siyuanUI/confirm.js'
import { showInputDialogPromise } from '../../dialog/inputDialog.js'
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
                <p>文件扫描结果将被写入"重复文件扫描结果.json"中,而不是直接删除</p>
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
                <p>文件扫描结果将被写入"重复文件扫描结果.json"中,而不是直接删除</p>
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
            let confirm = await confirmAsPromise(
                `确认处理重复文件?`,
                `<p>开始后,将会开始查找${localPath}中的重复文件</p>
                <p>可能会有大量读取文件操作并需要一定时间执行</p>
                <p>运行之前需要先使用扫描重复文件功能生成重复文件列表</p>
                <p>重复文件中修改时间最近的结果将会保留在原始位置,其他文件将会被移入"待删除_重复文件"子文件夹</p>
                `
            )
            if(!confirm){
                return
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

import { 执行图片去重, 执行图片去重_后处理 } from './duplicateImageScanner.js';
export const 图片去重 = (options,扫描完成后选择) => {
    return {
        label: 扫描完成后选择?'图片去重(基于粗略的像素比较,扫描完成后选择)':'图片去重(基于粗略的像素比较)',
        click: async () => {
            const localPath = options.tab.data.localPath;
            if (!localPath) {
                console.error('无法获取本地路径');
                return;
            }
            let confirm = await confirmAsPromise(
                `确认开始图片去重?`,
                `<p>开始后,将会对${localPath}中的图片文件的缩略图以灰度值计算简单哈希进行比较</p>
                <p>这个过程可能需要较长时间,具体取决于图片数量和大小</p>
                <p>识别并非完全准确,建议仅用于大量材质贴图等数量较大但准确性要求不高的场合</p>
                <p>重复的图片将被移动到"待删除_重复图片"文件夹中</p>
                `
            )
            
            if (confirm) {
                const taskController = 打开任务控制对话框('图片去重', '正在比较图片,使用像素哈希...');
                扫描完成后选择?await 执行图片去重_后处理(localPath, taskController,'simple'):await 执行图片去重(localPath, taskController,'simple');
            }
        }
    }
};

export const 基于pHash的图片去重 = (options,扫描完成后选择) => {
    return {
        label: 扫描完成后选择?'图片去重(基于phash,扫描完成后选择)':'图片去重(基于phash)',
        click: async () => {
            const localPath = options.tab.data.localPath;
            if (!localPath) {
                console.error('无法获取本地路径');
                return;
            }
            let confirm = await confirmAsPromise(
                `确认开始图片去重?`,
                `<p>开始后,将会对${localPath}中的图片文件的缩略图计算pHash进行比较</p>
                <p>这个过程可能需要较长时间,具体取决于图片数量和大小</p>
                <p>识别并非完全准确,建议仅用于大量材质贴图等数量较大但准确性要求不高的场合</p>
                <p>重复的图片将被移动到"待删除_重复图片"文件夹中</p>
                `
            )
            
            if (confirm) {
                const taskController = 打开任务控制对话框('图片去重', '正在比较图片,使用pahash...');
                扫描完成后选择?await 执行图片去重_后处理(localPath, taskController,'feature'):await 执行图片去重(localPath, taskController,'feature');
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

            const confirm = await confirmAsPromise(
                '归集图片文件',
                '是否包括子文件夹中的图片?',
            );

            if (confirm === null) return; // 用户取消操作

            const includeSubfolders = confirm;

            const taskController = 打开任务控制对话框('归集图片文件', '正在归集图片文件...');

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

                const collectImages = async (dir) => {
                    const entries = await fs.readdir(dir, { withFileTypes: true });
                    for (const entry of entries) {
                        const fullPath = path.join(dir, entry.name);
                        if (entry.isDirectory() && includeSubfolders) {
                            await taskController.addTask(async()=>{
                                await collectImages(fullPath)
                            },0)
                        } else if (entry.isFile() && isImage(entry.name)) {
                            await taskController.addTask(async () => {
                                const newPath = path.join(targetFolder, entry.name);
                                await fs.rename(fullPath, newPath);
                                processedFiles++;
                                return { message: `已移动: ${entry.name}` };
                            },1);
                        }
                    }
                };

                await collectImages(localPath);

                taskController.start();
                taskController.on('allTasksCompleted', () => {
                    clientApi.showMessage(`归集完成，共处理 ${processedFiles} 个图片文件。`, 'info');
                });
            } catch (error) {
                console.error('归集图片文件时发生错误:', error);
                clientApi.showMessage('归集图片文件时发生错误', 'error');
                taskController.close();
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
import { 执行批量打包文件 } from './zip.js'
export const 批量打包文件 = (options) => {
    const localPath = options.tab.data.localPath;
    const 执行打包 = async (每包文件数) => {
        if (!localPath) {
            console.error('无法获取本地路径');
            return;
        }
        let confirm = await confirmAsPromise(
            `确认开始批量打包?`,
            `开始后，${localPath}中的文件将会被每${每包文件数}个打包成一个zip文件。`
        )
        if (!confirm) {
            return;
        }
        const taskController = 打开任务控制对话框('批量打包文件', '正在打包文件...');
        await 执行批量打包文件(localPath, taskController, 每包文件数);
    };

    return {
        label: plugin.翻译`批量打包文件`,
        click: async () => {
            const result = await showInputDialogPromise('每个压缩包的文件数量', '请输入每个压缩包要包含的文件数量：', '10');
            if (result) {
                const 每包文件数 = parseInt(result, 10);
                if (isNaN(每包文件数) || 每包文件数 <= 0) {
                    clientApi.showMessage('请输入有效的正整数', 'error');
                    return;
                }
                await 执行打包(每包文件数);
            }
        },
        submenu: [
            {
                label: "每5个文件打包",
                click: () => 执行打包(5)
            },
            {
                label: "每10个文件打包",
                click: () => 执行打包(10)
            },
            {
                label: "每20个文件打包",
                click: () => 执行打包(20)
            },
            {
                label: "每50个文件打包",
                click: () => 执行打包(50)
            },
            {
                label: "每100个文件打包",
                click: () => 执行打包(100)
            }
        ]
    }
};