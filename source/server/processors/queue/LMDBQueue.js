const { open } = require('lmdb');
import { reportHeartbeat } from '../../utils/heartBeat';
const os = require('os');
const crypto = require('crypto');
import { setTimeout as sleep } from 'timers/promises';
import { EventEmitter } from 'events';

export const RINGS = {
    SYSTEM: 'system',
    HIGH: 'high',
    NORMAL: 'normal',
    LOW: 'low',
    BACKGROUND: 'background'
};

export const RING_ORDER = [
    RINGS.SYSTEM,
    RINGS.HIGH,
    RINGS.NORMAL,
    RINGS.LOW,
    RINGS.BACKGROUND
];

export const CONFIG = {
    DB_PATH: './data/taskQueue',
    MIN_TIMEOUT: 1,       // 最小执行间隔(ms)
    MAX_TIMEOUT: 1000,    // 最大执行间隔(ms)
    CLEANUP_INTERVAL: 60 * 1000,  // 清理间隔(ms)
    MAX_TASK_AGE: 24 * 60 * 60 * 1000,  // 任务最大存活时间(ms)
    MAP_SIZE: 256 * 1024 * 1024,  // LMDB映射大小(256MB)
    PROCESS_TIMEOUT: 5 * 60 * 1000,
    HEARTBEAT_INTERVAL: 30 * 1000,
    DEVICE_FINGERPRINT: getDeviceFingerprint()
};

// 获取设备指纹
function getDeviceFingerprint() {
    const networkInterfaces = os.networkInterfaces();
    const macAddresses = Object.values(networkInterfaces)
        .flat()
        .filter(iface => !iface.internal && iface.mac !== '00:00:00:00:00:00')
        .map(iface => iface.mac)
        .join(',');
    return crypto.createHash('md5').update(macAddresses).digest('hex');
}

class DistributedLock {
    constructor(db) {
        this.lockStore = db.openDB({
            name: 'distributed_locks',
            compression: true
        });
        this.ownedLocks = new Map(); // 改用 Map 存储锁的详细信息
        this._closed = false;
    }

    async acquire(resource, options = {}) {
        if (this._closed) {
            throw new Error('锁管理器已关闭');
        }

        const {
            timeout = 5000,
            ttl = 10000,
            retry = {
                times: 50,
                interval: 100
            }
        } = options;

        // 支持锁重入
        if (this.ownedLocks.has(resource)) {
            const lockInfo = this.ownedLocks.get(resource);
            if (lockInfo.owner.pid === process.pid) {
                lockInfo.reentrantCount++;
                return lockInfo.id;
            }
        }

        const lockId = `${CONFIG.DEVICE_FINGERPRINT}:${process.pid}:${Date.now()}`;
        const deadline = Date.now() + timeout;
        let attempts = 0;
        let lastError = null;

        while (Date.now() < deadline && attempts < retry.times) {
            const txn = this.lockStore.db.beginTxn();
            try {
                const existingLock = await txn.get(this.lockStore.dbi, resource);

                if (!existingLock || this.isLockExpired(existingLock)) {
                    if (existingLock && this.isLockExpired(existingLock)) {
                        // 清理过期锁
                        await this._cleanupExpiredLock(existingLock, txn);
                    }

                    const lockData = {
                        id: lockId,
                        resource,
                        acquiredAt: Date.now(),
                        expiresAt: Date.now() + ttl,
                        owner: {
                            device: CONFIG.DEVICE_FINGERPRINT,
                            pid: process.pid,
                            hostname: os.hostname()
                        },
                        reentrantCount: 1
                    };

                    await txn.put(this.lockStore.dbi, resource, lockData);
                    await txn.commit();
                    
                    this.ownedLocks.set(resource, lockData);
                    this._setupAutoRenewal(resource, ttl);
                    
                    return lockId;
                }

                // 检查是否是死锁
                if (this._isDeadLock(existingLock)) {
                    await this._handleDeadLock(resource, existingLock, txn);
                    continue;
                }

                txn.abort();
                attempts++;
                await sleep(retry.interval);
            } catch (error) {
                txn.abort();
                lastError = error;
                console.error(`获取锁失败 [${resource}]:`, error);
                attempts++;
                await sleep(retry.interval);
            }
        }

        throw new LockAcquisitionError(
            `获取锁超时 [${resource}], 已重试 ${attempts} 次`,
            { resource, attempts, lastError }
        );
    }

