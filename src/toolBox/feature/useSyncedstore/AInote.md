# 这个区段由开发者编写,未经允许禁止AI修改
<需要记录重要的开发决策和修复历史>

## 2023-xx-xx YJS同步适配器实现

实现了基于思源笔记WebSocket API的YJS同步适配器，支持实时协作编辑功能。

## 2023-xx-xx 重构编码解码部分

将编码解码和消息处理功能拆分为独立模块，提高代码可维护性。

## 2023-xx-xx 修复"无效的解码器"错误误报

修复了在数据同步过程中可能出现的"无效的解码器"错误误报问题。主要改进：

1. 修改了`isValidDecoder`函数，使其更宽容地处理边界情况（如解码器位置刚好等于数组长度的情况）
2. 改进了消息处理函数，更好地处理空数据和边界情况
3. 降低了某些非关键错误的日志级别，避免过多的错误报告
4. 添加了更多的健壮性检查和后备机制，确保即使出现问题也能尽可能继续同步

这些改进使得同步过程更加健壮，减少了不必要的错误日志，同时保持了数据同步的有效性。

## 开发说明

### 编码解码模块

`binaryUtils.js` - 提供二进制数据处理工具函数，支持Base64编码解码和数据类型检测
`messageHandlers.js` - 提供消息处理工具函数，处理各种类型的YJS同步消息

### 注意事项

1. 解码器位置刚好等于数组长度时，是正常的边界情况（表示数据已全部读取完毕）
2. 二进制数据处理需要特别注意空数据和数据类型转换的边界情况
3. WebSocket通信中可能出现各种格式的消息（二进制、JSON、Base64编码的字符串等），需要灵活处理

# SyncedStore 实现说明

## 功能概述

该模块提供了基于Yjs的同步数据存储实现，主要包含编码与解码功能，用于在网络传输过程中处理数据同步。

## 文件结构

- `impl/encoding.js`: 数据编码相关功能
  - 状态向量编码
  - 更新编码
  - 更新合并与差异处理

- `impl/decoding.js`: 数据解码相关功能
  - 基础数据类型解码
  - 应用更新到文档
  - 状态向量管理

## 设计原则

1. **函数式设计**: 所有函数都遵循函数式编程风格，避免共享状态和副作用
2. **错误处理**: 每个函数包含完善的错误处理机制
3. **性能优化**: 优先考虑性能，特别是在处理大量数据时
4. **可测试性**: 函数设计便于单元测试

## 注意事项

- 所有函数都需要传入Yjs实例，以避免直接依赖
- 编码/解码函数在处理大型文档时可能需要考虑性能优化
- 遵循Yjs的数据同步协议

## useSyncedstore 模块说明

`useSyncedstore` 是一个用于管理状态同步的工具集合，主要用于在多个客户端之间同步数据状态。

### 核心功能

1. `mergeArrays` 函数实现说明：
   - 功能：安全地合并两个数组，并处理嵌套对象和数组的深度复制
   - 设计思路：保持 Vue 的响应式特性，避免引用问题，并处理各种边缘情况
   - 性能考虑：使用深度限制(MAX_DEPTH)防止栈溢出，特别处理复杂嵌套结构
   - 容错机制：包含多种数组清空方法的备选项，确保在不同环境中可靠运行

2. 主要挑战和解决方案：
   - Vue 响应式数组更新：通过特殊的触发机制确保视图更新
   - 深层嵌套对象：使用递归处理，但有最大深度限制
   - 安全性考虑：跳过内部属性和函数，避免复制特殊字段

### 优化方向

1. 性能优化：考虑使用迭代而非递归处理深层结构
2. 内存优化：对大型数组考虑分批处理
3. 可靠性增强：增加更多错误处理和恢复机制

### 使用建议

使用 mergeArrays 时需注意：
- 避免过深的对象嵌套（超过5层）
- 对大型数组可能需要自定义合并策略
- 考虑数组项的唯一性和顺序敏感性

## 局域网思源节点发现机制

以下是几种可以实现局域网中思源节点自动发现的方法设计，可以根据具体需求进行选择实现。

### 1. 基于UDP广播/多播的发现

使用UDP广播或多播技术在局域网内自动发现其他思源节点：

```javascript
function createDiscoveryService(port = 6808) {
  const dgram = require('dgram');
  const socket = dgram.createSocket('udp4');
  
  // 发送者信息
  const nodeInfo = {
    id: generateUniqueId(),
    name: '思源节点-' + Math.floor(Math.random() * 1000),
    ip: getLocalIP(),
    port: 6806,  // 思源API端口
    syncEnabled: true
  };
  
  // 广播消息
  function broadcast() {
    const message = Buffer.from(JSON.stringify({
      type: 'SIYUAN_NODE_ANNOUNCE',
      data: nodeInfo,
      timestamp: Date.now()
    }));
    
    socket.setBroadcast(true);
    socket.send(message, 0, message.length, port, '255.255.255.255');
  }
  
  // 监听其他节点
  socket.on('message', (msg, rinfo) => {
    try {
      const data = JSON.parse(msg.toString());
      if (data.type === 'SIYUAN_NODE_ANNOUNCE' && data.data.id !== nodeInfo.id) {
        console.log('发现思源节点:', data.data);
        onDiscoverNode(data.data);
      }
    } catch (err) {
      console.error('解析发现消息失败:', err);
    }
  });
  
  socket.bind(port);
  
  // 定期广播自己的存在
  setInterval(broadcast, 5000);
  
  // 启动时立即广播
  broadcast();
}
```

