<template>
  <div class="panel-binding-toolbar">
    <div class="binding-indicator-container">
      <PanelBindingIndicator
        :panel-id="panelId"
        :panel-name="panelName"
        :panel-data="panelData"
        :state="bindingState"
        @navigate-to-panel="navigateToPanel"
        @create-binding="openBindingDialog"
        @sync-data="syncData"
        @unbind="unbindPanel"
        @binding-change="handleBindingChange"
      />
    </div>
    
    <div v-if="bindings.length > 0" class="binding-chips">
      <div 
        v-for="binding in bindings" 
        :key="binding.id"
        class="binding-chip"
        :style="getBindingStyle(binding)"
        :title="getBindingTitle(binding)"
        @click="navigateToPanel({ binding, targetPanelId: getTargetPanelId(binding) })"
      >
        <div class="binding-chip-icon">
          <svg><use xlink:href="#iconLink"></use></svg>
        </div>
        <span class="binding-chip-text">{{ getTargetPanelName(binding) }}</span>
      </div>
    </div>
    
    <button 
      v-if="showAddButton"
      class="binding-add-btn"
      @click="openBindingDialog"
      title="添加面板绑定"
    >
      <svg><use xlink:href="#iconAdd"></use></svg>
    </button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import PanelBindingIndicator from './PanelBindingIndicator.vue';
import { 
  getPanelBindings, 
  getBindingCSSVariables,
  BINDING_TYPES,
  CONNECTION_STATES
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
  bindingState: {
    type: String,
    default: CONNECTION_STATES.DISCONNECTED
  },
  showAddButton: {
    type: Boolean,
    default: true
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
const bindings = ref([]);

// 计算属性
const hasBindings = computed(() => bindings.value.length > 0);

// 方法
function refreshBindings() {
  bindings.value = getPanelBindings(props.panelId);
}

function getBindingStyle(binding) {
  return getBindingCSSVariables(binding.id);
}

function getBindingTitle(binding) {
  const targetName = getTargetPanelName(binding);
  const bindingType = getBindingTypeLabel(binding);
  
  return `${bindingType}绑定: ${targetName}`;
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

function getTargetPanelId(binding) {
  const isSource = binding.sourcePanelId === props.panelId;
  return isSource ? binding.targetPanelId : binding.sourcePanelId;
}

function getTargetPanelName(binding) {
  // 获取目标面板ID
  const targetId = getTargetPanelId(binding);
  
  // 这里可以从全局面板注册表获取面板名称
  // 暂时简单返回ID最后一部分作为名称
  return targetId.split('/').pop();
}

function navigateToPanel(event) {
  emit('navigate-to-panel', event);
}

function openBindingDialog() {
  emit('create-binding');
}

function syncData(event) {
  emit('sync-data', event);
}

function unbindPanel(event) {
  emit('unbind', event);
  refreshBindings();
}

function handleBindingChange(event) {
  refreshBindings();
  emit('binding-change', event);
}

// 生命周期钩子
onMounted(() => {
  refreshBindings();
});

watch(() => props.bindingState, () => {
  refreshBindings();
});
</script>

<style scoped>
.panel-binding-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 28px;
}

.binding-indicator-container {
  display: flex;
  align-items: center;
}

.binding-chips {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow-x: auto;
  max-width: 300px;
  padding-right: 4px;
  scrollbar-width: thin;
}

.binding-chips::-webkit-scrollbar {
  height: 4px;
}

.binding-chips::-webkit-scrollbar-track {
  background-color: var(--cc-theme-surface-light);
  border-radius: 4px;
}

.binding-chips::-webkit-scrollbar-thumb {
  background-color: var(--cc-theme-surface-lighter);
  border-radius: 4px;
}

.binding-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: 12px;
  background-color: var(--panel-binding-indicator, var(--cc-theme-surface-light));
  border: 1px solid var(--panel-binding-border, var(--cc-border-color));
  color: var(--panel-binding-text, var(--cc-theme-on-background));
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: all 0.2s;
}

.binding-chip:hover {
  background-color: var(--panel-binding-secondary, var(--cc-theme-surface-lighter));
  transform: translateY(-1px);
}

.binding-chip-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.binding-chip-icon svg {
  width: 12px;
  height: 12px;
}

.binding-chip-text {
  overflow: hidden;
  text-overflow: ellipsis;
}

.binding-add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: var(--cc-theme-surface-light);
  border: 1px solid var(--cc-border-color);
  color: var(--cc-theme-on-background);
  cursor: pointer;
  transition: all 0.2s;
  padding: 0;
}

.binding-add-btn svg {
  width: 14px;
  height: 14px;
}

.binding-add-btn:hover {
  background-color: var(--cc-theme-primary-lightest);
  border-color: var(--cc-theme-primary-lighter);
  color: var(--cc-theme-primary);
}
</style> 