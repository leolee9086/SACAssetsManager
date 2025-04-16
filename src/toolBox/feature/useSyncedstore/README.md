# SyncedStore 模块

基于Yjs的同步数据存储实现，提供实时协作编辑功能。

## 功能特点

- 自动数据同步与冲突解决
- 支持离线操作与重连后自动合并
- 高性能数据编码与解码
- 低网络带宽占用

## 使用方法

### 基本使用

```js
import { useSyncedStore } from '@/toolBox/feature/useSyncedstore';

// 创建一个同步存储
const { store, connect, disconnect } = useSyncedStore({
  initialValue: { text: '初始文本', counter: 0 },
  roomName: 'my-collaboration-room'
});

// 连接到同步服务器
connect();

// 读取数据
console.log(store.text); // "初始文本"

// 修改数据 (所有客户端都会自动同步)
store.text = '新的文本内容';
store.counter++;

// 断开连接
disconnect();
```

### 高级功能

#### 监听更改

```js
import { useSyncedStore, observeDeep } from '@/toolBox/feature/useSyncedstore';

const { store } = useSyncedStore({ initialValue: { text: '' } });

// 监听所有深层变化
const unsubscribe = observeDeep(store, (changes, origin) => {
  console.log('数据变更:', changes);
  console.log('变更来源:', origin);
});

// 停止监听
unsubscribe();
```

#### 获取更新和状态向量

```js
import { getUpdate, getStateVector } from '@/toolBox/feature/useSyncedstore/impl/decoding';
import { Y } from '@/toolBox/feature/useSyncedstore';

// 获取文档状态向量
const stateVector = getStateVector(ydoc);

// 获取更新数据
const update = getUpdate(ydoc);
```

## 注意事项

- 所有数据修改都应通过 store 对象进行，不要直接修改底层 Yjs 文档
- 大型数据结构可能需要考虑性能优化
- 离线时的修改会在重新连接后自动同步

## 错误处理

所有API都包含完善的错误处理机制，异常情况会通过控制台输出详细信息。 