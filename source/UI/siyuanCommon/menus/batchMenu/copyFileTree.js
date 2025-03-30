import { 递归扫描文件夹并执行任务 } from "../../../../utils/fs/batch.js";
import { 打开任务控制对话框 } from "../../dialog/tasks.js";
import { confirmAsPromise } from "../../../../utils/siyuanUI/confirm.js";
const path = require('path');
const fs = require('fs').promises;
const { clipboard } = require('electron');
import { 从文件树生成markdown列表,从文件树生成markdown段落 } from "../../../../utils/siyuanData/contentBuilder.js";
/**
 * 获取文件属性
 * @param {string} fullPath - 文件的完整路径
 * @returns {Promise<Object>} 文件属性
 */
export const 获取文件属性 = async (fullPath) => {
    const stats = await fs.stat(fullPath);
    return {
        name: path.basename(fullPath),
        path: fullPath,
        size: stats.size,
        mtime: stats.mtime,
        isDirectory: stats.isDirectory()
    };
};

/**
 * 处理单个条目
 * @param {string} fullPath - 条目的完整路径
 * @param {string} name - 条目名称
 * @param {Object} controller - 任务控制器
 * @param {Function} 添加任务 - 添加任务的函数
 * @param {Function} 获取文件属性 - 获取文件属性的函数
 * @param {Array} fileList - 文件列表
 */
export const 处理条目 = async (fullPath, name, controller, 添加任务, 获取文件属性, fileList) => {
    await 添加任务(async () => {
        const fileInfo = await 获取文件属性(fullPath);
        fileList.push(fileInfo);
        return { message: `已处理: ${fullPath}` };
    }, `处理失败: ${fullPath}`);
};

/**
 * 排序条目
 * @param {Array} entries - 条目数组
 * @param {string} sortBy - 排序依据
 * @param {string} sortOrder - 排序顺序
 * @returns {Array} 排序后的条目
 */
export const 排序条目 = (entries, sortBy, sortOrder) => {
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

/**
 * 构建树结构
 * @param {Array} entries - 所有文件条目
 * @param {string} basePath - 基础路径
 * @param {string} sortBy - 排序依据
 * @param {string} sortOrder - 排序顺序
 * @returns {Array} 树结构
 */
export const 构建树结构 = (entries, basePath, sortBy, sortOrder) => {
    const tree = [];
    const normalizedBasePath = basePath.replace(/\\/g, '/');
    
    const sortedEntries = 排序条目(entries.filter(entry => {
        const normalizedEntryPath = entry.path.replace(/\\/g, '/');
        return normalizedEntryPath.startsWith(normalizedBasePath) &&
               normalizedEntryPath.slice(normalizedBasePath.length).split('/').filter(Boolean).length === 1;
    }), sortBy, sortOrder);
    
    for (const entry of sortedEntries) {
        const node = { ...entry };
        if (entry.isDirectory) {
            node.children = 构建树结构(entries, entry.path, sortBy, sortOrder);
        }
        tree.push(node);
    }
    return tree;
};


/**
 * 执行复制文档树结构
 * @param {string} localPath - 本地路径
 * @param {string} sortBy - 排序依据
 * @param {string} sortOrder - 排序顺序
 * @param {string} type - 生成的Markdown格式类型（'list' 或 'paragraph'）
 */
export const 执行复制文档树结构 = async (localPath, sortBy = 'name', sortOrder = 'asc', type = 'list') => {
    const taskController = await 打开任务控制对话框('复制文档树结构', '正在扫描文件结构...');
    let fileList = [];

    try {
        await 递归扫描文件夹并执行任务(
            localPath,
            taskController,
            (fullPath, fileName, controller, 添加任务) => 处理条目(fullPath, fileName, controller, 添加任务, 获取文件属性, fileList),
            (fullPath, dirName, controller, 添加任务) => 处理条目(fullPath, dirName, controller, 添加任务, 获取文件属性, fileList)
        );

        taskController.start();
        taskController.on('allTasksCompleted', async () => {
            const treeStructure = 构建树结构(fileList, localPath, sortBy, sortOrder);
            
            let markdownContent = `# 文档树结构: ${localPath}\n\n`;
            if (type === 'list') {
                markdownContent += 从文件树生成markdown列表(treeStructure);
            } else if (type === 'paragraph') {
                markdownContent += 从文件树生成markdown段落(treeStructure);
            } else {
                throw new Error(`未知的类型: ${type}`);
            }

            const outputPath = path.join(localPath, '文档树结构.md');
            await fs.writeFile(outputPath, markdownContent);
            clipboard.writeText(markdownContent);
            await confirmAsPromise(
                '黏贴时注意内容长度',
                `文件树结构已经写入到剪贴板, 黏贴时请注意内容长达${markdownContent.length}, 有可能造成性能问题`
            );
        });
    } catch (error) {
        console.error('生成文档树结构时发生错误:', error);
        clientApi.showMessage('生成文档树结构时发生错误', 'error');
    }
};