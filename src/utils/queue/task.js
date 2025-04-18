import { IEventEmitterSimple } from "../../toolBox/base/forEvent/useCompatibleEmitter.js";
import { MinHeap } from "../useEcma/useArray/minHeap.js";

// 纯函数 - 比较任务优先级
function compareTaskPriority(tasks) {
  const [a, b] = tasks;
  const priorityA = a.priority !== undefined ? a.priority : Infinity;
  const priorityB = b.priority !== undefined ? b.priority : Infinity;
  
  if ((priorityA >= 0 && priorityB < 0) || (priorityA < 0 && priorityB >= 0)) {
    return priorityB - priorityA;
  }
  return priorityA - priorityB;
}

// 纯函数 - 计算进度百分比
function getProgressPercentage(state) {
  if (state.totalTasks === 0) return 0;
  return (state.completedTasks / state.totalTasks) * 100;
}

// 创建任务状态对象
function createTaskControllerState(options) {
  return {
    taskQueue: new MinHeap((a, b) => compareTaskPriority([a, b])),
    isPaused: false,
    totalTasks: 0,
    currentTask: null,
    isProcessing: false,
    completedTasks: 0,
    destroyOnComplete: options.destroyOnComplete,
    options: options,
    eventEmitter: new IEventEmitterSimple(),
    supportIdle: typeof requestIdleCallback === 'function',
    useIdleCallback: options.useIdleCallback,
    idleCallbackId: null
  };
}

// 非纯函数 - 添加任务
function forTaskAdd(context, options) {
  const { task, priority = 0 } = options;
  const wasPaused = context.isPaused;
  
  // 暂停处理
  context.isPaused = true;
  
  task.priority = priority;
  context.taskQueue.push(task);
  context.totalTasks++;
  context.eventEmitter.emit('taskAdded', { totalTasks: context.totalTasks });
  
  // 恢复之前的状态
  if (!wasPaused) {
    context.isPaused = false;
    forTaskProcess(context, {});
  }
}

// 非纯函数 - 执行任务
function forTaskExecution(context, options) {
  return new Promise((resolve) => {
    const runTask = async (deadline) => {
      const result = await context.currentTask();
      resolve(result);
    };

    if (context.useIdleCallback && context.supportIdle) {
      context.idleCallbackId = requestIdleCallback(runTask, { timeout: 1000 });
    } else {
      runTask({ timeRemaining: () => Infinity });
    }
  });
}

// 非纯函数 - 处理下一个任务
async function forTaskProcess(context, options) {
  if (context.isPaused || context.isProcessing) {
    return;
  }

  if (context.taskQueue.isEmpty()) {
    if (context.completedTasks > 0) {
      console.log('所有任务已完成');
      context.eventEmitter.emit('allTasksCompleted');
      if (context.destroyOnComplete) {
        forTaskDestroy(context, {});
      }
    }
    return;
  }

  context.isProcessing = true;
  try {
    context.currentTask = context.taskQueue.pop();
    
    const result = await forTaskExecution(context, {});
    context.completedTasks++;
    context.eventEmitter.emit('taskCompleted', {
      completedTasks: context.completedTasks,
      totalTasks: context.totalTasks,
      result: result
    });
  } catch (error) {
    console.error('任务执行出错:', error);
    context.eventEmitter.emit('taskError', { error, task: context.currentTask });
  } finally {
    if (context.idleCallbackId && context.supportIdle) {
      cancelIdleCallback(context.idleCallbackId);
    }
    context.currentTask = null;
    context.isProcessing = false;

    // 安排下一次处理
    if (context.useIdleCallback && context.supportIdle) {
      context.idleCallbackId = requestIdleCallback(() => forTaskProcess(context, {}));
    } else {
      forTaskProcess(context, {});
    }
  }
}

// 非纯函数 - 清空任务队列
function forTaskClear(context, options) {
  context.taskQueue = new MinHeap((a, b) => compareTaskPriority([a, b]));
  context.totalTasks = 0;
  context.completedTasks = 0;
  context.currentTask = null;
  context.eventEmitter.emit('queueCleared');
  context.isProcessing = false;
}

// 非纯函数 - 启动任务处理
function forTaskStart(context, options) {
  context.isPaused = false;
  forTaskProcess(context, {});
}

// 非纯函数 - 暂停任务处理
function forTaskPause(context, options) {
  context.isPaused = true;
}

// 非纯函数 - 恢复任务处理
function forTaskResume(context, options) {
  if (context.isPaused) {
    forTaskStart(context, {});
  }
}

// 非纯函数 - 销毁任务控制器
function forTaskDestroy(context, options) {
  if (context.idleCallbackId && context.supportIdle) {
    cancelIdleCallback(context.idleCallbackId);
  }
  forTaskClear(context, {});
  context.eventEmitter.emit('destroy');
  context.eventEmitter.removeAllListeners();
  console.log('串行任务控制器已销毁');
}

// 纯函数 - 获取当前任务
function getCurrentTask(state) {
  return state.currentTask;
}

// 纯函数 - 获取队列长度
function getQueueLength(state) {
  return state.taskQueue.size();
}

// 纯函数 - 获取所有等待任务
function getPendingTasks(state) {
  return state.taskQueue.toArray();
}

// 非纯函数 - 添加事件监听器
function forEventBinding(context, options) {
  const { event, callback } = options;
  context.eventEmitter.on(event, callback);
}

// 兼容类实现
export class 串行任务控制器 extends IEventEmitterSimple {
  constructor(options = {
    destroyOnComplete: false,
    useIdleCallback: false
  }) {
    super();
    
    // 创建状态对象
    this._state = createTaskControllerState(options);
    
    // 事件代理
    forEventBinding(this._state, { 
      event: 'taskAdded', 
      callback: data => this.emit('taskAdded', data) 
    });
    forEventBinding(this._state, { 
      event: 'taskCompleted', 
      callback: data => this.emit('taskCompleted', data) 
    });
    forEventBinding(this._state, { 
      event: 'allTasksCompleted', 
      callback: () => this.emit('allTasksCompleted') 
    });
    forEventBinding(this._state, { 
      event: 'destroy', 
      callback: () => this.emit('destroy') 
    });
    forEventBinding(this._state, { 
      event: 'taskError', 
      callback: data => this.emit('taskError', data) 
    });
    forEventBinding(this._state, { 
      event: 'queueCleared', 
      callback: () => this.emit('queueCleared') 
    });
  }
  
  compareTasks(a, b) {
    return compareTaskPriority([a, b]);
  }
  
  addTask(task, priority = 0) {
    forTaskAdd(this._state, { task, priority });
  }
  
  async processNext() {
    await forTaskProcess(this._state, {});
  }
  
  clear() {
    forTaskClear(this._state, {});
  }
  
  start() {
    forTaskStart(this._state, {});
  }
  
  pause() {
    forTaskPause(this._state, {});
  }
  
  resume() {
    forTaskResume(this._state, {});
  }
  
  destroy() {
    forTaskDestroy(this._state, {});
  }
  
  getProgress() {
    return getProgressPercentage(this._state);
  }
  
  getCurrentTask() {
    return getCurrentTask(this._state);
  }
  
  getQueueLength() {
    return getQueueLength(this._state);
  }
  
  getPendingTasks() {
    return getPendingTasks(this._state);
  }
}