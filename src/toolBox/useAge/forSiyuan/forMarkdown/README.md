# 思源笔记Markdown处理工具

此模块提供了对思源笔记块Markdown内容的处理功能，包括读取和写入操作。

## 文件结构

- `useSiyuanMarkdown.js` - Markdown处理工具函数

## 导出内容

### 对象

- `Markdown工具` - 提供Markdown内容读写的工具对象

### 函数

- `创建Markdown工具(容器)` - 创建针对特定块容器的Markdown工具实例
- `markdown委托器` - 兼容原有API的委托器对象（不推荐直接使用）

## 使用示例

### 函数式API

```javascript
import { Markdown工具 } from '../../../toolBox/useAge/forSiyuan/forMarkdown/useSiyuanMarkdown.js';

// 定义块容器
const 块容器 = {
  id: '块ID',
  kernelApi: kernelApiInstance
};

// 获取Markdown内容
const 内容 = Markdown工具.获取(块容器);

// 设置Markdown内容
Markdown工具.设置(块容器, '新的**Markdown**内容');

// 异步操作
const 异步内容 = await Markdown工具.获取异步(块容器);
await Markdown工具.设置异步(块容器, '异步设置的**内容**');
```

### 实例化API

```javascript
import { 创建Markdown工具 } from '../../../toolBox/useAge/forSiyuan/forMarkdown/useSiyuanMarkdown.js';

// 定义块容器
const 块容器 = {
  id: '块ID',
  kernelApi: kernelApiInstance
};

// 创建针对特定块的工具实例
const markdown处理器 = 创建Markdown工具(块容器);

// 获取内容
const 内容 = markdown处理器.获取();

// 设置内容
markdown处理器.设置('新的**Markdown**内容');

// 异步操作
const 异步内容 = await markdown处理器.获取异步();
await markdown处理器.设置异步('异步设置的**内容**');
```

## 功能说明

### Markdown内容读取

- 同步读取块的Markdown内容
- 异步读取块的Markdown内容

### Markdown内容写入

- 同步更新块的Markdown内容
- 异步更新块的Markdown内容

## 重构信息

本模块从 `source/fromThirdParty/siyuanUtils/delegators/markdown.js` 重构而来，采用函数式风格重新设计。

### 主要变更

1. 添加了完整的JSDoc文档注释
2. 提供了中文命名的函数API
3. 增加了实例化工具创建方式
4. 保留了原有的委托器API以兼容现有代码

## 后续计划

1. 增加批量操作多个块的Markdown内容功能
2. 增加Markdown内容的解析和渲染功能
3. 增加Markdown格式化和美化功能
4. 增加Markdown内容的差异比较功能 