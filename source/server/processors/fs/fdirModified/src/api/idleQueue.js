// 空闲队列处理器
// 用于在浏览器空闲时间执行任务，避免阻塞主线程

/**
 * 使用浏览器空闲时间执行任务
 * @param {Function} task - 要执行的任务函数
 * @param {Object} options - 配置选项
 * @param {number} options.deadline - 最小空闲时间要求(ms)
 * @param {number} options.timeout - 最大等待时间(ms)
 * @param {Function} options.onError - 错误处理函数
 * @returns {Function} 取消函数
 */
export function useIdleTask(task, options = {}) {
    const {
        deadline = 50,
        timeout = 1000,
        onError = console.error
    } = options;

    let isCancelled = false;
    let timeoutId = null;

    const executeTask = (deadlineTime) => {
        if (isCancelled) return;

        try {
            const timeRemaining = deadlineTime.timeRemaining();
            
            if (timeRemaining >= deadline) {
                task(timeRemaining);
            } else {
                // 使用 setTimeout 代替递归调用，避免调用栈过深
                timeoutId = setTimeout(() => {
                    requestIdleCallback(executeTask, { timeout });
                }, 0);
            }
        } catch (error) {
            onError(error);
        }
    };

    // 设置超时保护
    timeoutId = setTimeout(() => {
        if (!isCancelled) {
            onError(new Error('Idle task timeout'));
        }
    }, timeout);

    requestIdleCallback(executeTask, { timeout });

    // 返回取消函数
    return () => {
        isCancelled = true;
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
    };
}

/**
 * 直接使用 requestIdleCallback 执行任务
 * @param {Function} task - 要执行的任务函数
 * @param {Object} options - 配置选项
 * @param {number} options.timeout - 最大等待时间(ms)
 * @returns {number} 任务ID
 */
export function useIdleCallback(task, options = { timeout: 1000 }) {
    return requestIdleCallback(task, options);
}