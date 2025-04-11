<template>
  <div class="panel-register-controller">
    <div class="controller-header">
      <h3>面板注册控制台</h3>
      <div class="controller-buttons">
        <button class="controller-btn" @click="refreshPanels">刷新</button>
        <button class="controller-btn controller-btn--primary" @click="discoverPanels">发现面板</button>
      </div>
    </div>
    
    <div class="panels-info">
      <div class="info-item">
        <span class="info-label">已注册面板:</span>
        <span class="info-value">{{ registeredPanels.length }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">活跃面板:</span>
        <span class="info-value">{{ activePanels.length }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">已绑定的面板:</span>
        <span class="info-value">{{ boundPanels.length }}</span>
      </div>
    </div>
    
    <div class="panels-list">
      <h4>当前面板</h4>
      <div v-if="registeredPanels.length === 0" class="no-panels">
        没有找到已注册的面板
      </div>
      <div v-else class="panel-items">
        <div 
          v-for="panel in registeredPanels" 
          :key="panel.id"
          class="panel-item"
          :class="{ 'panel-item--active': panel.isActive, 'panel-item--bound': isBound(panel.id) }"
        >
          <div class="panel-icon">
            <svg><use xlink:href="#iconPanel"></use></svg>
          </div>
          <div class="panel-details">
            <div class="panel-name">{{ panel.name || panel.id }}</div>
            <div class="panel-id">ID: {{ panel.id }}</div>
            <div class="panel-tags">
              <span v-if="panel.isActive" class="panel-tag panel-tag--active">活跃</span>
              <span v-if="isBound(panel.id)" class="panel-tag panel-tag--bound">已绑定</span>
              <span v-if="panel.discovered" class="panel-tag panel-tag--discovered">已发现</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="controller-footer">
      <button class="controller-btn controller-btn--danger" @click="resetManager">重置注册</button>
      <button class="controller-btn controller-btn--primary" @click="openBindDialog" :disabled="registeredPanels.length < 2">创建绑定</button>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { 
  bindingEventBus, 
  BINDING_EVENTS, 
  getAllPanels, 
  discoverPanels as discoverAllPanels, 
  resetPanelManager,
  getAllBindings
} from '../panelBindingManager.js';

export default {
  name: 'PanelRegisterController',
  emits: ['open-binding-dialog'],
  
  setup(props, { emit }) {
    // 状态
    const panels = ref([]);
    const bindings = ref([]);
    
    // 计算属性
    const registeredPanels = computed(() => panels.value);
    
    const activePanels = computed(() => 
      panels.value.filter(panel => panel.isActive)
    );
    
    const boundPanels = computed(() => {
      const boundIds = new Set();
      bindings.value.forEach(binding => {
        boundIds.add(binding.sourcePanelId);
        boundIds.add(binding.targetPanelId);
      });
      return panels.value.filter(panel => boundIds.has(panel.id));
    });
    
    // 方法
    const refreshPanels = () => {
      panels.value = getAllPanels();
      bindings.value = getAllBindings();
      console.log('已刷新面板列表:', panels.value);
    };
    
    const discoverPanels = () => {
      panels.value = discoverAllPanels();
      console.log('发现的面板:', panels.value);
    };
    
    const resetManager = () => {
      if (confirm('确定要重置面板管理器吗？这将清除所有注册和绑定信息。')) {
        resetPanelManager();
        refreshPanels();
      }
    };
    
    const openBindDialog = () => {
      emit('open-binding-dialog');
    };
    
    const isBound = (panelId) => {
      return bindings.value.some(binding => 
        binding.sourcePanelId === panelId || binding.targetPanelId === panelId
      );
    };
    
    // 处理面板状态变化事件
    const handlePanelStateChanged = () => {
      refreshPanels();
    };
    
    // 生命周期钩子
    onMounted(() => {
      // 初始加载面板和绑定
      refreshPanels();
      
      // 监听面板状态变化事件
      bindingEventBus.on(BINDING_EVENTS.PANEL_STATE_CHANGED, handlePanelStateChanged);
      bindingEventBus.on(BINDING_EVENTS.PANEL_BOUND, handlePanelStateChanged);
      bindingEventBus.on(BINDING_EVENTS.PANEL_UNBOUND, handlePanelStateChanged);
    });
    
    onUnmounted(() => {
      // 移除事件监听
      bindingEventBus.off(BINDING_EVENTS.PANEL_STATE_CHANGED, handlePanelStateChanged);
      bindingEventBus.off(BINDING_EVENTS.PANEL_BOUND, handlePanelStateChanged);
      bindingEventBus.off(BINDING_EVENTS.PANEL_UNBOUND, handlePanelStateChanged);
    });
    
    return {
      registeredPanels,
      activePanels,
      boundPanels,
      refreshPanels,
      discoverPanels,
      resetManager,
      openBindDialog,
      isBound
    };
  }
};
</script>

<style scoped>
.panel-register-controller {
  width: 100%;
  background-color: var(--cc-theme-surface);
  border-radius: var(--cc-border-radius);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 100%;
}

.controller-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: var(--cc-theme-surface-light);
  border-bottom: 1px solid var(--cc-border-color);
}

.controller-header h3 {
  margin: 0;
  font-weight: 500;
  font-size: 16px;
  color: var(--cc-theme-on-background);
}

.controller-buttons {
  display: flex;
  gap: 8px;
}

.controller-btn {
  padding: 4px 12px;
  border-radius: var(--cc-border-radius);
  font-size: 13px;
  cursor: pointer;
  background-color: var(--cc-theme-surface);
  border: 1px solid var(--cc-border-color);
  color: var(--cc-theme-on-background);
  transition: all 0.2s;
}

.controller-btn--primary {
  background-color: var(--cc-theme-primary);
  border-color: var(--cc-theme-primary);
  color: var(--cc-theme-on-primary);
}

.controller-btn--danger {
  background-color: var(--cc-theme-error);
  border-color: var(--cc-theme-error);
  color: var(--cc-theme-on-error);
}

.controller-btn:hover {
  filter: brightness(1.1);
}

.controller-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  filter: grayscale(0.5);
}

