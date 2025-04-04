/**
 * 任务队列控制器模块
 * 
 * 提供串行任务队列的管理和控制功能，支持任务的添加、执行、暂停、恢复等操作。
 * 任务按优先级执行，支持空闲回调执行模式。
 */

import { createEventBus } from '../../forEvent/useEventBus.js';

/**
 * 最小堆实现，用于优先级队列
 */
class MinHeap {
    constructor(compareFunction) {
        this.heap = [];
        this.compareFunction = compareFunction || ((a, b) => a - b);
    }

    push(item) {
        this.heap.push(item);
        this._siftUp(this.heap.length - 1);
        return this.heap.length;
    }

    pop() {
        if (this.isEmpty()) return null;
        const top = this.heap[0];
        const bottom = this.heap.pop();
        if (this.heap.length > 0) {
            this.heap[0] = bottom;
            this._siftDown(0);
        }
        return top;
    }

    peek() {
        return this.isEmpty() ? null : this.heap[0];
    }

    isEmpty() {
        return this.heap.length === 0;
    }

    size() {
        return this.heap.length;
    }

    toArray() {
        return [...this.heap];
    }

    _siftUp(index) {
        const item = this.heap[index];
        while (index > 0) {
            const parentIndex = Math.floor((index - 1) / 2);
            const parent = this.heap[parentIndex];
            if (this.compareFunction(item, parent) >= 0) break;
            this.heap[index] = parent;
            index = parentIndex;
        }
        this.heap[index] = item;
    }

    _siftDown(index) {
        const item = this.heap[index];
        const length = this.heap.length;
        const halfLength = length >>> 1;
        
        while (index < halfLength) {
            let leftIndex = (index << 1) + 1;
            const rightIndex = leftIndex + 1;
            let best = this.heap[leftIndex];
            
            if (rightIndex < length && this.compareFunction(this.heap[rightIndex], best) < 0) {
                leftIndex = rightIndex;
                best = this.heap[rightIndex];
            }
            
            if (this.compareFunction(best, item) >= 0) break;
            
            this.heap[index] = best;
            index = leftIndex;
        }
        
        this.heap[index] = item;
    }
}

/**
 * 串行任务控制器类
 * 提供任务队列管理的功能，支持添加、执行、暂停、恢复和销毁任务
 */
export class 串行任务控制器 {
    /**
     * 创建一个串行任务控制器实例
     * @param {Object} options 配置选项
     * @param {boolean} [options.destroyOnComplete=false] 完成所有任务后是否自动销毁
     * @param {boolean} [options.useIdleCallback=false] 是否使用空闲回调执行任务
     */
    constructor(options = {
        destroyOnComplete: false,
        useIdleCallback: false
    }) {
        this.eventBus = createEventBus();
        this.taskQueue = new MinHeap(this.compareTasks);
        this.isPaused = false;
        this.totalTasks = 0;
        this.currentTask = null;
        this.isProcessing = false;
        this.completedTasks = 0;
        this.destroyOnComplete = options.destroyOnComplete;
        this.options = options;
        this.supportIdle = typeof requestIdleCallback === 'function';
        this.useIdleCallback = options.useIdleCallback;
        this.idleCallbackId = null;
    }

    /**
     * 比较两个任务的优先级
     * @param {Object} a 任务A
     * @param {Object} b 任务B
     * @returns {number} 比较结果
     * @private
     */
    compareTasks(a, b) {
        const priorityA = a.priority !== undefined ? a.priority : Infinity;
        const priorityB = b.priority !== undefined ? b.priority : Infinity;
        if ((priorityA >= 0 && priorityB < 0) || (priorityA < 0 && priorityB >= 0)) {
            return priorityB - priorityA;
        }
        return priorityA - priorityB;
    }

    /**
     * 添加任务到队列
     * @param {Function} task 任务函数
     * @param {number} [priority=0] 任务优先级
     */
    addTask(task, priority = 0) {
        // 暂停当前的处理
        const wasPaused = this.isPaused;
        this.pause();
    
        task.priority = priority;
        this.taskQueue.push(task);
        this.totalTasks++;
        this.eventBus.emit('taskAdded', { totalTasks: this.totalTasks });
    
        // 如果之前没有暂停，则恢复处理
        if (!wasPaused) {
            this.resume();
        }
    }

