# WebSocket 工具函数

本目录包含与 WebSocket 通信相关的工具函数，可用于创建和管理基于 WebSocket 的事件系统。

## 文件概览

- `useWebSocketEvents.js` - WebSocket 事件处理工具，提供事件广播和监听功能

## 主要功能

### WebSocket 事件处理

在 Node.js 环境中使用 WebSocket 进行事件通信的工具函数。主要支持：

- 创建 WebSocket 事件监听器
- 设置基于 WebSocket 的后端事件系统
- 在多个 WebSocket 目标间广播消息
- 综合事件发射与广播功能

## 使用示例

### 创建后端事件系统

```javascript
import { 创建后端事件系统 } from '../toolBox/base/forNetwork/forWebSocket/useWebSocketEvents.js';

// 端口列表和目标列表
const 端口列表 = [6806, 6807];
const WS目标列表 = [/* WebSocket 目标对象列表 */];

// 创建事件系统
const 事件系统 = 创建后端事件系统({
  端口列表,
  WS目标列表
});

// 监听事件
事件系统.on('自定义事件', (数据, 选项) => {
  console.log('收到自定义事件:', 数据, 选项);
});

// 广播事件
事件系统.广播('服务器通知', { 消息: '服务器已启动' });

// 发出事件并广播
事件系统.发出并广播('状态更新', { 状态: '运行中', 时间: Date.now() });
```

### 单独使用 WebSocket 事件监听器

```javascript
import { 创建WebSocket事件监听器 } from '../toolBox/base/forNetwork/forWebSocket/useWebSocketEvents.js';
import EventEmitter from 'events';

// 创建事件总线
const eventBus = new EventEmitter();

// 创建 WebSocket 目标
const ws = new WebSocket('ws://localhost:6806');

// 创建事件监听器
const 监听器 = 创建WebSocket事件监听器(ws, eventBus);

// 使用事件总线监听
eventBus.on('消息', (数据) => {
  console.log('收到消息:', 数据);
});
```

## 注意事项

1. 需要 Node.js 环境支持，依赖 `events` 和 `ws` 模块
2. 提供中英文双命名支持，推荐使用中文命名函数
3. 在 WebSocket 连接关闭时，需要相应处理目标列表
4. 发送消息前会检查连接状态，避免向已关闭的连接发送数据 