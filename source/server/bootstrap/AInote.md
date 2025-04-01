# bootstrap 目录

这个目录包含了应用程序的引导和初始化相关代码。主要负责在应用程序启动时执行的初始化任务，包括：

## 模块说明

### requireHack.js
- 提供了自定义 require 功能的实现
- 允许从指定的 node_modules 目录加载模块
- 通过广播通道接收配置信息并初始化环境

### staticImageService.js
- 负责初始化和加载静态图片服务
- 修改 webview 组件以支持图片服务
- 提供自动轮询重试机制确保服务正确启动

### logManager.js
- 管理日志组件的初始化和配置
- 在DOM加载完成后自动启动日志系统
- 协调各日志子系统的工作

## 设计原则

1. **模块化设计**：每个引导组件都是独立的，关注点分离清晰
2. **容错处理**：对初始化过程中的异常有适当的处理机制
3. **异步处理**：合理使用异步函数处理初始化任务
4. **轻量实现**：引导模块应尽量轻量，必要时才加载更多资源

## 用法示例

```javascript
// 导入并初始化
import { 初始化消息通道 } from './bootstrap/requireHack.js'
import { 轮询初始化图片服务 } from './bootstrap/staticImageService.js'
import { 在DOM加载后初始化日志 } from './bootstrap/logManager.js'

// 初始化消息通道
初始化消息通道()

// 初始化图片服务和日志系统
Promise.all([
  轮询初始化图片服务(),
  在DOM加载后初始化日志()
]).then(([图片服务结果, 日志结果]) => {
  console.log('初始化完成:', { 图片服务: 图片服务结果, 日志: 日志结果 })
})
``` 