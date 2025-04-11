<template>
  <div 
    class="panel-binding-indicator"
    :class="[
      `panel-binding-indicator--${state}`,
      { 'panel-binding-indicator--active': active }
    ]"
    :style="bindingStyle"
    @click="toggleActive"
    :title="bindingTitle"
  >
    <div class="panel-binding-icon">
      <svg v-if="connected" class="connected-icon">
        <use xlink:href="#iconLink"></use>
      </svg>
      <svg v-else-if="pending" class="pending-icon">
        <use xlink:href="#iconRefresh"></use>
      </svg>
      <svg v-else-if="error" class="error-icon">
        <use xlink:href="#iconWarning"></use>
      </svg>
      <svg v-else class="disconnected-icon">
        <use xlink:href="#iconUnlink"></use>
      </svg>
    </div>
    <div v-if="active" class="panel-binding-details">
      <div class="binding-header">
        <span class="binding-title">{{ bindingTitle }}</span>
        <button class="binding-close-btn" @click.stop="closeDetails">×</button>
      </div>
      
      <div class="binding-content">
        <div v-if="bindings.length > 0" class="binding-list">
          <div 
            v-for="binding in bindings" 
            :key="binding.id" 
            class="binding-item"
            :style="getBindingItemStyle(binding)"
          >
            <div class="binding-item-header">
              <span class="binding-target">{{ getTargetPanelName(binding) }}</span>
              <span class="binding-type-badge">{{ getBindingTypeLabel(binding) }}</span>
            </div>
            <div class="binding-item-actions">
              <button class="binding-action-btn" @click.stop="navigateToPanel(binding)">
                <svg><use xlink:href="#iconForward"></use></svg>
                前往
              </button>
              <button class="binding-action-btn" @click.stop="syncData(binding)">
                <svg><use xlink:href="#iconRefresh"></use></svg>
                同步
              </button>
              <button class="binding-action-btn binding-action-btn--danger" @click.stop="unbind(binding)">
                <svg><use xlink:href="#iconTrash"></use></svg>
                解除
              </button>
            </div>
          </div>
        </div>
        
        <div v-else class="no-bindings">
          <p>此面板未与其他面板绑定</p>
          <button class="binding-action-btn" @click.stop="showBindingDialog">
            <svg><use xlink:href="#iconAdd"></use></svg>
            创建绑定
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { 
  getPanelBindings, 
  unbindPanels, 
  syncPanelData,
  BINDING_EVENTS,
  CONNECTION_STATES,
  BINDING_TYPES,
  bindingEventBus,
  getBindingCSSVariables
} from '../panelBindingManager.js';

// 属性定义
const props = defineProps({
  panelId: {
    type: String,
    required: true
  },
  panelName: {
    type: String,
    default: ''
  },
  panelData: {
    type: Object,
    default: () => ({})
  },
  state: {
    type: String,
    default: CONNECTION_STATES.DISCONNECTED
  }
});

// 事件定义
const emit = defineEmits([
  'navigate-to-panel', 
  'create-binding',
  'sync-data',
  'unbind',
  'binding-change'
]);

// 组件状态
const active = ref(false);
const bindings = ref([]);

// 计算属性
const connected = computed(() => props.state === CONNECTION_STATES.CONNECTED);
const pending = computed(() => props.state === CONNECTION_STATES.PENDING);
const error = computed(() => props.state === CONNECTION_STATES.ERROR);

const bindingTitle = computed(() => {
  if (bindings.value.length === 0) return '未绑定';
  return `已绑定 ${bindings.value.length} 个面板`;
});

const bindingStyle = computed(() => {
  if (bindings.value.length === 0) return {};
  
  // 使用第一个绑定的样式
  const firstBinding = bindings.value[0];
  if (!firstBinding) return {};
  
  return getBindingCSSVariables(firstBinding.id);
});

// 方法
function toggleActive() {
  active.value = !active.value;
  
  if (active.value) {
    refreshBindings();
  }
}

function closeDetails() {
  active.value = false;
}

function refreshBindings() {
  bindings.value = getPanelBindings(props.panelId);
}

function getTargetPanelName(binding) {
  const isSource = binding.sourcePanelId === props.panelId;
  const targetId = isSource ? binding.targetPanelId : binding.sourcePanelId;
  
  // 这里可以从全局面板注册表获取面板名称，或者直接使用ID
  return targetId;
}

function getBindingTypeLabel(binding) {
  const { type } = binding.options;
  
  if (type === BINDING_TYPES.BIDIRECTIONAL) {
    return '双向';
  } else if (type === BINDING_TYPES.UNIDIRECTIONAL) {
    const isSource = binding.sourcePanelId === props.panelId;
    return isSource ? '输出' : '输入';
  } else if (type === BINDING_TYPES.PARTIAL) {
    return '部分';
  }
  
  return '未知';
}

function getBindingItemStyle(binding) {
  return getBindingCSSVariables(binding.id);
}

function navigateToPanel(binding) {
  const isSource = binding.sourcePanelId === props.panelId;
  const targetId = isSource ? binding.targetPanelId : binding.sourcePanelId;
  
  emit('navigate-to-panel', {
    binding,
    targetPanelId: targetId
  });
}

function syncData(binding) {
  emit('sync-data', {
    binding,
    data: props.panelData
  });
  
  // 直接调用同步API
  syncPanelData(props.panelId, props.panelData);
}

