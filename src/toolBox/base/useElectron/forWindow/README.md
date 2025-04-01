# Electron 窗口管理工具

本目录包含与 Electron 窗口创建和管理相关的工具函数，用于简化 BrowserWindow 的使用和控制。

## 文件概览

- `useBrowserWindow.js` - 浏览器窗口管理工具，提供窗口创建和控制功能

## 主要功能

### 浏览器窗口管理

提供高级 BrowserWindow 管理功能：

- 创建和配置 Electron 浏览器窗口
- 处理窗口单实例和多实例场景
- 支持窗口持久化和自动重建
- 内置心跳检测机制确保窗口活跃状态

## 使用示例

### 创建基本浏览器窗口

```javascript
import { 创建浏览器窗口 } from '../toolBox/base/useElectron/forWindow/useBrowserWindow.js';

// 创建一个简单窗口
const 窗口 = await 创建浏览器窗口('http://localhost:6806/index.html', {
  立即显示: true,
  清除缓存: true
});

// 操作窗口
窗口.maximize();
```

### 创建单实例窗口

```javascript
import { 创建浏览器窗口 } from '../toolBox/base/useElectron/forWindow/useBrowserWindow.js';

// 获取同源窗口函数
const 获取同源窗口 = (url) => {
  const { BrowserWindow } = window.require('@electron/remote');
  const 所有窗口 = BrowserWindow.getAllWindows();
  const 主机名 = new URL(url).hostname;
  
  return 所有窗口.filter(窗口 => {
    try {
      const 窗口URL = 窗口.webContents.getURL();
      return 窗口URL.includes(主机名);
    } catch (e) {
      return false;
    }
  });
};

// 创建单实例持久窗口
const 窗口 = await 创建浏览器窗口('http://localhost:6806/server', {
  单实例: true,
  保持活跃: true,
  使用心跳检测: true,
  获取同源窗口函数: 获取同源窗口
});
```

### 创建无标题栏窗口

```javascript
import { 创建浏览器窗口 } from '../toolBox/base/useElectron/forWindow/useBrowserWindow.js';

// 创建无标题栏窗口
const 窗口 = await 创建浏览器窗口('http://localhost:6806/custom-ui', {
  显示标题栏: false,
  立即显示: false  // 先加载内容，再显示窗口
});

// 窗口加载完成后显示
窗口.webContents.once('did-finish-load', () => {
  窗口.show();
});
```

## 特别注意

### 心跳检测机制

心跳检测用于确保窗口正常运行，防止窗口无响应：

1. 主窗口每秒向目标窗口发送心跳消息
2. 目标窗口收到心跳后回应
3. 如果 10 秒内没有收到响应，窗口将被关闭并重新创建
4. 心跳检测默认启用，可通过配置关闭

### 窗口生命周期管理

1. 单实例模式下，同源窗口将被关闭，只保留一个实例
2. 保持活跃选项使窗口关闭后自动重新创建
3. 窗口关闭时会清理相关资源和心跳计时器

## 配置选项

| 配置项 | 类型 | 默认值 | 说明 |
|-------|------|-------|------|
| 关闭已有窗口 | boolean | true | 是否关闭同源URL的已有窗口 |
| 单实例 | boolean | true | 确保同源URL只有一个窗口实例 |
| 立即显示 | boolean | true | 窗口创建后是否立即显示 |
| 清除缓存 | boolean | true | 是否在加载URL前清除缓存 |
| 保持活跃 | boolean | true | 窗口关闭时是否自动重新创建 |
| 使用心跳检测 | boolean | true | 是否启用心跳检测机制 |
| 显示标题栏 | boolean | true | 是否显示窗口标题栏 |
| 获取同源窗口函数 | Function | null | 自定义查找同源窗口的函数 | 