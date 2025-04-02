# 文件系统工具函数集 (useFs)

## 模块设计说明

这个模块采用了关注点分离原则，将原来的单一文件拆分为多个专注于特定功能的小模块：

1. **useFileStatus.js** - 负责获取文件状态信息的纯函数
2. **withFileCreation.js** - 负责文件创建功能
3. **withTimeout.js** - 提供异步操作的超时控制
4. **withErrorHandling.js** - 提供统一的错误处理机制
5. **useFileExecution.js** - 组合以上功能，提供完整的文件操作执行流程
6. **index.js** - 导出所有模块功能的入口文件

## 函数设计约定

1. 函数命名遵循前缀式语义化命名法（use/with等前缀）
2. 单参数函数为纯函数，参数不能被修改
3. 双参数函数不必是纯函数，第一个参数是context可以被修改，第二个参数是options不能被修改
4. 每个模块专注于一个功能点，降低了模块间的耦合度

## 重构说明

在原有代码基础上进行了以下改进：

1. 将原单一文件按功能点拆分为多个小模块
2. 修改了双参数函数的实现，直接修改context参数而不是创建新对象
3. 保留了原来的useFs.js文件作为向后兼容的入口
4. 每个模块都有明确的职责和功能边界，提高了代码的可维护性和可扩展性

## 使用建议

新代码建议直接从子模块导入所需功能，例如：

```javascript
import { useFileStatus } from './useFs/useFileStatus.js';
import { withFileCreation } from './useFs/withFileCreation.js';
```

或者从入口文件导入所有功能：

```javascript
import { useFileStatus, withFileCreation } from './useFs/index.js';
``` 