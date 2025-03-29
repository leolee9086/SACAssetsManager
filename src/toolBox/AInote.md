# 这个区块的内容来自开发者,禁止AI未经允许修改

现在扫描所有utils等类似命名的文件夹,尝试进行重构

注意我们需要集中思源笔记的环境依赖,可以使用useSiyuan进行集中

由于一些原因项目中零散分布有一些工具文件,你也需要重构这些文件

对于外部依赖,当你发现一个node_modules中的依赖可能可以使用static中使用esm形式打包成静态文件时,你应该提出建议(但是不要修改,这一部分暂时由开发者处理)

注意项目中的**每一个**文件夹你都可以创建readme和AInote

有关重构的最终目标你可以查看项目根目录的index new.js

# 工具箱重构笔记

## 工具箱结构概览

工具箱采用模块化设计，按功能域组织为不同子目录:

```
src/toolBox/
├── base/           - 基础工具函数
│   ├── useEcma/    - ECMA标准功能封装
│   │   ├── forFile/     - 文件操作相关工具
│   │   ├── forMath/     - 数学计算工具
│   │   ├── forString/   - 字符串处理工具 ✅
│   │   ├── textTools.js - 文本处理工具 ✅
│   │   └── ...
│   ├── forNetWork/  - 网络相关工具
│   │   ├── forFetch/     - fetch工具 ✅
│   │   ├── forPort/      - 端口工具 ✅
│   │   └── ...
│   ├── useDeps/    - 依赖管理工具
│   │   ├── pinyinTools.js - 拼音工具 ✅
│   │   └── ...
│   └── ...
├── feature/        - 特定功能工具
│   ├── useImage/   - 图像处理工具
│   └── ...
├── forCore/        - 核心串链器工具
├── forEvent/       - 事件处理工具
├── forMime/        - MIME类型处理
├── useAge/         - 使用时间相关工具
│   ├── forFileManage/    - 文件管理工具
│   ├── forSiyuan/        - 思源特定功能工具
│   │   ├── useSiyuanMenu.js    - 思源菜单工具 ✅
│   │   ├── useSiyuanDialog.js  - 思源对话框工具 ✅
│   │   ├── useSiyuanSystem.js  - 思源系统API ✅
│   │   └── ...
│   ├── useSiyuan.js      - 思源环境依赖集中管理 ✅
│   └── ...
├── useDeps/        - 依赖管理工具
├── usePolyfills/   - 平台兼容性工具
│   ├── uaAnalysis.js - UA分析工具 ✅
│   └── ...
├── useVue/         - Vue框架工具
├── toolBoxExports.js  - 统一导出接口
└── README.md       - 工具箱说明
```

## 已完成的重构(建议不要列举太多,隔一段时间总结一下,列出最近的动作就可以了)

1. 从根目录迁移的工具:
   - `imageToolBox.js` → `feature/useImage/imageToolBox.js` ✅
   - `collect-licenses-grouped.js` → `base/useDeps/licensesTools.js` ✅

2. 从source/utils迁移的工具:
   - `globBuilder.js` → `base/useEcma/forFile/globTools.js` ✅
   - `netWork/fetchWorker.js` → `base/forNetWork/forFetch/fetchWorkerTools.js` ✅
   - `netWork/fetchSync.js` → `base/forNetWork/forFetch/fetchSyncTools.js` ✅
   - `strings/search.js` → `base/useEcma/forString/forSearch.js` ✅

3. 从当前toolBox目录迁移的工具:
   - `基础文本工具.js` → `base/useEcma/textTools.js` ✅
   - `UA分析.js` → `usePolyfills/uaAnalysis.js` ✅

4. 创建的兼容层:
   - 根目录保留原文件名，但内容改为导入新位置的模块并重导出 ✅
   - 添加弃用警告，指导开发者使用新路径 ✅

5. 创建的目录说明文档:
   - `feature/useImage/README.md` ✅
   - `base/useDeps/README.md` ✅
   - `base/useEcma/forFile/README.md` ✅
   - `base/useEcma/README.md` ✅
   - `usePolyfills/README.md` ✅
   - `base/forNetWork/forFetch/README.md` ✅
   - `base/useEcma/forString/README.md` ✅
   - `useAge/README.md` ✅
   - `useAge/forSiyuan/README.md` ✅

