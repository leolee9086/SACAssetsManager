# useSyncedstore 模块

## 简介

`useSyncedstore` 是一个用于多客户端状态同步的工具集合，支持通过 WebRTC 和思源笔记 WebSocket 进行数据同步。它提供了一个可靠的方式来在不同客户端之间保持状态一致性。

## 核心功能

- **多端同步**：支持通过 WebRTC 或思源笔记 WebSocket 进行实时数据同步
- **自动重连**：网络断开后自动尝试重新连接
- **本地持久化**：支持将数据持久化到本地存储
- **深度合并**：智能合并对象和数组
- **事件处理**：提供事件监听和触发机制

## 使用方法

```javascript
import { createSyncStore } from './useSyncstore.js';

// 创建同步存储
const syncStore = await createSyncStore({
  // 房间名称，用于标识同步组
  roomName: 'my-sync-room',
  
  // 初始状态
  initialState: {
    counter: 0,
    items: [],
    settings: {}
  },
  
  // 是否启用本地持久化
  persist: true,
  
  // 思源笔记集成配置
  siyuan: {
    enabled: true  // 启用思源WebSocket
  }
});

// 监听连接状态变化
syncStore.on('connect', () => {
  console.log('已连接到同步服务');
});

// 监听数据同步事件
syncStore.on('sync', (data) => {
  console.log('收到同步数据', data);
});

// 手动触发同步
syncStore.sync();
```

## 注意事项

1. **数据结构限制**：避免过深的对象嵌套（超过5层）以防止性能问题
2. **大型数据**：对于大型数组（超过100项）和对象，系统会自动压缩处理
3. **WebRTC/思源选择**：可以通过 `disableWebRTC` 选项强制使用思源笔记同步
4. **事件处理**：事件处理器存储在同步结果对象上，而不是内部store对象上

## 最近修复

- 修复了 "cannot set new elements on root doc" 错误，该错误由于尝试在不可变的 Yjs 文档上添加属性导致
- 改进了事件处理机制，现在使用同步结果对象上的事件处理器映射，而不是尝试修改内部store对象

## 高级选项

```javascript
const advancedSyncStore = await createSyncStore({
  roomName: 'advanced-room',
  initialState: { /* 初始状态 */ },
  
  // 持久化选项
  persist: true,
  persistOptions: {
    storage: 'indexeddb',  // 使用 IndexedDB 存储
    throttle: 2000         // 保存频率限制
  },
  
  // WebRTC 选项
  webrtcOptions: {
    signaling: ['wss://signaling.example.com'],
    maxPeers: 10,
    peerOpts: { /* RTCPeerConnection 选项 */ }
  },
  
  // 自动同步配置
  autoSync: {
    enabled: true,
    interval: 5000,        // 每5秒同步一次
    throttle: 1000         // 同步请求节流
  },
  
  // 思源配置
  siyuan: {
    enabled: true,
    port: 6806,
    channel: 'sync',
    autoReconnect: true
  },
  
  // 是否禁用 WebRTC
  disableWebRTC: false
});
```

## 故障排除

如果遇到 "cannot set new elements on root doc" 错误，说明代码尝试修改 Yjs 文档对象，这是不允许的。这个问题在最新版本中已修复。 