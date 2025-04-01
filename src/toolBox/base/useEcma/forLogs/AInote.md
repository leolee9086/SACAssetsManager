# 日志工具重构笔记

## 重构目标

日志工具拆分为三个主要模块:

1. 日志记录器 (`useLogger.js`) - 提供日志记录的核心接口
2. 日志格式化工具 (`useLogFormatter.js`) - 提供各种日志格式化功能
3. 日志数据库 (`useLogDatabase.js`) - 提供基于IndexedDB的日志存储功能
4. 日志处理器 (`useLogProcessor.js`) - 提供高效的日志批处理功能

## 模块职责划分

### useLogger.js
- 创建日志记录器实例
- 提供不同级别的日志记录方法
- 支持格式化输出
- 支持定制日志输出目标

### useLogFormatter.js
- 提供各种日志格式模板
- 支持颜色化输出
- 支持结构化格式转换
- 支持自定义格式化逻辑

### useLogDatabase.js
- 提供基于IndexedDB的日志存储
- 处理日志条目的增删改查
- 支持日志条目自动清理
- 提供日志统计和检索功能

### useLogProcessor.js
- 高效批量处理日志条目
- 提供节流和缓冲功能
- 支持自动定时刷新
- 提供处理状态监控

## 使用示例

### 基本使用
```javascript
import { 日志 } from './src/toolBox/base/useEcma/forLogs/useLogger.js';

// 创建一个日志记录器
const 记录器 = 日志.创建日志记录器('组件名称');

// 记录不同级别的日志
记录器.信息('这是一条信息日志');
记录器.警告('这是一条警告日志');
记录器.错误('这是一条错误日志');
记录器.调试('这是一条调试日志');
```

### 使用数据库存储
```javascript
import { 日志 } from './src/toolBox/base/useEcma/forLogs/useLogger.js';
import * as 数据库 from './src/toolBox/base/useEcma/forLogs/useLogDatabase.js';

// 初始化数据库
await 数据库.初始化数据库();

// 创建数据库日志处理器
const 保存到数据库 = async (日志条目) => {
  await 数据库.添加日志条目(日志条目);
};

// 创建带数据库存储的日志记录器
const 记录器 = 日志.创建日志记录器('组件名称', {
  输出处理器: [保存到数据库, console.log]
});

// 记录日志
记录器.信息('这条日志会同时输出到控制台和保存到数据库');
```

### 使用批处理器
```javascript
import { 日志 } from './src/toolBox/base/useEcma/forLogs/useLogger.js';
import { 创建日志批处理器 } from './src/toolBox/base/useEcma/forLogs/useLogProcessor.js';
import * as 数据库 from './src/toolBox/base/useEcma/forLogs/useLogDatabase.js';

// 初始化数据库
await 数据库.初始化数据库();

// 创建批处理保存函数
const 批量保存 = async (日志条目列表) => {
  await 数据库.批量添加日志条目(日志条目列表);
};

// 创建批处理器
const 批处理器 = 创建日志批处理器(批量保存, {
  最大批量: 50,
  刷新间隔: 2000
});

// 创建带批处理的日志记录器
const 记录器 = 日志.创建日志记录器('组件名称', {
  输出处理器: [(日志条目) => 批处理器.添加日志(日志条目)]
});

// 记录大量日志时，会自动批量处理
for (let i = 0; i < 1000; i++) {
  记录器.信息(`测试日志 ${i}`);
}

// 应用关闭前刷新
window.addEventListener('beforeunload', async () => {
  await 批处理器.停止();
});
```

## 使用格式化器
```javascript
import { 日志 } from './src/toolBox/base/useEcma/forLogs/useLogger.js';
import * as 格式化器 from './src/toolBox/base/useEcma/forLogs/useLogFormatter.js';

// 创建自定义格式
const 自定义格式 = 格式化器.创建格式模板(
  '[{timestamp}] {level} ({category}): {message}'
);

// 创建使用自定义格式的日志记录器
const 记录器 = 日志.创建日志记录器('组件名称', {
  格式化函数: 自定义格式
});

// 记录日志
记录器.信息('这条日志会使用自定义格式输出');
```

## 日志工具拆分原则

1. **单一职责**：每个模块只负责一个主要功能
2. **高内聚**：相关功能放在一起
3. **低耦合**：模块之间通过明确的接口通信
4. **可组合**：模块可以灵活组合使用
5. **性能优先**：批处理和节流等优化内置
6. **全中文API**：提供完整的中文API

## 后续优化计划

1. 完善日志检索和过滤功能
2. 添加日志可视化工具
3. 提供日志传输和远程存储功能
4. 丰富日志格式和模板
5. 增强开发环境调试支持 