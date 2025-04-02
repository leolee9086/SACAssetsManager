## 2024-04-05 代码分析工具重构

### 完成事项

1. 创建了`feature/forCodeAnalysis`目录，专门用于存放代码分析相关工具
2. 将`source/utils/codeLoaders/js/jsDoc.js`迁移到`src/toolBox/feature/forCodeAnalysis/jsParser.js`
3. 增强了JSDoc解析功能，提供了中文命名API
4. 在`toolBoxExports.js`中添加导出

### 迁移摘要

| 旧路径 | 新路径 | 状态 |
|--------|--------|------|
| `source/utils/codeLoaders/js/jsDoc.js` | `src/toolBox/feature/forCodeAnalysis/jsParser.js` | 完成 |

### API变更

- 新增中文API:
  - `解析JSDoc配置` - 解析代码文本中的JSDoc注释
  - `从URL解析JSDoc配置` - 从URL加载代码并解析JSDoc注释
- 保留原有API以兼容现有代码:
  - `parseJSDocConfig`
  - `parseJSDocConfigFromURL`

### 下一步计划

1. 将`source/utils/codeLoaders/js/lexicalAnalyzer.js`迁移到`jsParser.js`中
2. 开发代码质量分析和代码修改工具