### 2. 基于mDNS的服务发现

利用多播DNS (如Bonjour/Avahi)进行零配置网络服务发现：

```javascript
function setupMDNSDiscovery() {
  const mdns = require('mdns');
  
  // 广播自己的服务
  const ad = mdns.createAdvertisement(mdns.tcp('siyuan-sync'), 6806, {
    name: '思源节点-' + Math.floor(Math.random() * 1000),
    txtRecord: {
      id: generateUniqueId(),
      version: '1.0.0',
      syncEnabled: 'true'
    }
  });
  ad.start();
  
  // 浏览网络中的同类服务
  const browser = mdns.createBrowser(mdns.tcp('siyuan-sync'));
  
  browser.on('serviceUp', service => {
    console.log('发现思源节点服务:', service.name);
    console.log('  地址:', service.addresses);
    console.log('  端口:', service.port);
    console.log('  元数据:', service.txtRecord);
    
    if (service.txtRecord.id !== nodeInfo.id) {
      onDiscoverNode({
        id: service.txtRecord.id,
        name: service.name,
        ip: service.addresses[0],
        port: service.port,
        metadata: service.txtRecord
      });
    }
  });
  
  browser.start();
}
```

### 3. HTTP扫描方式

对局域网IP段进行扫描，尝试连接思源API端口：

```javascript
async function scanLocalNetwork() {
  const baseIP = getBaseIP(); // 如"192.168.1."
  const results = [];
  
  for (let i = 1; i < 255; i++) {
    const ip = baseIP + i;
    tryConnectToSiyuan(ip)
      .then(info => {
        if (info) {
          console.log(`发现思源节点: ${ip}`);
          results.push(info);
          onDiscoverNode(info);
        }
      })
      .catch(() => {
        // 连接失败，忽略
      });
  }
}

async function tryConnectToSiyuan(ip) {
  try {
    // 尝试连接思源API
    const response = await fetch(`http://${ip}:6806/api/system/currentTime`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({token: ""}),
      signal: AbortSignal.timeout(500) // 设置超时
    });
    
    if (response.status === 200) {
      // 再获取系统信息
      const sysInfo = await fetch(`http://${ip}:6806/api/system/getSystemInfo`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({token: ""})
      }).then(res => res.json());
      
      return {
        ip,
        port: 6806,
        name: sysInfo.data?.appName || '未知思源节点',
        version: sysInfo.data?.appVersion,
        os: sysInfo.data?.os
      };
    }
    return null;
  } catch (err) {
    return null; // 连接失败
  }
}
```

### 4. 基于WebSocket的发现机制

利用思源现有的WebSocket广播功能实现节点发现：

```javascript
function discoverViaSiyuanBroadcast() {
  // 创建一个特殊的广播通道用于发现
  const ws = new WebSocket(`ws://127.0.0.1:6806/ws/broadcast?channel=siyuan-discovery`);
  
  // 节点信息
  const nodeInfo = {
    id: generateUniqueId(),
    name: '思源节点-' + Math.floor(Math.random() * 1000),
    ip: getLocalIP(),
    port: 6806,
    syncEnabled: true,
    rooms: ['room1', 'room2']  // 当前节点支持的同步房间列表
  };
  
  ws.onopen = () => {
    // 向广播通道发送自己的信息
    setInterval(() => {
      ws.send(JSON.stringify({
        type: 'NODE_ANNOUNCE',
        data: nodeInfo,
        timestamp: Date.now()
      }));
    }, 5000);
  };
  
  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      if (message.type === 'NODE_ANNOUNCE' && message.data.id !== nodeInfo.id) {
        console.log('通过WebSocket发现节点:', message.data);
        onDiscoverNode(message.data);
      }
    } catch (err) {
      console.warn('解析WebSocket消息失败:', err);
    }
  };
}
```

### 与SiyuanProvider整合

可以在现有的SiyuanProvider类中添加发现功能：

```javascript
// 在SiyuanProvider类中添加
discoverNodes() {
  // 实现上述任一发现机制
  
  // 当发现节点时的处理函数
  const onDiscoverNode = (node) => {
    this.emit('node-discovered', [node]);
    
    // 可以尝试与发现的节点建立连接
    if (this.shouldConnect && !this.wsconnected) {
      // 如果当前未连接，可以尝试连接到发现的节点
      this.connectToNode(node);
    }
  };
}

// 连接到指定节点
connectToNode(node) {
  // 构建连接到指定节点的WebSocket URL
  const wsUrl = `ws://${node.ip}:${node.port}/ws/broadcast?channel=${this.siyuanConfig.channel || `sync-${this.roomName}`}`;
  
  console.log(`[思源Provider] 尝试连接到发现的节点: ${node.name} (${wsUrl})`);
  
  // 使用现有的连接逻辑连接到该节点
  this._connectToUrl(wsUrl);
}
```

### 浏览器环境的特殊考虑

在浏览器环境中实现节点发现时需要考虑同源策略限制：

1. 可以通过思源API创建代理接口辅助发现
2. 利用WebRTC的ICE协议进行P2P节点发现
3. 对于同一浏览器多标签页场景，可以利用localStorage或BroadcastChannel实现通信

### 最佳实践

1. **节能考虑**：控制广播/扫描频率，建议5-10秒间隔
2. **安全性**：添加身份验证或验证机制，避免恶意节点连接
3. **用户体验**：提供可视化界面显示已发现节点，让用户选择连接
4. **可靠性**：实现自动重连和节点状态跟踪机制
5. **私密性**：允许用户配置哪些节点可见，哪些房间可以被发现 