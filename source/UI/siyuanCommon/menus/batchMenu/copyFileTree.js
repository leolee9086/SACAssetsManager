import { 递归扫描文件夹并执行任务 } from "../../../../utils/fs/batch.js";
import { 打开任务控制对话框 } from "../../dialog/tasks.js";
import { confirmAsPromise } from "../../../../utils/siyuanUI/confirm.js";
const path = require('path');
const fs = require('fs').promises;
const { clipboard } = require('electron');

export const 执行复制文档树结构 = async (localPath, sortBy = 'name', sortOrder = 'asc') => {
    const taskController = 打开任务控制对话框('复制文档树结构', '正在扫描文件结构...');
    let fileList = [];

    const 获取文件属性 = async (fullPath) => {
        const stats = await fs.stat(fullPath);
        return {
            name: path.basename(fullPath),
            path: fullPath,
            size: stats.size,
            mtime: stats.mtime,
            isDirectory: stats.isDirectory()
        };
    };

    const 处理条目 = async (fullPath, name,controller, 添加任务) => {
        await 添加任务(async () => {
            const fileInfo = await 获取文件属性(fullPath);
            fileList.push(fileInfo);
            return { message: `已处理: ${fullPath}` };
        }, `处理失败: ${fullPath}`);
    };

    try {
        await 递归扫描文件夹并执行任务(
            localPath,
            taskController,
            (fullPath, fileName, controller, 添加任务) => 处理条目(fullPath, fileName, controller, 添加任务),
            (fullPath, dirName, controller, 添加任务) => 处理条目(fullPath, dirName, controller, 添加任务)
        );

        taskController.start();
        taskController.on('allTasksCompleted', async () => {
          //  taskController.updateMessage('正在生成Markdown格式的文档树...');
            const 排序条目 = (entries) => {
                return entries.sort((a, b) => {
                    if (a.isDirectory !== b.isDirectory) {
                        return a.isDirectory ? -1 : 1;
                    }
                    let comparison;
                    switch (sortBy) {
                        case 'size':
                            comparison = a.size - b.size;
                            break;
                        case 'mtime':
                            comparison = a.mtime - b.mtime;
                            break;
                        default:
                            comparison = a.name.localeCompare(b.name);
                    }
                    return sortOrder === 'asc' ? comparison : -comparison;
                });
            };

            const 构建树结构 = (entries, basePath) => {
                const tree = [];
                const normalizedBasePath = basePath.replace(/\\/g, '/');
                
                const sortedEntries = 排序条目(entries.filter(entry => {
                    const normalizedEntryPath = entry.path.replace(/\\/g, '/');
                    return normalizedEntryPath.startsWith(normalizedBasePath) &&
                           normalizedEntryPath.slice(normalizedBasePath.length).split('/').filter(Boolean).length === 1;
                }));
            
                for (const entry of sortedEntries) {
                    const node = { ...entry };
                    if (entry.isDirectory) {
                        node.children = 构建树结构(entries, entry.path);
                    }
                    tree.push(node);
                }
                return tree;
            };

            const 生成Markdown = (tree, depth = 0) => {
                let content = '';
                for (const node of tree) {
                    const indent = '    '.repeat(depth);
                    const icon = node.isDirectory ? '📁' : '📄';
                    const size = node.isDirectory ? '' : ` (${node.size} bytes)`;
                    const mtime = node.mtime.toISOString().split('T')[0];
                    const absolutePath = node.path.replace(/\\/g, '/');
                    const linkText = node.isDirectory ? node.name : `[${node.name}](file:///${encodeURI(absolutePath)})`;
                    
                    content += `${indent}- ${icon} ${linkText}${size} - 修改日期: ${mtime}\n`;
            
                    if (node.children) {
                        content += 生成Markdown(node.children, depth + 1);
                    }
                }
                return content;
            };
            const treeStructure = 构建树结构(fileList, localPath);
            let markdownContent = `# 文档树结构:${localPath}\n\n${生成Markdown(treeStructure)}`;
            const outputPath = path.join(localPath, '文档树结构.md');
            await fs.writeFile(outputPath, markdownContent);
            clipboard.writeText(markdownContent);
            await confirmAsPromise('黏贴时注意内容长度', `文件树结构已经写入到剪贴板,黏贴时请注意内容长达${markdownContent.length},有可能造成性能问题`);
        });
    } catch (error) {
        console.error('生成文档树结构时发生错误:', error);
        clientApi.showMessage('生成文档树结构时发生错误', 'error');
    }
};