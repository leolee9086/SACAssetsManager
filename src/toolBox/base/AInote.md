# 这个部分由开发者编写,未经允许禁止AI助手更改

请注意引入限制

外部依赖的引入只允许发生在/toolbox/base或者/toolbox/feature层中;

如果你发现usage层中发现了外部依赖(包括浏览器特性依赖等),应该及时将相关工具重构到/toolbox/base中,极其基本高频的调用除外



# 基础工具函数重构笔记

## 重构状态

这个目录包含所有基础工具函数，是工具箱的核心层。重构仍在进行中。

## 职责范围

- 提供最底层、最通用的工具函数
- 建立稳定的基础能力层
- 被其他模块广泛使用

## 重构原则

1. **架构清晰**：
   - 按功能域划分子目录
   - 明确模块的边界和职责
   - 避免功能重叠

2. **命名一致**：
   - 统一使用for和use前缀
   - for前缀用于领域功能工具
   - use前缀用于技术栈或平台工具

3. **依赖管理**：
   - 基础层尽量减少外部依赖
   - 必要的外部依赖通过useDeps管理
   - 避免循环依赖

4. **兼容处理**：
   - 保持向后兼容性
   - 为旧版本API提供兼容层
   - 逐步替换旧引用

## 重构进度

- ✅ usePolyfills/uaAnalysis.js - UA分析工具（已完成）
- ✅ forNetWork/forFetch - fetch工具（已完成）
- ✅ forNetWork/forPort - 端口工具（已完成）
- ✅ useDeps/pinyinTools.js - 拼音工具（已完成）
- ⏳ useEcma - ECMA标准功能封装（进行中）
- ⏳ forEvent - 事件处理工具（进行中）
- ⏳ forMime - MIME类型处理（进行中）
- ⏳ forCore - 核心串链器工具（进行中）
- ⏳ forUI - 通用UI组件工具（进行中）
- ⏳ useEnv - 环境变量工具（进行中）
- ⏳ useBrowser - 浏览器相关工具（进行中）
- ⏳ useElectron - Electron相关工具（进行中）

## 待处理事项

1. 目录命名规范化：
   - 检查并统一所有子目录的命名前缀（for或use）
   - 合并功能重复的目录（如forMime和useMime）

2. 文件整理：
   - 将散落在其他位置的基础工具函数迁移到此目录
   - 对体积较大的文件进行分解

3. 文档完善：
   - 为每个子目录添加README.md
   - 完善JSDoc文档

4. 测试覆盖：
   - 添加单元测试
   - 验证向后兼容性

## 注意事项

- 基础工具函数是最底层的依赖，应该保持高度稳定性
- 任何API变更都需要仔细考虑向后兼容性
- 重构过程中应保留原有函数名的导出
- 尽量使用纯函数风格，减少副作用
- 对于有状态的功能，考虑函数工厂模式而非类

## 目录命名规范说明

1. **for前缀**：
   - 用于功能域工具，如forString、forMath
   - 针对特定数据类型或操作领域
   - 一般不依赖特定技术栈或平台

2. **use前缀**：
   - 用于技术栈或平台工具，如useEcma、useBrowser
   - 可能封装特定环境或技术的能力
   - 提供更高层次的抽象 

# base 文件夹说明

该文件夹包含项目中使用的基础工具函数和组件，提供通用的底层功能支持。

## 文件说明

### iframeLoader.js

`iframeLoader.js` 提供了一个通用的iframe加载器，用于在隔离环境中加载外部库。

主要功能：
- 在隔离的iframe环境中加载外部JavaScript库
- 获取库导出的对象
- 支持将库对象存储到全局Symbol中
- 防止库污染主应用环境

使用示例：
```javascript
import { createIframeLoader } from './base/iframeLoader.js';

const iframeLoader = createIframeLoader();
const myLibrary = await iframeLoader(
  '/path/to/library.js',  // 脚本路径
  'libraryName',          // 库在window对象上的名称
  'globalSymbolName'      // 可选：用于全局存储的Symbol名
);
```

## 设计理念

基础工具遵循以下原则：
- 功能单一：每个工具专注于解决一个特定问题
- 无副作用：尽量避免修改全局状态
- 函数式风格：优先使用纯函数，避免类和继承
- 高复用性：工具应易于在不同场景中重用 