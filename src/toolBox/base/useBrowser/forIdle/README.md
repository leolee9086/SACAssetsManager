# 空闲队列处理器

这个模块提供了一系列工具，用于在浏览器空闲时间执行任务，避免阻塞主线程，提高应用响应性能。

## 功能特点

- 基于浏览器的 `requestIdleCallback` API
- 提供简单和高级的空闲时间任务处理
- 支持任务取消和超时保护
- 提供优先级队列实现
- 支持并发控制

## 主要函数

### useIdleTask

在浏览器空闲时执行任务，自动管理时间控制。

```javascript
import { useIdleTask } from '../toolBox';

// 使用空闲任务
const cancelTask = useIdleTask((timeRemaining) => {
  // 执行耗时任务
  console.log(`剩余空闲时间: ${timeRemaining}ms`);
}, {
  deadline: 50,    // 最小空闲时间要求(ms)
  timeout: 1000,   // 最大等待时间(ms)
  onError: (error) => console.error('任务执行失败:', error)
});

// 需要时取消任务
cancelTask();
```

### useIdleCallback

直接使用浏览器的 `requestIdleCallback` API。

```javascript
import { useIdleCallback } from '../toolBox';

// 执行简单任务
const taskId = useIdleCallback((deadline) => {
  // 执行简单任务
  console.log(`当前时间片剩余时间: ${deadline.timeRemaining()}ms`);
  console.log(`是否超时: ${deadline.didTimeout}`);
}, { 
  timeout: 1000 
});
```

### isIdleCallbackSupported

检查当前环境是否支持 `requestIdleCallback`。

```javascript
import { isIdleCallbackSupported } from '../toolBox';

if (isIdleCallbackSupported()) {
  // 使用空闲队列处理
} else {
  // 使用其他方案
}
```

### createIdleTaskQueue

创建一个优先级队列，用于管理和调度空闲任务。

```javascript
import { createIdleTaskQueue } from '../toolBox';

// 创建一个空闲任务队列
const queue = createIdleTaskQueue({
  concurrency: 2,  // 最大并发任务数
  timeout: 5000    // 任务超时时间(ms)
});

// 添加任务到队列
queue.addTask(async (timeRemaining) => {
  // 执行高优先级任务
  return '任务结果';
}, 1); // 优先级1(高)

queue.addTask(async (timeRemaining) => {
  // 执行低优先级任务
  return '任务结果';
}, 9); // 优先级9(低)

// 获取队列状态
const status = queue.getStatus();
console.log(`队列长度: ${status.queueLength}`);
console.log(`运行中任务数: ${status.runningTasks}`);
console.log(`是否正在处理: ${status.isProcessing}`);

// 清空队列
queue.clearQueue();
```

## 中文API

同时提供了中文命名的API：

```javascript
import { 
  使用空闲任务, 
  使用空闲回调,
  检查空闲回调支持,
  创建空闲任务队列
} from '../toolBox';

// 使用方法与英文API相同
```

## 注意事项

1. 空闲队列处理适合非关键任务，不应用于高优先级或时间敏感的操作
2. 测试浏览器兼容性，某些老旧浏览器可能不支持 `requestIdleCallback`
3. 设置合理的截止时间和超时，避免任务长时间等待
4. 空闲时间是不可靠的，任务可能在任何时刻被调度执行 