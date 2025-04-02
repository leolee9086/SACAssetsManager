# 文件系统工具函数集 (useFs)

一套简洁、高效的文件系统操作工具函数集，遵循函数式设计风格，支持链式调用和组合使用。

## 主要功能

- 文件状态检查与获取
- 按需创建文件
- 异步操作超时控制
- 统一错误处理机制
- 条件化文件操作执行

## 模块结构

```
useFs/
  ├── useFileStatus.js   - 文件状态获取
  ├── withFileCreation.js - 文件创建功能
  ├── withTimeout.js     - 超时控制
  ├── withErrorHandling.js - 错误处理
  ├── useFileExecution.js - 组合执行
  └── index.js           - 入口文件
```

## 使用示例

### 基本文件状态检查

```javascript
import { useFileStatus } from './useFs/useFileStatus.js';

const main = async () => {
  const status = await useFileStatus({ filePath: './example.txt' });
  console.log('文件存在:', status.fileExists);
  if (status.fileExists) {
    console.log('文件大小:', status.fileStats.size);
  }
};
```

### 按需创建文件

```javascript
import { useFileStatus, withFileCreation } from './useFs/index.js';

const main = async () => {
  let context = await useFileStatus({ filePath: './example.txt' });
  context = await withFileCreation(context, {
    createIfNotExists: true,
    defaultContent: '# 示例文件',
    logProcess: true
  });
  console.log('文件现在存在:', context.fileExists);
};
```

### 完整文件操作流程

```javascript
import { useFileExecution } from './useFs/useFileExecution.js';

const main = async () => {
  const result = await useFileExecution(
    { filePath: './example.txt' },
    {
      createIfNotExists: true,
      defaultContent: '# 示例文件',
      logProcess: true,
      condition: (ctx) => ctx.fileStats.size < 1024, // 文件小于1KB才执行
      executor: async (ctx) => {
        // 对文件进行操作
        await ctx.fs.appendFile(ctx.normalizedPath, '\n新增内容');
        return '操作成功';
      },
      timeout: 5000 // 5秒超时
    }
  );
  
  console.log('执行结果:', result);
};
```

## 函数设计约定

- 单参数函数为纯函数，不修改输入参数
- 双参数函数中，第一个参数为context(可修改)，第二个参数为options(不可修改)
- 所有函数均采用前缀式语义化命名法 