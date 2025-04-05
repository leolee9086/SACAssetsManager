# 这个区块的内容来自开发者,禁止AI未经允许修改

现在扫描所有utils等类似命名的文件夹,尝试进行重构

注意我们需要集中思源笔记的环境依赖,可以使用useSiyuan进行集中

由于一些原因项目中零散分布有一些工具文件,你也需要重构这些文件

对于外部依赖,当你发现一个node_modules中的依赖可能可以使用static中使用esm形式打包成静态文件时,你应该提出建议(但是不要修改,这一部分暂时由开发者处理)

注意项目中的**每一个**文件夹你都可以创建readme和AInote

有关重构的最终目标你可以查看项目根目录的index new.js

**已经完成的重构之后应该有一个倒数计数,每次计数为零时视为完成了一个阶段性重构,此时你应该总结当前的任务进度到history.md,不要让太多的细节干扰这个文件的框架**

**阶段计数是一个倒数进度,每次任务计划完成后需要减一,当减至零时表示完成一个阶段,此时应总结进度到history.md并重置计数**

**详细的历史记录应该只出现在history.md中,AInote.md只需要计数和简单提示,这个文件主要记录的是重构心得和要求而不是历史详情**

**先停止不断扩充工具箱,开始检查功能代码的实现**

# 工具箱重构笔记

## 工具箱结构概览

工具箱采用三层分类模块化设计，按功能域组织为不同子目录:

```
src/toolBox/
├── base/           - 基础工具函数
│   ├── useEcma/    - ECMA标准功能封装
│   │   ├── forFile/     - 文件操作相关工具
│   │   ├── forMath/     - 数学计算工具
│   │   ├── forString/   - 字符串处理工具 ✅
│   │   ├── textTools.js - 文本处理工具 ✅
│   │   └── ...
│   ├── forNetwork/  - 网络相关工具
│   │   ├── forFetch/     - fetch工具 ✅
│   │   ├── forPort/      - 端口工具 ✅
│   │   └── ...
│   ├── forEvent/    - 事件处理工具
│   ├── forMime/     - MIME类型处理
│   ├── forCore/     - 核心串链器工具
│   ├── forUI/       - 通用UI组件工具
│   ├── usePolyfills/ - 平台兼容性工具
│   │   ├── uaAnalysis.js - UA分析工具 ✅
│   │   └── ...
│   ├── useDeps/    - 依赖管理工具
│   │   ├── pinyinTools.js - 拼音工具 ✅
│   │   └── ...
│   └── ...
├── feature/        - 特定功能工具
│   ├── useImage/   - 图像处理工具
│   ├── useVue/     - Vue框架工具
│   ├── forFileSystem/ - 文件系统工具
│   └── ...
├── useAge/         - 使用场景相关工具
│   ├── forFileManage/    - 文件管理工具
│   ├── forSiyuan/        - 思源特定功能工具
│   │   ├── useSiyuanMenu.js    - 思源菜单工具 ✅
│   │   ├── useSiyuanDialog.js  - 思源对话框工具 ✅
│   │   ├── useSiyuanSystem.js  - 思源系统API ✅
│   │   └── ...
│   ├── useSiyuan.js      - 思源环境依赖集中管理 ✅
│   └── ...
├── toolBoxExports.js  - 统一导出接口
└── README.md       - 工具箱说明
```

## 已完成的重构(建议不要列举太多,隔一段时间总结一下,列出最近的动作就可以了)

阶段计数:0

当前正在进行重构工作：
- 重构思源工具函数到工具箱，已完成 BlockHandler、blockIcons、upload 和 markdown 的迁移
- 向量距离计算函数统一整合至 forDistance.js，完善各类向量距离计算函数
- 规范化向量归一化工具，保持命名一致性

详细历史记录请查看src/toolBox/history.md

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

参见src/toolBox/history.md中的历史记录

## 下一步重构计划

当前阶段3重点：siyuanCommon工具函数重构

详细重构计划请参考下方的详细计划部分以及history.md中的记录

## siyuanCommon工具函数重构详细计划

