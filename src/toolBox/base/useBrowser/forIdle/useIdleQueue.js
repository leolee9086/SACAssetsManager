/**
 * 空闲队列处理器模块
 * 
 * 用于在浏览器空闲时间执行任务，避免阻塞主线程，提高应用响应性能
 * 基于浏览器的requestIdleCallback API实现
 */

/**
 * 使用浏览器空闲时间执行任务
 * @param {Function} task - 要执行的任务函数
 * @param {Object} options - 配置选项
 * @param {number} options.deadline - 最小空闲时间要求(ms)
 * @param {number} options.timeout - 最大等待时间(ms)
 * @param {Function} options.onError - 错误处理函数
 * @param {Function} options.onComplete - 完成回调函数
 * @returns {Function} 取消函数
 */
export function useIdleTask(task, options = {}) {
    const {
        deadline = 50,
        timeout = 1000,
        onError = console.error,
        onComplete = () => {}
    } = options;

    let isCancelled = false;
    let timeoutId = null;
    let idleCallbackId = null;
    let isCompleted = false;

    // 任务完成处理
    const completeTask = (result) => {
        if (!isCompleted && !isCancelled) {
            isCompleted = true;
            
            // 清除超时定时器
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
            
            try {
                onComplete(result);
            } catch (error) {
                onError(error);
            }
        }
    };

    const executeTask = (deadlineTime) => {
        if (isCancelled || isCompleted) return;

        try {
            const timeRemaining = deadlineTime.timeRemaining();
            
            if (timeRemaining >= deadline) {
                // 执行任务，处理返回值可能是Promise的情况
                const result = task(timeRemaining);
                
                // 如果任务返回Promise，等待它完成
                if (result instanceof Promise) {
                    result
                        .then(completeTask)
                        .catch(error => {
                            if (!isCancelled && !isCompleted) {
                                onError(error);
                                completeTask(null);
                            }
                        });
                } else {
                    // 同步任务直接完成
                    completeTask(result);
                }
            } else {
                // 使用 setTimeout 代替递归调用，避免调用栈过深
                timeoutId = setTimeout(() => {
                    if (!isCancelled && !isCompleted) {
                        idleCallbackId = requestIdleCallback(executeTask, { timeout });
                    }
                }, 0);
            }
        } catch (error) {
            if (!isCancelled && !isCompleted) {
                onError(error);
                completeTask(null);
            }
        }
    };

    // 设置超时保护
    timeoutId = setTimeout(() => {
        if (!isCancelled && !isCompleted) {
            onError(new Error('Idle task timeout'));
            completeTask(null);
        }
    }, timeout);

    // 启动任务
    idleCallbackId = requestIdleCallback(executeTask, { timeout });

    // 返回取消函数
    return () => {
        if (!isCancelled && !isCompleted) {
            isCancelled = true;
            
            // 清除定时器
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
            
            // 取消requestIdleCallback
            if (idleCallbackId) {
                cancelIdleCallback(idleCallbackId);
                idleCallbackId = null;
            }
        }
    };
}

/**
 * 直接使用 requestIdleCallback 执行任务
 * @param {Function} task - 要执行的任务函数
 * @param {Object} options - 配置选项
 * @param {number} options.timeout - 最大等待时间(ms)
 * @returns {Object} - 包含任务ID和取消函数
 */
export function useIdleCallback(task, options = { timeout: 1000 }) {
    const id = requestIdleCallback(task, options);
    
    return {
        id,
        cancel: () => cancelIdleCallback(id)
    };
}

/**
 * 检查当前环境是否支持 requestIdleCallback
 * @returns {boolean} 是否支持
 */
export function isIdleCallbackSupported() {
    return typeof window !== 'undefined' && 'requestIdleCallback' in window;
}

/**
 * 创建一个空闲任务队列，按优先级执行任务
 * @param {Object} options - 配置选项
 * @param {number} options.concurrency - 最大并发任务数
 * @param {number} options.timeout - 任务超时时间
 * @param {Function} options.onError - 全局错误处理函数
 * @returns {Object} 任务队列控制器
 */
