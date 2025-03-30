# UI组件库

本目录包含思源插件的UI组件及相关功能，用于构建插件界面和交互元素。

## 目录结构

- **components/** - 可复用UI组件
- **composables/** - Vue组合式API钩子函数
- **dialogs/** - 对话框和弹窗组件
- **dynamicCss/** - 动态CSS和主题相关功能
- **electronUI/** - 为Electron应用定制的UI组件
- **icons/** - 图标资源和图标组件
- **pannels/** - 面板组件，包括侧边栏、底部栏等
- **siyuanCommon/** - 思源笔记通用UI组件
- **toolBox/** - UI工具函数和辅助方法
- **utils/** - UI相关工具函数

## 主要文件

- **tab.js** - 标签页管理功能
- **dock.js** - 停靠面板功能

## 使用指南

### 组件使用

```javascript
// 使用对话框组件示例
import { createConfirmDialog } from './dialogs/confirmDialog.js';

const dialog = createConfirmDialog({
  title: '确认操作',
  content: '确定要执行此操作吗？',
  onConfirm: () => {
    // 确认操作
  }
});

dialog.open();
```

### 样式定制

组件库支持思源笔记的主题系统，可以通过dynamicCss目录中的工具进行样式定制：

```javascript
import { registerThemeStyles } from './dynamicCss/themeManager.js';

registerThemeStyles('my-component', `
  .my-component {
    background-color: var(--b3-theme-background);
    color: var(--b3-theme-on-background);
  }
`);
```

## 设计规范

1. **一致性**：UI组件应遵循思源笔记的设计风格
2. **可访问性**：组件应支持键盘导航和屏幕阅读器
3. **响应式**：组件应适应不同屏幕尺寸
4. **轻量级**：最小化依赖，避免引入大型框架
5. **主题兼容**：支持思源笔记的明暗主题切换

## 重构说明

所有UI组件正在逐步重构到新的架构，迁移目标为`src/components`目录。在迁移期间，请遵循以下原则：

1. 新功能优先使用新架构中的组件
2. 对旧组件的修改应同步到新架构
3. 避免在旧组件中引入新的设计模式或大型重构

## 兼容性

组件库支持以下环境：
- 现代浏览器（Chrome、Firefox、Safari、Edge）
- Electron桌面应用
- 移动端思源笔记应用（通过响应式设计）

## 贡献指南

在为UI组件库贡献代码时，请遵循以下准则：

1. 使用函数式风格编写组件
2. 优先使用原生DOM API，减少对框架的依赖
3. 为新组件编写完整的文档和使用示例
4. 确保组件支持思源笔记的主题系统
5. 测试组件在不同环境和屏幕尺寸下的表现 