### 1. 斜杠菜单工具函数（useSiyuanSlash.js）
- 提取`slash.js`中以下函数：
  - `handleDialogDestroy` - 处理对话框销毁后的操作
  - `openDialogWithApiConfig` - 使用API配置打开对话框
  - `openDialogWithLocalPath` - 使用本地路径打开对话框
  - `openDiskSelectionDialog` - 打开磁盘选择对话框
  - `openEverythingDialog`和`openAnytxtDialog` - 搜索工具对话框
- 提供统一的斜杠菜单项注册接口
- 添加思源环境检查和错误处理

### 2. 对话框工具函数（useSiyuanDialog.js）
- 整合`dialog/vueDialog.js`中的`openDialog`函数
- 整合`dialog/inputDialog.js`中的输入对话框功能
- 整合`dialog/tasks.js`中的任务对话框功能
- 整合`dialog/fileDiffAndPick.js`中的文件对比和选择功能
- 提供统一的对话框创建和管理接口

### 3. 页签管理工具函数（useSiyuanTab.js）
- 从`tabs/assetsTab.js`提取以下函数：
  - `打开附件面板` - 打开资源面板
  - `打开笔记本资源视图` - 打开笔记本资源
  - `打开笔记资源视图` - 打开笔记资源
  - `打开标签资源视图` - 打开标签资源
  - `打开本地资源视图` - 打开本地资源
  - `打开efu文件视图页签` - 打开efu文件
  - `打开颜色资源视图` - 打开颜色资源
  - `打开everything搜索面板` - 打开搜索面板
  - `打开anytxt搜索面板` - 打开搜索面板
- 提供通用的页签创建和管理接口
- 添加页签状态监控和生命周期管理

### 4. 颜色工具函数（useSiyuanColor.js）
- 从`menus/galleryItem.js`中提取`颜色操作`相关函数：
  - `添加颜色操作菜单` - 添加颜色菜单
  - `创建颜色菜单项` - 创建颜色菜单项
  - `生成颜色子菜单` - 生成颜色子菜单
- 提供颜色提取、分析和操作的统一接口
- 添加颜色转换和调色板功能

### 5. 菜单构建工具函数（useSiyuanMenuBuilder.js）
- 从`menus/galleryItem.js`中提取`菜单构建`相关函数：
  - `添加附件选中信息` - 添加附件信息
  - `添加移动菜单` - 添加移动菜单
  - `添加批处理菜单组` - 添加批处理菜单
  - `添加只读菜单内容` - 添加只读菜单
  - `添加通用菜单内容` - 添加通用菜单
  - `添加展开的通用菜单` - 添加展开菜单
  - `添加折叠的通用菜单` - 添加折叠菜单
- 提供组合式菜单构建接口，支持菜单项的灵活组合
- 添加菜单项模板和预设

### 实施顺序和优先级
1. 先从功能相对独立的`useSiyuanSlash.js`和`useSiyuanTab.js`开始重构
2. 然后处理`useSiyuanDialog.js`的增强，整合对话框相关功能
3. 最后处理复杂的`useSiyuanMenuBuilder.js`和`useSiyuanColor.js`

这些重构将使思源笔记的环境依赖更加集中，通过`useSiyuan`系列模块提供统一的接口，提高代码的可维护性和可重用性。

## 前缀命名规范说明

工具箱中使用的前缀具有明确的语义区分，这些前缀不是随意选择的，而是反映了工具函数的功能定位和使用场景：

1. **for前缀**：针对特定目标领域的工具函数
   - 表示该工具专为某个特定领域或功能设计
   - 例如：`forEvent`（事件处理）、`forMime`（MIME类型处理）、`forNetwork`（网络请求）

2. **use前缀**：基于特定技术或环境实现的工具函数
   - 表示该工具基于某种技术栈或环境API构建
   - 例如：`useEcma`（基于ECMAScript标准）、`useVue`（基于Vue框架）、`useBrowser`（使用浏览器API）

3. **from前缀**：数据源或转换工具
   - 表示从某种数据源获取或转换数据
   - 例如：从Blob创建图像、从SVG创建图像等函数

