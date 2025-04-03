# 重构笔记: BlockHandler

## 重构背景

`BlockHandler` 原本位于 `source/fromThirdParty/siyuanUtils/BlockHandler.js`，作为一个工具类提供对思源笔记块的处理功能。根据项目的模块化设计规范，应将其迁移至工具箱的合适位置，并采用函数式风格进行包装。

## 重构方案

1. 将原类移动到 `src/toolBox/useAge/forSiyuan/forBlock/useBlockHandler.js`
2. 保留 `BlockHandler` 类以维持兼容性
3. 提供函数式封装 `创建块处理器()`
4. 添加完整 JSDoc 文档注释
5. 修复原有代码的缺陷

## 注意事项

### 方法设计

原 `BlockHandler` 类混合了多种设计风格:

1. 使用了 getter/setter 属性
2. 使用了异步方法
3. 使用了 Proxy 进行属性拦截

重构时保留了这些特性，并且添加了清晰的类型标注和返回值说明。

### 核心API依赖

该模块依赖 `kernelApi` 提供的思源笔记核心 API。目前仍使用原始路径引入：

```javascript
import kernelApi from '../../../../../polyfills/kernelApi.js';
```

在后续重构中，应考虑将 `kernelApi` 也纳入工具箱体系，可能的路径是 `src/toolBox/useAge/forSiyuan/useSiyuanKernel.js`。

### 类保留原因

虽然项目规范建议避免使用类，但 `BlockHandler` 使用了大量的 getter/setter 和方法链式调用，完全转换为函数式风格会带来较大改动。因此选择保留类并提供函数式包装。

### 方法命名

保留了原有方法名，并为部分中文方法名添加了正确的函数签名和JSDoc注释。例如 `获取文档` 和 `批量移动文档` 等方法。

## 后续工作

1. 修复文件中引用的 `kernelApi.获取文档` 等中文API方法，这些方法当前可能不兼容
2. 完善 `listChildren` 等方法的实现
3. 可能需要将 `prepend` 和 `append` 等方法中的 `type` 参数拆分为必选参数
4. 增加对核心API错误处理的支持

## 相关依赖

- 思源块处理功能依赖于思源内核API
- `BlockHandler` 被 `source/noteChat/index.js` 等文件引用 