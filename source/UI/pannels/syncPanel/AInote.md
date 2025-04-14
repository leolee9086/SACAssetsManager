# 这个区段由开发者编写,未经允许禁止AI修改
<本面板展示了如何利用思源WebSocket同步数据，使不同组件/面板之间保持数据同步>

# 同步数据面板

这个面板演示了如何使用`useSyncedReactive.js`进行跨组件数据同步，支持在不同的Tab、窗口之间实时同步数据。

## 核心功能

1. 使用思源WebSocket进行数据同步，不依赖外部信令服务器
2. 基于CRDT技术，支持多点编辑和冲突自动解决
3. 提供通用的同步服务接口，方便任何组件接入
4. 支持本地持久化

## 接入方式

任何Vue组件都可以通过以下方式接入数据同步：

### 1. 使用封装好的同步服务

```js
import { createSyncService } from './useSyncService.js';

// 创建同步服务
const syncService = createSyncService({
  namespace: 'your-feature', // 功能命名空间
  id: 'main-data',           // 数据ID
  initialData: {             // 初始数据
    title: '标题',
    content: '内容'
  },
  persist: true              // 是否持久化
});

// 使用同步数据
const syncData = syncService.data;

// 在组件卸载时可以选择是否销毁服务
onBeforeUnmount(() => {
  // syncService.destroy(); // 一般不需要销毁，其他组件可能还在使用
});
```

### 2. 在组件间共享同一个数据源

通过相同的namespace和id，不同组件可以共享同一个数据：

```js
// 组件A
const serviceA = createSyncService({
  namespace: 'feature-x',
  id: 'shared-data'
});

// 组件B - 将获取相同的数据引用
const serviceB = createSyncService({
  namespace: 'feature-x',
  id: 'shared-data'
});

// serviceA.data === serviceB.data // true
```

### 3. 创建命名空间服务

如果一个功能需要多个同步数据，可以创建一个命名空间服务：

```js
import { createNamespacedSync } from './useSyncService.js';

// 创建命名空间服务
const editorSync = createNamespacedSync('editor', {
  persist: true,
  debug: true
});

// 创建多个同步数据，共享相同的命名空间
const documentData = editorSync('document');
const settingsData = editorSync('settings');
const historyData = editorSync('history');
```

## 高级用法

### 监听同步事件

```js
const syncService = createSyncService({
  // ...配置
  onConnected: () => console.log('连接成功'),
  onDisconnected: () => console.log('连接断开'),
  onSynced: (data) => console.log('数据同步', data),
  onError: (err) => console.error('同步错误', err)
});
```

### 手动控制连接

```js
// 手动连接/断开
syncService.connect();
syncService.disconnect();

// 强制同步
syncService.sync();

// 重置数据
syncService.reset();

// 更新部分数据
syncService.update({
  title: '新标题',
  counter: 100
});
```

### 获取连接状态

```js
// 状态引用是响应式的
const { status } = syncService;

console.log(status.connected);  // 是否已连接
console.log(status.peers);      // 连接节点数
console.log(status.lastSync);   // 上次同步时间
console.log(status.loading);    // 是否加载中
console.log(status.error);      // 错误信息
```

## 性能考虑

1. 同步服务实例会被缓存，多次调用相同配置只会创建一个实例
2. 组件卸载时通常不需要销毁服务，除非确定不再使用
3. 复杂数据结构可能会影响性能，建议保持数据结构简单 