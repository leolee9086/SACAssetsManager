<template>
  <div class="panel-binding-example">
    <div class="panel-header">
      <h3>面板绑定示例</h3>
      <div class="binding-status">
        <span class="binding-indicator" :class="{ active: hasBindings }">
          <svg><use :xlink:href="hasBindings ? '#iconLink' : '#iconUnlink'"></use></svg>
          {{ hasBindings ? '已绑定' : '未绑定' }}
        </span>
        <button class="binding-btn" @click="openBindingDialog">
          {{ hasBindings ? '管理绑定' : '创建绑定' }}
        </button>
      </div>
    </div>
    
    <div class="panel-content">
      <div class="content-section">
        <h4>面板信息</h4>
        <div class="panel-info">
          <div class="info-item">
            <span class="label">ID:</span>
            <span class="value">{{ panelId }}</span>
          </div>
          <div class="info-item">
            <span class="label">名称:</span>
            <span class="value">{{ panelName }}</span>
          </div>
          <div class="info-item">
            <span class="label">状态:</span>
            <span class="value">{{ bindingState }}</span>
          </div>
        </div>
      </div>
      
      <div class="content-section">
        <h4>示例数据</h4>
        <div class="data-controls">
          <div class="control-group">
            <label for="text-input">文本：</label>
            <input 
              id="text-input" 
              type="text" 
              v-model="panelData.text" 
              @input="handleDataChange"
            />
          </div>
          
          <div class="control-group">
            <label for="number-input">数值：</label>
            <input 
              id="number-input" 
              type="number" 
              v-model.number="panelData.number" 
              @input="handleDataChange"
            />
          </div>
          
          <div class="control-group">
            <label for="color-input">颜色：</label>
            <input 
              id="color-input" 
              type="color" 
              v-model="panelData.color" 
              @input="handleDataChange"
            />
            <span class="color-preview" :style="{ backgroundColor: panelData.color }"></span>
          </div>
          
          <div class="control-group">
            <label for="toggle-input">开关：</label>
            <input 
              id="toggle-input" 
              type="checkbox" 
              v-model="panelData.toggle" 
              @change="handleDataChange"
            />
          </div>
        </div>
        
        <div class="data-actions">
          <button class="sync-btn" @click="syncData">
            <svg><use xlink:href="#iconSync"></use></svg>
            同步数据
          </button>
          <button class="reset-btn" @click="resetData">
            <svg><use xlink:href="#iconReset"></use></svg>
            重置数据
          </button>
        </div>
      </div>
      
      <div class="content-section">
        <h4>绑定列表</h4>
        <div v-if="bindings.length === 0" class="no-bindings">
          当前没有绑定关系。点击"创建绑定"按钮添加新的绑定。
        </div>
        <div v-else class="bindings-list">
          <div v-for="binding in bindings" :key="binding.id" class="binding-item">
            <div class="binding-info">
              <div class="binding-type" :class="binding.options.type">
                {{ getBindingTypeLabel(binding.options.type) }}
              </div>
              <div class="binding-target">
                目标: {{ getTargetPanelName(binding) }}
              </div>
            </div>
            <div class="binding-actions">
              <button class="binding-action" @click="syncToTarget(binding)">
                <svg><use xlink:href="#iconForward"></use></svg>
              </button>
              <button class="binding-action danger" @click="removeBinding(binding)">
                <svg><use xlink:href="#iconDelete"></use></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div class="content-section">
        <h4>调试信息</h4>
        <div class="debug-info">
          <button class="debug-btn" @click="discoverPanels">
            发现面板
          </button>
          <button class="debug-btn" @click="logRegistryStats">
            注册表状态
          </button>
        </div>
        <div class="debug-log">
          <div v-for="(log, index) in debugLogs" :key="index" class="log-entry">
            {{ log }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { usePanelBinding } from '../../../toolBox/feature/panelBinding/panelBindingMixin.js';
import { 
  getPanelBindings, 
  unbindPanels, 
  syncPanelData 
} from '../../../toolBox/feature/panelBinding/panelBindingManager.js';
import { 
  getAllPanels, 
  getRegistryStats 
} from '../../../toolBox/feature/panelBinding/panelRegistry.js';
import { 
  discoveryService 
} from '../../../toolBox/feature/panelBinding/panelDiscoveryService.js';

export default {
  name: 'PanelBindingExample',
  
  setup() {
    // 生成唯一ID
    const uniqueId = `example_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
    const panelId = ref(uniqueId);
    const panelName = ref('绑定示例面板');
    
    // 面板数据
    const panelData = ref({
      text: '示例文本',
      number: 42,
      color: '#3573f0',
      toggle: true
    });
    
    // 调试日志
    const debugLogs = ref([
      `面板初始化: ${panelId.value}`
    ]);
    
    const addLog = (message) => {
      const timestamp = new Date().toLocaleTimeString();
      debugLogs.value.unshift(`[${timestamp}] ${message}`);
      
      // 限制日志数量
      if (debugLogs.value.length > 10) {
        debugLogs.value = debugLogs.value.slice(0, 10);
      }
    };
    
    // 使用面板绑定混入
    const { 
      bindingState, 
      openBindingDialog, 
      syncData: syncBindingData
    } = usePanelBinding({
      panelId: panelId.value,
      panelName: panelName.value,
      panelData,
      onReceiveData: (data, sourcePanelId) => {
        addLog(`收到来自 ${sourcePanelId} 的数据`);
        
        // 合并接收到的数据
        if (data.text !== undefined) panelData.value.text = data.text;
        if (data.number !== undefined) panelData.value.number = data.number;
        if (data.color !== undefined) panelData.value.color = data.color;
        if (data.toggle !== undefined) panelData.value.toggle = data.toggle;
      },
      exposedProperties: ['text', 'number', 'color', 'toggle']
    });
    
    // 获取绑定列表
    const bindings = ref([]);
    
    const updateBindings = () => {
      bindings.value = getPanelBindings(panelId.value);
      addLog(`更新绑定列表: 共${bindings.value.length}个绑定`);
    };
    
    // 判断是否有绑定
    const hasBindings = computed(() => bindings.value.length > 0);
    
    // 数据变更处理
    const handleDataChange = () => {
      // 添加防抖处理可以提高性能
      addLog('数据已更改，准备同步');
      syncBindingData(panelData.value);
    };
    
    // 同步数据
    const syncData = () => {
      addLog('手动触发数据同步');
      syncBindingData(panelData.value);
    };
    
    // 重置数据
    const resetData = () => {
      panelData.value = {
        text: '示例文本',
        number: 42,
        color: '#3573f0',
        toggle: true
      };
      
      addLog('数据已重置');
      syncBindingData(panelData.value);
    };
    
    // 移除绑定
    const removeBinding = (binding) => {
      unbindPanels(binding.id);
      updateBindings();
      addLog(`解除绑定: ${binding.id}`);
    };
    
    // 同步到目标
    const syncToTarget = (binding) => {
      syncPanelData(panelId.value, panelData.value, binding.targetPanelId);
      addLog(`同步数据到: ${binding.targetPanelId}`);
    };
    
    // 获取绑定类型标签
    const getBindingTypeLabel = (type) => {
      const types = {
        'bidirectional': '双向绑定',
        'unidirectional': '单向绑定',
        'partial': '部分绑定'
      };
      
      return types[type] || type;
    };
    
    // 获取目标面板名称
    const getTargetPanelName = (binding) => {
      // 这里可以通过面板注册表获取面板名称，但为简单起见直接返回ID
      return binding.targetPanelId;
    };
    
    // 调试功能：发现面板
    const discoverPanels = () => {
      const panels = discoveryService.discover();
      addLog(`发现面板: ${panels.length}个`);
      
      // 更新绑定列表
      updateBindings();
    };
    
    // 调试功能：查看注册表状态
    const logRegistryStats = () => {
      const stats = getRegistryStats();
      addLog(`注册表: ${stats.totalPanels}个面板, ${stats.totalGroups}个分组`);
      
      const panels = getAllPanels();
      console.log('所有注册的面板:', panels);
    };
    
    // 生命周期钩子
    onMounted(() => {
      updateBindings();
      addLog('面板已挂载');
      
      // 确保发现服务已启动
      discoverPanels();
    });
    
    return {
      panelId,
      panelName,
      panelData,
      bindingState,
      bindings,
      hasBindings,
      debugLogs,
      
      handleDataChange,
      openBindingDialog,
      syncData,
      resetData,
      removeBinding,
      syncToTarget,
      getBindingTypeLabel,
      getTargetPanelName,
      discoverPanels,
      logRegistryStats
    };
  }
};
</script>

<style scoped>
.panel-binding-example {
  display: flex;
  flex-direction: column;
  height: 100%;
  color: var(--cc-theme-on-background);
  background-color: var(--cc-theme-background);
}

.panel-header {
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--cc-border-color);
  background-color: var(--cc-theme-surface);
}

.panel-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
}

.binding-status {
  display: flex;
  align-items: center;
  gap: 12px;
}

.binding-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: var(--cc-theme-on-surface);
}

.binding-indicator.active {
  color: var(--cc-theme-primary);
}

.binding-indicator svg {
  width: 16px;
  height: 16px;
}

.binding-btn {
  padding: 6px 12px;
  background-color: var(--cc-theme-primary);
  color: var(--cc-theme-on-primary);
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.binding-btn:hover {
  background-color: var(--cc-theme-primary-dark);
}

.panel-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.content-section {
  background-color: var(--cc-theme-surface);
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.content-section h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 500;
  color: var(--cc-theme-on-background);
}

.panel-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.label {
  font-weight: 500;
  min-width: 60px;
}

.value {
  font-family: monospace;
  background-color: var(--cc-theme-surface-light);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 14px;
}

.data-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.control-group label {
  min-width: 60px;
  font-weight: 500;
}

.control-group input[type="text"],
.control-group input[type="number"] {
  flex: 1;
  padding: 8px;
  border: 1px solid var(--cc-border-color);
  border-radius: 4px;
  background-color: var(--cc-theme-background);
  color: var(--cc-theme-on-background);
}

.control-group input[type="color"] {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 4px;
  background: none;
  cursor: pointer;
}

.color-preview {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 1px solid var(--cc-border-color);
}

.data-actions {
  display: flex;
  gap: 12px;
}

.sync-btn,
.reset-btn,
.debug-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background-color: var(--cc-theme-surface-light);
  color: var(--cc-theme-on-background);
  border: 1px solid var(--cc-border-color);
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.sync-btn:hover,
.reset-btn:hover,
.debug-btn:hover {
  background-color: var(--cc-theme-surface-lighter);
}

.sync-btn svg,
.reset-btn svg {
  width: 16px;
  height: 16px;
}

.no-bindings {
  padding: 12px;
  background-color: var(--cc-theme-surface-light);
  border-radius: 4px;
  font-size: 14px;
  color: var(--cc-theme-on-surface);
}

.bindings-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.binding-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background-color: var(--cc-theme-surface-light);
  border-radius: 4px;
  border-left: 4px solid var(--cc-theme-primary);
}

.binding-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.binding-type {
  font-weight: 500;
  font-size: 14px;
}

.binding-type.bidirectional {
  color: var(--cc-theme-primary);
}

.binding-type.unidirectional {
  color: var(--cc-theme-success);
}

.binding-type.partial {
  color: var(--cc-theme-warning);
}

.binding-target {
  font-size: 13px;
  color: var(--cc-theme-on-surface);
}

.binding-actions {
  display: flex;
  gap: 8px;
}

.binding-action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background-color: var(--cc-theme-surface);
  border: 1px solid var(--cc-border-color);
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.binding-action:hover {
  background-color: var(--cc-theme-surface-lighter);
}

.binding-action.danger {
  color: var(--cc-theme-error);
}

.binding-action.danger:hover {
  background-color: var(--cc-theme-error-lightest);
}

.binding-action svg {
  width: 16px;
  height: 16px;
}

.debug-info {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.debug-log {
  background-color: var(--cc-theme-surface-light);
  border-radius: 4px;
  padding: 8px;
  font-family: monospace;
  font-size: 13px;
  color: var(--cc-theme-on-surface);
  max-height: 150px;
  overflow-y: auto;
}

.log-entry {
  padding: 4px 0;
  border-bottom: 1px solid var(--cc-border-color-lighter);
}

.log-entry:last-child {
  border-bottom: none;
}
</style> 