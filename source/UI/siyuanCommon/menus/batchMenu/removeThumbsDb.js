import { 打开任务控制对话框 } from "../../dialog/tasks.js";
import { 递归扫描文件夹并执行任务 } from "../../../../../src/utils/fs/batch.js";
const fs=require('fs').promises

/**
 * 执行删除所有Thumbs.db文件
 * @param {string} localPath 本地路径
 */
export const 执行删除所有ThumbsDB = async (localPath) => {
    // 打开任务控制对话框并等待其返回值
    const taskController = await 打开任务控制对话框('删除Thumbs.db文件', '正在扫描并删除Thumbs.db文件...');
    
    const 文件处理函数 = async (fullPath, fileName, controller, 添加任务) => {
        if (fileName.toLowerCase() === "thumbs.db") {
            await 添加任务(async () => {
                await fs.unlink(fullPath);
                return { message: `已删除: ${fullPath}` };
            }, `删除失败: ${fullPath}`);
        }
    };
    
    try {
        await 递归扫描文件夹并执行任务(localPath, taskController, 文件处理函数);
        taskController.start();
        taskController.on('allTasksCompleted', () => {
            console.log('任务完成');
        });
    } catch (error) {
        console.error('删除Thumbs.db文件时发生错误:', error);
    }
};