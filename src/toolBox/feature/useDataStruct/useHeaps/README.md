# 最小堆 (MinHeap) 使用指南

最小堆是一种特殊的二叉树数据结构，其中父节点的值总是小于或等于其子节点的值。本模块提供了高性能最小堆的实现，支持标准堆操作、批量操作、异步处理以及事务处理。

## 安装

无需安装额外依赖，直接导入使用：

```javascript
// 函数式API
import { createMinHeap } from './useMinHeap';

// 或者类式API
import { MinHeap } from './useMinHeap';
```

## 基本用法

### 创建堆

```javascript
// 函数式方式
const minHeap = createMinHeap();

// 类式方式
const heapInstance = new MinHeap();
```

### 添加元素

```javascript
minHeap.push(5);
minHeap.push(3);
minHeap.push(8);
```

### 获取并移除最小元素

```javascript
const smallest = minHeap.pop(); // 返回3
```

### 只查看最小元素（不移除）

```javascript
const topElement = minHeap.peek(); // 返回最小元素但不移除
```

### 其他常用操作

```javascript
// 检查堆是否为空
const isEmpty = minHeap.isEmpty();

// 获取堆中元素数量
const size = minHeap.size();

// 获取堆的当前状态（数组形式）
const heapArray = minHeap.getHeap();

// 清空堆
minHeap.clear();
```

## 高级用法

### 批量添加元素（高性能）

```javascript
// 一次添加多个元素（比单独添加每个元素更高效）
minHeap.pushBulk([5, 3, 8, 1, 10]);

// 等效于但比下面的代码更高效：
// [5, 3, 8, 1, 10].forEach(item => minHeap.push(item));
```

### 自定义比较函数

默认比较函数为`(a, b) => a - b`，可以自定义比较函数：

```javascript
// 创建最大堆
const maxHeap = createMinHeap((a, b) => b - a);

// 创建按特定属性排序的堆
const taskHeap = createMinHeap((a, b) => a.priority - b.priority);
taskHeap.push({ task: "任务A", priority: 5 });
taskHeap.push({ task: "任务B", priority: 1 });
```

### 异步操作

提供两种异步模式：标准模式(高性能)和安全模式(事务保护)：

```javascript
// 标准异步操作 - 高性能
await minHeap.pushAsync(42);
const item = await minHeap.popAsync();

// 安全异步操作 - 提供事务保护，操作失败时自动回滚
await minHeap.pushAsyncSafe(42);
const safeItem = await minHeap.popAsyncSafe();
```

### 动态更改比较函数

```javascript
// 改变排序方式
minHeap.setCompareFn((a, b) => b.value - a.value);
```

## 事务系统

最小堆实现了一个强大的事务处理系统，允许您在原子操作中执行一系列堆操作。

### 基本事务

```javascript
const heap = createMinHeap();
heap.push(5);
heap.push(3);

// 执行一个事务
await heap.withTransaction(async (data) => {
  // 在这里直接操作堆数组
  const min = data[0];  // 读取最小值
  data.push(1);         // 添加新元素
  
  // 如果这里抛出异常，所有操作都会被回滚
  if (min < 0) throw new Error('不允许负值');
  
  return min; // 返回事务结果
});
```

### 事务类型

提供三种预定义的事务类型：

```javascript
const heap = createMinHeap();
const types = heap.getTransactionTypes();

// 1. 标准事务（浅拷贝）- 性能好
await heap.withTransaction(data => {
  // 执行操作...
}, types.STANDARD);

// 2. 深拷贝事务 - 适用于复杂对象
await heap.withTransaction(data => {
  // 执行操作...
}, types.DEEP_COPY);

// 3. 带元数据的自定义事务
await heap.withTransaction(data => {
  // 执行操作...
}, types.CUSTOM({ userId: 123, timestamp: Date.now() }));
```

### 事务生命周期钩子

可以注册钩子在事务的不同阶段执行自定义逻辑：

```javascript
const heap = createMinHeap();

// 1. 事务开始前
const unregister = heap.registerTransactionHook('beforeTransaction', (context) => {
  console.log(`事务开始，堆大小: ${context.data.length}`);
  console.log(`附加元数据:`, context.metadata);
});

// 2. 事务成功完成后
heap.registerTransactionHook('afterTransaction', (context) => {
  console.log(`事务完成，耗时: ${context.duration}ms`);
  console.log(`事务结果:`, context.result);
});

// 3. 事务出错时
heap.registerTransactionHook('onError', (context) => {
  console.error(`事务出错:`, context.error);
});

// 4. 回滚前
heap.registerTransactionHook('beforeRollback', (context) => {
  console.log(`准备回滚...`);
});

// 5. 回滚后
heap.registerTransactionHook('afterRollback', (context) => {
  console.log(`回滚完成`);
});

// 执行事务
await heap.withTransaction(data => {
  // 业务逻辑...
});

// 取消钩子注册
unregister();
```

## 性能优化特性

本实现包含多项性能优化：

1. **算法优化**
   - 使用位运算代替除法和乘法计算索引
   - 采用非递归实现减少函数调用开销
   - 元素上浮/下沉过程中减少交换操作
   - 批量添加元素时使用更高效的堆化算法

2. **内存优化**
   - 减少不必要的数组复制
   - 只在值确实变化时才进行赋值操作

3. **异步优化**
   - 批量计算和执行交换操作
   - 仅在必要时让出事件循环控制权

## 适用场景

- 优先队列实现
- 任务调度系统
- 图算法中的最短路径计算
- 数据流中寻找Top-K元素
- 需要高效处理大量元素的排序场景
- 需要事务安全性的关键业务逻辑

## 注意事项

1. 堆操作的时间复杂度：
   - push/pop: O(log n)
   - pushBulk: O(n) - 线性时间复杂度
   - peek/size/isEmpty: O(1)

2. 选择合适的API：
   - 批量添加元素时，使用pushBulk而非多次调用push
   - 需要UI响应性时，使用异步API
   - 只有在确实需要事务安全的场景下才使用*Safe异步API或事务系统

3. 事务系统使用建议：
   - 简单操作优先使用标准API，避免事务开销
   - 复杂、需要原子性的操作使用事务系统
   - 对性能敏感的场景，避免使用深拷贝事务类型
   - 钩子系统非常适合用于记录日志、性能跟踪和错误处理

4. 异步操作适用于处理大量数据时避免UI卡顿

5. 不允许添加undefined值到堆中 