    async release(resource, lockId) {
        if (this._closed) {
            return false;
        }

        const lockInfo = this.ownedLocks.get(resource);
        if (!lockInfo || lockInfo.id !== lockId) {
            return false;
        }

        // 处理重入锁的释放
        if (lockInfo.reentrantCount > 1) {
            lockInfo.reentrantCount--;
            return true;
        }

        const txn = this.lockStore.db.beginTxn();
        try {
            const currentLock = await txn.get(this.lockStore.dbi, resource);
            
            if (currentLock && currentLock.id === lockId) {
                await txn.del(this.lockStore.dbi, resource);
                await txn.commit();
                this.ownedLocks.delete(resource);
                this._clearAutoRenewal(resource);
                return true;
            }
            
            txn.abort();
            return false;
        } catch (error) {
            txn.abort();
            console.error(`释放锁失败 [${resource}]:`, error);
            throw error;
        }
    }

    // 新增：锁自动续期
    _setupAutoRenewal(resource, ttl) {
        const renewalInterval = Math.max(ttl / 3, 1000); // 至少每秒续期一次
        const timer = setInterval(async () => {
            try {
                if (!this.ownedLocks.has(resource)) {
                    this._clearAutoRenewal(resource);
                    return;
                }

                const txn = this.lockStore.db.beginTxn();
                try {
                    const lock = await txn.get(this.lockStore.dbi, resource);
                    if (lock && lock.id === this.ownedLocks.get(resource).id) {
                        lock.expiresAt = Date.now() + ttl;
                        await txn.put(this.lockStore.dbi, resource, lock);
                        await txn.commit();
                    } else {
                        txn.abort();
                        this._clearAutoRenewal(resource);
                    }
                } catch (error) {
                    txn.abort();
                    console.error(`续期锁失败 [${resource}]:`, error);
                }
            } catch (error) {
                console.error(`锁续期过程出错 [${resource}]:`, error);
            }
        }, renewalInterval);

        this.ownedLocks.get(resource).renewalTimer = timer;
    }

    _clearAutoRenewal(resource) {
        const lockInfo = this.ownedLocks.get(resource);
        if (lockInfo?.renewalTimer) {
            clearInterval(lockInfo.renewalTimer);
            delete lockInfo.renewalTimer;
        }
    }

    async _cleanupExpiredLock(existingLock, txn) {
        try {
            await txn.del(this.lockStore.dbi, existingLock.resource);
        } catch (error) {
            console.error(`清理过期锁失败 [${existingLock.resource}]:`, error);
        }
    }

    _isDeadLock(lock) {
        return lock && 
               Date.now() - lock.acquiredAt > 30000 && // 锁持有超过30秒
               !this.isLockExpired(lock);
    }

    async _handleDeadLock(resource, existingLock, txn) {
        console.warn(`检测到潜在的死锁 [${resource}]:`, existingLock);
        try {
            await txn.del(this.lockStore.dbi, resource);
            await txn.commit();
        } catch (error) {
            console.error(`处理死锁失败 [${resource}]:`, error);
            txn.abort();
        }
    }

    async close() {
        if (this._closed) return;

        this._closed = true;
        const releasePromises = Array.from(this.ownedLocks.entries()).map(
            async ([resource, lockInfo]) => {
                try {
                    await this.release(resource, lockInfo.id);
                } catch (error) {
                    console.error(`关闭时释放锁失败 [${resource}]:`, error);
                }
            }
        );

        await Promise.allSettled(releasePromises);
    }
}

export class TaskQueueStore {
    constructor() {
        this.db = open({
            path: CONFIG.DB_PATH,
            mapSize: CONFIG.MAP_SIZE,
            maxDbs: 6,
            compression: true
        });

        // 为每个ring创建独立的优先级队列存储
        this.ringStores = new Map(
            RING_ORDER.map(ring => [
                ring,
                this.db.openDB({
                    name: `ring_${ring}`,
                    ordered: true
                })
            ])
        );

        // 任务注册表
        this.taskRegistry = this.db.openDB({
            name: 'taskRegistry'
        });

        // 进程注册表现在包含设备信息
        this.processRegistry = this.db.openDB({
            name: 'processRegistry'
        });

        this.lock = new DistributedLock(this.db);
        
        // 定期清理过期的锁
        setInterval(() => {
            this.lock.cleanup().catch(error => {
                console.error('清理过期锁时出错:', error);
            });
        }, CONFIG.CLEANUP_INTERVAL);

        this._closed = false;
        this._closePromise = null;
    }

