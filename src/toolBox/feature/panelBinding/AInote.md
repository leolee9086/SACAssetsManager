# 这个区段由开发者编写,未经允许禁止AI修改
<修复面板绑定功能的关键问题：现在需要确保面板绑定对话框能够找到可绑定的面板>

# 面板绑定功能设计与实现

## 功能概述

面板绑定功能允许不同的UI面板之间建立数据同步关系，实现数据的自动传递和共享。这种绑定可以是双向的（两个面板互相影响）、单向的（源面板影响目标面板）或部分的（只绑定选定的属性）。

## 架构设计

面板绑定功能由以下几个核心部分组成：

1. **面板注册表** (`panelRegistry.js`)
   - 提供全局面板实例管理和高效查询功能
   - 支持面板分组、状态管理和元数据存储
   - 使用事件总线进行系统通知
   - 预注册系统面板，确保至少有可绑定面板

2. **面板发现服务** (`panelDiscoveryService.js`) 
   - 提供智能面板发现和注册功能
   - 支持手动注册和自动发现机制
   - 注册示例面板，确保即使DOM中没有发现面板也有可绑定面板

3. **面板绑定管理器** (`panelBindingManager.js`)
   - 管理面板之间的绑定关系和通信
   - 提供绑定、解绑和数据同步功能
   - 存储和管理绑定元数据

4. **面板绑定混入** (`panelBindingMixin.js`)
   - 为Vue组件提供绑定功能的复用逻辑
   - 处理面板的生命周期和事件监听
   - 提供开箱即用的API

5. **面板绑定对话框** (`PanelBindingDialog.vue`)
   - 用户创建和管理绑定的界面
   - 提供绑定类型和属性选择
   - 支持主题和样式定制

## 关键问题修复

以下是面板绑定功能的关键改进：

1. **面板发现机制改进**：
   - 不再依赖DOM查询发现面板
   - 引入手动注册机制确保关键面板可用
   - 预先注册示例面板，确保永远有可绑定面板

2. **注册表实现**：
   - 使用高效的Map和Set数据结构
   - 提供完整的面板状态管理
   - 支持面板分组和元数据存储

3. **绑定对话框改进**：
   - 从注册表获取面板列表
   - 使用面板ID和名称进行准确匹配
   - 支持过滤和搜索功能

## 使用指南

### 在Vue组件中使用面板绑定

```javascript
const { 
  bindingState, 
  openBindingDialog,
  syncData
} = usePanelBinding({
  panelId: 'uniquePanelId',
  panelName: '我的面板',
  panelData: reactiveData,
  onReceiveData: (data, sourcePanelId) => {
    // 处理接收到的数据
  },
  exposedProperties: ['property1', 'property2']
});
```

### 添加绑定按钮

```html
<button @click="openBindingDialog">创建绑定</button>
```

### 手动注册面板

如果需要手动注册面板，可以使用面板发现服务提供的API：

```javascript
import { discoveryService } from '/plugins/SACAssetsManager/src/toolBox/feature/panelBinding';

// 手动注册面板
discoveryService.registerPanel('customPanelId', '自定义面板', {
  type: 'custom',
  groups: ['myGroup']
});
```

## 测试和调试

可以通过以下方式验证面板绑定功能：

1. 打开两个面板绑定演示面板实例
2. 点击"创建绑定"按钮
3. 验证对话框中是否显示可绑定的面板
4. 创建绑定并验证数据同步功能

可以在控制台中查看面板注册状态：

```javascript
// 获取所有注册的面板
getAllPanels();

// 获取注册表统计信息
getRegistryStats();

// 触发面板发现
discoveryService.discover();
```

## 数据流

面板之间的数据同步遵循以下流程：

1. 源面板的数据发生变化
2. 触发数据同步事件
3. 绑定管理器接收事件并查找相关绑定
4. 根据绑定类型和规则处理数据
5. 将处理后的数据发送到目标面板

## 性能考虑

- 使用Map和Set高效存储和查询数据
- 实现防抖处理避免频繁同步
- 支持部分属性绑定减少不必要的数据传输
- 懒加载绑定UI和按需注册面板

## 设计思路