function unbind(binding) {
  if (confirm(`确定要解除与 ${getTargetPanelName(binding)} 的绑定吗？`)) {
    emit('unbind', { binding });
    unbindPanels(binding.id);
    refreshBindings();
  }
}

function showBindingDialog() {
  emit('create-binding', {
    sourcePanelId: props.panelId,
    panelName: props.panelName
  });
}

// 事件监听器
function handleBindingEvent(event) {
  const { source, target } = event;
  
  if (source === props.panelId || target === props.panelId) {
    refreshBindings();
    emit('binding-change', event);
  }
}

// 生命周期钩子
onMounted(() => {
  refreshBindings();
  
  // 监听绑定事件
  bindingEventBus.on(BINDING_EVENTS.PANEL_BOUND, handleBindingEvent);
  bindingEventBus.on(BINDING_EVENTS.PANEL_UNBOUND, handleBindingEvent);
  bindingEventBus.on(BINDING_EVENTS.PANEL_DATA_SYNC, handleBindingEvent);
});

onUnmounted(() => {
  // 移除事件监听器
  bindingEventBus.off(BINDING_EVENTS.PANEL_BOUND, handleBindingEvent);
  bindingEventBus.off(BINDING_EVENTS.PANEL_UNBOUND, handleBindingEvent);
  bindingEventBus.off(BINDING_EVENTS.PANEL_DATA_SYNC, handleBindingEvent);
});

// 监听属性变化
watch(() => props.panelData, () => {
  // 当面板数据变化时，可以选择自动同步到绑定的面板
}, { deep: true });

watch(() => props.state, () => {
  // 当面板状态变化时更新UI
});
</script>

<style scoped>
.panel-binding-indicator {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: var(--cc-theme-surface-light);
  cursor: pointer;
  transition: all 0.3s ease;
  margin: 0 4px;
}

.panel-binding-indicator:hover {
  background-color: var(--panel-binding-indicator, var(--cc-theme-surface-lighter));
}

.panel-binding-indicator--connected {
  background-color: var(--panel-binding-indicator, rgba(24, 128, 56, 0.2));
  border: 1px solid var(--panel-binding-border, #188038);
}

.panel-binding-indicator--pending {
  background-color: var(--panel-binding-indicator, rgba(242, 153, 0, 0.2));
  border: 1px solid var(--panel-binding-border, #f29900);
  animation: pulse 1.5s infinite;
}

.panel-binding-indicator--error {
  background-color: var(--panel-binding-indicator, rgba(217, 48, 37, 0.2));
  border: 1px solid var(--panel-binding-border, #d93025);
}

.panel-binding-indicator--disconnected {
  background-color: var(--cc-theme-surface-light);
  border: 1px solid var(--cc-border-color);
}

.panel-binding-indicator--active {
  z-index: 1000;
}

.panel-binding-icon {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.panel-binding-icon svg {
  width: 16px;
  height: 16px;
}

.connected-icon {
  color: var(--panel-binding-text, #188038);
}

.pending-icon {
  color: var(--panel-binding-text, #f29900);
  animation: rotate 1.5s linear infinite;
}

.error-icon {
  color: var(--panel-binding-text, #d93025);
}

.disconnected-icon {
  color: var(--cc-theme-on-surface);
}

/* 绑定详情面板 */
.panel-binding-details {
  position: absolute;
  top: 100%;
  right: 0;
  width: 280px;
  background-color: var(--cc-theme-surface);
  border: 1px solid var(--cc-border-color);
  border-radius: var(--cc-border-radius);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  margin-top: 8px;
  overflow: hidden;
}

.binding-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background-color: var(--cc-theme-surface-light);
  border-bottom: 1px solid var(--cc-border-color);
}

.binding-title {
  font-weight: 500;
  font-size: 14px;
}

.binding-close-btn {
  background: none;
  border: none;
  color: var(--cc-theme-on-surface);
  font-size: 16px;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
}

.binding-close-btn:hover {
  color: var(--cc-theme-on-background);
}

.binding-content {
  padding: 12px;
  max-height: 320px;
  overflow-y: auto;
}

.binding-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.binding-item {
  padding: 12px;
  background-color: var(--cc-theme-surface-light);
  border-radius: var(--cc-border-radius);
  border: 1px solid var(--panel-binding-border, var(--cc-border-color));
}

.binding-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.binding-target {
  font-weight: 500;
  font-size: 13px;
}

.binding-type-badge {
  font-size: 11px;
  background-color: var(--panel-binding-indicator, var(--cc-theme-surface-lighter));
  color: var(--panel-binding-text, var(--cc-theme-on-background));
  padding: 2px 6px;
  border-radius: 10px;
}

.binding-item-actions {
  display: flex;
  gap: 4px;
  margin-top: 8px;
}

.binding-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background-color: var(--cc-theme-surface);
  border: 1px solid var(--cc-border-color);
  color: var(--cc-theme-on-background);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.binding-action-btn svg {
  width: 12px;
  height: 12px;
}

.binding-action-btn:hover {
  background-color: var(--cc-theme-primary-lightest);
  border-color: var(--cc-theme-primary-lighter);
  color: var(--cc-theme-primary);
}

.binding-action-btn--danger:hover {
  background-color: rgba(217, 48, 37, 0.1);
  border-color: #d93025;
  color: #d93025;
}

.no-bindings {
  text-align: center;
  padding: 16px 0;
  color: var(--cc-theme-on-surface);
}

.no-bindings p {
  margin-bottom: 16px;
  font-size: 13px;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes pulse {
  0% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.6;
  }
}
</style> 