    /**
     * 生成进程唯一标识符
     */
    getProcessIdentifier(pid = process.pid) {
        return `${CONFIG.DEVICE_FINGERPRINT}:${pid}`;
    }

    /**
     * 更新进程心跳
     */
    async updateProcessHeartbeat() {
        const processId = this.getProcessIdentifier();
        await this.processRegistry.put(processId, {
            lastHeartbeat: Date.now(),
            pid: process.pid,
            deviceFingerprint: CONFIG.DEVICE_FINGERPRINT,
            hostname: os.hostname()  // 添加主机名以便调试
        });
    }

    /**
     * 获取死亡进程列表
     */
    async getDeadProcesses() {
        const deadProcesses = [];
        const now = Date.now();

        for await (const { key, value } of this.processRegistry.getRange()) {
            if (now - value.lastHeartbeat > CONFIG.PROCESS_TIMEOUT) {
                deadProcesses.push({
                    processId: key,
                    deviceFingerprint: value.deviceFingerprint,
                    pid: value.pid
                });
            }
        }
        return deadProcesses;
    }

    /**
     * 注册任务
     */
    async registerTask(taskId, taskInfo) {
        await this.taskRegistry.put(taskId, {
            ...taskInfo,
            registeredBy: process.pid,
            registeredAt: Date.now()
        });
    }

    /**
     * 检查任务所有权
     */
    async isTaskOwner(taskId) {
        const taskInfo = await this.taskRegistry.get(taskId);
        return taskInfo?.registeredBy === process.pid;
    }

    /**
     * 添加任务到优先级队列
     */
    async pushTask(ringName, taskId, priority) {
        const lockKey = `ring:${ringName}:push`;
        let lockId;

        try {
            lockId = await this.lock.acquire(lockKey, {
                timeout: 3000,
                ttl: 5000
            });

            const store = this.ringStores.get(ringName);
            if (!store) throw new Error(`未知的ring: ${ringName}`);

            const key = `${priority.toString().padStart(20, '0')}_${taskId}`;
            const txn = this.db.beginTxn();
            
            try {
                await txn.put(store.dbi, key, { taskId, priority });
                await txn.commit();
            } catch (error) {
                txn.abort();
                throw error;
            }
        } finally {
            if (lockId) {
                await this.lock.release(lockKey, lockId);
            }
        }
    }

    /**
     * 获取最高优先级任务
     */
    async popTask(ringName) {
        const lockKey = `ring:${ringName}`;
        let lockId;
        
        try {
            // 获取锁，设置较短的超时时间以避免任务堆积
            lockId = await this.lock.acquire(lockKey, {
                timeout: 3000,
                ttl: 5000
            });

            const store = this.ringStores.get(ringName);
            if (!store) throw new Error(`未知的ring: ${ringName}`);

            const txn = this.db.beginTxn();
            try {
                const cursor = await txn.openCursor(store.dbi);
                const entry = await cursor.goToLast();

                if (entry) {
                    const { value } = entry;
                    await txn.del(store.dbi, entry.key);
                    await txn.commit();
                    return value.taskId;
                }

                txn.abort();
                return null;
            } catch (error) {
                txn.abort();
                throw error;
            }
        } finally {
            if (lockId) {
                await this.lock.release(lockKey, lockId);
            }
        }
    }

    /**
     * 检查ring是否为空
     */
    async isRingEmpty(ringName) {
        const store = this.ringStores.get(ringName);
        if (!store) throw new Error(`未知的ring: ${ringName}`);

        const cursor = store.getRange();
        const first = await cursor.next();
        return !first;
    }

