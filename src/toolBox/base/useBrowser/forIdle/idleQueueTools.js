/**
 * 空闲队列处理器模块
 * 
 * 提供空闲队列相关工具的统一导出
 */

import {
    useIdleTask,
    useIdleCallback,
    isIdleCallbackSupported,
    createIdleTaskQueue
} from './useIdleQueue.js';

// 中文函数导出
export const 使用空闲任务 = useIdleTask;
export const 使用空闲回调 = useIdleCallback;
export const 检查空闲回调支持 = isIdleCallbackSupported;
export const 创建空闲任务队列 = createIdleTaskQueue;

// 英文函数导出
export {
    useIdleTask,
    useIdleCallback,
    isIdleCallbackSupported,
    createIdleTaskQueue
}; 