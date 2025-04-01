# 自定义模块加载系统

本目录包含了扩展Node.js原生模块加载系统的工具，主要是为了解决在特定环境下模块加载路径管理的问题。

## 核心文件

### hackRequire.js

该文件实现了一个自定义的require系统，它能够：

1. **扩展搜索路径** - 允许从指定的外部路径加载模块
2. **透明拦截** - 拦截原生require调用，尝试从自定义路径加载
3. **优雅降级** - 在找不到模块时尝试备选路径，而不是直接失败

## 工作原理

1. 保存原始的require引用到realRequire
2. 重写require函数，添加自定义查找逻辑
3. 拦截module.load方法，增强模块加载机制
4. 提供API允许动态设置外部依赖路径

## 关键API

```javascript
// 设置外部依赖搜索路径
window.require.setExternalDeps(依赖路径)

// 设置外部基础路径（只能设置一次）
window.require.setExternalBase(基础路径)
```

## 使用示例

```javascript
// 导入hack机制
import '../utils/hack/hackRequire.js'

// 配置外部路径
const 外部路径 = path.join(工作目录, 'node_modules') 
window.require.setExternalBase(外部路径)

// 正常使用require - 现在会自动查找外部路径
const lodash = require('lodash')
```

## 注意事项

1. 这种黑客技术修改了Node.js核心行为，应谨慎使用
2. 可能会导致某些依赖模块版本冲突
3. 主要用于特定场景（如思源插件）下的模块管理 