    /**
     * 清理过期任务
     */
    async cleanup() {
        const now = Date.now();
        const expired = [];
        const deadProcesses = await this.getDeadProcesses();
        const currentProcessId = this.getProcessIdentifier();

        // 收集过期任务
        for await (const { key, value } of this.taskRegistry.getRange()) {
            const shouldClean = 
                // 清理自己的过期任务
                (value.registeredBy === currentProcessId && 
                 now - value.registeredAt > CONFIG.MAX_TASK_AGE) ||
                // 清理死亡进程的任务
                deadProcesses.some(dp => dp.processId === value.registeredBy);

            if (shouldClean) {
                expired.push({
                    key,
                    ringName: value.ringName,
                    registeredBy: value.registeredBy
                });
            }
        }

        // 批量删除任务
        if (expired.length > 0) {
            console.log(`清理 ${expired.length} 个过期任务`);
            const txn = this.db.beginTxn();
            try {
                for (const { key, ringName, registeredBy } of expired) {
                    const [deviceFingerprint] = registeredBy.split(':');
                    console.log(`清理任务: ${key}, 来自设备: ${deviceFingerprint}`);
                    
                    await txn.del(this.taskRegistry.dbi, key);
                    const store = this.ringStores.get(ringName);
                    if (store) {
                        for await (const entry of store.getRange()) {
                            if (entry.value.taskId === key) {
                                await txn.del(store.dbi, entry.key);
                                break;
                            }
                        }
                    }
                }
                await txn.commit();
            } catch (error) {
                txn.abort();
                console.error('清理任务时出错:', error);
                throw error;
            }
        }

        // 清理死亡进程的注册信息
        if (deadProcesses.length > 0) {
            console.log(`清理 ${deadProcesses.length} 个死亡进程记录`);
            const txn = this.db.beginTxn();
            try {
                for (const { processId, deviceFingerprint } of deadProcesses) {
                    console.log(`清理进程: ${processId}, 来自设备: ${deviceFingerprint}`);
                    await txn.del(this.processRegistry.dbi, processId);
                }
                await txn.commit();
            } catch (error) {
                txn.abort();
                console.error('清理进程记录时出错:', error);
                throw error;
            }
        }
    }

    /**
     * 添加任务时使用新的进程标识符
     */
    async addTask(ringName, task, priority) {
        const taskId = crypto.randomUUID();
        await this.taskRegistry.put(taskId, {
            ringName,
            registeredAt: Date.now(),
            registeredBy: this.getProcessIdentifier(),
            priority
        });
        // ... rest of the code ...
    }

    async close() {
        if (this._closed || this._closePromise) {
            return this._closePromise;
        }

        this._closePromise = (async () => {
            console.log('开始关闭数据库连接...');
            
            try {
                // 关闭所有数据库实例
                for (const [name, store] of this.ringStores) {
                    await store.close();
                    console.log(`关闭 ring store: ${name}`);
                }

                await this.taskRegistry.close();
                console.log('关闭任务注册表');

                await this.processRegistry.close();
                console.log('关闭进程注册表');

                await this.lock.close();
                console.log('关闭分布式锁存储');

                await this.db.close();
                console.log('关闭主数据库连接');

                this._closed = true;
                console.log('所有数据库连接已关闭');
            } catch (error) {
                console.error('关闭数据库连接时发生错误:', error);
                throw error;
            }
        })();

        return this._closePromise;
    }

    // 添加健康检查方法
    async healthCheck() {
        if (this._closed) {
            throw new Error('数据库连接已关闭');
        }

        try {
            // 验证所有存储是否可用
            for (const [name, store] of this.ringStores) {
                await store.db.check();
            }
            await this.taskRegistry.db.check();
            await this.processRegistry.db.check();
            return true;
        } catch (error) {
            console.error('数据库健康检查失败:', error);
            throw error;
        }
    }
}

export class TaskQueueError extends Error {
    constructor(message, code, details = {}) {
        super(message);
        this.name = 'TaskQueueError';
        this.code = code;
        this.details = details;
        this.timestamp = new Date();
    }
}

export class TaskExecutionError extends TaskQueueError {
    constructor(message, details = {}) {
        super(message, 'TASK_EXECUTION_ERROR', details);
        this.name = 'TaskExecutionError';
    }
}

