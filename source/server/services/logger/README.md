# 日志服务

## 服务说明

日志服务是应用的基础服务，提供全局统一的日志记录功能。该服务支持多种日志级别、多种输出目标，并提供格式化和过滤功能，使系统行为更加透明、可调试和可监控。

## 功能

- 多级别日志记录（debug、info、warn、error）
- 同时支持控制台和文件输出
- 日志文件轮转和大小限制
- 结构化日志格式
- 上下文标记和分类
- 错误堆栈捕获和格式化
- 日志查询和过滤
- 性能分析日志

## 文件结构

- `loggerService.js` - 主服务实现，提供日志记录核心功能
- `logFormatter.js` - 日志格式化工具，处理日志的格式和结构
- `fileTransport.js` - 文件传输实现，处理日志文件的存储和轮转

## 配置项

日志服务的配置位于`config/default.js`中：

```javascript
logger: {
    // 日志级别 (debug, info, warn, error)
    level: 'info',
    // 日志文件路径
    filePath: path.join(os.homedir(), 'sacassetsmanager', 'logs'),
    // 是否在控制台输出
    console: true,
    // 是否记录到文件
    file: true,
    // 最大日志文件大小（字节）
    maxSize: 10 * 1024 * 1024, // 10MB
    // 最大历史文件数量
    maxFiles: 5,
    // 格式选项
    format: {
        // 时间戳格式
        timestamp: 'YYYY-MM-DD HH:mm:ss.SSS',
        // 是否着色（控制台输出）
        colorize: true,
        // 是否包含调用者信息
        caller: true
    }
}
```

## API参考

### 记录信息日志

```javascript
/**
 * 记录信息级别日志
 * @param {string} message - 日志消息
 * @param {string} [category='General'] - 日志分类
 * @param {Object} [metadata] - 额外元数据
 */
logger.info(message, category, metadata)
```

### 记录警告日志

```javascript
/**
 * 记录警告级别日志
 * @param {string} message - 日志消息
 * @param {string} [category='General'] - 日志分类
 * @param {Object} [metadata] - 额外元数据
 */
logger.warn(message, category, metadata)
```

### 记录错误日志

```javascript
/**
 * 记录错误级别日志
 * @param {string} message - 日志消息
 * @param {Error|string} [error] - 错误对象或错误消息
 * @param {string} [category='General'] - 日志分类
 * @param {Object} [metadata] - 额外元数据
 */
logger.error(message, error, category, metadata)
```

### 记录调试日志

```javascript
/**
 * 记录调试级别日志
 * @param {string} message - 日志消息
 * @param {string} [category='General'] - 日志分类
 * @param {Object} [metadata] - 额外元数据
 */
logger.debug(message, category, metadata)
```

### 性能分析

```javascript
/**
 * 开始性能分析
 * @param {string} label - 分析标签
 * @returns {Function} 结束分析的函数
 */
const end = logger.startProfiling(label);

// 在完成操作后调用
end(); // 输出操作耗时
```

### 查询日志

```javascript
/**
 * 查询日志
 * @param {Object} options - 查询选项
 * @param {string} [options.level] - 日志级别过滤
 * @param {string} [options.category] - 分类过滤
 * @param {string} [options.startDate] - 开始日期
 * @param {string} [options.endDate] - 结束日期
 * @param {string} [options.search] - 搜索关键字
 * @param {number} [options.limit=100] - 返回数量限制
 * @returns {Promise<Array>} 日志条目数组
 */
logger.query(options)
```

## 使用示例

### 基本日志记录

```javascript
import { logger } from '../services/logger/loggerService.js';

// 记录信息日志
logger.info('操作成功完成', 'UserService');

// 记录警告日志
logger.warn('配置项缺失，使用默认值', 'ConfigService', { 
  missingKey: 'server.timeout',
  defaultValue: 30000
});

// 记录错误日志
try {
  // 一些可能出错的操作
} catch (error) {
  logger.error('操作失败', error, 'FileService', {
    filePath: '/path/to/file.txt',
    operation: 'read'
  });
}
```

### 性能分析

```javascript
import { logger } from '../services/logger/loggerService.js';

async function processLargeFile(filePath) {
  const end = logger.startProfiling('文件处理');
  
  // 执行一些耗时操作
  await heavyOperation();
  
  // 结束分析并记录耗时
  end(); // 输出: "文件处理 完成，耗时: 1250ms"
}
```

### 查询日志

```javascript
import { logger } from '../services/logger/loggerService.js';

async function getErrorLogs() {
  // 查询过去24小时的错误日志
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const logs = await logger.query({
    level: 'error',
    startDate: yesterday.toISOString(),
    limit: 50
  });
  
  console.log(`找到 ${logs.length} 条错误日志`);
  return logs;
}
```

## 依赖说明

日志服务依赖以下组件：

1. 文件系统访问（原生fs模块）
2. 配置管理（configManager.js）
3. 日期时间处理库（可选，如dayjs或date-fns）

## 日志格式

日志服务生成的日志条目包含以下字段：

```json
{
  "timestamp": "2023-06-15T09:23:45.123Z",
  "level": "info",
  "message": "用户登录成功",
  "category": "AuthService",
  "pid": 12345,
  "hostname": "server-node-1",
  "metadata": {
    "userId": "user123",
    "ip": "192.168.1.100"
  },
  "caller": {
    "file": "authService.js",
    "line": 125,
    "function": "loginUser"
  }
}
```

## 日志文件管理

1. 日志文件按照日期命名（如`app-2023-06-15.log`）
2. 当日志文件达到配置的最大大小时，会自动轮转
3. 最多保留配置的历史文件数量，超出时自动删除最旧的日志文件
4. 可通过设置`maxSize`和`maxFiles`控制存储空间使用

## 最佳实践

1. **选择合适的日志级别**：
   - `debug` - 仅用于开发调试
   - `info` - 记录正常流程和重要操作
   - `warn` - 记录需要注意但不影响系统运行的问题
   - `error` - 记录影响功能和系统运行的错误

2. **添加上下文信息**：
   - 总是指定分类（通常是模块或服务名称）
   - 添加相关的元数据（如用户ID、资源ID等）
   - 对于错误日志，确保传入完整的错误对象以捕获堆栈

3. **避免敏感信息**：
   - 不要记录密码、令牌等敏感信息
   - 过滤掉个人身份信息（PII）
   - 使用通用标识符代替明文内容

## 未来改进

1. 添加结构化日志查询API，支持更复杂的查询和过滤
2. 实现实时日志流，便于监控和调试
3. 添加日志聚合和分析功能
4. 集成第三方监控系统（如ELK、Datadog等）
5. 添加日志压缩和归档功能，优化存储空间使用 