.panels-info {
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  background-color: var(--cc-theme-surface-lighter);
  border-bottom: 1px solid var(--cc-border-color);
}

.info-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.info-label {
  font-size: 12px;
  color: var(--cc-theme-on-surface);
}

.info-value {
  font-size: 18px;
  font-weight: 500;
  color: var(--cc-theme-primary);
}

.panels-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
}

.panels-list h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--cc-theme-on-background);
}

.no-panels {
  padding: 24px;
  text-align: center;
  color: var(--cc-theme-on-surface);
  background-color: var(--cc-theme-surface-light);
  border-radius: var(--cc-border-radius);
}

.panel-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.panel-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  background-color: var(--cc-theme-surface-light);
  border: 1px solid var(--cc-border-color);
  border-radius: var(--cc-border-radius);
  transition: all 0.2s;
}

.panel-item--active {
  border-left: 3px solid var(--cc-theme-success);
}

.panel-item--bound {
  border-left: 3px solid var(--cc-theme-primary);
}

.panel-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-right: 12px;
}

.panel-icon svg {
  width: 20px;
  height: 20px;
  color: var(--cc-theme-on-background);
}

.panel-details {
  flex: 1;
}

.panel-name {
  font-weight: 500;
  font-size: 14px;
  color: var(--cc-theme-on-background);
}

.panel-id {
  font-size: 12px;
  color: var(--cc-theme-on-surface);
}

.panel-tags {
  display: flex;
  gap: 4px;
  margin-top: 4px;
}

.panel-tag {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  background-color: var(--cc-theme-surface);
  color: var(--cc-theme-on-surface);
}

.panel-tag--active {
  background-color: var(--cc-theme-success-lightest);
  color: var(--cc-theme-success);
}

.panel-tag--bound {
  background-color: var(--cc-theme-primary-lightest);
  color: var(--cc-theme-primary);
}

.panel-tag--discovered {
  background-color: var(--cc-theme-warning-lightest);
  color: var(--cc-theme-warning);
}

.controller-footer {
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  background-color: var(--cc-theme-surface-light);
  border-top: 1px solid var(--cc-border-color);
}
</style> 