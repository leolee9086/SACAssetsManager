# 代码迁移说明文档

本文档记录了从旧版代码库到新版 `toolBox` 结构的迁移说明和规范。

## 迁移规则

1. **渐进式迁移**：不强制立即更改所有导入语句，而是通过适配器提供平滑过渡
2. **向后兼容**：保持原有API接口，避免破坏性变更
3. **功能增强**：迁移同时进行功能增强和代码质量提升
4. **文档完善**：为每个迁移模块提供详细文档和使用示例

## 已迁移模块

### 1. 性能监测工具 (2023年X月)

| 原始位置 | 新位置 | 适配器 |
|---------|-------|-------|
| `source/utils/functionAndClass/performanceRun.js` | `src/toolBox/base/useEcma/performance.js` | `src/toolBox/base/useEcma/forMigration/performanceAdapter.js` |

**迁移内容**：
- 函数性能监测工具
- 支持同步和异步函数记录
- 扩展了更多性能分析功能

**迁移原因**：
- 需要支持更多性能统计指标
- 增加函数对比功能
- 提供更好的类型标注和文档

**使用示例**：
```js
// 旧导入方式
import { withPerformanceLogging } from "source/utils/functionAndClass/performanceRun.js";

// 过渡导入方式
import { withPerformanceLogging } from "src/toolBox/base/useEcma/forMigration/performanceAdapter.js";

// 推荐导入方式
import { withPerformanceLogging, comparePerformance } from "src/toolBox/base/useEcma/performance.js";
```

### 2. 组合函数 (2023年X月)

| 原始位置 | 新位置 | 适配器 |
|---------|-------|-------|
| `source/utils/functionTools.js` (部分) | `src/toolBox/base/forChain/parallel.js` | 无 |

**迁移内容**：
- 函数并行执行工具
- 支持动态添加函数
- 处理并发执行结果收集

**使用示例**：
```js
// 新导入方式
import { 组合函数, parallel } from "src/toolBox/base/forChain/parallel.js";
```

## 计划迁移模块

1. 其他函数工具 (functionTools.js)
2. 向量计算工具 (vector/)
3. 文件系统工具 (fs/)

## 迁移注意事项

- 检查当前导入路径和使用方式
- 确保新模块提供相同或增强的功能
- 添加适当的废弃警告和迁移提示
- 更新相关文档 