6. 新增的依赖管理工具:
   - `base/useDeps/pinyinTools.js` - 拼音处理第三方依赖的封装 ✅
   - `useAge/useSiyuan.js` - 思源笔记环境依赖集中管理 ✅
   - `useAge/forSiyuan/useSiyuanDialog.js` - 思源对话框工具 ✅
   - `useAge/forSiyuan/useSiyuanSystem.js` - 思源系统API ✅

## 重构原则

1. **最小改动**:
   - 创建兼容层以保持现有代码可用
   - 保留原函数名导出，添加中文命名版本

2. **函数式风格**:
   - 尽可能使用纯函数
   - 避免使用类，除非必要
   - 减少嵌套和副作用

3. **命名规范**:
   - 避免无语义的文件名(index.js, main.js)
   - 优先使用中文命名函数
   - 文件名应反映功能

4. **模块化设计**:
   - 按功能域组织工具
   - 相关功能放在同一目录
   - 文件过长时及时拆分

5. **依赖管理规范**:
   - useDeps 目录专门用于处理所有外部模块引用
   - 原则上任何外部模块不能被除了 useDeps 以外的文件直接引用
   - 需要使用外部模块的工具应当通过 useDeps 提供的封装接口进行调用
   - 所有外部依赖应在 useDeps 中进行集中管理和版本控制

## 后续重构计划

1. **待重构文件**:
   - `source/utils/time/` 目录下的时间处理工具
   - `source/utils/object/` 目录下的对象处理工具
   - `source/utils/` 目录下的其他工具函数
   - 继续完善 `useAge/forSiyuan/` 目录，迁移更多思源相关工具

2. **工具增强**:
   - 为更多工具函数添加单元测试
   - 补充JSDoc文档
   - 优化性能关键路径

## 注意事项

1. 所有重构应遵循"兼容、增强、替换"的三步走策略:
   - 先建立兼容层保证向后兼容
   - 在新位置增强功能
   - 最后逐步替换旧引用

2. 文件重构应该遵循:
   - 一次只处理少量文件
   - 每次改动应该可测试
   - 保留导入/导出兼容性

3. 代码规范:
   - 文件应尽可能精简，专注于单一职责
   - 优先使用命名导出而非默认导出
   - 同时提供中英文函数命名

## 已完成重构文件的增强

1. **文档增强**:
   - 所有重构文件都添加了完整的JSDoc注释
   - 为所有新文件添加了README.md说明文档

2. **API增强**:
   - 为所有函数添加了中英文双命名支持
   - 优化了函数参数和返回值的类型

3. **兼容性增强**:
   - 为所有已迁移文件创建了兼容层
   - 在原始位置添加了导入/重导出
   - 设置了弃用警告以指导开发者

## 最近完成的重构工作

1. **思源环境依赖集中化**:
   - 创建 `useAge/useSiyuan.js` 作为思源环境依赖的集中管理模块
   - 整合了已有的思源相关工具，如端口工具、前端API、配置工具等
   - 提供了 system、plugin、ui 等命名空间下的专用工具函数
   - 通过函数式接口提供思源环境访问，避免直接访问全局对象

2. **思源API组件化**:
   - 创建 `useAge/forSiyuan/useSiyuanDialog.js` 为对话框操作提供统一接口
   - 创建 `useAge/forSiyuan/useSiyuanSystem.js` 封装思源系统API
   - 创建 `useAge/forSiyuan/useSiyuanBlock.js` 封装思源块操作API
   - 创建 `useAge/forSiyuan/useSiyuanWorkspace.js` 封装思源工作区操作API ✅
   - 创建 `useAge/forSiyuan/useSiyuanNotebook.js` 封装思源笔记本操作API ✅
   - 创建 `useAge/forSiyuan/useSiyuanAsset.js` 封装思源资源文件操作API ✅
   - 扩展 useSiyuan 模块，提供新的 fs 命名空间，集成文件系统相关操作 ✅
   - 为所有组件添加了中英文双命名和完整的JSDoc文档
   - 添加 `useAge/forSiyuan/README.md` 提供详细的使用说明和示例 ✅


