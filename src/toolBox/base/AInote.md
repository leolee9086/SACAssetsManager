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

3. **依赖管理 (重要调整)**：
   - **基础层 (`base`) 内部依赖规则:**
     - 功能性目录 (如 `useEcma`, `forMath`, `forNetwork`) **禁止** 相互引用。
     - 功能性目录 **允许且仅允许** 从 `base/useDeps` 目录引入外部依赖的封装接口。
     - `base/useDeps` 目录是**唯一**允许直接引入外部依赖的地方。
   - 基础层尽量减少外部依赖
   - 必要的外部依赖通过useDeps管理
   - 避免循环依赖

4. **兼容处理**：
   - 保持向后兼容性
   - 为旧版本API提供兼容层
   - 逐步替换旧引用

## 外部依赖管理原则 (`useDeps`)

**核心原则:** 本 `base` 目录下的 [`./useDeps`](./useDeps) 子目录是项目中**唯一**允许直接引入外部依赖（来自 `node_modules` 或 `static`）的地方。所有外部依赖**必须**在此处进行封装。

**目标:**
*   集中管理依赖版本。
*   提供稳定的内部接口，隔离外部变化。
*   简化依赖追踪和维护。

**实现方式:**
*   其他所有模块（`base` 内其他目录, `feature`, `useAge`）都应通过从 `./useDeps` 导出的接口来使用外部功能，**禁止**直接 `import` 外部库。

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

## 结构分析与调整计划 (由 AI 助手 织 记录 @ 2024-07-28)

**目标:** 明确 `base` 目录范围，确保只包含基础、通用、与应用解耦的工具。

**`base` 目录定位:**
*   封装底层 API (ECMAScript, Node, Browser, Electron)。
*   提供通用计算、处理逻辑 (数学, 事件, 网络, MIME, 路径)。
*   环境信息、兼容性处理、依赖管理辅助。

**当前 `base` 内容评估:**
*   ✅ **符合:** `useEcma`, `useBrowser`, `forNetwork` (原 `forNetWork`), `usePath`, `forEvent`, `useDeps`, `forMath`, `useNode`, `useElectron`, `useEnv`, `usePolyfills`, `forMime`, `forChain` (函数式/流程控制工具)。
*   ❌ **不符合 (已处理/逻辑废弃):**
    *   `useVue`: (已更新 `feature/useVue` 导入，空目录待手动删除)。
    *   `useMime`: (确认为空，空目录待手动删除)。
    *   `forNetWork`: (内容已移至 `forNetwork`，空目录待手动删除)。
*   ❓ **待查:**
    *   `useUtils`: 内容模糊，需检查后决定拆分或移动。
    *   `useNative`: 内容模糊，需明确范围，避免与 `useBrowser`/`useNode`/`useElectron` 重叠。

**潜在可移入 `base` 的:**
*   来自 `feature`: `useDataStruct`, `forColors`, `useStateMachine`, `useSvg` (基础操作部分)。
*   来自 `useAge`: `forSync`, `forSafe`, `forText` (通用部分)。

**待办事项:**
1.  **立即执行:**
    *   将 `base/useVue` 移动/合并到 `feature/useVue`。
    *   检查 `base/forMime` 和 `base/useMime` 内容，合并功能到 `forMime`，删除 `useMime`。
    *   将 `base/forNetWork` 重命名为 `base/forNetwork`。
2.  **后续探查:**
    *   `useUtils`, `useNative`, `useModules`, `forUI` 的具体内容和代码，明确其归属。
    *   评估上面列出的"潜在可移入 `base`"的模块，确认是否适合移入。 