# 工具函数库 (Utils)

本目录包含项目的各种工具函数，提供各种通用功能支持。

## 目录结构

- `base/` - 基础工具函数
- `canvas/` - Canvas绘图相关工具
- `color/` - 颜色处理工具
- `DOM/` - DOM操作工具
- `events/` - 事件处理工具
- `feature/` - 特性相关工具
- `forSort/` - 排序算法工具
- `fs/` - 文件系统操作工具
- `functions/` - 函数式编程工具
- `generators/` - 生成器工具
- `graph/` - 图形和图表工具
- `hash/` - 哈希计算工具
- `i18n/` - 国际化工具
- `image/` - 图像处理工具
- `math/` - 数学计算工具
- `module/` - 模块加载工具
- `netWork/` - 网络请求工具
- `object/` - 对象操作工具
- `pathUtils/` - 路径处理工具
- `queue/` - 队列和任务管理工具
- `siyuanData/` - 思源数据处理工具
- `siyuanUI/` - 思源UI工具
- `sql/` - SQL查询工具
- `strings/` - 字符串处理工具
- `system/` - 系统相关工具
- `time/` - 时间处理工具
- `useDeps/` - 依赖管理工具
- `useEcma/` - ECMA标准功能工具
- `useRemote/` - 远程资源工具
- `webKoa/` - Web框架工具
- `webworker/` - Web Worker工具

## 主要文件

- `objectTools.js` - 对象操作工具集
- `functionTools.js` - 函数操作工具集
- `Math.js` - 数学计算工具集
- `globBuilder.js` - Glob匹配工具
- `port.js` - 端口管理工具
- `canvasUtils.js` - Canvas工具
- `sseUtils.js` - 服务器发送事件工具
- `test.js` - 测试工具

## 工具函数设计原则

1. **纯函数优先**：
   - 优先使用纯函数设计
   - 避免副作用和状态依赖
   - 确保函数输出只依赖输入

2. **单一职责**：
   - 每个函数专注于单一任务
   - 避免功能过于复杂
   - 促进代码复用

3. **合理抽象**：
   - 提供适当抽象级别
   - 封装复杂实现细节
   - 提供简洁清晰的接口

4. **错误处理**：
   - 提供明确的错误处理机制
   - 返回有意义的错误信息
   - 支持错误恢复策略

## 重构计划

本目录下的工具函数将逐步迁移到src/toolBox目录下，按照以下映射关系：

| 现有目录/文件 | 迁移目标 | 优先级 |
|--------------|---------|-------|
| base/ | src/toolBox/base | 高 |
| canvas/ | src/toolBox/feature/useImage | 中 |
| color/ | src/toolBox/feature/forColors | 中 |
| DOM/ | src/toolBox/base/forUI | 中 |
| events/ | src/toolBox/base/forEvent | 高 |
| fs/ | src/toolBox/feature/forFileSystem | 高 |
| functions/ | src/toolBox/base/useEcma/forFunctions | 高 |
| math/ | src/toolBox/base/useEcma/forMath | 高 |
| netWork/ | src/toolBox/base/forNetWork | 高 |
| object/ | src/toolBox/base/useEcma/forObjectManagement | 高 |
| strings/ | src/toolBox/base/useEcma/forString | 高 |
| time/ | src/toolBox/base/useEcma/forTime | 高 |
| objectTools.js | src/toolBox/base/useEcma/forObjectManagement | 高 |
| functionTools.js | src/toolBox/base/useEcma/forFunctions | 高 |
| Math.js | src/toolBox/base/useEcma/forMath | 高 |
| globBuilder.js | src/toolBox/base/useEcma/forFile | 高 |
| port.js | src/toolBox/base/forNetWork/forPort | 高 |

## 使用指南

在重构过程中，应遵循以下原则：

1. 从旧位置导入到新位置时，确保提供兼容层：
   ```js
   // 旧位置的兼容导出
   import { 函数名 } from '../../src/toolBox/...';
   export { 函数名 };
   ```

2. 迁移函数时，保持API兼容性，同时改进实现：
   ```js
   // 旧函数签名
   export function 旧函数名(参数1, 参数2) {
     return 新实现(参数1, 参数2);
   }
   
   // 新实现
   export function 新实现(参数1, 参数2) {
     // 改进的实现...
   }
   ```

3. 逐步替换现有代码中的导入路径：
   ```js
   // 旧导入
   // import { 函数名 } from '../utils/某文件';
   
   // 新导入
   import { 函数名 } from '../src/toolBox/...';
   ```

## 注意事项

- 保持工具函数的通用性，避免引入业务逻辑
- 确保迁移后的功能完全兼容现有代码
- 添加适当的测试确保功能正确性
- 为每个工具函数添加JSDoc文档
- 遵循项目的命名规范和编码风格 