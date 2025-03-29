# SSE工具集说明

## 概述

Server-Sent Events (SSE) 工具集提供了处理服务器发送事件流的完整功能，主要用于实现AI流式响应。本工具集分为两个主要部分：事件解析和流验证，确保可靠处理来自不同API的流式响应。

## 文件结构

1. `parseEvents.js` - 提供事件解析功能
2. `validateStream.js` - 提供流验证和辅助处理功能

## 主要功能

### 事件解析 (parseEvents.js)

- **解析SSE事件(`解析SSE事件`)**: 将原始SSE事件文本解析为结构化数据，支持多种内容格式（增量和完整模式）
- **解析OpenAI事件(`解析OpenAI事件`)**: 专门解析OpenAI API的SSE响应格式
- **分割事件(`分割事件`)**: 将包含多个事件的文本流分割为独立事件

### 流验证 (validateStream.js)

- **验证流有效性(`是有效流`)**: 检查对象是否为有效的可异步迭代流
- **验证SSE响应(`是有效SSE响应`)**: 检查HTTP响应是否为有效的SSE流
- **查找差异索引(`查找差异索引`)**: 用于增量更新时找出两个文本之间的差异起始位置
- **分割缓冲区(`分割缓冲区`)**: 将缓冲区文本分割为独立的块和剩余部分

## 使用示例

### 基本使用

```javascript
// 解析SSE事件
import { 解析SSE事件 } from './parseEvents.js';

const event = 'event: chunk\ndata: {"content": "Hello", "progress": 50}';
const result = 解析SSE事件(event);
console.log(result);
// 输出: { 类型: 'chunk', 数据: { 内容: 'Hello', 进度: 50, 模式: 'unknown', 是完整: false } }

// 验证流
import { 是有效流 } from './validateStream.js';

const validStream = {
  [Symbol.asyncIterator]: async function* () { yield 'data'; }
};
console.log(是有效流(validStream)); // true
```

### 流式消息处理

```javascript
import { 解析SSE事件, 分割事件 } from './parseEvents.js';
import { 是有效流, 分割缓冲区 } from './validateStream.js';

async function 处理流(response) {
  if (!是有效流(response)) {
    throw new Error('无效的响应流');
  }
  
  let buffer = '';
  let result = '';
  
  for await (const chunk of response) {
    buffer += chunk;
    const [events, remaining] = 分割缓冲区(buffer);
    buffer = remaining;
    
    for (const event of events) {
      const parsed = 解析SSE事件(event);
      if (parsed.数据.是完整) {
        return result;
      }
      result += parsed.数据.内容;
      // 处理进度更新等...
    }
  }
  
  return result;
}
```

## 注意事项

1. 流式处理中的增量更新需要特别处理，可使用`查找差异索引`函数来避免重复内容
2. 不同AI供应商的事件格式可能不同，需根据实际情况调整解析逻辑
3. 所有工具函数均提供中文命名和英文别名，保证代码可读性和兼容性

## 与其他模块的集成

本工具集通常与聊天模块(`useChat`)集成使用，处理流式响应并将结果转换为消息格式。例如：

```javascript
import { 处理流式消息 } from '../../feature/useChat/forStreamProcessing.js';
import { 创建流式消息 } from '../../feature/useChat/forMessageCreation.js';

// 处理AI响应流
const message = 创建流式消息();
await 处理流式消息(response, {
  onChunk: (updatedMsg) => {
    // 更新UI...
  },
  初始消息: message
});
``` 