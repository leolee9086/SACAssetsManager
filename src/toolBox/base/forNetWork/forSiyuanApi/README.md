# 思源API请求模块

本模块提供了对思源笔记API的统一请求处理、缓存和重试机制。通过本模块，可以更方便地调用思源笔记的各种API，并获得更好的错误处理、缓存和重试机制支持。

## 主要功能

- 统一的思源API请求处理
- 请求缓存机制
- 请求重试机制
- 请求超时处理
- 统一的错误处理
- 针对不同API类型的便捷请求函数

## 使用方法

### 基础API请求

```javascript
import { 发送思源请求 } from '../../toolBox/base/forNetWork/forSiyuanApi/apiBase.js';

// 基本用法
async function 示例1() {
  const 结果 = await 发送思源请求('notebook', 'lsNotebooks');
  console.log('笔记本列表', 结果.data);
}

// 带参数调用
async function 示例2() {
  const 结果 = await 发送思源请求('block', 'getBlockInfo', { id: '20220101121212-abcdef' });
  console.log('块信息', 结果.data);
}

// 使用缓存
async function 示例3() {
  const 选项 = {
    使用缓存: true,
    缓存时间: 30000 // 30秒缓存有效期
  };
  
  // 第一次调用会发起实际请求
  const 结果1 = await 发送思源请求('notebook', 'lsNotebooks', {}, 选项);
  
  // 30秒内再次调用会使用缓存的结果
  const 结果2 = await 发送思源请求('notebook', 'lsNotebooks', {}, 选项);
}

// 自定义重试和超时
async function 示例4() {
  const 选项 = {
    重试次数: 5,    // 最多重试5次
    重试延迟: 500,  // 初始延迟500毫秒
    超时时间: 10000 // 10秒超时
  };
  
  try {
    const 结果 = await 发送思源请求('workspace', 'getConf', {}, 选项);
    console.log('工作区配置', 结果.data);
  } catch (错误) {
    console.error('请求失败', 错误);
  }
}
```

### 专用API请求函数

```javascript
import { 
  发送块请求,
  发送笔记本请求,
  发送工作区请求,
  发送资源请求,
  发送SQL查询,
  发送搜索请求,
  发送同步请求
} from '../../toolBox/base/forNetWork/forSiyuanApi/apiBase.js';

// 块操作
async function 块操作示例() {
  const 块信息 = await 发送块请求('getBlockInfo', { id: '20220101121212-abcdef' });
  console.log('块信息', 块信息.data);
}

// 笔记本操作
async function 笔记本操作示例() {
  const 笔记本列表 = await 发送笔记本请求('lsNotebooks');
  console.log('笔记本列表', 笔记本列表.data);
}

// 工作区操作
async function 工作区操作示例() {
  const 工作区配置 = await 发送工作区请求('getConf');
  console.log('工作区配置', 工作区配置.data);
}

// 资源文件上传
async function 资源文件操作示例() {
  const 文件 = new File(['hello'], 'hello.txt', { type: 'text/plain' });
  const formData = new FormData();
  formData.append('file[]', 文件);
  
  const 上传结果 = await 发送资源请求('upload', formData);
  console.log('上传结果', 上传结果.data);
}

// SQL查询
async function SQL查询示例() {
  const sql = "SELECT * FROM blocks WHERE content LIKE '%思源%' LIMIT 10";
  const 查询结果 = await 发送SQL查询(sql);
  console.log('SQL查询结果', 查询结果.data);
}

// 全文搜索
async function 搜索示例() {
  const 搜索结果 = await 发送搜索请求({
    query: "思源笔记",
    types: ["doc", "heading", "paragraph"],
    paths: ["/"]
  });
  console.log('搜索结果', 搜索结果.data);
}

// 同步操作
async function 同步示例() {
  const 同步状态 = await 发送同步请求('getSyncInfo');
  console.log('同步状态', 同步状态.data);
}
```

### 缓存管理

```javascript
import { 清除API缓存 } from '../../toolBox/base/forNetWork/forSiyuanApi/apiBase.js';

// 清除所有缓存
清除API缓存();

// 清除特定缓存（需要提供缓存键）
清除API缓存('notebook/lsNotebooks/{}');
```

## 高级用法

### 处理大量请求

对于需要发送大量请求的场景，可以结合`Promise.all`和批处理来优化：

```javascript
async function 批量获取块信息(块ID列表) {
  // 将请求分批处理，每批10个
  const 批大小 = 10;
  const 结果 = [];
  
  for (let i = 0; i < 块ID列表.length; i += 批大小) {
    const 当前批 = 块ID列表.slice(i, i + 批大小);
    const 请求列表 = 当前批.map(id => 发送块请求('getBlockInfo', { id }));
    
    // 并行处理当前批次请求
    const 批结果 = await Promise.all(请求列表);
    结果.push(...批结果);
    
    // 避免请求过快，适当延迟
    if (i + 批大小 < 块ID列表.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return 结果;
}
```

### 创建自定义请求

如果需要支持新的API，可以轻松创建自定义请求函数：

```javascript
// 自定义新API请求
export const 发送自定义请求 = (endpoint, data = {}, options = {}) => {
  return 发送思源请求('custom', endpoint, data, options);
};
```

## 注意事项

1. 对于上传文件等使用FormData的请求，不会使用缓存
2. 建议为不常变化的数据启用缓存，提高性能
3. 请求错误会在控制台输出警告和错误信息
4. 所有API函数都同时提供中英文命名版本 