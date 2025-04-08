# 这个区段由开发者编写,未经允许禁止AI修改
<开发者将会在这里提出要求,AI需要判断并满足这些要求>
```

# forInput 目录说明

此目录包含处理浏览器输入事件的工具函数集合。核心设计理念是提供函数式API来简化事件处理，尤其是复杂的输入场景。

## 文件结构

- `useInputEvents.js` - 核心文件，提供事件常量和基础事件处理函数

## 设计原则

1. **函数式优先** - 所有API采用函数式设计，避免类和实例状态
2. **性能优化** - 处理频繁触发的输入事件时注重性能
3. **中文输入支持** - 特别处理IME输入，解决中文输入法的常见问题
4. **命名一致性** - 函数前缀遵循`use*`模式表示钩子函数

## 常见用例

### 基础事件绑定

```js
import { TYPING_EVENTS, useAddEventListener } from './useInputEvents.js';

// 添加事件并获取解绑函数
const removeListener = useAddEventListener(
  document, 
  TYPING_EVENTS.按键按下, 
  (e) => console.log(e.key)
);

// 使用完毕后解绑
removeListener();
```

### 处理中文输入

```js
import { TYPING_EVENTS, useInputWithIME } from './useInputEvents.js';

// 获取处理函数集合
const { 
  handleCompositionStart, 
  handleCompositionEnd, 
  handleInput 
} = useInputWithIME((e) => {
  // 只在输入完成时调用
  console.log('输入完成:', e.target.value);
});

// 添加相关事件监听
inputElement.addEventListener(TYPING_EVENTS.开始组合输入, handleCompositionStart);
inputElement.addEventListener(TYPING_EVENTS.结束组合输入, handleCompositionEnd);
inputElement.addEventListener(TYPING_EVENTS.输入, handleInput);
```

### 快捷键处理

```js
import { KEY_CODES, useKeyCombination } from './useInputEvents.js';

// 定义快捷键 Ctrl+S
const removeShortcut = useKeyCombination(
  document,
  [KEY_CODES.CONTROL, 'S'],
  (e) => {
    console.log('保存操作触发');
    saveDocument();
  }
);
```

### 节流处理高频事件

```js
import { PHYSICAL_EVENTS, useThrottleInput } from './useInputEvents.js';

// 创建节流处理函数(50ms内最多执行一次)
const throttledMove = useThrottleInput(
  (e) => {
    // 处理鼠标移动，更新UI元素位置
    updateTooltipPosition(e.clientX, e.clientY);
  },
  50,
  { leading: true, trailing: true } // 开始和结束都触发
);

// 应用到鼠标移动事件
document.addEventListener(PHYSICAL_EVENTS.MOUSE.MOUSE_MOVE, throttledMove);
```

### 使用事件委托优化性能

```js
import { TYPING_EVENTS, useEventDelegation } from './useInputEvents.js';

// 使用事件委托处理大量列表项的点击
const removeDelegation = useEventDelegation(
  document.querySelector('#large-list'), // 容器
  TYPING_EVENTS.CLICK,                  // 事件类型
  '.list-item',                         // 目标元素选择器
  (e) => {
    // 事件处理，e.delegateTarget是匹配的.list-item元素
    console.log('点击了项目:', e.delegateTarget.dataset.id);
    handleItemClick(e.delegateTarget);
  },
  { passive: true }                     // 事件选项
);

// 移除委托
removeDelegation();
```

## 性能注意事项

1. 高频事件(如mousemove)应使用节流或防抖处理
2. 长列表滚动时考虑使用passive:true提高性能
3. 大量事件处理器时，推荐使用事件委托

## 未来扩展

计划添加的功能：
- 触摸手势识别
- 辅助功能事件支持
- 虚拟键盘支持 