# 工具箱（ToolBox）

此文件夹包含各种通用工具函数，为整个项目提供基础能力支持。工具箱采用模块化设计，根据功能领域划分为不同的子目录。

## 文件夹结构

- `base/` - 基础工具函数，提供核心能力支持
- `feature/` - 特定功能领域的工具
- `forCore/` - 核心功能相关工具，如串链器
- `forEvent/` - 事件处理相关工具
- `forMime/` - MIME类型处理工具
- `useAge/` - 使用时间/使用期限相关工具
- `useDeps/` - 依赖管理相关工具
- `usePolyfills/` - 平台兼容性和检测工具
- `useVue/` - Vue框架相关工具

## 使用指南

推荐通过 `toolBoxExports.js` 统一导入所需的工具函数：

```js
// 推荐：导入特定工具
import { createEventBus } from './toolBox/toolBoxExports.js';

// 或者按需导入
import { 创建文本工具 } from './toolBox/base/useEcma/textTools.js';
```

## 工具函数归并建议

### 当前目录下需要归并的文件

1. `基础文本工具.js` -> 应移至 `base/useEcma/textTools.js`
   - 包含通用的文本处理功能，属于ECMA基础能力范畴

2. `UA分析.js` -> 应移至 `usePolyfills/uaAnalysis.js`
   - 与平台检测相关，已有相关模块在usePolyfills目录

### 项目其他位置需要归并的文件

1. `source/utils/globBuilder.js` -> 应移至 `base/useEcma/forFile/globTools.js`
   - 提供文件路径匹配功能，属于基础文件处理工具

2. `source/utils/objectTools.js` -> 旧版兼容层，已被较新版本取代
   - 已有对应实现：`src/toolBox/base/useEcma/forObjectManagement/forDeepCopy.js`

3. `source/utils/functionTools.js` -> 旧版兼容层，已被较新版本取代
   - 已有对应实现：`src/toolBox/base/useEcma/forFunctions/`目录下的相关文件

4. `imageToolBox.js` -> 应移至 `feature/useImage/imageToolBox.js`
   - 提供全面的图像处理工具参考，应归类到特定功能工具

5. `collect-licenses-grouped.js` -> 应移至 `base/useDeps/licensesTools.js`
   - 提供依赖许可证收集功能，属于依赖管理工具

## 工具箱使用原则

工具箱应该只包含通用的、可在多个场景重用的函数。以下是判断一个函数是否应该归入工具箱的标准：

1. **通用性**：该函数解决的是通用问题，不依赖于特定业务逻辑
2. **可重用性**：该函数在项目的多个部分都可能被使用
3. **职责单一**：该函数只做一件事，并做好这件事
4. **无副作用**：优先使用纯函数，尽量避免改变外部状态

## 贡献指南

向工具箱添加新工具时，请遵循以下原则：

1. **通用性原则**：只有非常通用、可复用的函数才应放入工具箱
2. **职责单一**：每个工具函数应该只做一件事，并做好
3. **函数式风格**：尽可能使用函数式编程风格，减少副作用
4. **命名规范**：
   - 使用有意义的文件名和函数名
   - 避免使用index.js、main.js等无语义文件名
5. **代码组织**：
   - 按功能域组织工具函数
   - 相关功能应该放在同一目录下
   - 文件过长时应及时拆分

## 测试

所有工具函数都应有对应的单元测试，确保其正确性和稳定性。

## 中文名和英文名的使用

使用符合文式编程的命名风格,可能的前提下兼顾中英文调用,中文优先

外部导入和原生特性等使用英文(如果原本就是英文的话)

函数名使用中文

数据结构一般使用英文,但是参数等使用中文

## 笔记

AI助手可以使用AInote.md在各个文件夹记录更改文件时的注意事项