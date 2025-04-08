# 浏览器输入事件处理工具

提供高性能、函数式的浏览器输入事件处理工具集。

## 核心功能

- 📝 统一的事件常量定义
- 🔄 中文输入法(IME)处理
- ⌨️ 快捷键组合支持 
- 👆 长按事件处理
- 🛡️ 防抖/节流输入处理
- 🎯 事件委托辅助

## 快速使用

### 事件常量

```js
import { TYPING_EVENTS, PHYSICAL_EVENTS } from './useInputEvents.js';

// 使用中文友好的事件名
element.addEventListener(TYPING_EVENTS.按键按下, handleKeyDown);

// 或使用英文事件名
element.addEventListener(TYPING_EVENTS.KEY_DOWN, handleKeyDown);

// 或使用原始事件名
element.addEventListener(PHYSICAL_EVENTS.KEYBOARD.KEY_DOWN, handleKeyDown);
```

### 快捷键处理

```js
import { KEY_CODES, useKeyCombination } from './useInputEvents.js';

// 设置快捷键 Ctrl+Z
const removeUndo = useKeyCombination(
  document,
  [KEY_CODES.CONTROL, 'Z'],
  handleUndo
);

// 解除快捷键
removeUndo();
```

### 中文输入处理

```js
import { useInputWithIME } from './useInputEvents.js';

const { handleCompositionStart, handleCompositionEnd, handleInput } = 
  useInputWithIME(value => {
    // 只在输入完成时触发，避免中文输入法问题
    updateValue(value);
  });
```

### 事件节流处理

```js
import { useThrottleInput } from './useInputEvents.js';

// 创建节流处理函数(100ms内最多触发一次)
const throttledHandler = useThrottleInput(
  (e) => {
    // 高性能处理滚动/移动事件
    updatePosition(e);
  },
  100
);

// 应用于滚动事件
window.addEventListener('scroll', throttledHandler);
```

### 事件委托

```js
import { useEventDelegation } from './useInputEvents.js';

// 将大量子元素的点击事件委托给父容器
const removeDelegate = useEventDelegation(
  document.querySelector('.list-container'),
  'click',
  '.list-item',
  (e) => {
    // e.delegateTarget 是被点击的 .list-item 元素
    handleItemClick(e.delegateTarget.dataset.id);
  }
);
```

详细文档参见 [AInote.md](./AInote.md) 