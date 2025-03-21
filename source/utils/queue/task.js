import { IEventEmitterSimple } from "../events/emitter.js";
import { MinHeap } from "../useEcma/useArray/minHeap.js";
export class 串行任务控制器 extends IEventEmitterSimple {
    constructor(options={
        destroyOnComplete : false,
        useIdleCallback: false
    }) {
        super()
        this.taskQueue = new MinHeap(this.compareTasks);
        this.isPaused = false;
        this.totalTasks = 0;
        this.currentTask = null;
        this.isProcessing = false;
        this.completedTasks = 0;
        this.destroyOnComplete =options.destroyOnComplete;
        this.options=options
        this.eventListeners = {
            taskAdded: [],
            taskCompleted: [],
            allTasksCompleted: [],
            destroy: []  // 添加这一行
        };
        this.supportIdle = typeof requestIdleCallback === 'function';
        this.useIdleCallback = options.useIdleCallback;
        this.idleCallbackId = null;
    }
    compareTasks(a, b) {
        const priorityA = a.priority !== undefined ? a.priority : Infinity;
        const priorityB = b.priority !== undefined ? b.priority : Infinity;
        if ((priorityA >= 0 && priorityB < 0) || (priorityA < 0 && priorityB >= 0)) {
            return priorityB - priorityA;
        }
        return priorityA - priorityB;
    }
    addTask(task, priority = 0) {
        // 暂停当前的处理
        const wasPaused = this.isPaused;
        this.pause();
    
        task.priority = priority;
        this.taskQueue.push(task);
        this.totalTasks++;
        this.emit('taskAdded', { totalTasks: this.totalTasks });
    
        // 如果之前没有暂停，则恢复处理
        if (!wasPaused) {
            this.resume();
        }
    }
    async processNext() {
        if (this.isPaused || this.isProcessing) {
            return;
        }

        if (this.taskQueue.isEmpty()) {
            if (this.completedTasks > 0) {
                console.log('所有任务已完成');
                this.emit('allTasksCompleted');
                if (this.destroyOnComplete) {
                    this.destroy();
                }
            }
            return;
        }


        this.isProcessing = true;
        try {
            this.currentTask = this.taskQueue.pop();
            
            // 新增空闲回调执行逻辑
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
            this.emit('taskCompleted', {
                completedTasks: this.completedTasks,
                totalTasks: this.totalTasks,
                result: result
            });
        } catch (error) {
            console.error('任务执行出错:', error);
            this.emit('taskError', { error, task: this.currentTask });
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
    clear() {
        this.taskQueue = new MinHeap(this.compareTasks);
        this.totalTasks = 0;
        this.completedTasks = 0;
        this.currentTask = null;
        this.emit('queueCleared');
        this.isProcessing = false;
    }
    start() {
        this.isPaused = false;
        this.processNext();
    }
    pause() {
        this.isPaused = true;
    }
    resume() {
        if (this.isPaused) {
            this.start();
        }
    }
    destroy() {
        // 新增空闲回调取消逻辑
        if (this.idleCallbackId && this.supportIdle) {
            cancelIdleCallback(this.idleCallbackId);
        }
        // 清理任务队列
        this.clear();
        // 触发 destroy 事件
        this.emit('destroy');
        // 移除所有事件监听器
        this.removeAllListeners();
        console.log('串行任务控制器已销毁');
    }

    getProgress() {
        if (this.totalTasks === 0) return 0;
        return (this.completedTasks / this.totalTasks) * 100;
    }
    getCurrentTask() {
        return this.currentTask;
    }

    getQueueLength() {
        return this.taskQueue.size();
    }
    getPendingTasks() {
        return this.taskQueue.toArray();
    }
}