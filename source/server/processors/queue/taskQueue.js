import { MinHeap } from '../../../utils/useEcma/useArray/minHeap.js'
import { reportHeartbeat } from '../../../../src/toolBox/base/useElectron/useHeartBeat.js'

// 常量配置
const CONFIG = {
    MAX_TASKS: 1000000,
    MIN_TIMEOUT: 10,
    MAX_TIMEOUT: 10000,
    LOG_INTERVAL: 1000
}

// 优先级比较器
const priorityComparators = {
    mainQueue: (a, b) => {
        const priorityA = a.priority ?? Infinity;
        const priorityB = b.priority ?? Infinity;
        
        if ((priorityA >= 0 && priorityB < 0) || (priorityA < 0 && priorityB >= 0)) {
            return priorityB - priorityA; // 非负数优先
        }
        return priorityA - priorityB;
    },
    
    auxiliaryQueue: (a, b) => {
        const priorityA = a.priority ?? Infinity;
        const priorityB = b.priority ?? Infinity;
        
        if ((priorityA >= 0 && priorityB < 0) || (priorityA < 0 && priorityB >= 0)) {
            return priorityA - priorityB; // 负数优先
        }
        return priorityB - priorityA;
    }
}

// TaskQueue 类
class TaskQueue extends MinHeap {
    constructor() {
        super(priorityComparators.mainQueue);
        this.auxiliaryHeap = new MinHeap(priorityComparators.auxiliaryQueue);
        this.paused = false;
        this.started = false;
        this.isProcessing = false;
        this.stats = {
            index: 0,
            timeout: 0,
            lastTimeout: 0,
            logs: []
        };
        this.processNext = this.processNext.bind(this);
        this.start = this.start.bind(this);
        this.handleEmptyQueue = this.handleEmptyQueue.bind(this);
        this.executeTask = this.executeTask.bind(this);
        this.updateTimeout = this.updateTimeout.bind(this);
        this.logProgress = this.logProgress.bind(this);
        this.push = this.push.bind(this);
        this.pause = this.pause.bind(this);
        this.priority = this.priority.bind(this);
        
        // 定义ended方法
        this.ended = () => this.size() === 0;

    }

    // 任务管理方法
    push(task) {
        if (typeof task !== 'function') {
            throw new Error('任务必须是一个函数，并且返回一个Promise');
        }

        MinHeap.prototype.添加.call(this, task);
        this.auxiliaryHeap.添加(task);
        
        if (this.size() >= CONFIG.MAX_TASKS) {
            const lowestPriorityTask = this.auxiliaryHeap.pop();
            if (lowestPriorityTask) {
                lowestPriorityTask.$canceled = true;
            }
        }
    }

    priority(fn, num) {
        fn.priority = num;
        return fn;
    }

    // 队列控制方法
    pause() {
        this.paused = true;
    }

    async executeTask(task) {
        if (task.$canceled) {
            return {};
        }
        
        const start = performance.now();
        try {
            const result = await task();
            this.updateTimeout(performance.now() - start);
            return result;
        } catch (error) {
            console.error(error);
            this.stats.timeout = Math.min(this.stats.timeout * 2, CONFIG.MAX_TIMEOUT);
            throw error;
        }
    }

    updateTimeout(executionTime) {
        this.stats.timeout = Math.max(
            this.stats.timeout / 10,
            executionTime,
            (this.stats.lastTimeout / 10 || 0)
        );
    }

    logProgress(stat = null) {
        if (this.stats.index % CONFIG.LOG_INTERVAL === 0 || this.size() < 100) {
            console.log('processNext', this.stats.index, this.size(), this.stats.timeout);
            if (this.stats.logs.length) {
                console.log(this.stats.logs.join(','));
                this.stats.logs = [];
            }
        }
        
        if (stat) {
            const logEntry = ['processFile', stat.path, this.stats.index, this.size()];
            if (stat.error) {
                logEntry.unshift('processFileError');
                logEntry.push(stat.error);
            }
            this.stats.logs.push(logEntry.join(','));
        }
    }

    // 核心处理逻辑
    processNext($timeout = 0, force = false) {
        // 使用箭头函数绑定this
        const scheduleNext = (timeout) => {
            setTimeout(() => this.processNext(), timeout);
        };

        reportHeartbeat();
        
        if ($timeout) {
            this.stats.timeout = $timeout;
        }
        if ($timeout === 0) {
            this.stats.lastTimeout = this.stats.timeout || this.stats.lastTimeout;
            this.stats.timeout = 0;
        }
        if (force) {
            this.paused = false;
        }

        if (this.isProcessing) {
            scheduleNext(this.stats.timeout);
            return;
        }

        this.isProcessing = true;

        if (this.peek() && !this.paused) {
            this.stats.index++;
            this.logProgress();
            
            const task = this.pop();
            this.executeTask(task)
                .then(stat => {
                    this.logProgress(stat);
                    scheduleNext(this.stats.timeout);
                })
                .catch(() => {
                    scheduleNext(this.stats.timeout);
                });
                
            this.stats.timeout = Math.max(this.stats.timeout / 10, CONFIG.MIN_TIMEOUT);
            this.isProcessing = false;
        } else {
            this.handleEmptyQueue();
        }
    }

    handleEmptyQueue() {
        if (!this.ended()) {
            this.logProgress();
            this.stats.timeout = Math.min(
                Math.max(this.stats.timeout * 2, this.stats.timeout + 100),
                CONFIG.MAX_TIMEOUT
            );
            setTimeout(() => this.processNext(), this.stats.timeout);
        }
        this.isProcessing = false;
    }

    start($timeout = 0, force = false) {
        console.log('恢复后台任务', "执行间隔:" + $timeout, force ? "强制开始:" : '');
        if (this.started) {
            // 使用箭头函数绑定this
            setTimeout(() => this.processNext($timeout, force), 0);
            return;
        }
        this.ended = () => this.size() === 0;
        // 使用箭头函数绑定this
        setTimeout(() => this.processNext($timeout, force), 0);
        this.started = true;
    }
}

// 创建全局单例
const globalTaskQueue = new TaskQueue();
globalThis[Symbol.for('taskQueue')] = globalThis[Symbol.for('taskQueue')] || globalTaskQueue;

// 导出公共API
export { globalTaskQueue };
export const 暂停文件系统解析队列 = () => globalTaskQueue.pause();
export const 恢复文件系统解析队列 = () => {
    globalTaskQueue.paused = false;
    globalTaskQueue.start();
};
export const 添加文件系统解析任务 = (task) => globalTaskQueue.push(task);
/**
 * 创建优先级任务
 * @param {Function} taskFn 要执行的任务函数
 * @param {number} priority 优先级值
 * @returns {Object} 任务对象
 */
export const 添加优先级任务 = (taskFn, priority) => {
    globalTaskQueue.push(
        globalTaskQueue.priority(
            async () => {
                const result = await taskFn();
                return result || {};
            },
            priority
        )
    )
}

/**
 * 临时实现,以负数优先级实现后进先出,之后需要更加准确的优先级计算逻辑
 */
export const 添加后进先出后台任务=(任务函数)=>{
    const 负数时间优先级 = 0-Date.now()
    添加优先级任务(任务函数,负数时间优先级)
}