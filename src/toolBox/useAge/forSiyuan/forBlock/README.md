# 思源笔记块处理工具

此模块提供了对思源笔记块的处理功能，包括创建、修改、删除和查询等操作。

## 文件结构

- `useBlockHandler.js` - 块处理器主要实现
- `useSiyuanBlockIcon.js` - 块图标工具函数

## 导出内容

### 类

- `BlockHandler` - 块处理器类，提供对块的完整操作功能

### 函数

#### useBlockHandler.js
- `创建块处理器(blockID, initdata, kernelApiInstance)` - 创建一个新的块处理器实例
- `匹配块类型(type)` - 根据块类型名获取对应的类型缩写

#### useSiyuanBlockIcon.js
- `根据类型获取图标(type, sub)` - 根据块类型获取对应的图标名称
- `获取块类型图标映射()` - 返回块类型图标映射表的只读副本
- `获取列表图标映射()` - 返回列表图标映射表的只读副本

## 使用示例

### BlockHandler

```javascript
import { 创建块处理器, BlockHandler } from '../../../toolBox/useAge/forSiyuan/forBlock/useBlockHandler.js';

// 方式1：使用类
const 块处理器 = new BlockHandler('块ID');
const 块内容 = 块处理器.markdown;

// 方式2：使用函数
const 另一个块处理器 = 创建块处理器('另一个块ID');
await 另一个块处理器.insertAfter('新的内容');
```

### BlockIcon

```javascript
import { 根据类型获取图标 } from '../../../toolBox/useAge/forSiyuan/forBlock/useSiyuanBlockIcon.js';

// 获取普通块类型图标
const 段落图标 = 根据类型获取图标('NodeParagraph'); // 返回 'iconParagraph'

// 获取标题块图标（需要子类型）
const 二级标题图标 = 根据类型获取图标('NodeHeading', '2'); // 返回 'iconH2'

// 获取列表块图标（根据列表类型）
const 任务列表图标 = 根据类型获取图标('NodeList', 't'); // 返回 'iconCheck'
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

### 块图标

- 根据块类型获取对应图标
- 支持特殊类型（标题、列表）的图标获取
- 提供图标映射表访问

## 重构信息

本模块从 `source/fromThirdParty/siyuanUtils/` 目录下的相关文件重构而来：

- `BlockHandler.js` → `useBlockHandler.js`
- `blockIcons.js` → `useSiyuanBlockIcon.js`

采用函数式风格的包装，同时保留原有的类和函数以兼容现有代码。

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