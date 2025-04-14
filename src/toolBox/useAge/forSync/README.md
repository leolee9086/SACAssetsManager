# 响应式数据同步工具 (Vue Reactive Sync)

这个模块提供基于 Yjs 和 WebRTC 的跨窗口/跨组件/跨端响应式数据同步工具，使 Vue 的响应式数据可以在不同环境间自动同步。

## 主要功能

- **跨窗口/标签页数据共享** - 同一浏览器中的不同窗口/标签页可以实时共享数据
- **跨组件数据同步** - 无需通过prop传递或全局状态管理，直接实现组件间数据同步
- **自动离线/在线处理** - 支持离线状态下的本地操作和在线后的自动同步
- **本地持久化** - 可以将数据持久化到本地存储
- **使用Vue响应式API风格** - 兼容Vue的reactive和ref API风格

## 安装

`forSync`模块作为`useAge`的一部分，已集成到工具箱中，可以直接导入使用：

```javascript
// 按需导入具体功能
import { useSyncedReactive, useSyncedRef } from '../../toolBox/useAge/forSync';

// 或使用通用的useSync API
import { useSync } from '../../toolBox/useAge/forSync';

// 或者通过默认导出访问
import SyncTools from '../../toolBox/useAge/forSync';
SyncTools.reactive(/* ... */);
```

## 基本用法

### 1. 使用`useSyncedRef` - 适用于简单值类型

```javascript
import { useSyncedRef } from '../../toolBox/useAge/forSync';

// 在组件中
export default {
  async setup() {
    // 创建可同步的响应式引用
    const counter = await useSyncedRef(0, {
      key: 'shared-counter',  // 使用相同的key可以在不同实例间共享数据
      roomName: 'my-app',     // 同步房间名
      debug: true             // 启用调试日志
    });
    
    function increment() {
      counter.value++;  // 自动同步到所有使用相同key的实例
    }
    
    // 在组件销毁时清理资源
    onBeforeUnmount(() => {
      counter.destroy();
    });
    
    return {
      counter,
      increment,
      connectionStatus: counter.status
    };
  }
}
```

### 2. 使用`useSyncedReactive` - 适用于对象

```javascript
import { useSyncedReactive } from '../../toolBox/useAge/forSync';

// 在组件中
export default {
  async setup() {
    // 创建可同步的响应式对象
    const user = await useSyncedReactive({
      name: '默认用户',
      age: 25,
      preferences: {
        theme: 'light',
        fontSize: 14
      }
    }, {
      key: 'user-profile',
      roomName: 'user-data',
      onSync: (state) => {
        console.log('数据已同步', state);
      }
    });
    
    function updateTheme(theme) {
      user.preferences.theme = theme;  // 自动同步到所有实例
    }
    
    function resetUser() {
      user.$reset();  // 重置为初始状态
    }
    
    // 在组件销毁时清理资源
    onBeforeUnmount(() => {
      user.$destroy();
    });
    
    return {
      user,
      updateTheme,
      resetUser,
      syncStatus: user.$status
    };
  }
}
```

### 3. 使用通用的`useSync` API

```javascript
import { useSync } from '../../toolBox/useAge/forSync';

// 在组件中
export default {
  async setup() {
    // 自动检测值类型并使用相应的同步方法
    const { state: userData, status, sync, destroy } = await useSync({
      username: 'test',
      email: 'test@example.com'
    }, {
      key: 'user-data'
    });
    
    // 对于简单值类型，也可以使用value访问器
    const { value: counter, status: counterStatus } = await useSync(0, {
      key: 'counter'
    });
    
    function syncData() {
      sync();  // 手动同步最新数据
    }
    
    onBeforeUnmount(() => {
      destroy();
    });
    
    return {
      userData,
      counter,
      status,
      counterStatus,
      syncData
    };
  }
}
```

## API 参考

### useSyncedRef(initialValue, options)

创建一个可同步的响应式引用，类似于Vue的`ref`但支持自动同步。

**参数：**

- `initialValue` - 初始值
- `options` - 配置选项
  - `key` - 存储键名 (默认: 'default')
  - `roomName` - 同步房间名 (默认: 'synced-refs')
  - `persist` - 是否持久化 (默认: true)
  - `autoConnect` - 是否自动连接 (默认: true)
  - `deep` - 是否深度监听 (默认: true)
  - `onSync` - 同步回调 (可选)
  - `onUpdate` - 更新回调 (可选)
  - `debug` - 调试模式 (默认: false)

