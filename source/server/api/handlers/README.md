# API 处理器

## 模块说明

API处理器是负责处理HTTP请求的函数集合，它们接收客户端请求，调用相应的服务来执行业务逻辑，并返回标准化的响应。每个处理器文件对应一个功能域，包含该域的所有API端点实现。

## 处理器列表

| 处理器文件 | 功能描述 | 主要API |
|------------|---------|---------|
| fs.js | 文件系统操作 | 文件读写、目录列表、文件信息 |
| thumbnail.js | 缩略图生成和管理 | 生成缩略图、清除缓存、获取支持格式 |
| metadata.js | 元数据提取和分析 | 提取EXIF数据、获取文件属性、获取图片尺寸 |
| color.js | 颜色分析和搜索 | 提取图片颜色、颜色搜索、管理颜色记录 |
| eagle.js | Eagle素材库集成 | 查找库路径、获取标签、搜索资源 |
| document.js | 文档处理 | PDF文本提取、Office文档处理、PDF预览 |

## 处理器模板

所有处理器应遵循标准化的处理器模板（`handlerTemplate.js`），该模板提供：

1. 标准化的请求上下文
2. 统一的错误处理机制
3. 标准化的响应格式

## 处理器实现规范

### 基本结构

每个处理器函数应遵循以下结构：

```javascript
export const handlerName = standardizeHandler(async (ctx) => {
  const { req } = ctx;
  
  // 1. 验证请求参数
  
  // 2. 调用服务执行业务逻辑
  
  // 3. 返回标准化响应
  return createSuccessResponse({
    // 响应数据...
  });
});
```

### 错误处理

错误处理应使用try/catch，并返回标准化的错误响应：

```javascript
try {
  // 业务逻辑...
} catch (error) {
  // 记录错误
  logger.error(`操作失败: ${error.message}`, 'Module-Name');
  
  // 返回错误响应
  return createErrorResponse(error, '操作失败', 500);
}
```

### 参数验证

所有请求参数应进行验证：

```javascript
const filePath = req.query.path;
if (!filePath) {
  return createErrorResponse('未提供文件路径', '参数错误', 400);
}
```

## 创建新处理器

创建新处理器的步骤：

1. 创建新的处理器文件，文件名应反映功能域
2. 引入必要的依赖和服务
3. 实现处理器函数，使用标准化模板
4. 在`routes.js`中注册新处理器的路由

## 每个处理器文件的标准结构

```javascript
/**
 * [功能域]API处理器
 * 提供[功能描述]相关的API端点
 */

import { standardizeHandler, createSuccessResponse, createErrorResponse } from './handlerTemplate.js';
import { logger } from '../../services/logger/loggerService.js';
import * as relevantService from '../../services/relevant/relevantService.js';

/**
 * [API端点描述]
 */
export const apiEndpoint = standardizeHandler(async (ctx) => {
  const { req } = ctx;
  
  // 参数验证
  
  try {
    // 调用服务执行业务逻辑
    const result = await relevantService.doSomething();
    
    // 返回成功响应
    return createSuccessResponse({
      // 响应数据...
    });
  } catch (error) {
    // 记录错误
    logger.error(`操作失败: ${error.message}`, 'Module-Name');
    
    // 返回错误响应
    return createErrorResponse(error, '操作失败', 500);
  }
});
```

## 注意事项

- 处理器应专注于请求处理和参数验证，复杂业务逻辑应放在服务层
- 遵循单一职责原则，每个处理器函数只负责一种操作
- 确保所有可能的错误情况都有适当的处理
- 避免在处理器中直接操作数据库和文件系统，应通过服务层间接操作
- 使用详细的JSDoc注释说明每个处理器的功能和参数 