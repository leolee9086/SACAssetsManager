# 日志服务

日志服务是系统的核心组件之一，负责记录和管理应用程序运行过程中的各种信息、警告和错误。它提供了统一的日志记录接口，支持不同级别的日志记录、日志分类、性能分析等功能。

## 功能特性

- 多级别日志记录（debug、info、warn、error）
- 日志分类管理
- 文件日志和控制台日志输出
- 日志文件自动轮转
- 日志压缩和清理
- 性能分析支持
- 日志查询和过滤
- 调用栈追踪

## 文件结构

```
services/logger/
├── README.md           # 服务文档
├── loggerService.js    # 主服务实现
├── logFormatter.js     # 日志格式化器
└── fileTransport.js    # 文件传输模块
```

## 配置选项

配置项位于 `config/default.js`：

```javascript
{
  logger: {
    level: 'info',           // 日志级别
    filePath: './logs',      // 日志文件路径
    maxSize: 10 * 1024 * 1024,  // 单个日志文件最大大小（字节）
    maxFiles: 10,            // 最大保留的日志文件数
    console: true,           // 是否输出到控制台
    file: true,             // 是否输出到文件
    format: 'json'          // 日志格式
  }
}
```

## API 参考

### 基础日志记录

```javascript
import { debug, info, warn, error } from './services/logger/loggerService.js';

// 记录调试日志
debug('调试信息', 'Debug', { userId: 123 });

// 记录信息日志
info('操作成功', 'Operation', { action: 'create' });

// 记录警告日志
warn('资源不足', 'Resource', { type: 'memory' });

// 记录错误日志
error('操作失败', new Error('数据库连接失败'), 'Database');
```

### 性能分析

```javascript
import { startProfiling } from './services/logger/loggerService.js';

// 开始性能分析
const endProfiling = startProfiling('数据库查询');

// 执行操作
await performDatabaseQuery();

// 结束性能分析
endProfiling();
```

### 日志查询

```javascript
import { query } from './services/logger/loggerService.js';

// 查询日志
const logs = await query({
  level: 'error',
  category: 'Database',
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  search: '连接失败',
  limit: 100
});
```

## 日志格式

日志条目采用 JSON 格式，包含以下字段：

```javascript
{
  timestamp: '2024-01-01T12:00:00.000Z',  // ISO 格式时间戳
  level: 'info',                           // 日志级别
  message: '操作成功',                      // 日志消息
  category: 'Operation',                   // 日志分类
  metadata: {                              // 额外元数据
    userId: 123,
    action: 'create'
  },
  caller: {                                // 调用者信息
    function: 'handleRequest',
    file: 'requestHandler.js',
    line: 42,
    column: 15
  },
  error: {                                 // 错误信息（如果有）
    message: '数据库连接失败',
    stack: 'Error: 数据库连接失败\n    at ...',
    name: 'Error'
  }
}
```

## 使用示例

### 1. 记录操作日志

```javascript
import { info } from './services/logger/loggerService.js';

async function createUser(userData) {
  try {
    const user = await db.users.create(userData);
    info('用户创建成功', 'User', {
      userId: user.id,
      action: 'create',
      data: userData
    });
    return user;
  } catch (error) {
    error('用户创建失败', error, 'User', {
      data: userData
    });
    throw error;
  }
}
```

### 2. 性能监控

```javascript
import { startProfiling } from './services/logger/loggerService.js';

async function processBatch(items) {
  const endProfiling = startProfiling('批处理');
  
  try {
    for (const item of items) {
      await processItem(item);
    }
  } finally {
    endProfiling();
  }
}
```

### 3. 错误追踪

```javascript
import { error } from './services/logger/loggerService.js';

async function handleRequest(req, res) {
  try {
    await processRequest(req);
    res.send({ success: true });
  } catch (err) {
    error('请求处理失败', err, 'Request', {
      method: req.method,
      url: req.url,
      headers: req.headers
    });
    res.status(500).send({ error: '服务器内部错误' });
  }
}
```

## 依赖项

- 文件系统服务：用于日志文件的读写操作
- 配置管理器：用于获取日志配置
- 路径处理模块：用于处理文件路径

## 性能优化

1. 异步写入：使用异步文件操作避免阻塞
2. 批量处理：支持日志批量写入
3. 文件轮转：自动管理日志文件大小和数量
4. 压缩存储：支持日志文件压缩

## 未来改进

1. 添加日志聚合功能
2. 实现日志分析工具
3. 支持远程日志收集
4. 添加日志告警机制
5. 优化日志查询性能 