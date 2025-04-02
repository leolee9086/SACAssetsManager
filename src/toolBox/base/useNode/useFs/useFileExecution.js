/**
 * 文件执行模块
 * 提供文件操作的组合执行功能
 */
import { useFileStatus } from './useFileStatus.js';
import { withFileCreation } from './withFileCreation.js';
import { withTimeout } from './withTimeout.js';
import { withErrorHandling } from './withErrorHandling.js';

/**
 * 检查文件并按条件执行相关操作
 * @param {Object} context - 包含文件路径和所需操作的上下文对象
 * @param {Object} options - 操作选项
 * @returns {Promise<any>} 执行结果或false
 */
const useFileExecution = async (context, options = {}) => {
    try {
        // 获取文件状态并合并到context
        const fileStatus = await useFileStatus(context);
        Object.assign(context, fileStatus);
        context.startTime = Date.now();
        
        // 处理文件不存在情况
        await withFileCreation(context, options);
        
        // 执行条件判断
        const conditionPromise = Promise.resolve(options.condition?.(context) ?? true);
        const conditionResult = await withTimeout(
            conditionPromise, 
            { 
                timeout: options.timeout || 0, 
                errorMessage: '条件判断超时' 
            }
        );
        
        if (options.logProcess) {
            console.log(`条件判断结果: ${conditionResult}`);
        }
        
        // 条件通过则执行操作
        if (conditionResult) {
            const executorPromise = Promise.resolve(options.executor?.(context) ?? undefined);
            const result = await withTimeout(
                executorPromise, 
                { 
                    timeout: options.timeout || 0, 
                    errorMessage: '执行操作超时' 
                }
            );
            
            if (options.logProcess) {
                const endTime = Date.now();
                console.log(`执行完成，耗时: ${endTime - context.startTime}ms`);
            }
            
            return result;
        }
        
        return false;
    } catch (error) {
        return withErrorHandling(context, {
            error,
            logProcess: options.logProcess,
            errorHandler: options.errorHandler
        });
    }
};

// 导出模块功能
export { useFileExecution }; 