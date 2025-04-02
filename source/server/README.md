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

# 服务端架构说明

## 总体架构

服务端由两个独立的服务组成：

1. **主服务器**：提供API服务、文件索引和处理逻辑
2. **静态文件服务器**：提供静态资源访问和缩略图服务

这两个服务相互独立运行，通过HTTP协议和广播通道进行通信。

## 服务启动流程

1. 插件主进程(`main.js`)创建主服务窗口
2. 主服务窗口加载并初始化(`init.js`)
3. 主服务准备就绪后，通知主进程
4. 主进程创建静态服务窗口
5. 静态服务窗口加载并初始化

## 服务间通信

- 主进程通过`BroadcastChannel`与两个服务通信
- 静态服务通过HTTP协议从主服务获取缩略图
- 主进程进行心跳检测，确保服务正常运行

## 文件结构

- `main.js` - 服务容器管理和创建入口
- `init.js` - 主服务初始化流程
- `server.js` - 主服务核心代码
- `staticServerEntry.html` - 静态服务的入口
- `bootstrap/` - 包含各模块的初始化代码
- `handlers/` - API处理函数
- `processors/` - 业务处理逻辑
- `middlewares/` - 中间件

## 端口使用

- 主服务：使用插件配置的端口
- 静态服务：使用主服务端口+1

## 设计优势

1. **职责分离**：主服务和静态服务各司其职
2. **独立扩展**：两个服务可以独立扩展和维护
3. **容错性**：静态服务崩溃不会影响主服务
4. **性能优化**：静态资源服务专门优化，缓存更高效 