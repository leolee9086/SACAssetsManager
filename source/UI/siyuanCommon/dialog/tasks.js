import { openTaskDialog } from "../../../../src/toolBox/feature/useVue/dialogTools.js";
import { 串行任务控制器 } from "../../../../src/toolBox/base/useEcma/forFunctions/forTaskQueue.js";
import { clientApi } from "../../../asyncModules.js";

/**
 * 打开任务控制对话框
 * @param {string} taskTitle 任务标题
 * @param {string} taskDescription 任务描述
 * @returns {串行任务控制器} 任务控制器实例
 */
export const 打开任务控制对话框 = async (taskTitle = '批处理', taskDescription = '任务执行中') => {
    // 创建任务控制器
    const taskController = new 串行任务控制器({
        destroyOnComplete: true
    });
    
    try {
        const { dialog } = await openTaskDialog(
            clientApi,
            import.meta.resolve('./task.vue'),
            taskController,
            taskTitle,
            taskDescription,
            '70vw',
            'auto'
        );
    } catch (error) {
        console.error('打开任务控制对话框失败:', error);
    }
    
    return taskController;
};

