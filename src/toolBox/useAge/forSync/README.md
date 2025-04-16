# 响应式同步工具

本模块提供基于 Yjs 和 思源WebSocket 的跨窗口/跨组件响应式数据同步工具。

## 设计目标

1. 兼容 Vue 响应式 API 的使用体验 
2. 提供自动化的跨窗口/跨组件数据同步
3. 支持本地存储持久化
4. 自动断线重连和错误处理

## 主要API函数

### useSyncedReactive 

创建可同步的响应式对象，类似 Vue 的 `reactive`，但支持跨窗口同步。

```js
import { useSyncedReactive } from '../../toolBox/useAge/forSync/useSyncedReactive.js';

// 创建同步响应式对象
const syncedData = useSyncedReactive(
  { // 初始状态
    count: 0,
    items: ['item1', 'item2'],
    nested: {
      value: 'test'
    }
  }, 
  { // 配置选项
    roomName: 'my-app',  // 房间名称
    key: 'counter-data', // 数据键
    persist: true,       // 是否持久化
    debug: true,         // 是否输出调试信息
    // 思源配置
    siyuan: {
      enabled: true      // 是否启用思源同步
    }
  }
);

// 像使用普通响应式对象一样使用
syncedData.count++; // 自动跨窗口同步

// 获取状态
console.log(syncedData.$status.connected); // 是否已连接
console.log(syncedData.$status.peers);     // 连接的节点数
console.log(syncedData.$status.lastSync);  // 上次同步时间

// 手动同步
syncedData.$sync();

// 修复数组方法 (可能出现的slice方法丢失问题)
syncedData.$enhanceAllArrays();
```

### useSyncedRef

创建可同步的响应式引用，类似 Vue 的 `ref`，但支持跨窗口同步。适合同步简单值。

```js
import { useSyncedRef } from '../../toolBox/useAge/forSync/useSyncedReactive.js';

// 创建同步响应式引用
const counter = useSyncedRef(0, {
  roomName: 'my-app',
  key: 'counter'
});

// 像使用普通ref一样使用
counter.value++; // 自动跨窗口同步

// 获取状态
console.log(counter.$status.connected);
```

## 内部模块

本模块由以下部分组成：

1. **useSyncedReactive.js**: 主模块，提供API接口
2. **reactiveCore/**: 核心功能实现
   - **constants.js**: 常量和工具函数
   - **internal.js**: 内部转换函数 
   - **boxed.js**: 原始值包装
   - **map.js**: 映射实现
   - **array.js**: 数组实现
   - **index.js**: 导出接口

## 已知问题与解决方案

### 数组方法丢失

**症状**: `Uncaught TypeError: syncedData.items.slice is not a function`

**解决方案**: 调用 `syncedData.$enhanceAllArrays()` 方法恢复所有数组方法

### 大型数据集同步慢

**症状**: 同步大量数据时性能下降

**解决方案**: 
1. 拆分数据为多个小型同步对象
2. 减少嵌套层级
3. 使用 `persist: false` 减少持久化成本

## 高级用法

### 自定义同步逻辑

```js
const syncedData = useSyncedReactive(initialState, {
  onSync: (data) => {
    console.log('数据同步事件', data);
    // 执行自定义逻辑
  },
  onUpdate: (newValue) => {
    console.log('数据更新事件', newValue);
  }
});
```

### 多窗口同步测试

通过设置相同的 `roomName` 和 `key`，不同窗口的数据会自动同步：

```js
// 窗口1
const data1 = useSyncedReactive({count: 0}, {
  roomName: 'test-room',
  key: 'test-data'
});

// 窗口2
const data2 = useSyncedReactive({count: 0}, {
  roomName: 'test-room',
  key: 'test-data'
});

// 在窗口1中更新data1.count，窗口2中的data2.count会自动同步
``` 