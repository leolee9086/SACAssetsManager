<template>
  <div class="panel-binding-demo">
    <div class="panel-header">
      <div class="panel-title">
        <h3>面板绑定演示</h3>
        <PanelBindingToolbar
          :panel-id="panelId"
          :panel-name="panelName"
          :panel-data="panelData"
          :binding-state="bindingState"
          @navigate-to-panel="navigateToPanel"
          @create-binding="openBindingDialog"
          @sync-data="handleSyncData"
          @unbind="handleUnbind"
          @binding-change="handleBindingChange"
        />
      </div>
      <div class="panel-subtitle">演示如何在面板之间创建数据绑定关系</div>
    </div>
    
    <div class="panel-content">
      <div class="color-section">
        <h4>颜色设置</h4>
        <div class="color-controls">
          <label for="color">选择颜色：</label>
          <div class="color-input-group">
            <input 
              type="color" 
              id="color" 
              v-model="panelData.color"
              @input="handleDataChange"
            />
            <span class="color-value">{{ panelData.color }}</span>
          </div>
        </div>
        
        <div class="color-preview" :style="{ backgroundColor: panelData.color }">
          <span :style="{ color: getContrastColor(panelData.color) }">颜色预览</span>
        </div>
      </div>
      
      <div class="size-section">
        <h4>尺寸设置</h4>
        <div class="size-controls">
          <label for="size">尺寸：{{ panelData.size }}px</label>
          <input 
            type="range" 
            id="size" 
            v-model.number="panelData.size"
            min="10" 
            max="100" 
            step="1"
            @input="handleDataChange"
          />
        </div>
        
        <div class="size-preview">
          <div class="size-square" :style="{ 
            width: `${panelData.size}px`, 
            height: `${panelData.size}px`,
            backgroundColor: panelData.color
          }"></div>
        </div>
      </div>
      
      <div class="text-section">
        <h4>文本设置</h4>
        <div class="text-controls">
          <label for="text">文本内容：</label>
          <input 
            type="text" 
            id="text" 
            v-model="panelData.text"
            @input="handleDataChange"
          />
        </div>
        
        <div class="text-preview" :style="{ 
          color: panelData.color,
          fontSize: `${panelData.size/2}px`
        }">
          {{ panelData.text || '请输入文本' }}
        </div>
      </div>
      
      <div class="binding-section">
        <h4>绑定状态</h4>
        <div v-if="hasBindings" class="binding-status">
          <div class="status-icon active">
            <svg><use xlink:href="#iconLink"></use></svg>
          </div>
          <div class="status-text">
            已绑定 {{ bindingsCount }} 个面板
          </div>
        </div>
        <div v-else class="binding-status">
          <div class="status-icon">
            <svg><use xlink:href="#iconUnlink"></use></svg>
          </div>
          <div class="status-text">
            未绑定其他面板
          </div>
        </div>
        
        <div class="binding-action">
          <button class="action-btn" @click="openBindingDialog">
            {{ hasBindings ? '管理绑定' : '创建绑定' }}
          </button>
        </div>
      </div>
      
      <div class="help-section">
        <h4>使用说明</h4>
        <ol class="help-steps">
          <li>调整上方的颜色、尺寸或文本值</li>
          <li>点击"创建绑定"按钮，选择另一个面板</li>
          <li>选择绑定类型（双向、单向或部分）</li>
          <li>选择绑定颜色主题，便于识别</li>
          <li>创建绑定后，调整的值将自动同步到目标面板</li>
        </ol>
        <div class="help-tip">
          提示：尝试打开两个此面板的实例，然后将它们互相绑定，观察数据同步效果
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import PanelBindingToolbar from '/plugins/SACAssetsManager/src/toolBox/feature/panelBinding/components/PanelBindingToolbar.vue';
import { usePanelBinding } from '/plugins/SACAssetsManager/src/toolBox/feature/panelBinding/panelBindingMixin.js';
import { getPanelBindings } from '/plugins/SACAssetsManager/src/toolBox/feature/panelBinding/panelBindingManager.js';
import { clientApi,kernelApi } from '/plugins/SACAssetsManager/source/asyncModules.js';
import { plugin } from '/plugins/SACAssetsManager/source/pluginSymbolRegistry.js';
// 生成唯一ID，使多个实例能够互相绑定
const uniqueId = Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
const panelId = `panelBindingDemo_${uniqueId}`;
const panelName = '面板绑定演示';

// 面板数据
const panelData = ref({
  color: '#3573f0',
  size: 50,
  text: '示例文本'
});

// 数据变更防抖
let debounceTimer = null;
const handleDataChange = () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    // 同步当前数据到绑定的面板
    syncData(panelData.value);
  }, 300);
};