    /**
     * 处理下一个任务
     * @returns {Promise<void>}
     * @private
     */
    async processNext() {
        if (this.isPaused || this.isProcessing) {
            return;
        }

        if (this.taskQueue.isEmpty()) {
            if (this.completedTasks > 0) {
                this.eventBus.emit('allTasksCompleted');
                if (this.destroyOnComplete) {
                    this.destroy();
                }
            }
            return;
        }

        this.isProcessing = true;
        try {
            this.currentTask = this.taskQueue.pop();
            
            // 任务执行逻辑
            const executeTask = () => {
                return new Promise((resolve) => {
                    const runner = async (deadline) => {
                        const result = await this.currentTask();
                        resolve(result);
                    };

                    if (this.useIdleCallback && this.supportIdle) {
                        this.idleCallbackId = requestIdleCallback(runner, { timeout: 1000 });
                    } else {
                        runner({ timeRemaining: () => Infinity });
                    }
                });
            };

            const result = await executeTask();
            this.completedTasks++;
            this.eventBus.emit('taskCompleted', {
                completedTasks: this.completedTasks,
                totalTasks: this.totalTasks,
                result: result
            });
        } catch (error) {
            console.error('任务执行出错:', error);
            this.eventBus.emit('taskError', { error, task: this.currentTask });
        } finally {
            // 取消未执行的空闲回调
            if (this.idleCallbackId && this.supportIdle) {
                cancelIdleCallback(this.idleCallbackId);
            }
            this.currentTask = null;
            this.isProcessing = false;

            // 根据配置选择执行方式
            if (this.useIdleCallback && this.supportIdle) {
                this.idleCallbackId = requestIdleCallback(() => this.processNext());
            } else {
                this.processNext();
            }
        }
    }

    /**
     * 清空任务队列
     */
    clear() {
        this.taskQueue = new MinHeap(this.compareTasks);
        this.totalTasks = 0;
        this.completedTasks = 0;
        this.currentTask = null;
        this.eventBus.emit('queueCleared');
        this.isProcessing = false;
    }

    /**
     * 开始处理任务
     */
    start() {
        this.isPaused = false;
        this.processNext();
    }

    /**
     * 暂停任务处理
     */
    pause() {
        this.isPaused = true;
        this.eventBus.emit('paused');
    }

    /**
     * 恢复任务处理
     */
    resume() {
        if (this.isPaused) {
            this.isPaused = false;
            this.eventBus.emit('resumed');
            this.processNext();
        }
    }

    /**
     * 销毁任务控制器
     */
    destroy() {
        // 取消空闲回调
        if (this.idleCallbackId && this.supportIdle) {
            cancelIdleCallback(this.idleCallbackId);
        }
        // 清理任务队列
        this.clear();
        // 触发销毁事件
        this.eventBus.emit('destroy');
        
        // 清理所有事件监听器
        if (typeof this.eventBus.removeAllListeners === 'function') {
            // 如果支持 removeAllListeners 方法，直接使用
            this.eventBus.removeAllListeners();
        } else {
            // 否则，使用预定义的事件列表逐个清理
            const events = [
                'taskAdded', 'taskCompleted', 'taskError', 
                'paused', 'resumed', 'queueCleared', 
                'destroy', 'allTasksCompleted'
            ];
            
            for (const event of events) {
                if (typeof this.eventBus.off === 'function') {
                    try {
                        // 使用 removeAllListeners 变体（如果有）
                        if (typeof this.eventBus.removeAllListeners === 'function') {
                            this.eventBus.removeAllListeners(event);
                        } else {
                            // 避免直接调用无参数的 off 方法
                            this.eventBus.eventNames?.().forEach(name => {
                                if (name === event) {
                                    this.eventBus.removeAllListeners?.(name);
                                }
                            });
                        }
                    } catch (error) {
                        console.error(`清理事件 ${event} 监听器时出错:`, error);
                    }
                }
            }
        }
    }

    /**
     * 获取任务完成进度百分比
     * @returns {number} 进度百分比
     */
    getProgress() {
        if (this.totalTasks === 0) return 0;
        return (this.completedTasks / this.totalTasks) * 100;
    }

    /**
     * 获取当前正在执行的任务
     * @returns {Function|null} 当前任务
     */
    getCurrentTask() {
        return this.currentTask;
    }

    /**
     * 获取队列中任务数量
     * @returns {number} 队列长度
     */
    getQueueLength() {
        return this.taskQueue.size();
    }

    /**
     * 获取队列中所有待处理任务
     * @returns {Array} 任务数组
     */
    getPendingTasks() {
        return this.taskQueue.toArray();
    }

    /**
     * 注册事件监听器
     * @param {string} event 事件名称
     * @param {Function} callback 回调函数
     */
    on(event, callback) {
        this.eventBus.on(event, callback);
    }

    /**
     * 移除事件监听器
     * @param {string} event 事件名称
     * @param {Function} [callback] 回调函数，如不提供则移除该事件所有监听器
     */
    off(event, callback) {
        if (callback) {
            this.eventBus.off(event, callback);
        } else {
            this.eventBus.off(event);
        }
    }
}

// 英文别名
export const SerialTaskController = 串行任务控制器; 