export class LockAcquisitionError extends TaskQueueError {
    constructor(message, details = {}) {
        super(message, 'LOCK_ACQUISITION_ERROR', details);
        this.name = 'LockAcquisitionError';
    }
}

export class DatabaseError extends TaskQueueError {
    constructor(message, details = {}) {
        super(message, 'DATABASE_ERROR', details);
        this.name = 'DatabaseError';
    }
}

export class QueueMetrics extends EventEmitter {
    constructor() {
        super();
        this.metrics = {
            taskProcessed: 0,
            taskErrors: 0,
            taskRetries: 0,
            avgProcessingTime: 0,
            lockAcquisitions: 0,
            lockTimeouts: 0,
            currentQueueSize: 0,
            lastProcessedAt: null,
            errorCounts: new Map(),
            ringMetrics: new Map()
        };

        this.processingTimes = []; // 用于计算平均处理时间
        this._setupPeriodicMetricsReset();
    }

    recordTaskProcessed(ringName, processingTime) {
        this.metrics.taskProcessed++;
        this.metrics.lastProcessedAt = new Date();
        this.processingTimes.push(processingTime);
        
        // 更新平均处理时间
        this.metrics.avgProcessingTime = this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;
        
        // 更新ring特定指标
        this._updateRingMetrics(ringName, 'processed');
        
        this.emit('taskProcessed', {
            ringName,
            processingTime,
            timestamp: this.metrics.lastProcessedAt
        });
    }

    recordTaskError(error, ringName) {
        this.metrics.taskErrors++;
        
        // 记录错误类型统计
        const errorType = error.name || 'UnknownError';
        this.metrics.errorCounts.set(
            errorType,
            (this.metrics.errorCounts.get(errorType) || 0) + 1
        );
        
        this._updateRingMetrics(ringName, 'errors');
        
        this.emit('taskError', {
            error,
            ringName,
            timestamp: new Date()
        });
    }

    recordTaskRetry(taskId, ringName, attempt) {
        this.metrics.taskRetries++;
        this._updateRingMetrics(ringName, 'retries');
        
        this.emit('taskRetry', {
            taskId,
            ringName,
            attempt,
            timestamp: new Date()
        });
    }

    recordLockOperation(operation, success) {
        if (operation === 'acquire') {
            if (success) {
                this.metrics.lockAcquisitions++;
            } else {
                this.metrics.lockTimeouts++;
            }
        }
        
        this.emit('lockOperation', {
            operation,
            success,
            timestamp: new Date()
        });
    }

    updateQueueSize(size, ringName) {
        this.metrics.currentQueueSize = size;
        this._updateRingMetrics(ringName, 'size', size);
        
        this.emit('queueSizeChanged', {
            size,
            ringName,
            timestamp: new Date()
        });
    }

    _updateRingMetrics(ringName, metricType, value) {
        if (!this.metrics.ringMetrics.has(ringName)) {
            this.metrics.ringMetrics.set(ringName, {
                processed: 0,
                errors: 0,
                retries: 0,
                size: 0
            });
        }
        
        const ringMetrics = this.metrics.ringMetrics.get(ringName);
        if (value !== undefined) {
            ringMetrics[metricType] = value;
        } else {
            ringMetrics[metricType]++;
        }
    }

    _setupPeriodicMetricsReset() {
        // 每小时重置处理时间数组，以避免内存持续增长
        setInterval(() => {
            this.processingTimes = this.processingTimes.slice(-1000); // 只保留最近1000个样本
        }, 60 * 60 * 1000);
    }

    getMetrics() {
        return {
            ...this.metrics,
            ringMetrics: Object.fromEntries(this.metrics.ringMetrics),
            errorCounts: Object.fromEntries(this.metrics.errorCounts)
        };
    }
}

