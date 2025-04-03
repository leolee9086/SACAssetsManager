import { openTaskDialog } from "../../../../src/toolBox/feature/useVue/dialogTools.js";
import { 串行任务控制器 } from "../../../../src/toolBox/base/useEcma/forFunctions/forTaskQueue.js";
import { clientApi } from "../../../asyncModules.js";

/**
 * 创建任务队列控制器
 * @param {object} options 配置选项
 * @param {boolean} [options.destroyOnComplete=true] 完成时是否销毁
 * @param {function} [options.uiRenderer] UI渲染函数，接收控制器和UI选项
 * @returns {串行任务控制器} 任务控制器实例
 */
export const useTaskQueue = async (options = {}) => {
    const {
        destroyOnComplete = true,
        uiRenderer,
        ...uiOptions
    } = options;
    
    // 创建任务控制器
    const taskController = new 串行任务控制器({
        destroyOnComplete
    });
    
    // 如果提供了UI渲染函数，则调用它
    if (typeof uiRenderer === 'function') {
        try {
            await uiRenderer(taskController, uiOptions);
        } catch (error) {
            console.error('UI渲染失败:', error);
        }
    }
    
    return taskController;
};

/**
 * 默认对话框UI渲染函数
 * @param {串行任务控制器} controller 任务控制器
 * @param {object} options UI配置选项
 * @param {string} [options.taskTitle='批处理'] 任务标题
 * @param {string} [options.taskDescription='任务执行中'] 任务描述
 * @param {string} [options.width='70vw'] 对话框宽度
 * @param {string} [options.height='auto'] 对话框高度
 * @returns {Promise<object>} 对话框实例
 */
export const withDialogUI = async (controller, options = {}) => {
    const {
        taskTitle = '批处理',
        taskDescription = '任务执行中',
        width = '70vw',
        height = 'auto'
    } = options;
    
    return openTaskDialog(
        clientApi,
        import.meta.resolve('./task.vue'),
        controller,
        taskTitle,
        taskDescription,
        width,
        height
    );
};

/**
 * 使用任务控制对话框
 * @param {object} options 配置选项
 * @param {string} [options.taskTitle='批处理'] 任务标题
 * @param {string} [options.taskDescription='任务执行中'] 任务描述
 * @param {boolean} [options.destroyOnComplete=true] 完成时是否销毁
 * @param {string} [options.width='70vw'] 对话框宽度
 * @param {string} [options.height='auto'] 对话框高度
 * @returns {Promise<串行任务控制器>} 任务控制器实例
 */
export const useTaskDialog = async (options = {}) => {
    return useTaskQueue({
        ...options,
        uiRenderer: withDialogUI
    });
};

/**
 * 打开任务控制对话框
 * @param {string} taskTitle 任务标题
 * @param {string} taskDescription 任务描述
 * @returns {串行任务控制器} 任务控制器实例
 */
export const 打开任务控制对话框 = async (taskTitle = '批处理', taskDescription = '任务执行中') => {
    return useTaskDialog({
        taskTitle,
        taskDescription
    });
};

