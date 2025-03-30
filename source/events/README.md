# 事件系统

本目录包含思源插件的事件相关工具，暂时负责处理全局事件、编辑器事件和资源变更事件等等。

## 目录结构

- **editorEvents/** - 编辑器相关事件处理器和监听器

## 主要文件

- **globalEvents.js** - 全局事件管理器，处理应用级别事件
- **eventNames.js** - 事件名称常量定义
- **assets.js** - 资源变更事件管理器

## 使用方法

### 订阅全局事件

```javascript
import { subscribe, eventTypes } from './globalEvents.js';

// 订阅主题切换事件
const unsubscribe = subscribe(eventTypes.THEME_CHANGED, (themeData) => {
  console.log('主题已更改为:', themeData.name);
  // 处理主题变更
});

// 取消订阅
unsubscribe();
```

### 触发全局事件

```javascript
import { emit, eventTypes } from './globalEvents.js';

// 触发自定义事件
emit(eventTypes.CUSTOM_EVENT, {
  detail: '事件详情',
  timestamp: Date.now()
});
```

### 编辑器事件处理

```javascript
import { registerEditorHandler } from './editorEvents/handlers.js';

// 注册编辑器选中文本事件处理器
registerEditorHandler('text-selected', (editor, selection) => {
  console.log('选中的文本:', selection.text);
  // 处理选中文本
  return false; // 返回false允许事件继续传播
});
```

## 事件类型

### 全局事件

| 事件名 | 描述 | 参数 |
|--------|------|------|
| APP_READY | 应用就绪 | 无 |
| THEME_CHANGED | 主题变更 | `{name, mode, colors}` |
| CONFIG_CHANGED | 配置变更 | `{key, value, oldValue}` |
| RELOAD_REQUIRED | 需要重新加载 | `{reason}` |

### 编辑器事件

| 事件名 | 描述 | 参数 |
|--------|------|------|
| EDITOR_CREATED | 编辑器创建 | `editor` |
| TEXT_CHANGED | 文本变更 | `{editor, changeData}` |
| CURSOR_MOVED | 光标移动 | `{editor, position}` |
| TEXT_SELECTED | 文本选中 | `{editor, selection}` |

## 最佳实践

1. **事件解耦**：使用事件系统分离组件和逻辑，减少直接依赖
2. **性能考虑**：避免在事件处理器中执行耗时操作，必要时使用防抖或节流
3. **清理订阅**：组件销毁时务必取消事件订阅，防止内存泄漏
4. **事件冒泡**：合理使用事件冒泡机制，避免事件过度传播
5. **错误处理**：在事件处理器中添加适当的错误处理，避免影响其他功能

## 调试提示

启用事件调试功能，可以在控制台查看事件流：

```javascript
import { enableDebug } from './globalEvents.js';

// 启用调试模式
enableDebug(true);
```

## 扩展事件系统

### 添加新的事件类型

1. 在`eventNames.js`中定义新的事件名称常量
2. 在相应的事件管理器中添加处理逻辑
3. 更新文档说明新事件的用途和参数

### 创建自定义事件管理器

```javascript
// myEvents.js
import { createEventEmitter } from '../utils/eventEmitter.js';

const { subscribe, emit, unsubscribeAll } = createEventEmitter();

export const eventTypes = {
  MY_CUSTOM_EVENT: 'my-custom-event',
  ANOTHER_EVENT: 'another-event'
};

export {
  subscribe,
  emit,
  unsubscribeAll
};
```

## 重构说明

事件系统正在逐步重构到新的架构，迁移目标为`src/events`目录。在迁移期间，请遵循以下原则：

1. 新的事件处理器应该在新架构中实现
2. 保持向后兼容性，确保现有代码不受影响
3. 使用适配器模式连接新旧事件系统 