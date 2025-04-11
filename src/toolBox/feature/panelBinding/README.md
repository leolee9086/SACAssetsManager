# 面板绑定功能

## 介绍

面板绑定功能是一个强大的模块，允许应用中的不同UI面板之间建立数据同步关系。这使得开发者可以创建互相协作的UI组件，无需编写复杂的状态同步代码。

## 主要特性

- **多种绑定类型**：支持双向绑定、单向绑定和部分属性绑定
- **可视化绑定界面**：通过直观的对话框创建和管理绑定
- **主题定制**：使用颜色主题标识不同类型的绑定关系
- **高性能**：优化的数据同步机制，减少不必要的更新
- **强大的管理API**：全面的面板注册和查询功能

## 目录结构

```
panelBinding/
├── components/                 # UI组件
│   ├── PanelBindingDialog.vue  # 绑定创建对话框
│   └── PanelBindingToolbar.vue # 绑定工具栏
├── panelRegistry.js            # 面板注册表
├── panelBindingManager.js      # 绑定关系管理器
├── panelBindingMixin.js        # Vue组件混入
├── AInote.md                   # 功能设计说明
└── README.md                   # 本文档
```

## 快速开始

### 1. 在Vue组件中使用

```javascript
<script setup>
import { ref, onMounted } from 'vue';
import { usePanelBinding } from '/path/to/panelBindingMixin.js';

// 生成唯一ID
const panelId = `uniquePanel_${Date.now()}`;

// 面板数据
const panelData = ref({
  value1: 100,
  value2: 'Hello',
  value3: true
});

// 使用面板绑定混入
const { 
  bindingState,
  openBindingDialog, 
  syncData
} = usePanelBinding({
  panelId,
  panelName: '我的面板',
  panelData,
  onReceiveData: (data, sourcePanelId) => {
    // 当接收到其他面板同步的数据时
    Object.assign(panelData.value, data);
  },
  exposedProperties: ['value1', 'value2', 'value3']
});

// 监听数据变化并同步
function handleDataChange() {
  syncData(panelData.value);
}
</script>
```

### 2. 添加绑定按钮

```html
<button @click="openBindingDialog">创建绑定</button>
```

## 核心API

### 面板注册表 (panelRegistry.js)

```javascript
// 注册面板
registerPanel('panelId', {
  name: '面板名称',
  type: PANEL_TYPES.STANDARD,
  metadata: { /* 自定义元数据 */ }
});

// 获取所有面板
const panels = getAllPanels({ activeOnly: true });

// 查找特定面板
const myPanels = findPanels(panel => panel.type === 'myCustomType');
```

### 面板绑定管理器 (panelBindingManager.js)

```javascript
// 创建绑定
const bindingId = bindPanels(
  'sourcePanelId', 
  'targetPanelId',
  { 
    type: 'bidirectional',
    theme: 'blue',
    properties: ['property1', 'property2']
  }
);

// 解除绑定
unbindPanels(bindingId);

// 同步数据
syncPanelData('sourcePanelId', { property1: 'new value' });
```

## 贡献指南

### 扩展面板绑定功能

要添加新的绑定类型或行为：

1. 在`panelBindingManager.js`中定义新的绑定类型常量
2. 在绑定处理逻辑中添加对新类型的支持
3. 更新`PanelBindingDialog.vue`以显示新的绑定选项

### 添加新的UI组件

创建新的绑定相关UI组件：

1. 在`components/`目录下添加新的Vue组件
2. 导入并使用面板绑定相关的API
3. 更新文档以反映新的组件用法

## 性能优化提示

- 使用部分绑定而非全部绑定可减少不必要的数据同步
- 考虑在`onReceiveData`回调中实现自定义数据合并逻辑
- 对于大型数据结构，实现细粒度的属性变更检测

## 故障排除

- **找不到可绑定的面板**：确保至少有两个面板已经注册
- **数据不同步**：检查绑定类型和绑定的属性列表
- **绑定对话框不显示**：确保正确传递了sourcePanelId参数

## 许可

此功能模块遵循项目的整体许可协议。 