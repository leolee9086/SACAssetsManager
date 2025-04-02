# 代码分析工具 (forCodeAnalysis)

本目录包含用于代码分析、解析和处理的工具函数。

## 文件结构

- `jsParser.js` - JavaScript 代码解析工具，包含JSDoc解析功能
- 其他代码分析工具文件

## 主要功能

### JavaScript 解析工具 (jsParser.js)

提供JavaScript代码和JSDoc注释解析功能：

```js
// 解析JavaScript代码中的JSDoc注释
const jsDocConfig = await 解析JSDoc配置('/path/to/file.js', '函数名');

// 检查配置
console.log(jsDocConfig.description); // 函数描述
console.log(jsDocConfig.inputTypes);  // 输入参数类型
console.log(jsDocConfig.outputTypes); // 输出类型
```

## 使用指南

代码分析工具通过 `toolBoxExports.js` 统一导入：

```js
// 推荐：通过统一导出接口导入
import { 解析JSDoc配置, 从URL解析JSDoc配置 } from '../../../toolBox/toolBoxExports.js';

// 或者直接从具体模块导入
import { 解析JSDoc配置 } from '../../../toolBox/feature/forCodeAnalysis/jsParser.js';
```

## 贡献指南

向代码分析工具添加新函数时，请遵循以下原则：

1. **解析器职责**：
   - 解析器应专注于解析和提取信息
   - 避免在解析器中添加处理或转换逻辑
   - 输出应是结构化的中间表示

2. **性能优化**：
   - 处理大型代码库时考虑性能影响
   - 提供增量解析能力
   - 适当缓存解析结果

3. **错误处理**：
   - 提供友好的错误提示
   - 在解析失败时提供部分结果
   - 添加调试选项以便排查问题 