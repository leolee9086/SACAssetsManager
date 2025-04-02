/**
 * 超时控制模块
 * 提供Promise超时控制功能
 */

/**
 * 使用超时机制执行Promise
 * @param {Promise} promise - 要执行的Promise
 * @param {Object} options - 超时配置
 * @returns {Promise<any>} Promise执行结果
 */
const withTimeout = (promise, options) => {
    const { timeout = 0, errorMessage = '操作超时' } = options;
    
    if (timeout <= 0) return promise;
    
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(new Error(`${errorMessage}: ${timeout}ms`));
        }, timeout);
    });
    
    return Promise.race([promise, timeoutPromise])
        .finally(() => {
            if (timeoutId) clearTimeout(timeoutId);
        });
};

// 导出模块功能
export { withTimeout }; 