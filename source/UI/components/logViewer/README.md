# 日志查看器组件

日志查看器是一个高性能、模块化的日志显示和管理系统，专为处理大量日志记录而设计。

## 主要特性

- 高性能日志显示和筛选
- 实时日志接收和处理
- 支持日志级别、关键词和标签过滤
- 支持查看历史日志和无限滚动
- 图片预览功能
- 复制和导出功能

## 组件结构

日志查看器由以下模块组成：

1. `logViewer.vue` - 主组件
2. `LogContainer.vue` - 日志显示容器，处理滚动和加载
3. `logEntry.vue` - 单条日志记录组件
4. `logControls.vue` - 控制面板组件
5. `imageViewer.vue` - 图片查看器组件
6. `Notification.vue` - 通知消息组件

## 工具模块

1. `useLogData.js` - 日志数据管理钩子函数
2. `logUtils.js` - 通用工具函数

## 使用方法

### 基本使用

```vue
<template>
  <logViewer />
</template>

<script setup>
import logViewer from '../pannels/logViewer.vue'
</script>
```

### 添加日志

```js
// 获取组件引用
const logViewerRef = ref(null)

// 添加单条日志
logViewerRef.value.添加日志({
  级别: 'info',
  内容: '这是一条日志消息',
  时间: new Date().toISOString(),
  来源: '应用程序',
  标签: ['系统', '初始化']
})

// 批量添加日志
logViewerRef.value.批量添加日志([
  { 级别: 'info', 内容: '消息1' },
  { 级别: 'error', 内容: '错误消息' }
])
```

### 清空日志

```js
logViewerRef.value.清空日志()
```

## 性能优化

日志查看器使用了多种性能优化技术：

1. 惰性加载 - 仅加载和渲染可见区域的日志
2. 批处理 - 批量处理日志保存和渲染
3. 节流 - 减少滚动事件处理频率
4. 组件拆分 - 独立的组件和逻辑关注点分离
5. 内存管理 - 限制内存中的最大日志数量

## 数据库集成

日志查看器使用IndexedDB进行本地日志存储：

- 日志自动保存到本地数据库
- 支持分页加载和时间范围查询
- 支持日志导出功能

## 注意事项

- 默认最大内存日志数为1000条，可配置
- 日志级别支持：info, warn, error, debug
- 当接收到大量日志时，会自动丢弃旧日志以保持性能 