export class TaskQueue {
    constructor() {
        this.store = new TaskQueueStore();
        this.taskMap = new Map();
        this.currentRingIndex = 0;
        this.paused = false;
        this.isProcessing = false;
        this.stats = {
            index: 0,
            timeout: CONFIG.MIN_TIMEOUT,
            lastTimeout: 0
        };

        // 启动任务清理器
        this.startTaskCleaner();

        this._shutdownPromise = null;
        this._shutdownTimeout = 30000; // 30秒关闭超时
        
        // 注册进程信号处理
        this._setupSignalHandlers();

        this.metrics = new QueueMetrics();
        this.retryPolicy = {
            maxAttempts: 3,
            delays: [1000, 5000, 15000], // 重试延迟时间（毫秒）
            backoff: 'exponential' // 可选: 'fixed', 'linear', 'exponential'
        };

        this.maxConcurrent = 10; // 最大并发任务数
        this.currentProcessingTasks = 0;
        this.processingTasks = new Map(); // 跟踪正在处理的任务
        
        // 任务超时配置
        this.timeoutConfig = {
            [RINGS.SYSTEM]: 30000,    // 系统任务 30 秒
            [RINGS.HIGH]: 60000,      // 高优先级 1 分钟
            [RINGS.NORMAL]: 300000,   // 普通优先级 5 分钟
            [RINGS.LOW]: 600000,      // 低优先级 10 分钟
            [RINGS.BACKGROUND]: 1800000 // 后台任务 30 分钟
        };
    }

    _setupSignalHandlers() {
        const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
        signals.forEach(signal => {
            process.once(signal, async () => {
                console.log(`收到 ${signal} 信号，开始优雅关闭...`);
                try {
                    await this.shutdown();
                    process.exit(0);
                } catch (error) {
                    console.error('关闭过程中发生错误:', error);
                    process.exit(1);
                }
            });
        });
    }

    async shutdown() {
        if (this._shutdownPromise) {
            return this._shutdownPromise;
        }

        this._shutdownPromise = (async () => {
            console.log('开始任务队列关闭流程...');
            
            // 1. 停止接受新任务
            this.pause();
            console.log('已暂停接受新任务');

            // 2. 等待当前任务完成
            const shutdownStart = Date.now();
            while (this.isProcessing) {
                if (Date.now() - shutdownStart > this._shutdownTimeout) {
                    console.warn('等待任务完成超时，强制关闭');
                    break;
                }
                await sleep(100);
            }

            // 3. 保存当前状态
            await this._saveState();

            // 4. 关闭数据库连接
            await this.store.close();

            // 5. 清理内存资源
            this.taskMap.clear();
            
            console.log('任务队列已完全关闭');
        })();

        return this._shutdownPromise;
    }

    async _saveState() {
        console.log('保存队列状态...');
        const state = {
            timestamp: Date.now(),
            currentRingIndex: this.currentRingIndex,
            stats: this.stats,
            remainingTasks: Array.from(this.taskMap.keys())
        };

        try {
            await this.store.taskRegistry.put('queue_state', state);
            console.log('队列状态已保存');
        } catch (error) {
            console.error('保存队列状态失败:', error);
            throw error;
        }
    }

    async _restoreState() {
        console.log('恢复队列状态...');
        try {
            const state = await this.store.taskRegistry.get('queue_state');
            if (state) {
                this.currentRingIndex = state.currentRingIndex;
                this.stats = state.stats;
                console.log('队列状态已恢复');
            }
        } catch (error) {
            console.error('恢复队列状态失败:', error);
            throw error;
        }
    }

    // 添加健康检查方法
    async healthCheck() {
        const status = {
            isHealthy: true,
            details: {
                isProcessing: this.isProcessing,
                currentRingIndex: this.currentRingIndex,
                taskCount: this.taskMap.size,
                isPaused: this.paused,
                lastProcessedAt: this.stats.lastProcessedAt
            }
        };

        try {
            await this.store.healthCheck();
        } catch (error) {
            status.isHealthy = false;
            status.details.error = error.message;
        }

        return status;
    }

    /**
     * 添加任务到指定ring
     */
    async ring(ringName, task, priority = 0) {
        if (typeof task !== 'function') {
            throw new Error('任务必须是一个函数');
        }

        // 生成任务ID
        const taskId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;

        // 保存到运行时映射
        this.taskMap.set(taskId, task);

        // 注册任务
        await this.store.registerTask(taskId, {
            ringName,
            priority,
            type: task.name || 'anonymous'
        });

        // 添加到优先级队列
        await this.store.pushTask(ringName, taskId, priority);

        // 检查是否需要中断当前执行
        if (this.shouldInterrupt(ringName)) {
            this.interrupt();
        }

        return taskId;
    }

