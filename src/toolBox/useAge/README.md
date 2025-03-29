# 使用时间相关工具 (useAge)

此目录包含各种与使用时间相关的工具函数和模块，如文件管理、文本处理、思源笔记环境集成等。

## 目录结构

```
useAge/
├── forFileManage/      - 文件管理相关工具
├── forText/            - 文本处理相关工具
├── forKramdown/        - Kramdown格式处理工具
├── forImageAndCanvas/  - 图像和画布处理工具
├── forThumbNail/       - 缩略图处理工具
├── forSiyuan/          - 思源笔记特定功能工具
├── forWebviewContextMenu.js - Webview上下文菜单工具
├── useSiyuan.js        - 思源笔记环境集成工具
├── useSiyuanConfig.js  - 思源笔记配置工具
├── useSiyuanFrontEndApi.js - 思源笔记前端API封装
└── README.md           - 本说明文件
```

## 主要模块

### useSiyuan.js

`useSiyuan.js` 是一个集中管理思源笔记环境依赖的模块，提供了访问思源笔记环境、API和配置的统一接口。使用此模块可以简化思源笔记环境的集成和使用。

主要功能包括：

- 系统环境工具 (`system`)：访问思源系统环境的方法
- 插件环境工具 (`plugin`)：访问思源插件环境的方法
- UI相关工具 (`ui`)：访问思源UI组件的方法
- 思源核心API：导出整合了已有的思源API工具

#### 示例用法

```js
import { system, plugin, ui, dialog, 打开思源标签页, 文档 } from '../../toolBox/useAge/useSiyuan.js';

// 获取系统信息
const 工作空间 = system.获取工作空间路径();
const 语言 = system.获取语言设置();

// 访问插件
const 当前插件 = plugin.获取插件实例();
const 所有插件 = plugin.获取所有插件();

// 使用UI组件
const 确认按钮文本 = ui.获取语言文本('confirm');
ui.显示通知({
  title: '操作成功',
  body: '文件已保存',
  type: 'success'
});

// 使用对话框
dialog.showMessage('操作完成');
dialog.confirm('确认', '确定要执行此操作吗？', () => {
  console.log('用户确认');
});

// 打开文档
打开思源标签页({
  doc: { id: '20220101121212-abcdef' }
});

// 打开并缩放文档
文档.openByIdAndZoom('20220101121212-abcdef');
```

### useSiyuanConfig.js

提供思源笔记配置相关的工具函数，如AI配置加载等。

### useSiyuanFrontEndApi.js

提供思源笔记前端API的函数式封装，使API调用更加声明式和易用。

### forSiyuan/

包含针对思源笔记特定功能的工具，如菜单处理等。

## 最佳实践

1. **集中依赖**：使用 `useSiyuan.js` 作为访问思源环境的统一入口
2. **函数式风格**：优先使用模块导出的函数，而非直接访问全局对象
3. **类型安全**：利用模块提供的安全访问方法，避免直接访问可能不存在的属性

## 注意事项

- 这些工具设计用于思源笔记插件开发环境
- 部分功能可能依赖特定的思源笔记版本
- 建议在使用前先调用 `检查思源环境()` 函数确认当前是否在思源环境中 