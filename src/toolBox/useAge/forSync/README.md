# 数据同步(Synced)模块

此模块提供了基于 Vue 响应式系统的跨窗口/跨组件数据同步功能，支持与思源笔记的WebSocket集成。

## 核心功能

- **响应式数据同步** - 在多窗口间自动同步响应式状态
- **思源笔记集成** - 通过WebSocket与思源笔记后端通信
- **持久化存储** - 支持本地数据持久化
- **自动重连** - 断线自动重连和错误处理

## 使用方式

### 基本使用

```javascript
import { useSyncedReactive } from '../toolBox/useAge/forSync/useSyncedReactiveNew.js';

// 创建可同步的响应式对象
const state = useSyncedReactive({
  count: 0,
  todos: [],
  settings: {
    darkMode: false
  }
}, {
  roomName: 'my-app',   // 同步房间名
  key: 'main-state'     // 数据标识符
});

// 使用方式与Vue的reactive类似
state.count++;
state.todos.push({ id: Date.now(), text: '新任务', done: false });
state.settings.darkMode = true;

// 特殊API
state.$status;       // 获取同步状态
state.$sync();       // 手动触发同步
state.$connect();    // 手动连接
state.$disconnect(); // 手动断开连接
state.$destroy();    // 销毁并清理资源
```

### 简单值的同步

```javascript
import { useSyncedRef } from '../toolBox/useAge/forSync/useSyncedReactiveNew.js';

// 创建可同步的响应式引用
const counter = useSyncedRef(0, {
  roomName: 'my-app',
  key: 'counter'
});

// 使用方式与Vue的ref类似
counter.value++;

// 同样拥有特殊API
counter.$status;
counter.$sync();
// ...
```

## 从旧版迁移

### 主要变化

此版本使用了官方的`@syncedstore/core`库替代自定义实现，主要改进包括：

1. 更稳定的响应式系统集成
2. 更好的嵌套对象和数组处理
3. 减少了代码复杂度和潜在bug

### 迁移步骤

1. **更新导入路径**：
   ```javascript
   // 旧版
   import { useSyncedReactive } from '../toolBox/useAge/forSync/useSyncedReactive.js';
   
   // 新版
   import { useSyncedReactive } from '../toolBox/useAge/forSync/useSyncedReactiveNew.js';
   ```

2. **特殊场景处理**：

   - **深层嵌套对象**：新版能更好地处理深层嵌套对象，不需要特殊处理
   
   - **数组操作**：新版自动跟踪数组操作，无需手动监听数组变化
   
   - **与思源笔记集成**：新版保持了与思源笔记的集成，使用相同的配置方式

3. **测试**：
   使用`syncedReactiveTest.js`进行功能测试，确保所有功能正常工作

## 配置选项

```javascript
useSyncedReactive(initialState, {
  // 基本配置
  key: 'default',           // 数据标识符
  roomName: 'default-room', // 同步房间名称
  persist: true,            // 是否持久化到本地存储
  debug: false,             // 是否启用调试日志
  autoConnect: true,        // 是否自动连接
  
  // 回调函数
  onSync: (data) => {},     // 同步完成时的回调
  onUpdate: (data) => {},   // 数据更新时的回调
  
  // 思源笔记配置
  siyuan: {
    enabled: true,          // 是否启用思源集成
    host: '127.0.0.1',      // 思源笔记主机名
    port: 6806,             // 思源笔记端口
    token: '6806',          // 思源笔记令牌
    channel: 'sync'         // 信道前缀
  }
});
```

## 高级用法

### 跨组件/跨窗口状态共享

```javascript
// 组件A
import { useSyncedReactive } from '../toolBox/useAge/forSync/useSyncedReactiveNew.js';

const state = useSyncedReactive({ 
  shared: 'Hello from A'
}, {
  roomName: 'shared-room',
  key: 'shared-state'
});

// 组件B (可以在不同窗口)
import { useSyncedReactive } from '../toolBox/useAge/forSync/useSyncedReactiveNew.js';

// 使用相同的roomName和key获取共享状态
const state = useSyncedReactive({}, {
  roomName: 'shared-room',
  key: 'shared-state'
});

// state.shared 会自动同步组件A的修改
```

### 获取已存在的同步对象

```javascript
import { getCachedSyncObject } from '../toolBox/useAge/forSync/useSyncedReactiveNew.js';

// 获取已创建的同步对象
const existingState = getCachedSyncObject('room-name', 'state-key');

if (existingState) {
  // 使用已有的同步对象
} else {
  // 创建新的同步对象
}
```

### 清理资源

```javascript
import { clearRoom, clearAllRooms } from '../toolBox/useAge/forSync/useSyncedReactiveNew.js';

// 清理指定房间的所有同步对象
clearRoom('room-name');

// 清理所有房间和同步对象
clearAllRooms();
``` 