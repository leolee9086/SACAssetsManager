# 思源笔记块处理工具

此模块提供了对思源笔记块的处理功能，包括创建、修改、删除和查询等操作。

## 文件结构

- `useBlockHandler.js` - 块处理器主要实现

## 导出内容

### 类

- `BlockHandler` - 块处理器类，提供对块的完整操作功能

### 函数

- `创建块处理器(blockID, initdata, kernelApiInstance)` - 创建一个新的块处理器实例
- `匹配块类型(type)` - 根据块类型名获取对应的类型缩写

## 使用示例

```javascript
import { 创建块处理器, BlockHandler } from '../../../toolBox/useAge/forSiyuan/forBlock/useBlockHandler.js';

// 方式1：使用类
const 块处理器 = new BlockHandler('块ID');
const 块内容 = 块处理器.markdown;

// 方式2：使用函数
const 另一个块处理器 = 创建块处理器('另一个块ID');
await 另一个块处理器.insertAfter('新的内容');
```

## 功能说明

### 块属性操作

- 获取/设置块属性
- 获取/设置块样式
- 获取/设置块别名

### 块内容操作

- 获取/设置Markdown内容
- 在块前/后插入内容
- 在块首/尾追加内容

### 块查询与遍历

- 获取块类型
- 获取块元素
- 获取父块
- 获取子块

### 块移动与删除

- 移动块到指定位置
- 删除块
- 删除父块

### 块转换

- 转换为子文档
- 转换为标题
- 转换块类型

## 重构信息

本模块从 `source/fromThirdParty/siyuanUtils/BlockHandler.js` 重构而来，采用函数式风格的包装，同时保留原有的类以兼容现有代码。

### 主要变更

1. 添加了完整的JSDoc文档注释
2. 提供了中文命名的函数API
3. 优化了部分方法的实现
4. 修复了原有代码中的一些问题

## 后续计划

1. 增加更多的块操作功能
2. 为耗时操作添加缓存策略
3. 优化性能关键路径
4. 添加单元测试 