    /**
     * 处理下一个任务
     */
    async processNext() {
        if (!this.isProcessing || this.paused || 
            this.currentProcessingTasks >= this.maxConcurrent) {
            return;
        }

        const startTime = performance.now();
        let taskInfo = null;

        try {
            const ringName = RING_ORDER[this.currentRingIndex];
            const taskId = await this.store.popTask(ringName);

            if (taskId) {
                const task = this.taskMap.get(taskId);
                if (task) {
                    taskInfo = {
                        id: taskId,
                        ring: ringName,
                        startTime,
                        attempts: 0
                    };
                    
                    this.currentProcessingTasks++;
                    this.processingTasks.set(taskId, taskInfo);

                    await this._executeTaskWithTimeout(task, taskInfo);
                    
                    this.taskMap.delete(taskId);
                    this.metrics.updateQueueSize(this.taskMap.size, ringName);
                }
            }

            const processingTime = performance.now() - startTime;
            this.updateTimeout(false, processingTime);

        } catch (error) {
            this.updateTimeout(true);
            if (taskInfo) {
                this.metrics.recordTaskError(error, taskInfo.ring);
            }
            console.error('任务处理错误:', error);
        } finally {
            if (taskInfo) {
                this.currentProcessingTasks--;
                this.processingTasks.delete(taskInfo.id);
            }
        }

        // 继续处理下一个任务
        if (!this.paused) {
            setTimeout(() => this.processNext(), this.stats.timeout);
        }
    }

    async _executeTaskWithTimeout(task, taskInfo) {
        const timeout = this.timeoutConfig[taskInfo.ring];
        const timeoutPromise = sleep(timeout).then(() => {
            throw new TaskExecutionError('任务执行超时', {
                taskId: taskInfo.id,
                ring: taskInfo.ring,
                timeout
            });
        });

        try {
            const result = await Promise.race([
                this._executeTaskWithRetry(task, taskInfo),
                timeoutPromise
            ]);

            const processingTime = performance.now() - taskInfo.startTime;
            this.metrics.recordTaskProcessed(taskInfo.ring, processingTime);

            return result;
        } catch (error) {
            if (error.message === '任务执行超时') {
                // 记录超时指标
                this.metrics.recordTaskTimeout(taskInfo.ring);
            }
            throw error;
        }
    }

    async _executeTaskWithRetry(task, taskInfo) {
        while (taskInfo.attempts < this.retryPolicy.maxAttempts) {
            try {
                return await task();
            } catch (error) {
                taskInfo.attempts++;
                
                if (!this._shouldRetryError(error) || 
                    taskInfo.attempts >= this.retryPolicy.maxAttempts) {
                    throw error;
                }

                this.metrics.recordTaskRetry(taskInfo.id, taskInfo.ring, taskInfo.attempts);
                const delay = this._calculateRetryDelay(taskInfo.attempts);
                await sleep(delay);
            }
        }
    }

    _shouldRetryError(error) {
        // 根据错误类型决定是否重试
        const nonRetryableErrors = [
            'ValidationError',
            'AuthorizationError',
            'ResourceNotFoundError'
        ];
        
        return !nonRetryableErrors.includes(error.name);
    }

    _calculateRetryDelay(attempt) {
        const baseDelay = this.retryPolicy.delays[attempt - 1] || 
                         this.retryPolicy.delays[this.retryPolicy.delays.length - 1];
        
        switch (this.retryPolicy.backoff) {
            case 'fixed':
                return baseDelay;
            case 'linear':
                return baseDelay * attempt;
            case 'exponential':
                return baseDelay * Math.pow(2, attempt - 1);
            default:
                return baseDelay;
        }
    }

    /**
     * 更新执行间隔
     */
    updateTimeout(isError, executionTime = 0) {
        if (isError) {
            this.stats.timeout = Math.min(
                this.stats.timeout * 2,
                CONFIG.MAX_TIMEOUT
            );
        } else {
            this.stats.timeout = Math.max(
                CONFIG.MIN_TIMEOUT,
                Math.min(executionTime, CONFIG.MAX_TIMEOUT)
            );
        }
    }

