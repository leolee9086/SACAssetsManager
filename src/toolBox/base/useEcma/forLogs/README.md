# 日志工具 (Logging Tools)

本目录包含日志记录、格式化、存储和处理的工具函数，提供完整的日志解决方案。

## 文件结构

- `useLogger.js` - 日志记录器核心模块
- `useLogFormatter.js` - 日志格式化工具模块
- `useLogDatabase.js` - 日志数据库存储模块
- `useLogProcessor.js` - 日志批处理器模块
- `README.md` - 本文档
- `AInote.md` - 开发笔记

## 核心功能

### 日志记录器 (useLogger.js)

提供日志记录的核心接口，支持不同日志级别和多种输出目标。

```javascript
import { 日志 } from './useLogger.js';

// 创建日志记录器
const logger = 日志.创建日志记录器('模块名称');

// 记录不同级别的日志
logger.信息('这是一条信息');
logger.警告('这是一条警告');
logger.错误('这是一条错误');
logger.调试('这是一条调试信息');
```

### 日志格式化 (useLogFormatter.js)

提供丰富的日志格式化功能，支持颜色、时间戳和自定义模板。

```javascript
import * as 格式化器 from './useLogFormatter.js';

// 使用预定义格式
const 简单格式 = 格式化器.简单格式;
const 详细格式 = 格式化器.详细格式;
const 彩色格式 = 格式化器.彩色格式;

// 创建自定义格式
const 自定义格式 = 格式化器.创建格式模板('[{timestamp}] {level}: {message}');
```

### 日志数据库 (useLogDatabase.js)

提供基于IndexedDB的日志存储和检索功能，支持高效的日志管理。

```javascript
import * as 数据库 from './useLogDatabase.js';

// 初始化日志数据库
await 数据库.初始化数据库({
  数据库名: 'myAppLogs',
  最大条目数: 5000
});

// 添加日志
await 数据库.添加日志条目({
  level: 'info',
  message: '系统启动',
  timestamp: Date.now(),
  category: '系统'
});

// 查询日志
const 结果 = await 数据库.查询日志条目({
  level: 'error',
  startTime: 昨天时间戳,
  endTime: 当前时间戳,
  limit: 100,
  orderBy: 'desc'
});

// 清理旧日志
await 数据库.清空日志();
```

### 日志处理器 (useLogProcessor.js)

提供高效的日志批处理功能，支持节流、缓冲和自动刷新。

```javascript
import { 创建日志批处理器, 创建节流函数 } from './useLogProcessor.js';
import * as 数据库 from './useLogDatabase.js';

// 创建批处理器
const 批处理器 = 创建日志批处理器(
  // 保存函数
  async (日志列表) => {
    await 数据库.批量添加日志条目(日志列表);
  },
  // 配置选项
  {
    最大批量: 100,
    刷新间隔: 2000,
    缓冲区最大大小: 10000,
    启用自动刷新: true
  }
);

// 添加日志到批处理器
批处理器.添加日志({
  level: 'info',
  message: '用户登录',
  timestamp: Date.now(),
  category: '用户'
});

// 获取批处理器统计
const 统计 = 批处理器.获取统计信息();
console.log(`已处理 ${统计.处理批次} 批日志，总计 ${统计.添加总数} 条`);

// 应用关闭前停止批处理器
window.addEventListener('beforeunload', async () => {
  await 批处理器.停止();
});

// 创建节流函数
const 节流发送日志 = 创建节流函数((消息) => {
  console.log(`延迟发送: ${消息}`);
}, 500);

// 调用节流函数
节流发送日志('测试消息');
```

## 集成使用示例

以下示例展示如何集成所有模块创建完整的日志系统：

```javascript
import { 日志 } from './useLogger.js';
import * as 格式化器 from './useLogFormatter.js';
import * as 数据库 from './useLogDatabase.js';
import { 创建日志批处理器 } from './useLogProcessor.js';

// 初始化
async function 初始化日志系统() {
  // 初始化数据库
  await 数据库.初始化数据库();
  
  // 创建批处理器
  const 批处理器 = 创建日志批处理器(
    async (日志列表) => {
      await 数据库.批量添加日志条目(日志列表);
    },
    { 最大批量: 50, 刷新间隔: 1000 }
  );
  
  // 创建带批处理的日志记录器
  const 系统日志 = 日志.创建日志记录器('系统', {
    格式化函数: 格式化器.彩色格式,
    输出处理器: [
      // 输出到控制台
      console.log,
      // 存储到数据库
      (日志) => 批处理器.添加日志(日志)
    ]
  });
  
  return {
    系统日志,
    批处理器,
    异步查询: async (条件) => 数据库.查询日志条目(条件)
  };
}

// 使用日志系统
const 日志系统 = await 初始化日志系统();
日志系统.系统日志.信息('日志系统初始化完成');
```

## 性能考虑

- 使用批处理器可以显著减少数据库操作，提高日志系统性能
- 节流函数可以防止频繁记录日志导致的性能问题
- 日志数据库会自动清理旧日志，防止存储空间过度增长
- 格式化只在必要时进行，避免不必要的字符串操作

## 扩展建议

- 添加远程日志功能，将日志发送到中央服务器
- 实现日志查看器UI，方便浏览和检索日志
- 添加日志分析功能，提供统计和异常检测
- 开发日志导出工具，支持导出为CSV或JSON格式

## 兼容性提示

日志数据库模块依赖于IndexedDB API，在一些老旧浏览器或WebView环境中可能不可用。在这种情况下，可以使用内存存储或LocalStorage作为替代方案。 