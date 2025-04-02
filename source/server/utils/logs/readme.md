# 日志数据库模块使用指南

## 简介

`logDB.js` 是一个基于 IndexedDB 的高性能日志存储模块，专为前端应用设计，可以高效地记录、存储和查询日志信息。

## 安装与引入

直接导入需要的函数：

```javascript
import { 
  初始化数据库, 
  保存日志, 
  加载日志, 
  按条件查询日志 
} from './utils/logs/logDB.js';
```

## 基本用法

### 1. 初始化数据库

在应用启动时初始化数据库：

```javascript
try {
  await 初始化数据库();
  console.log('日志数据库初始化成功');
} catch (错误) {
  console.error('日志数据库初始化失败', 错误);
}
```

### 2. 保存日志

单条日志：

```javascript
await 保存日志([
  {
    级别: 'info',  // 日志级别：info, warn, error, debug
    内容: '用户登录成功',  // 日志内容
    来源: '用户认证',  // 日志来源模块
    元数据: { userId: 'user123', ip: '192.168.1.1' }  // 可选的额外信息
  }
]);
```

批量保存（性能更好）：

```javascript
await 保存日志([
  { 级别: 'info', 内容: '开始处理数据', 来源: '数据处理' },
  { 级别: 'warn', 内容: '数据格式异常', 来源: '数据处理' },
  { 级别: 'error', 内容: '处理失败', 来源: '数据处理', 元数据: { 错误码: 500 } }
]);
```

### 3. 查询日志

基本查询（分页）：

```javascript
// 获取第一页，每页50条
const 日志列表 = await 加载日志(0, 50);

// 获取下一页
const 下一页 = await 加载日志(1, 50);
```

基于时间戳的连续加载：

```javascript
const 日志列表 = await 加载日志(0, 20);
if (日志列表.length > 0) {
  const 最早日志时间 = 日志列表[日志列表.length - 1].时间;
  const 更早日志 = await 加载早于时间戳的日志(最早日志时间, 20);
}
```

条件查询：

```javascript
// 查询特定级别的日志
const 错误日志 = await 按条件查询日志({ 级别: 'error' });

// 查询时间范围内的日志
const 今日日志 = await 按条件查询日志({ 
  开始时间: new Date().setHours(0, 0, 0, 0),
  结束时间: new Date() 
});

// 组合条件查询
const 系统错误 = await 按条件查询日志({
  级别: 'error',
  来源: '系统',
  开始时间: '2023-01-01T00:00:00Z'
});
```

### 4. 管理日志

获取日志总数：

```javascript
const 总数 = await 获取日志计数();
```

清空日志：

```javascript
await 清空日志数据库();
```

## 高级用法

### 自定义过滤器

可以使用导出的过滤函数进行自定义过滤：

```javascript
import { 加载日志, 按级别过滤, 按时间范围过滤 } from './utils/logs/logDB.js';

// 自定义过滤逻辑
const 日志 = await 加载日志(0, 1000);
const 已过滤 = 按级别过滤(日志, 'warn')
  .filter(日志 => 日志.内容.includes('网络'));
```

### 错误处理

所有数据库操作都应该使用 try-catch 进行错误处理：

```javascript
try {
  await 保存日志([{ 级别: 'info', 内容: '操作成功' }]);
} catch (错误) {
  console.error('保存日志失败', 错误);
  // 可以实现备用存储策略，如存储到localStorage
}
```

## 性能优化建议

1. 尽量批量保存日志，而非单条保存
2. 定期清理不需要的旧日志
3. 在查询时设置合理的数量限制
4. 使用具体的查询条件降低过滤负担 