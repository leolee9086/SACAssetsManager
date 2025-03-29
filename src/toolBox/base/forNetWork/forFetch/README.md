# 网络请求工具 (forFetch)

此目录包含用于进行网络请求的工具函数，提供了标准fetch API的替代实现和扩展功能。

## 文件说明

- `fetchWorkerTools.js` - 基于Web Worker的并行fetch请求工具，支持多Worker并发执行
- `fetchSyncTools.js` - 同步版本的HTTP请求工具，基于XMLHttpRequest
- `index.js` - 统一导出接口

## 使用示例

### Web Worker版fetch

```javascript
import { 使用Worker发起请求, 终止所有Worker } from '../toolBox/base/forNetWork/forFetch/fetchWorkerTools.js';
// 或者使用英文API
// import { fetchWorker, terminateWorkers } from '../toolBox/base/forNetWork/forFetch/fetchWorkerTools.js';

// 发起请求
const response = await 使用Worker发起请求('https://api.example.com/data', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ key: 'value' }),
  responseType: 'json'
});

console.log(response.data);

// 使用完毕后终止Worker（通常在应用关闭时）
终止所有Worker();
```

### 同步fetch

```javascript
import { 同步发起请求, 同步获取JSON } from '../toolBox/base/forNetWork/forFetch/fetchSyncTools.js';
// 或者使用英文API
// import { fetchSync, fetchSyncJSON } from '../toolBox/base/forNetWork/forFetch/fetchSyncTools.js';

// 同步获取JSON数据（阻塞当前线程）
try {
  const data = 同步获取JSON('https://api.example.com/data');
  console.log(data);
} catch (error) {
  console.error('请求失败:', error);
}

// 同步发起请求获取完整响应
const response = 同步发起请求('https://api.example.com/resource');
if (response.ok) {
  const text = response.text();
  console.log(text);
}
```

## 注意事项

1. **Web Worker版fetch**:
   - 需要浏览器环境支持Web Worker
   - 提供更好的并发性能，适合多个请求并行执行
   - 默认维护4个Worker线程池，可自定义池大小

2. **同步fetch**:
   - 会阻塞JavaScript主线程，性能较差
   - 仅推荐在特定场景下使用，如启动初始化数据获取
   - 超过50ms的请求会输出性能警告
   - 在某些浏览器环境中可能受到限制或不支持

3. **通用建议**:
   - 除非有特殊需求，优先使用标准的异步fetch API
   - Worker版fetch适合需要并行执行大量请求的场景
   - 同步fetch只应作为最后的备选方案 