// 使用面板绑定混入
const { 
  bindingState, 
  openBindingDialog,
  syncData,
  updateBindingState
} = usePanelBinding({
  panelId,
  panelName,
  panelData: panelData,
  // 当接收到其他面板的数据时触发
  onReceiveData: (data, sourcePanelId) => {
    console.log(`面板绑定演示收到来自 ${sourcePanelId} 的数据:`, data);
    // 合并接收到的数据
    if (data.color !== undefined) panelData.value.color = data.color;
    if (data.size !== undefined) panelData.value.size = data.size;
    if (data.text !== undefined) panelData.value.text = data.text;
  },
  // 声明此面板暴露的属性，用于部分绑定
  exposedProperties: ['color', 'size', 'text']
});

// 绑定状态
const bindingsCount = ref(0);
const hasBindings = computed(() => bindingsCount.value > 0);

// 更新绑定计数
const updateBindingsCount = () => {
  const bindings = getPanelBindings(panelId);
  bindingsCount.value = bindings.length;
};

// 处理同步数据事件
const handleSyncData = (event) => {
  syncData(panelData.value);
};

// 处理解除绑定事件
const handleUnbind = (event) => {
  updateBindingsCount();
};

// 处理绑定变化事件
const handleBindingChange = (event) => {
  updateBindingsCount();
};

// 导航到其他面板
const navigateToPanel = (event) => {
  const { targetPanelId } = event;
  
  // 示例实现：打开相同组件的新实例
  clientApi.openTab({
    app: plugin.app,
    custom: {
      icon: "iconPanel",
      title: "面板绑定演示",
      id: plugin.name + "panelBindingTab",
      data: {
        tabType: "panelBindingTab"
      }
    }
  });
};

// 计算出与背景色对比的文字颜色
const getContrastColor = (hexColor) => {
  // 移除井号和处理简写形式
  let color = hexColor.replace('#', '');
  if (color.length === 3) {
    color = color[0] + color[0] + color[1] + color[1] + color[2] + color[2];
  }
  
  // 转换为RGB
  const r = parseInt(color.substr(0, 2), 16);
  const g = parseInt(color.substr(2, 2), 16);
  const b = parseInt(color.substr(4, 2), 16);
  
  // 计算亮度
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
  // 亮度高于128返回黑色，否则返回白色
  return brightness > 128 ? '#000000' : '#ffffff';
};

// 生命周期钩子
onMounted(() => {
  updateBindingsCount();
});
</script>

<style scoped>
.panel-binding-demo {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  color: var(--cc-theme-on-background);
}

.panel-header {
  padding: 16px;
  border-bottom: 1px solid var(--cc-border-color);
}

.panel-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.panel-title h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
}

.panel-subtitle {
  font-size: 14px;
  color: var(--cc-theme-on-surface);
}

.panel-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.color-section,
.size-section,
.text-section,
.binding-section,
.help-section {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--cc-border-color);
}

h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 500;
}

.color-controls,
.size-controls,
.text-controls {
  margin-bottom: 12px;
}

label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
}

input[type="color"] {
  padding: 0;
  border: none;
  border-radius: 4px;
  height: 32px;
  width: 60px;
  cursor: pointer;
}

.color-input-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-value {
  font-family: monospace;
  font-size: 14px;
}

.color-preview {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 8px;
  border-radius: var(--cc-border-radius);
  transition: background-color 0.3s;
}

input[type="range"] {
  width: 100%;
  margin: 8px 0;
}

.size-preview {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}

.size-square {
  transition: all 0.3s;
}

.text-preview {
  margin-top: 16px;
  padding: 12px;
  min-height: 60px;
  border: 1px solid var(--cc-border-color);
  border-radius: var(--cc-border-radius);
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  word-break: break-word;
}

.binding-status {
  display: flex;
  align-items: center;
  padding: 12px;
  background-color: var(--cc-theme-surface-light);
  border-radius: var(--cc-border-radius);
  margin-bottom: 16px;
}

.status-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-right: 12px;
  color: var(--cc-theme-on-surface);
}

.status-icon.active {
  color: var(--cc-theme-primary);
}

.status-icon svg {
  width: 20px;
  height: 20px;
}

.status-text {
  font-size: 14px;
}

.binding-action {
  display: flex;
  justify-content: center;
}

.action-btn {
  padding: 8px 16px;
  background-color: var(--cc-theme-primary);
  color: var(--cc-theme-on-primary);
  border: none;
  border-radius: var(--cc-border-radius);
  cursor: pointer;
  transition: background-color 0.2s;
}

.action-btn:hover {
  background-color: var(--cc-theme-primary-light);
}

.help-steps {
  margin: 0;
  padding-left: 24px;
  font-size: 14px;
  line-height: 1.5;
}

.help-steps li {
  margin-bottom: 8px;
}

.help-tip {
  margin-top: 16px;
  padding: 12px;
  background-color: var(--cc-theme-primary-lightest);
  border-left: 4px solid var(--cc-theme-primary);
  font-size: 14px;
  line-height: 1.5;
  border-radius: 0 var(--cc-border-radius) var(--cc-border-radius) 0;
}
</style> 