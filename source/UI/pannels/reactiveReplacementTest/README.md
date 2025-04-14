# 响应式替代测试面板

## 概述

本面板用于验证 `useSyncedReactive` 作为 Vue 原生 `reactive` 的完全替代品的表现。它展示了响应式同步系统如何无缝地替代标准 Vue 响应式系统，同时提供额外的跨窗口/跨组件同步功能。

## 功能特点

- 完全使用 `useSyncedReactive` 替代 Vue 的 `reactive`
- 支持复杂对象和数组的响应式操作
- 提供实时的跨窗口数据同步
- 内置性能监测和日志记录
- 支持离线操作和重连同步

## 集成方式

### 作为插件面板使用

面板已注册为标准插件面板，可以通过以下方式打开：

```javascript
// 在代码中打开面板
eventBus.emit('plugin-tab:open', {
  tabType: 'reactiveReplacementTab',
  tabData: {
    // 可选配置
    syncConfig: {
      namespace: 'custom-namespace',
      id: 'custom-data-id'
    }
  }
});
```

### 面板配置参数

支持的配置参数包括：

- `namespace`: 同步命名空间
- `id`: 数据标识符
- `roomName`: 同步房间名称
- `siyuanConfig`: 思源同步配置
- `tabId`: 自定义标签页ID

### 作为组件复用

面板也可以作为组件在其他面板中复用：

```html
<ReactiveReplacementTest 
  :syncConfig="{ 
    namespace: 'embedded-test',
    id: 'panel-data' 
  }"
/>
```

## 开发扩展

要扩展此测试面板，可以：

1. 添加更多测试类型到现有布局中
2. 扩展性能分析指标
3. 添加更复杂的数据结构测试用例

## 技术实现

- 使用 Vue 3 Composition API
- 使用 useSyncedReactive 替代所有响应式数据
- 与标准 Vue API (computed, watch) 完全兼容
- 使用思源 WebSocket 作为同步通道

## 依赖关系

- src/toolBox/useAge/forSync/useSyncedReactive.js
- static/vue.esm-browser.js 