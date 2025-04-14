# 这个区段由开发者编写,未经允许禁止AI修改
<开发者将会在这里提出要求,AI需要判断并满足这些要求>

# 工具函数迁移计划与进度跟踪

## 概述

本目录(`source/utils`)包含项目中各种通用工具函数，这些函数正逐步迁移到 `src/toolBox` 目录的新架构中。
迁移过程中保持向后兼容性，同时提高代码质量、测试覆盖率和文档完整性。

## 迁移进度

| 原始文件/目录 | 迁移目标 | 状态 | 完成度 |
|-------------|---------|------|-------|
| `functionTools.js` | `src/toolBox/base/forChain/` | ✅ 已完成 | 100% |
| `vector/similarity.js` | `src/toolBox/feature/forVectorEmbedding/` | ✅ 已完成 | 100% |
| `functionAndClass/performanceRun.js` | `src/toolBox/base/useEcma/performance.js` | ✅ 已完成 | 100% |

## 迁移详情

### functionTools.js 迁移
- **迁移目标**: `src/toolBox/base/forChain/`
- **完成时间**: 2023-11-20
- **主要变更**:
  - 拆分函数到专门的文件: compose.js, curry.js, parallel.js
  - 添加英文命名的导出别名
  - 完善JSDoc文档和使用示例
  - 保留原始文件为重定向，确保向后兼容性

### vector/similarity.js 迁移
- **迁移目标**: `src/toolBox/feature/forVectorEmbedding/`
- **完成时间**: 2023-11-25
- **主要变更**:
  - 创建分离的 vectorSimilarity.js 和 stringSimilarity.js
  - 添加新算法: 曼哈顿距离、Jaccard相似度、JaroWinkler相似度等
  - 添加智能相似度计算函数 (`智能计算相似度`)
  - 优化算法性能和边界情况处理
  - 详细的文档和使用示例

### functionAndClass/performanceRun.js 迁移
- **迁移目标**: `src/toolBox/base/useEcma/performance.js`
- **完成时间**: 2023-10-15
- **主要变更**:
  - 增加更全面的性能统计指标
  - 添加函数性能比较工具
  - 提供手动性能计时器
  - 完善文档和类型标注

## 使用指南

### 新代码引用方式

```javascript
// 旧的导入方式 (仍可用，但不推荐)
import { 计算余弦相似度 } from 'source/utils/vector/similarity.js';

// 新的导入方式 (推荐)
import { 计算余弦相似度 } from 'src/toolBox/feature/forVectorEmbedding/vectorSimilarity.js';
// 或使用入口文件
import { 计算余弦相似度 } from 'src/toolBox/feature/forVectorEmbedding/similarity.js';
```

### 迁移提示

旧文件在导入时会记录废弃警告，推荐更新引用到新位置。随着项目发展，旧文件的导入重定向可能会在未来某个版本中移除。

## 未来计划

1. **增强功能**:
   - 添加更多实用工具函数
   - 提高类型安全性
   - 增加性能优化

2. **文档完善**:
   - 为每个模块编写详细使用文档
   - 添加更多使用示例
   - 示范最佳实践 