4. **with前缀**：表示与特定资源结合使用的工具
   - 表示该工具需要与某种资源配合使用
   - 通常用于增强或修饰某个操作

### 嵌套目录的命名规范

当出现嵌套目录时（如 `useEcma/forString/`），应理解为：
- 外层目录（useEcma）表示技术基础
- 内层目录（forString）表示针对的具体目标

### 统一和调整计划

在后续重构中，需要特别注意：
1. 严格遵循前缀语义，不要混用
2. 发现命名不符合规范的目录或文件应进行调整
3. 消除功能重复的模块，遵循前缀规范重新组织

现有的一些问题需要解决：
- `forMime` 和 `useMime` 功能重叠，应明确区分或合并
- `base/forUI` 和 `feature/useUI` 功能可能重叠，需要明确职责
- `useAge/forImageAndCanvas` 与 `feature/useImage` 功能可能重叠

## Static文件夹依赖分析

经过对`static`文件夹的扫描，发现有多种依赖已经以ESM形式存在，可以通过`useDeps`模块进行更充分的封装和利用。以下是主要依赖分类和优化建议：

### 已发现的依赖类别

1. **网络与MIME相关**:
   - accepts.js, type-is.js, content-type.js, content-disposition.js, cache-content-type.js
   - mimeDb.js

2. **数据处理与实用工具**:
   - dayjs.js (及dayjsPlugins/)
   - pinyin.js
   - uuid.mjs
   - buffer.mjs
   - rbush.js
   - mmcq.js (颜色量化)

3. **视觉与UI相关**:
   - vue.esm-browser.js
   - konva.js, vue-konva.mjs
   - pickr-esm2022.js (颜色选择器)
   - dom-to-image.mjs

4. **协作与同步工具**:
   - yjs.js, y-websocket.js, y-webrtc.js, y-indexeddb.js
   - @syncedstore/

5. **多媒体处理**:
   - mp4-muxer.mjs, webm-muxer.mjs
   - opencv.js

6. **语言与解析**:
   - jieba_rs_wasm.js (中文分词)
   - @babel/, @babel_parser.js

7. **AI与机器学习**:
   - tf.min.js
   - @huggingface/

### 优化建议

根据工具箱重构原则，可以在`base/useDeps`目录下创建以下封装模块：

1. **forMimeType**：
   - 封装mimeDb.js和content-type.js等MIME相关依赖
   - 提供统一的MIME类型判断和处理接口

2. **forDateManagement**：
   - 封装dayjs和相关插件
   - 提供日期格式化、解析和操作功能

3. **forUUID**：
   - 封装uuid.mjs
   - 提供UUID生成和解析功能

4. **forPinyin**：
   - 检查现有的pinyinTools.js是否已充分利用static/pinyin.js
   - 可能需要增强拼音处理功能

5. **forUI/useVue**：
   - 封装vue.esm-browser.js的使用
   - 提供Vue组件加载和管理工具

6. **forVisualProcessing**：
   - 封装konva.js, pickr-esm2022.js等
   - 提供画布和颜色处理工具

7. **forCollaboration**：
   - 封装yjs和syncedstore相关库
   - 提供实时协作功能接口

8. **forMedia**：
   - 封装媒体相关工具(mp4-muxer, webm-muxer)
   - 提供统一的媒体处理接口

9. **forAI**：
   - 封装AI工具(@huggingface, tf.min.js)
   - 提供简易的AI功能接口

### 实施优先级

1. 优先封装已有直接引用但未通过useDeps管理的依赖
2. 优先处理核心功能使用的依赖(MIME, 日期, UI等)
3. 为复杂依赖创建简化的接口，降低使用门槛

### 注意事项

1. 封装时保持API稳定，提供中英文双命名
2. 避免将所有依赖捆绑导出，按需加载更为高效
3. 为每个依赖模块创建清晰的文档和使用示例
4. 处理版本冲突，确保使用正确的ESM版本

通过系统性地封装static目录下的依赖，可以提高代码可维护性，减少重复引用，并确保依赖的一致性和可控性。


