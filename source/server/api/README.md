# API 模块

## 模块说明

API模块负责处理客户端请求，包括请求路由、处理和响应。该模块是客户端与服务器之间交互的桥梁，提供了一系列标准化的API端点，用于访问系统的各种功能。

## 文件结构

- `apiService.js` - API服务实现，提供创建响应等通用功能
- `router.js` - 路由器实现，提供路由注册和管理功能
- `routes.js` - 路由定义，将URL路径关联到处理器函数
- `backendEvents.js` - 后端事件系统，用于模块间通信
- `handlers/` - API处理器目录，包含各功能域的处理器

### 处理器文件

- `handlerTemplate.js` - 标准化的处理器模板
- `fs.js` - 文件系统相关API处理器
- `thumbnail.js` - 缩略图相关API处理器
- `metadata.js` - 元数据相关API处理器
- `color.js` - 颜色分析相关API处理器
- `eagle.js` - Eagle素材库集成API处理器
- `document.js` - 文档处理相关API处理器

## 功能说明

### 外部API注册

这个模块之后应该具备通过接口动态增删API的能力,注意API的入口文件只能是本地文件


### apiService.js

`apiService.js`提供API服务的核心功能：

1. 标准化的成功响应创建函数
2. 标准化的错误响应创建函数
3. API请求验证和处理
4. 跨域资源共享(CORS)配置

### router.js

`router.js`实现路由管理功能：

1. HTTP方法封装（GET、POST、PUT、DELETE等）
2. 路由组创建和管理
3. 中间件应用
4. 错误处理

### routes.js

`routes.js`定义所有API路由：

1. 将URL路径映射到处理器函数
2. 组织路由为功能组
3. 提供向后兼容的旧路由

### backendEvents.js

`backendEvents.js`实现后端事件系统：

1. 事件发布/订阅机制
2. 模块间通信
3. 异步事件处理

### handlers/

处理器目录包含各功能域的API处理器：

1. 处理客户端请求
2. 调用相应服务完成业务逻辑
3. 返回标准化响应

## API响应格式

所有API响应遵循标准格式：

### 成功响应

```json
{
  "success": true,
  "data": {
    // 响应数据...
  }
}
```

### 错误响应

```json
{
  "success": false,
  "error": {
    "code": 400,
    "message": "错误信息",
    "details": "详细错误描述(可选)"
  }
}
```

## 创建新的API处理器

创建新的API处理器的步骤：

1. 在`handlers/`目录下创建新的处理器文件
2. 使用标准化的处理器模板
3. 实现处理函数，处理请求和生成响应
4. 在`routes.js`中注册新路由

## 示例

### 处理器示例

```javascript
export const getExample = standardizeHandler(async (ctx) => {
  try {
    // 使用服务实现业务逻辑
    const result = await exampleService.doSomething();
    
    // 返回成功响应
    return createSuccessResponse({
      example: result
    });
  } catch (error) {
    // 返回错误响应
    return createErrorResponse(error, '操作失败', 500);
  }
});
```

### 路由注册示例

```javascript
// 创建功能组
const exampleRoutes = createRouteGroup('/example');

// 定义路由
exampleRoutes.get('/', exampleHandlers.getExample);
exampleRoutes.post('/create', exampleHandlers.createExample);
```

## 注意事项

- 所有处理器应使用标准化的成功/错误响应格式
- 处理器应关注请求处理，业务逻辑应位于服务层
- 所有异步操作必须使用try/catch处理异常
- 路由路径应采用RESTful风格
- 确保适当的错误日志记录 