# 自定义模块加载工具

本目录包含了扩展Node.js模块加载系统的工具，主要用于在思源笔记插件环境中管理外部依赖。

## 主要文件

- **hackRequire.js**: 提供自定义require函数，允许从指定外部路径加载模块

## 使用说明

1. 在应用启动入口处导入此模块
2. 设置外部依赖路径
3. 正常使用require函数（将自动处理路径查找）

### 示例代码

```javascript
// 在初始化文件中导入
import './utils/hack/hackRequire.js'

// 配置外部路径
const 配置Require = (workspaceDir) => {
  const path = require('path')
  const 外部路径 = path.join(workspaceDir, '/data/plugins/SACAssetsManager/node_modules/')
  
  // 设置外部依赖搜索路径
  window.require.setExternalBase(外部路径)
  window.require.setExternalDeps(外部路径)
}

// 之后可以正常使用require
const express = require('express')
```

## API 参考

### `window.require.setExternalBase(路径)`

设置外部依赖基础路径，此路径会被添加到模块搜索路径中。
注意：此方法只能调用一次。

### `window.require.setExternalDeps(路径)`

添加额外的外部依赖路径，可以多次调用添加多个路径。

## 技术原理

通过重写原生require函数和模块加载机制，当模块未在标准路径中找到时，会自动从用户配置的外部路径中查找。 