export function createIdleTaskQueue(options = {}) {
    const {
        concurrency = 1,
        timeout = 5000,
        onError = console.error
    } = options;
    
    const queue = [];
    let running = 0;
    let isProcessing = false;
    let isDestroyed = false;
    
    // 任务取消函数集合
    const cancelFunctions = new Map();
    
    /**
     * 添加任务到队列
     * @param {Function} task - 任务函数
     * @param {number} priority - 优先级(0-9，越小优先级越高)
     * @param {Object} taskOptions - 任务特定选项
     * @returns {Promise} 任务完成的Promise
     */
    const addTask = (task, priority = 5, taskOptions = {}) => {
        if (isDestroyed) {
            return Promise.reject(new Error('Task queue has been destroyed'));
        }
        
        const taskId = Date.now() + Math.random().toString(36).substr(2, 9);
        
        return new Promise((resolve, reject) => {
            queue.push({
                id: taskId,
                task,
                priority,
                options: taskOptions,
                resolve,
                reject
            });
            
            // 按优先级排序
            queue.sort((a, b) => a.priority - b.priority);
            
            // 避免递归调用，使用setTimeout启动处理
            if (!isProcessing) {
                setTimeout(processQueue, 0);
            }
        });
    };
    
    /**
     * 处理队列中的任务
     */
    const processQueue = () => {
        if (isDestroyed) return;
        
        if (queue.length === 0 || running >= concurrency) {
            isProcessing = false;
            return;
        }
        
        isProcessing = true;
        
        // 处理可以运行的任务
        while (queue.length > 0 && running < concurrency) {
            const taskData = queue.shift();
            running++;
            
            const taskOptions = {
                ...taskData.options,
                timeout,
                onComplete: (result) => {
                    running--;
                    cancelFunctions.delete(taskData.id);
                    taskData.resolve(result);
                    
                    // 继续处理队列，使用setTimeout避免调用栈过深
                    setTimeout(processQueue, 0);
                },
                onError: (error) => {
                    running--;
                    cancelFunctions.delete(taskData.id);
                    taskData.reject(error);
                    
                    if (options.onError) {
                        try {
                            options.onError(error, taskData);
                        } catch (e) {
                            console.error('Error in queue error handler:', e);
                        }
                    }
                    
                    // 继续处理队列，使用setTimeout避免调用栈过深
                    setTimeout(processQueue, 0);
                }
            };
            
            try {
                const cancelFn = useIdleTask(
                    async (timeRemaining) => {
                        try {
                            return await taskData.task(timeRemaining);
                        } catch (error) {
                            throw error; // 让useIdleTask的错误处理来处理
                        }
                    }, 
                    taskOptions
                );
                
                // 保存取消函数
                cancelFunctions.set(taskData.id, cancelFn);
                
            } catch (error) {
                // 处理任务创建时的错误
                running--;
                taskData.reject(error);
                
                if (options.onError) {
                    try {
                        options.onError(error, taskData);
                    } catch (e) {
                        console.error('Error in queue error handler:', e);
                    }
                }
            }
        }
        
        // 如果还有任务，继续处理
        if (queue.length > 0 && running < concurrency) {
            setTimeout(processQueue, 0);
        } else {
            isProcessing = queue.length > 0;
        }
    };
    
    /**
     * 取消特定任务
     * @param {string} taskId - 任务ID
     * @returns {boolean} 是否成功取消
     */
    const cancelTask = (taskId) => {
        // 检查是否在队列中
        const index = queue.findIndex(task => task.id === taskId);
        if (index !== -1) {
            const task = queue[index];
            queue.splice(index, 1);
            task.reject(new Error('Task cancelled'));
            return true;
        }
        
        // 检查是否正在运行
        if (cancelFunctions.has(taskId)) {
            const cancelFn = cancelFunctions.get(taskId);
            cancelFn();
            cancelFunctions.delete(taskId);
            return true;
        }
        
        return false;
    };
    
    /**
     * 清空任务队列
     */
    const clearQueue = () => {
        const error = new Error('Task queue cleared');
        
        // 取消所有运行中的任务
        for (const cancelFn of cancelFunctions.values()) {
            cancelFn();
        }
        cancelFunctions.clear();
        
        // 拒绝所有等待中的任务
        queue.forEach(taskData => taskData.reject(error));
        queue.length = 0;
        
        // 重置状态
        running = 0;
        isProcessing = false;
    };
    
    /**
     * 销毁队列
     */
    const destroy = () => {
        if (isDestroyed) return;
        
        clearQueue();
        isDestroyed = true;
    };
    
    /**
     * 获取队列状态
     * @returns {Object} 队列状态
     */
    const getStatus = () => ({
        queueLength: queue.length,
        runningTasks: running,
        isProcessing,
        isDestroyed
    });
    
    /**
     * 暂停队列
     */
    const pause = () => {
        isProcessing = false;
    };
    
    /**
     * 恢复队列
     */
    const resume = () => {
        if (!isProcessing && !isDestroyed && queue.length > 0) {
            setTimeout(processQueue, 0);
        }
    };
    
    return {
        addTask,
        cancelTask,
        clearQueue,
        destroy,
        pause,
        resume,
        getStatus
    };
} 