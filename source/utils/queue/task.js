import { IEventEmitterSimple } from "../events/emitter.js";
import { MinHeap } from "../array/minHeap.js";
export class 串行任务控制器 extends IEventEmitterSimple {
    constructor(options={
        destroyOnComplete : false
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
            const result = await this.currentTask();
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
            this.currentTask = null;
            this.isProcessing = false;

            // 直接调用下一个任务，而不是使用 setImmediate
            this.processNext();
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