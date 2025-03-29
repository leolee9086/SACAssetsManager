# 高级富文本编辑器系统

这是一个功能全面、性能出色的富文本编辑器系统，集成了多种高级功能，采用模块化设计，提供卓越的用户体验。

## 核心功能

- **强大的事件系统**：基于 `useEvent.js` 的高度优化事件处理，支持事件合并、队列处理和优先级
- **文档模型**：基于事务的文档状态管理，支持撤销/重做和精确的状态控制
- **协同编辑**：内置协同编辑支持，基于CRDT原理，实现高效的实时协作
- **特殊设备支持**：完整支持数位板、触控笔、MIDI设备等专业输入设备
- **高级绘图功能**：提供多种绘图工具，支持压力感应和倾斜度
- **高级文本选择**：支持多选、块选择和语义单位选择
- **主题系统**：灵活的主题定制，支持明暗模式和用户自定义
- **扩展性**：强大的插件机制，支持功能扩展和自定义

## 系统架构

编辑器由以下核心模块组成：

1. **事件管理器** (`useEvent.js`) - 高性能事件处理系统
2. **文档模型** (`documentModel.js`) - 文档状态管理
3. **特殊设备支持** (`specialDeviceSupport.js`) - 高级输入设备支持
4. **协同编辑** (`collaborationManager.js`) - 实时协作功能
5. **绘图支持** (`advancedDrawingSupport.js`) - 集成绘图功能
6. **主题系统** (`themeSystem.js`) - 主题管理与定制
7. **编辑器管理器** (`editorManager.js`) - 统一接口与模块管理

## 使用方法

### 基本初始化

```javascript
import { initIntegratedEditor } from './integratedEditor.js';
import { createEventManager } from './useEvent.js';

// 创建事件管理器
const eventManager = createEventManager();

// 初始化编辑器
const editor = initIntegratedEditor({
  container: document.getElementById('editor-container'),
  eventManager,
  initialContent: '<h1>欢迎使用</h1><p>这是一个强大的编辑器。</p>',
  theme: 'light'
});

// 使用编辑器API
editor.execCommand('formatBold');
editor.setTheme('dark');

// 获取内容
const content = editor.getContent('html');
```

### 启用协同编辑

```javascript
const editor = initIntegratedEditor({
  container: document.getElementById('editor-container'),
  eventManager,
  collaborative: true,
  userId: 'user-123',
  syncEndpoint: 'https://your-collab-server.com/sync'
});

// 连接到协作会话
editor.connect('session-abc');
```

### 启用绘图功能

```javascript
// 启用绘图模式
editor.enableDrawing();

// 设置绘图工具
editor.setDrawingTool('brush');

// 禁用绘图模式
editor.disableDrawing();
```

### 主题自定义

```javascript
// 使用预定义主题
editor.setTheme('dark');

// 创建自定义主题
const customThemeId = editor.createCustomTheme({
  name: '我的主题',
  baseTheme: 'light',
  colors: {
    primary: '#ff5722',
    background: '#f5f5f5',
    text: '#333333'
  }
});

// 应用自定义主题
editor.setTheme(customThemeId);
```

### 插件注册

```javascript
import { createExamplePlugin } from './integratedEditor.js';

// 创建自定义插件
const myPlugin = createExamplePlugin({
  name: 'markdownShortcuts',
  description: '提供Markdown快捷语法支持'
});

// 注册插件
editor.registerPlugin(myPlugin);
```

## 适用场景

这个编辑器系统适用于需要高级编辑功能的各种场景：

- 内容管理系统 (CMS)
- 协作文档平台
- 电子邮件客户端
- 在线教育系统
- 知识库和文档系统
- 设计和创意工具
- 技术文档撰写工具

## 浏览器兼容性

支持所有现代浏览器：

- Chrome (最新版)
- Firefox (最新版)
- Safari (最新版)
- Edge (最新版)

## 性能特点

- 高效的事件处理机制
- 通过事件合并减少不必要的重绘
- 优化的选择和编辑操作
- 高效的协同编辑冲突解决
- 绘图操作的平滑渲染
- 适应高频输入设备

## 扩展开发

系统设计支持通过插件机制进行功能扩展。要开发自己的插件：

1. 使用提供的插件API
2. 实现`init`和`cleanup`方法
3. 注册自定义命令
4. 监听编辑器事件
5. 提供自定义UI元素

请参考`integratedEditor.js`中的`createExamplePlugin`函数了解详情。 