    /**
     * 检查是否需要中断当前执行
     */
    shouldInterrupt(newRingName) {
        if (!this.isProcessing) return false;
        const currentRing = RING_ORDER[this.currentRingIndex];
        return RING_ORDER.indexOf(newRingName) < RING_ORDER.indexOf(currentRing);
    }

    /**
     * 中断当前执行
     */
    interrupt() {
        if (this.isProcessing) {
            this.processNext(0, true);
        }
    }

    /**
     * 启动任务清理器
     */
    startTaskCleaner() {
        setInterval(() => {
            this.store.cleanup().catch(error => {
                console.error('Task cleanup error:', error);
            });
        }, CONFIG.CLEANUP_INTERVAL);
    }

    /**
     * 检查是否还有待处理的任务
     */
    async hasRemainingTasks() {
        for (const ring of RING_ORDER) {
            if (!await this.store.isRingEmpty(ring)) {
                return true;
            }
        }
        return false;
    }

    /**
     * 暂停队列
     */
    pause() {
        this.paused = true;
    }

    /**
     * 恢复队列
     */
    resume() {
        this.paused = false;
        this.processNext();
    }
}

let globalTaskQueue = null;

export async function getTaskQueue() {
    if (!globalTaskQueue) {
        globalTaskQueue = new TaskQueue();
        // 初始化时恢复状态
        await globalTaskQueue._restoreState();
    }
    return globalTaskQueue;
}

export async function shutdownTaskQueue() {
    if (globalTaskQueue) {
        await globalTaskQueue.shutdown();
        globalTaskQueue = null;
    }
}

// 导出健康检查方法
export async function checkTaskQueueHealth() {
    if (!globalTaskQueue) {
        return {
            isHealthy: false,
            details: {
                error: '任务队列未初始化'
            }
        };
    }
    return await globalTaskQueue.healthCheck();
}

export class QueueAlertManager {
    constructor(metrics, options = {}) {
        this.metrics = metrics;
        this.thresholds = {
            errorRate: options.errorRate || 0.1, // 10% 错误率
            queueSize: options.queueSize || 1000,
            processingTime: options.processingTime || 5000, // 5秒
            lockTimeout: options.lockTimeout || 5
        };
        
        this._setupAlertListeners();
    }

    _setupAlertListeners() {
        this.metrics.on('taskError', this._checkErrorRate.bind(this));
        this.metrics.on('queueSizeChanged', this._checkQueueSize.bind(this));
        this.metrics.on('taskProcessed', this._checkProcessingTime.bind(this));
        this.metrics.on('lockOperation', this._checkLockTimeouts.bind(this));
    }

    _checkErrorRate({ ringName }) {
        const metrics = this.metrics.getMetrics();
        const ringMetrics = metrics.ringMetrics[ringName];
        
        if (ringMetrics) {
            const errorRate = ringMetrics.errors / (ringMetrics.processed || 1);
            if (errorRate > this.thresholds.errorRate) {
                this._sendAlert('ERROR_RATE', {
                    ringName,
                    errorRate,
                    threshold: this.thresholds.errorRate
                });
            }
        }
    }

    _checkQueueSize({ size, ringName }) {
        if (size > this.thresholds.queueSize) {
            this._sendAlert('QUEUE_SIZE', {
                ringName,
                size,
                threshold: this.thresholds.queueSize
            });
        }
    }

    _checkProcessingTime({ processingTime, ringName }) {
        if (processingTime > this.thresholds.processingTime) {
            this._sendAlert('PROCESSING_TIME', {
                ringName,
                processingTime,
                threshold: this.thresholds.processingTime
            });
        }
    }

    _checkLockTimeouts({ success, operation }) {
        if (!success && operation === 'acquire') {
            const metrics = this.metrics.getMetrics();
            const timeoutRate = metrics.lockTimeouts / 
                              (metrics.lockAcquisitions + metrics.lockTimeouts);
            
            if (timeoutRate > this.thresholds.lockTimeout) {
                this._sendAlert('LOCK_TIMEOUTS', {
                    timeoutRate,
                    threshold: this.thresholds.lockTimeout
                });
            }
        }
    }

    async _sendAlert(type, data) {
        // 这里实现实际的告警发送逻辑
        console.error(`队列告警 [${type}]:`, data);
        // 可以集成其他告警系统，如邮件、Slack、钉钉等
    }
}