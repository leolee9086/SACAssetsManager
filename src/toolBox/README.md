# SAC Assets Manager 工具箱

## 简介

这是一个为SAC Assets Manager插件设计的模块化工具箱，提供了丰富的工具函数和组件，可以帮助开发者更高效地实现各种功能。工具箱遵循功能域划分，按照"基础工具"、"特性工具"和"使用场景工具"三层结构组织代码。

## 工具箱结构

```
src/toolBox/
├── base/           - 基础工具函数
│   ├── useEcma/    - ECMA标准功能封装
│   │   ├── forFile/     - 文件操作相关工具
│   │   ├── forMath/     - 数学计算工具
│   │   ├── forString/   - 字符串处理工具
│   │   ├── forCrypto/   - 加密和哈希工具
│   │   ├── forLogs/     - 日志记录工具
│   │   └── ...
│   ├── forNetwork/  - 网络相关工具
│   │   ├── forFetch/     - fetch工具
│   │   ├── forPort/      - 端口工具
│   │   ├── forEndPoints/ - 端点URL生成工具
│   │   └── ...
│   ├── forEvent/    - 事件处理工具
│   ├── forMime/     - MIME类型处理
│   ├── forCore/     - 核心串链器工具
│   ├── forUI/       - 通用UI组件工具
│   ├── usePolyfills/ - 平台兼容性工具
│   ├── useBrowser/   - 浏览器API工具
│   ├── useElectron/  - Electron相关工具
│   ├── useDeps/     - 依赖管理工具
│   └── ...
├── feature/        - 特定功能工具
│   ├── useImage/   - 图像处理工具
│   ├── useVue/     - Vue框架工具
│   ├── useChat/    - 聊天功能工具
│   ├── forAssets/  - 资产管理工具
│   ├── forFileSystem/ - 文件系统工具
│   ├── forCodeAnalysis/ - 代码分析工具
│   └── ...
├── useAge/         - 使用场景相关工具
│   ├── forFileManage/    - 文件管理工具
│   ├── forSiyuan/        - 思源特定功能工具
│   │   ├── forBlock/     - 块相关工具
│   │   ├── forMarkdown/  - Markdown相关工具
│   │   ├── forAsset/     - 资源相关工具
│   │   ├── forFiletree/  - 文件树相关工具
│   │   ├── useSiyuanMenu.js    - 思源菜单工具
│   │   ├── useSiyuanDialog.js  - 思源对话框工具
│   │   ├── useSiyuanSystem.js  - 思源系统API
│   │   └── ...
│   ├── useSiyuan.js      - 思源环境依赖集中管理
│   └── ...
├── toolBoxExports.js  - 统一导出接口
├── phase4_plan.md    - 工具箱重构计划
├── history.md        - 重构历史记录
└── README.md         - 工具箱说明
```

## 使用方法

### 导入工具

```js
// 方式1：从统一导出接口导入
import { 创建事件总线, 解析思考内容 } from '../toolBox/toolBoxExports.js';

// 方式2：直接从具体模块导入
import { 创建事件总线 } from '../toolBox/base/forEvent/eventBusTools.js';
import { 解析思考内容 } from '../toolBox/feature/useChat/forMessageFormatting.js';

// 方式3：使用分组工具
import { useSiyuanDialog } from '../toolBox/toolBoxExports.js';
useSiyuanDialog.创建确认对话框('确认操作', '是否继续？');
```

### 常用工具快速索引

#### 基础工具
- **事件工具**: `创建事件总线`, `事件监听器`
- **网络工具**: `fetchGet`, `fetchPost`, `检查端口可用性`
- **文本处理**: `计算文本相似度`, `获取拼音`, `解析HTML`
- **文件操作**: `读取文本文件`, `计算哈希`, `解析文件路径`
- **UI组件**: `创建菜单`, `显示对话框`, `输入弹窗`
- **平台检测**: `获取浏览器信息`, `判断操作系统`, `检测是否为移动设备`

#### 特性工具
- **图像处理**: `创建Canvas处理器`, `加载图像`, `从Blob创建图像`
- **Vue组件**: `加载Vue组件`, `创建Vue对话框`
- **聊天工具**: `创建消息`, `处理流式消息`, `格式化富文本消息`
- **资产管理**: `处理资产标签`, `获取资产信息`
- **文件系统**: `获取磁盘列表`, `获取文件系统信息`

#### 思源笔记工具
- **块操作**: `创建块处理器`, `获取块图标`
- **Markdown**: `创建Markdown工具`, `Markdown渲染`
- **资源管理**: `上传到思源资源库`, `获取资源信息`
- **UI交互**: `创建思源菜单`, `显示思源对话框`, `打开页签`

## 设计原则

### 命名规范

工具箱采用语义化前缀命名:

1. **for前缀**: 针对特定目标领域的工具函数
   - 例如: `forEvent` (事件处理), `forMime` (MIME类型处理)

2. **use前缀**: 基于特定技术或环境实现的工具函数
   - 例如: `useEcma` (ECMAScript标准), `useVue` (Vue框架)

3. **from前缀**: 数据源或转换工具
   - 例如: 从Blob创建图像, 从SVG创建图像

4. **with前缀**: 与特定资源结合使用的工具
   - 用于增强或修饰某个操作

### 函数命名规则

1. **纯函数前缀**:
   - `compute*` - 计算和转换数据的纯函数
   - `get*` - 获取或提取数据的纯函数
   - `is*` / `has*` / `should*` - 布尔判断的纯函数
   - `to*` - 数据类型转换的纯函数
   - `format*` - 格式化数据的纯函数

2. **非纯函数前缀**:
   - `use*` - 获取或使用资源的函数
   - `modify*` - 修改对象的函数，会改变原对象
   - `create*` - 创建新对象或资源的函数
   - `for*` - 针对特定目的的实用函数
   - `from*` - 从特定来源获取数据的函数

## 当前开发阶段

当前工具箱正在进行阶段5的重构工作，主要集中在以下方面：

1. **思源笔记工具函数的整合与优化**
   - 解决模块间功能重叠问题
   - 统一接口规范和错误处理机制
   - 增强现有功能，提高处理效率

2. **性能优化**
   - 实现更高效的延迟加载策略
   - 为频繁调用的API添加缓存机制
   - 优化批量操作的并发处理

3. **代码重构与解耦**
   - 优化目录结构，更清晰地划分功能域
   - 减少模块间的循环依赖
   - 移除过时或冗余的代码

4. **文档与示例完善**
   - 为所有模块添加完整的JSDoc注释
   - 编写详细的API文档和使用示例
   - 提高代码的可维护性和可读性

详细的重构计划请参考 [phase4_plan.md](./phase4_plan.md)。

## 贡献

欢迎为工具箱贡献代码或提出改进建议。在贡献前，请阅读 [AInote.md](./AInote.md) 了解工具箱的设计原则和重构思路。

## 许可

SAC Assets Manager 工具箱使用与主项目相同的许可证。