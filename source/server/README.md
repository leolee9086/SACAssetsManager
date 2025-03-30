# 服务器模块

本目录包含思源插件的服务器端功能，负责处理API请求、数据存储和后端逻辑。

## 目录结构

- **dataBase/** - 数据库相关功能和存储接口
- **handlers/** - 请求处理器和路由控制
- **middlewares/** - 中间件函数，用于请求预处理
- **packageServer/** - 包管理服务，负责插件的安装和更新
- **processors/** - 数据处理器，负责复杂数据的变换
- **utils/** - 服务器工具函数集合

## 主要文件

- **apiService.js** - API服务定义，包含主要接口实现
- **server.js** - 服务器主程序，负责启动和配置服务器
- **init.js** - 服务器初始化脚本，设置环境和依赖
- **endPoints.js** - API端点定义，包含所有可用路由
- **indexer.js** - 索引生成器，用于文件索引构建
- **main.js** - 服务器启动入口
- **backendEvents.js** - 后端事件系统，用于服务器内部通信
- **preload.js** - Electron环境预加载脚本
- **logger.js** - 日志记录工具
- **licenseChecker.js** - 许可证验证工具

## 使用方法

### 服务器启动

```javascript
// 导入服务器模块
import { startServer } from './server.js';

// 启动服务器
startServer({
  port: 6806,
  host: 'localhost',
  silent: false,
  onStarted: () => {
    console.log('服务器已启动');
  }
});
```

### API调用示例

```javascript
// 导入API服务
import { callAPI } from './apiService.js';

// 调用API
const result = await callAPI('getDocuments', {
  ids: ['20220101000000-abcdef']
});

// 处理结果
console.log(result.data);
```

## 技术栈

- **Node.js** - 运行环境
- **Express** - Web框架（如果使用）
- **WebSocket** - 实时通信
- **SQLite/LevelDB** - 数据存储（取决于配置）

## 开发指南

### 添加新API端点

1. 在`endPoints.js`中定义新端点
2. 在`handlers/`目录下创建相应的处理器
3. 将端点与处理器绑定
4. 更新文档

### 处理数据库操作

```javascript
// 导入数据库服务
import { db } from './dataBase/dbService.js';

// 查询数据
const results = await db.query('SELECT * FROM documents WHERE id = ?', [documentId]);

// 更新数据
await db.update('documents', {
  title: newTitle,
  content: newContent
}, {
  id: documentId
});
```

## 性能考虑

- 大型操作应使用流式处理
- 长时间运行的任务应放入后台进程
- 请考虑内存使用，避免大对象常驻内存
- 使用缓存减少重复计算和数据库访问

## 安全建议

- 验证所有用户输入
- 使用参数化查询防止SQL注入
- 限制API请求频率
- 适当记录敏感操作的日志

## 故障排除

常见问题：

1. **服务器无法启动**：检查端口占用和权限
2. **API返回错误**：查看日志文件获取详细错误信息
3. **性能下降**：检查数据库查询和内存使用情况
4. **连接断开**：验证WebSocket配置和网络状态

## 重构说明

服务器模块正在逐步重构到新的架构，迁移目标为`src/services`目录。在迁移期间，请遵循以下原则：

1. 新功能优先在新架构中实现
2. 对旧代码的修改应尽可能少
3. 重构应保持向后兼容性
4. 使用适配器模式连接新旧系统 