**返回值：**

包含以下属性和方法的对象：
- `value` - 响应式值 (可读写)
- `isConnected` - 连接状态引用
- `status` - 连接状态对象
- `connect()` - 连接方法
- `disconnect()` - 断开连接方法
- `sync()` - 手动同步方法
- `destroy()` - 清理资源方法

### useSyncedReactive(initialState, options)

创建一个可同步的响应式对象，类似于Vue的`reactive`但支持自动同步。

**参数：**

- `initialState` - 初始状态对象
- `options` - 配置选项
  - `key` - 存储键名 (默认: 'default')
  - `roomName` - 同步房间名 (默认: 'synced-reactive')
  - `persist` - 是否持久化 (默认: true)
  - `autoConnect` - 是否自动连接 (默认: true)
  - `onSync` - 同步回调 (可选)
  - `onUpdate` - 更新回调 (可选)
  - `debug` - 调试模式 (默认: false)

**返回值：**

响应式对象，附加以下不可枚举的属性和方法：
- `$status` - 连接状态对象
- `$sync()` - 手动同步方法
- `$reset()` - 重置为初始状态
- `$connect()` - 连接方法
- `$disconnect()` - 断开连接方法
- `$destroy()` - 清理资源方法
- `$watch()` - 监听属性变化
- `$peers` - 获取连接的节点

### useSync(state, options)

统一的API，根据状态类型自动使用`useSyncedRef`或`useSyncedReactive`。

**参数：**

- `state` - 状态（对象或简单值）
- `options` - 配置选项 (同上)

**返回值：**

包含以下属性和方法的对象：
- `state` - 响应式状态
- `value` - 计算属性形式的状态 (对于简单值可读写)
- `status` - 连接状态对象
- `sync()` - 手动同步方法
- `connect()` - 连接方法
- `disconnect()` - 断开连接方法
- `destroy()` - 清理资源方法

## 高级用例

### 跨窗口编辑同一份数据

```javascript
// 窗口1
const document = await useSyncedReactive({
  title: '未命名文档',
  content: '',
  lastEdit: null
}, { key: 'shared-document-1' });

// 窗口2（甚至可以在不同的标签页或浏览器中）
const document = await useSyncedReactive({}, { key: 'shared-document-1' });
// 会自动同步窗口1中的数据

// 任何一个窗口的修改都会自动同步到其他窗口
document.content = '这是一些新内容';
document.lastEdit = new Date();
```

### 监听连接状态

```javascript
const counter = await useSyncedRef(0, { key: 'counter' });

// 监听连接状态变化
watch(counter.isConnected, (connected) => {
  if (connected) {
    console.log('连接成功，数据将自动同步');
  } else {
    console.log('连接断开，将在重新连接后同步');
  }
});

// 或使用status对象
watch(() => counter.status.connected, (connected) => {
  console.log('连接状态:', connected);
});
```

### 自定义同步事件

```javascript
const settings = await useSyncedReactive({
  theme: 'light',
  fontSize: 14
}, {
  key: 'app-settings',
  // 当收到远程数据更新时触发
  onSync: (newState) => {
    console.log('收到远程设置更新', newState);
    // 可以在这里做一些额外处理，比如保存到本地
  },
  // 当数据更新时触发（本地或远程）
  onUpdate: (state, source) => {
    console.log(`设置已${source === 'local' ? '本地' : '远程'}更新`, state);
  }
});
```

## 注意事项

1. 所有使用`useSyncedRef`、`useSyncedReactive`或`useSync`创建的实例都需要在不再使用时调用`destroy()`方法释放资源，建议在`onBeforeUnmount`钩子中进行。

2. 使用相同的`key`和`roomName`可以在不同实例间共享数据，确保正确使用这两个参数来管理数据同步范围。

3. 对于大型应用，可以按功能模块划分不同的`roomName`，以减少不必要的数据同步和提高性能。

4. 如果遇到同步问题，可以启用`debug: true`选项查看同步日志，帮助排查问题。

5. 由于使用了WebRTC技术，同步功能在大多数现代浏览器中可用，但在一些特殊环境（如一些企业内网）可能会受到限制。 