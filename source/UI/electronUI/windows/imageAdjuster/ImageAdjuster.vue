<template>
  <div class="adjustment-controls">
    <div class="effects-list-container">
      <div class="effects-list">
        <div v-for="effect in effectStack" :key="effect.id" class="control-item"
          :class="{ 'dragging': draggingEffectId === effect.id }">
          <div class="control-header" draggable="true" @dragstart="handleDragStart($event, effect)"
            @dragend="handleDragEnd" @dragover.prevent @drop="handleDrop($event, effect)">
            <div class="control-left">
              <span class="drag-handle">⋮⋮</span>
              <label>
                <input type="checkbox" v-model="effect.enabled" />
                {{ effect.label }}
              </label>
            </div>
            <div class="control-right">
              <span class="value-display">{{ effect.value }}</span>
              <button class="remove-btn" @click="removeEffect(effect)">×</button>
            </div>
          </div>
          <div class="control-body">
            <template v-for="param in effect.params" :key="param.key">
              <div class="param-item">
                <label>{{ param.label }}</label>
                <input v-if="param.type === 'slider'" type="range" :value="param.value" :min="param.min" :max="param.max"
                  :step="param.step" @input="e => updateParamValue(effect, param, e.target.value)" :disabled="!effect.enabled">
                <div v-else-if="param.type === 'matrix3x3'" class="matrix-editor">
                  <div v-for="(row, i) in 3" :key="i" class="matrix-row">
                    <input v-for="(col, j) in 3" :key="j" type="number" v-model="param.value[i][j]" step="0.1"
                      @input="updateProcessing" :disabled="!effect.enabled">
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
    
    <div class="add-effect-container">
      <button @click="openEffectSelector" class="add-effect">
        <span class="plus-icon">+</span>
      </button>
    </div>

    <FloatLayerWindow
      v-if="showEffectSelector"
      v-model:visible="showEffectSelector"
      :title="'选择效果'"
      :initial-width="400"
      :initial-height="500"
      :initial-x="200"
      :initial-y="100"
    >
      <div class="effect-selector-content">
        <div class="search-container">
          <input 
            type="text" 
            v-model="searchQuery" 
            placeholder="搜索效果..."
            class="search-input"
          >
        </div>
        <div v-for="effect in filteredEffects" 
          :key="effect.key" 
          class="effect-option" 
          @click="addEffect(effect)"
        >
          <span>{{ effect.label }}</span>
          <span class="effect-description">{{ effect.description }}</span>
        </div>
      </div>
    </FloatLayerWindow>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { 参数定义注册表 } from './pipelineBuilder.js';
import FloatLayerWindow from '../../../components/common/floatLayerWindow/floatLayerWindow.vue';
import _pinyin from '../../../../../static/pinyin.js';
import {  以关键词匹配对象 } from '../../../../../src/utils/strings/search.js';
const props = defineProps({
  effectStack: {
    type: Array,
    required: true
  },
  draggingEffectId: {
    type: String,
    default: null
  }
});
const emit = defineEmits(['update:effect-stack', 'effect-param-change']);
// 效果选择器相关
const showEffectSelector = ref(false);
const searchQuery = ref('');
const availableEffects = ref([...参数定义注册表]);
// 获取文本的所有可能搜索形式（原文、拼音、首字母）
// 修改过滤效果的计算属性，支持拼音搜索
const filteredEffects = computed(() => {
  const 查询文本 = searchQuery.value.trim();
  if (!查询文本) return availableEffects.value;
  return availableEffects.value.filter(效果 => 
    以关键词匹配对象(查询文本, 效果, ['label', 'description'])
  );
});

// 添加效果
const addEffect = (selectedEffect) => {
  const newEffect = {
    ...selectedEffect,
    id: `effect-${Date.now()}`,
    enabled: true,
    params: selectedEffect.params?.map(param => ({
      ...param,
      value: Array.isArray(param.defaultValue)
        ? JSON.parse(JSON.stringify(param.defaultValue))
        : param.defaultValue
    })) || []
  };

  emit('update:effect-stack', [...props.effectStack, newEffect]);
  showEffectSelector.value = false;
};

// 移除效果
const removeEffect = (effect) => {
  const newStack = props.effectStack.filter(e => e.id !== effect.id);
  emit('update:effect-stack', newStack);
};

// 处理拖拽排序
const handleDragStart = (e, effect) => {
  emit('update:dragging-effect-id', effect.id);
  e.dataTransfer.effectAllowed = 'move';
};

const handleDragEnd = () => {
  emit('update:dragging-effect-id', null);
};

const handleDrop = (e, target) => {
  e.preventDefault();
  const draggedIndex = props.effectStack.findIndex(e => e.id === props.draggingEffectId);
  const targetIndex = props.effectStack.findIndex(e => e.id === target.id);

  if (draggedIndex === targetIndex) return;

  const newStack = [...props.effectStack];
  const [removed] = newStack.splice(draggedIndex, 1);
  newStack.splice(targetIndex, 0, removed);

  emit('update:effect-stack', newStack);
};

