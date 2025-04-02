/**
 * 错误处理模块
 * 提供统一的错误处理功能
 */

/**
 * 处理执行过程中的错误
 * @param {Object} context - 上下文对象
 * @param {Object} options - 错误处理选项
 * @returns {Promise<any>} 错误处理结果或抛出错误
 */
const withErrorHandling = (context, options) => {
    const { error, logProcess = false, errorHandler = null } = options;
    
    // 直接修改context
    context.error = error;
    context.errorTime = new Date();
    context.errorMessage = error.message;
    context.errorStack = error.stack;
    
    if (logProcess) {
        console.error(`执行错误: ${error.message}`);
    }
    
    if (errorHandler) {
        return Promise.resolve(errorHandler(context));
    }
    
    throw error;
};

// 导出模块功能
export { withErrorHandling }; 