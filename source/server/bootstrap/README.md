# 引导启动模块

这个目录包含了系统引导启动相关的模块，主要负责初始化系统环境和加载核心组件。

## 文件说明

- **requireHack.js**: 自定义require实现，使系统能从特定目录加载模块
- **staticImageService.js**: 静态图片服务加载器
- **logManager.js**: 日志系统初始化和管理模块

## 工作流程

1. 通过消息通道接收系统配置
2. 初始化自定义require功能，设置模块加载路径
3. 加载静态图片服务
4. 初始化日志系统和界面组件

## 依赖说明

- 依赖于日志系统模块 (`../utils/logs/`)
- 依赖于Vue组件加载器 (`src/toolBox/feature/useVue/vueComponentLoader.js`)

## 使用方法

```javascript
// 初始化系统
import { 初始化消息通道 } from './bootstrap/requireHack.js'
import { 轮询初始化图片服务 } from './bootstrap/staticImageService.js'
import { 在DOM加载后初始化日志 } from './bootstrap/logManager.js'

// 启动系统
const 启动系统 = async () => {
  // 第一步：初始化消息通道
  初始化消息通道()
  
  // 第二步：初始化服务和日志
  const [图片服务状态, 日志状态] = await Promise.all([
    轮询初始化图片服务(),
    在DOM加载后初始化日志()
  ])
  
  // 检查初始化状态
  if (!图片服务状态 || !日志状态) {
    console.error('系统初始化失败')
    return false
  }
  
  console.log('系统初始化完成')
  return true
}

// 执行启动
启动系统()
``` 