1. **面板绑定需求**：
   - 允许不同面板之间互相绑定，数据联动
   - 支持多种绑定类型（单向、双向、部分）
   - 绑定关系可视化，使用颜色区分不同绑定

2. **实现方式**：
   - 使用事件总线实现组件间通信
   - 提供统一的绑定管理器和绑定UI组件
   - 基于组合式API设计，方便集成到现有面板

3. **代码结构**：
   - `panelBindingManager.js` - 提供核心绑定功能
   - `panelBindingMixin.js` - 组合式API混入
   - 可视化组件 - 指示器、工具栏和绑定对话框

## 面板绑定使用方法

### 基本集成

在面板组件中添加绑定功能：

```vue
<template>
  <div class="panel-container">
    <div class="panel-header">
      <h3>我的面板</h3>
      <!-- 添加绑定工具栏 -->
      <PanelBindingToolbar
        :panel-id="panelId"
        :panel-name="panelName"
        :panel-data="selectedData"
        :binding-state="bindingState"
        @navigate-to-panel="navigateToPanel"
        @create-binding="openBindingDialog"
        @sync-data="handleSyncData"
        @unbind="handleUnbind"
      />
    </div>
    
    <!-- 面板内容 -->
    <div class="panel-content">
      <!-- 你的面板内容... -->
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { usePanelBinding } from '/plugins/SACAssetsManager/src/toolBox/feature/panelBinding/panelBindingMixin.js';
import PanelBindingToolbar from '/plugins/SACAssetsManager/src/toolBox/feature/panelBinding/components/PanelBindingToolbar.vue';

// 面板基本信息
const panelId = 'myPanel';
const panelName = '我的面板';

// 面板数据
const selectedData = ref({
  color: '#ff0000',
  size: 24,
  text: 'Hello World'
});

// 使用面板绑定混入
const { 
  bindingState, 
  openBindingDialog,
  syncData,
  updateBindingState
} = usePanelBinding({
  panelId,
  panelName,
  panelData: selectedData,
  // 当接收到其他面板的数据时触发
  onReceiveData: (data, sourcePanelId) => {
    console.log(`收到来自 ${sourcePanelId} 的数据:`, data);
    // 合并或处理接收到的数据
    Object.assign(selectedData.value, data);
  },
  // 声明此面板暴露的属性，用于部分绑定
  exposedProperties: ['color', 'size', 'text']
});

// 处理同步数据事件
function handleSyncData(event) {
  syncData(selectedData.value);
}

// 处理解除绑定事件
function handleUnbind(event) {
  // 可选的自定义解绑逻辑
  console.log('解除绑定:', event);
}

// 导航到其他面板
function navigateToPanel(event) {
  const { targetPanelId } = event;
  console.log('导航到面板:', targetPanelId);
  // 实现面板导航逻辑...
}
</script>
```

### 绑定类型

1. **双向绑定**：两个面板互相影响，数据双向同步
2. **单向绑定**：源面板数据改变时，会影响目标面板，但目标面板改变不会影响源面板
3. **部分绑定**：只同步选定的属性，其他属性不受影响

### 面板数据同步

当面板数据需要同步时（如用户操作改变了数据）:

```js
// 在数据变化时主动同步
function handleColorChange(newColor) {
  selectedData.value.color = newColor;
  syncData(); // 自动同步到绑定的面板
}
```

### 高级使用

对于需要特殊数据转换的场景，可以在创建绑定时提供转换函数：

```js
// 在面板绑定对话框中设置，或直接调用API
bindPanels(sourcePanelId, targetPanelId, {
  type: BINDING_TYPES.BIDIRECTIONAL,
  theme: 'blue',
  dataTransformer: (data, sourceId, targetId) => {
    // 转换数据
    return {
      ...data,
      // 特殊处理逻辑
      size: data.size * 2 // 例如源面板的尺寸在目标面板中加倍
    };
  }
});
```

## 注意事项

1. 每个面板必须有唯一的`panelId`才能正确绑定
2. 绑定状态通过颜色主题直观显示，便于识别
3. 当在已绑定面板间切换时，可以使用工具栏上的绑定指示器快速导航
4. 解除绑定后，面板数据不会自动重置，需要手动处理 