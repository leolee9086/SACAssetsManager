# ECMA标准功能封装 (useEcma)

此目录包含与ECMAScript标准相关的工具函数封装，提供了对JavaScript原生功能的扩展和增强。

## 目录结构

- `forFile/` - 文件操作相关工具
- `forCrypto/` - 加密和哈希相关工具
- `forFunctions/` - 函数式编程工具（柯里化、防抖等）
- `forMath/` - 数学计算和几何处理工具
- `forObjectManagement/` - 对象操作和管理工具
- `forString/` - 字符串处理工具
- `textTools.js` - 文本处理工具，支持管道处理

## 设计原则

1. **纯函数优先**：尽可能使用纯函数，避免副作用
2. **函数式风格**：采用函数式编程风格，支持组合和管道处理
3. **零依赖**：尽量不引入外部依赖，使用原生API
4. **类型安全**：提供类型提示和文档

## 使用示例

```javascript
// 文本处理
import { 创建文本工具 } from '../toolBox/base/useEcma/textTools.js';

const 文本工具 = 创建文本工具('Hello World');
const 处理结果 = 文本工具.管道(
  文本工具.转大写(),
  文本工具.分割(' '),
  文本工具.连接('-')
)(文本工具.创建上下文());

console.log(文本工具.获取文本()(处理结果)); // "HELLO-WORLD"

// 对象处理
import { 深拷贝 } from '../toolBox/base/useEcma/forObjectManagement/forDeepCopy.js';

const 原对象 = { a: 1, b: { c: 2 } };
const 新对象 = 深拷贝(原对象);
```

## 贡献指南

添加新的工具函数时，请遵循以下原则：

1. 按功能域分类，放在对应的子目录中
2. 提供完整的JSDoc文档注释
3. 同时提供中文命名和英文命名版本
4. 编写单元测试确保功能正确性 