// 更新参数值
const updateParamValue = (effect, param, newValue) => {
  const newStack = props.effectStack.map(e => {
    if (e.id === effect.id) {
      return {
        ...e,
        params: e.params.map(p => {
          if (p.key === param.key) {
            // 根据参数类型进行适当的值转换
            let convertedValue = newValue;
            if (param.type === 'slider' || param.type === 'number') {
              // 确保数值类型参数被转换为数字
              convertedValue = Number(newValue);
              
              // 验证数值是否在有效范围内
              if (typeof param.min !== 'undefined') {
                convertedValue = Math.max(param.min, convertedValue);
              }
              if (typeof param.max !== 'undefined') {
                convertedValue = Math.min(param.max, convertedValue);
              }
            }
            
            return {
              ...p,
              value: param.updateValue ? 
                param.updateValue(convertedValue) : 
                convertedValue
            };
          }
          return p;
        })
      };
    }
    return e;
  });

  emit('update:effect-stack', newStack);
  emit('effect-param-change');
};

// 打开效果选择器
const openEffectSelector = () => {
  showEffectSelector.value = true;
};

// 暴露给父组件的方法
defineExpose({
  getCurrentSettings() {
    return {
      effectStack: props.effectStack,
      // 其他需要保存的设置...
    }
  },
  
  loadSettings(settings) {
    if (settings && settings.effectStack) {
      emit('update:effect-stack', settings.effectStack)
    }
  }
})
</script>

<style scoped>
.adjustment-controls {
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
}

.effects-list-container {
  flex: 1;
  overflow-y: auto;
  padding: var(--cc-space-lg);
  padding-bottom: calc(var(--cc-space-lg) + 80px);
}

.effects-list {
  display: flex;
  flex-direction: column;
  gap: var(--cc-space-md);
}

.control-item {
  background: var(--cc-theme-surface);
  border-radius: var(--cc-border-radius);
  padding: var(--cc-space-md);
  cursor: default;
  transition: var(--cc-transition);
  border: var(--cc-border-width) solid var(--cc-border-color);
}

.control-item:hover {
  background: var(--cc-theme-surface-light);
}

.control-item.dragging {
  opacity: var(--cc-opacity-disabled);
}

.control-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  cursor: move;
  padding: var(--cc-space-sm);
  border-radius: var(--cc-border-radius-sm);
}

.control-header:hover {
  background: var(--cc-theme-surface-lighter);
}

.control-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.drag-handle {
  color: #666;
  cursor: move;
  user-select: none;
}

.remove-btn {
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  font-size: 16px;
  padding: 0 4px;
}

.remove-btn:hover {
  color: #ff4444;
}

input[type="range"] {
  width: 100%;
  height: 4px;
  background: #3a3a3a;
  border-radius: 2px;
  -webkit-appearance: none;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  background: #fff;
  border-radius: 50%;
  cursor: pointer;
}

.effect-selector-content {
  padding: var(--cc-space-md);
  overflow-y: auto;
  height: 100%;
}

.effect-option {
  padding: var(--cc-space-md);
  border-radius: var(--cc-border-radius);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: var(--cc-space-sm);
  transition: var(--cc-transition);
}

.effect-option:hover {
  background: var(--cc-theme-surface-light);
}

.effect-description {
  font-size: 0.9em;
  color: var(--cc-theme-on-surface);
}

.control-body {
  padding: 0 var(--cc-space-sm);
  cursor: default;
}

.param-item {
  margin: var(--cc-space-sm) 0;
}

.matrix-editor {
  background: var(--cc-theme-surface-light);
  padding: var(--cc-space-sm);
  border-radius: var(--cc-border-radius-sm);
}

.matrix-row {
  display: flex;
  gap: var(--cc-space-sm);
  margin: var(--cc-space-xs) 0;
}

.matrix-row input {
  width: 50px;
  text-align: center;
  padding: var(--cc-space-xs);
  background: var(--cc-theme-surface);
  border: var(--cc-border-width) solid var(--cc-border-color);
  border-radius: var(--cc-border-radius-sm);
  color: var(--cc-theme-on-surface);
}

.add-effect-container {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  border-top: var(--cc-border-width) solid var(--cc-border-color);
}

.add-effect {
  width: 100%;
  background: var(--cc-theme-surface);
  border: 2px dashed var(--cc-border-color);
  border-radius: var(--cc-border-radius);
  color: var(--cc-theme-on-surface);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--cc-space-sm);
}

.add-effect:hover {
  background: var(--cc-theme-surface-light);
  border-color: var(--cc-theme-primary);
  color: var(--cc-theme-primary);
}

.plus-icon {
  font-size: 1.2em;
  font-weight: bold;
}

.search-container {
  padding: var(--cc-space-sm);
  position: sticky;
  top: 0;
  background: var(--cc-theme-surface);
  z-index: 1;
}

.search-input {
  width: 100%;
  padding: var(--cc-space-sm);
  border: var(--cc-border-width) solid var(--cc-border-color);
  border-radius: var(--cc-border-radius);
  background: var(--cc-theme-surface-light);
  color: var(--cc-theme-on-surface);
}

.search-input:focus {
  outline: none;
  border-color: var(--cc-theme-primary);
}
</style>