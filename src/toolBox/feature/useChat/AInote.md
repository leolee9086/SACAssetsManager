# 聊天功能工具集说明

## 概述

此目录包含处理聊天相关功能的工具集，从MAGI面板重构而来。这些工具可用于构建各种聊天界面、处理流式响应以及管理消息格式化等。

## 文件结构

- `forMessageCreation.js` - 消息创建工具，提供创建各种类型消息的函数
- `forMessageFormatting.js` - 消息格式化工具，包括处理特殊标签如`<think>`等
- `forStreamProcessing.js` - 流式消息处理工具，用于处理SSE流式响应

## 主要功能

### 消息创建
提供了一系列用于创建不同类型消息的函数：

- `创建消息()` - 创建基础消息
- `创建用户消息()` - 创建用户发送的消息
- `创建助手消息()` - 创建AI助手的回复
- `创建系统消息()` - 创建系统通知
- `创建错误消息()` - 创建错误提示
- `创建流式消息()` - 创建流式加载消息
- `创建投票消息()` - 创建投票结果消息
- `创建共识消息()` - 创建多AI共识结果

### 消息格式化

- `解析思考内容()` - 解析消息中的`<think>`标签，提取思考内容和普通内容
- `格式化富文本消息()` - 处理消息中的富文本标记（如加粗、斜体等）
- `处理三贤人响应并转换Think标签()` - 特定于MAGI系统的处理函数

### 流式处理

- `处理流式消息()` - 处理SSE流式响应，支持增量和全量更新
- `简易流处理()` - 简化版流处理函数，适用于简单场景

## 使用示例

```js
// 创建消息
import { 创建用户消息, 创建助手消息 } from '../toolBox/feature/useChat/forMessageCreation.js';

const 用户消息 = 创建用户消息('你好，AI助手');
const 助手回复 = 创建助手消息('你好，我是AI助手，有什么可以帮到你的？');

// 处理流式消息
import { 处理流式消息 } from '../toolBox/feature/useChat/forStreamProcessing.js';

const 处理响应 = async (response) => {
  const 结果 = await 处理流式消息(response, {
    onStart: (msg) => {
      console.log('开始接收流');
      // 可以在此添加初始消息到UI
    },
    onChunk: (msg) => {
      console.log('收到数据块:', msg.content);
      // 可以在此更新UI显示
    },
    onComplete: (msg) => {
      console.log('流处理完成:', msg.content);
      // 可以在此更新最终状态
    }
  });
  
  return 结果.content;
};

// 解析带思考标签的消息
import { 解析思考内容 } from '../toolBox/feature/useChat/forMessageFormatting.js';

const 原始消息 = '我需要先思考一下<think>这是一个复杂问题，让我分析一下...</think>我的回答是...';
const { 思考内容, 普通内容, 有思考 } = 解析思考内容(原始消息);

console.log('思考内容:', 思考内容);
console.log('普通内容:', 普通内容);
console.log('有思考:', 有思考);
```

## 重构说明

这些工具函数原本来自MAGI面板（source/UI/pannels/MAGI），为了提高代码复用性和组织结构，我们将它们重构为独立的工具函数并移至toolBox目录。所有函数都保留了中文命名，同时提供英文别名以兼容现有代码。 