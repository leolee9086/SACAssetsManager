<template>
  <div class="adjustment-controls">
    <div class="effects-list-container">
      <div class="effects-list">
        <div v-for="control in controls" :key="control.id" class="control-item"
          :class="{ 'dragging': draggingId === control.id }">
          <div class="control-header" draggable="true" @dragstart="handleDragStart($event, control)"
            @dragend="handleDragEnd" @dragover.prevent @drop="handleDrop($event, control)">
            <div class="control-left">
              <span class="drag-handle">⋮⋮</span>
              <label>
                <input type="checkbox" v-model="control.enabled" />
                {{ control.label }}
              </label>
            </div>
            <div class="control-right">
              <span class="value-display">{{ control.value }}</span>
              <button class="remove-btn" @click="removeEffect(control)">×</button>
            </div>
          </div>
          <div class="control-body">
            <template v-for="param in control.params" :key="param.key">
              <div class="param-item">
                <label>{{ param.label }}</label>
                <input v-if="param.type === 'slider'" type="range" :value="param.value" :min="param.min" :max="param.max"
                  :step="param.step" @input="e => updateParamValue(param, e.target.value)" :disabled="!control.enabled">
                <div v-else-if="param.type === 'matrix3x3'" class="matrix-editor">
                  <div v-for="(row, i) in 3" :key="i" class="matrix-row">
                    <input v-for="(col, j) in 3" :key="j" type="number" v-model="param.value[i][j]" step="0.1"
                      @input="updateProcessing" :disabled="!control.enabled">
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
import { 参数定义注册表, getValueType, convert } from './pipelineBuilder.js';
import { fromBuffer } from '../../../utils/fromDeps/sharpInterface/useSharp/toSharp.js';
import FloatLayerWindow from '../../components/common/floatLayerWindow/floatLayerWindow.vue';
//import { getValueType, convert } from '../../../../utils/typeConverter.js';
import _pinyin from '../../../../static/pinyin.js'


const pinyin = _pinyin.default
pinyin.initialize()
console.log(pinyin)
const controls = ref([]);
const draggingId = ref(null);
const availableEffects = ref([...参数定义注册表]);
const showEffectSelector = ref(false);
const searchQuery = ref('');

// 获取文本的所有可能搜索形式（原文、拼音、首字母）
const getSearchableText = (text) => {
  if (!text) return [''];
  
  return [
    text.toLowerCase(),
    pinyin.getFullChars(text).toLowerCase(),
    pinyin.getCamelChars(text).toLowerCase()
  ];
};

// 修改过滤效果的计算属性，支持拼音搜索
const filteredEffects = computed(() => {
  const query = searchQuery.value.toLowerCase().trim();
  if (!query) return availableEffects.value;
  
  return availableEffects.value.filter(effect => {
    // 获取效果名称的所有搜索形式
    const labelTexts = getSearchableText(effect.label);
    // 获取描述的所有搜索形式
    const descTexts = effect.description ? getSearchableText(effect.description) : [''];
    
    // 如果任一搜索形式包含查询字符串，则匹配成功
    return labelTexts.some(text => text.includes(query)) ||
           descTexts.some(text => text.includes(query));
  });
});

// 添加效果
const addEffect = (selectedEffect) => {
  // 确保有默认的params
  const defaultParams = selectedEffect.params || [];

  const newEffect = {
    ...selectedEffect,
    id: `effect-${Date.now()}`,
    enabled: true,
    params: defaultParams.map(param => ({
      ...param,
      value: Array.isArray(param.defaultValue)
        ? JSON.parse(JSON.stringify(param.defaultValue))
        : param.defaultValue
    }))
  };

  controls.value.push(newEffect);
  showEffectSelector.value = false;
  updateProcessing();
};

// 移除效果
const removeEffect = (control) => {
  const index = controls.value.findIndex(c => c.id === control.id);
  if (index > -1) {
    controls.value.splice(index, 1);
  }
  updateProcessing();
};

// 拖拽相关函数
const handleDragStart = (e, control) => {
  draggingId.value = control.id;
  e.dataTransfer.effectAllowed = 'move';
};

const handleDragEnd = () => {
  draggingId.value = null;
};

const handleDrop = (e, target) => {
  e.preventDefault();
  const draggedIndex = controls.value.findIndex(c => c.id === draggingId.value);
  const targetIndex = controls.value.findIndex(c => c.id === target.id);

  if (draggedIndex === targetIndex) return;

  const item = controls.value[draggedIndex];
  controls.value.splice(draggedIndex, 1);
  controls.value.splice(targetIndex, 0, item);

  updateProcessing();
};

// 更新处理管道
const createProcessingPipeline = () => {
  return async (sharpInstance) => {
    let processed = sharpInstance;

    for await (const control of controls.value) {
      if (control.enabled) {
        // 创建参数对象
        const params = control.params.map(item => item.value)

        // 如果需要克隆，在处理前创建新的 Sharp 实例
        if (control.needClone) {
          const buffer = await processed.toBuffer();
          processed = fromBuffer(buffer);
        }

        // 传递参数对象
        try {
          processed = await control.处理函数(processed, ...params);

        } catch (e) {
          console.error(e)
        }
      }
    }

    return processed;
  };
};

const emit = defineEmits(['update:processing']);

// 更新处理函数
const updateProcessing = () => {
  emit('update:processing', createProcessingPipeline());
};

// 导出重置函数
const reset = () => {
  controls.value.forEach(control => {
    control.params.forEach(param => {
      param.value = param.defaultValue;
    });
  });
  updateProcessing();
};

// 导出当前设置
const getCurrentSettings = () => {
  return controls.value.reduce((acc, control) => {
    acc[control.key] = control.params.reduce((acc, param) => {
      acc[param.key] = param.value;
      return acc;
    }, {});
    return acc;
  }, {});
};

// 导出加载设置函数
const loadSettings = (settings) => {
  controls.value.forEach(control => {
    if (settings[control.key] !== undefined) {
      control.params.forEach(param => {
        if (settings[control.key][param.key] !== undefined) {
          param.value = settings[control.key][param.key];
        }
      });
    }
  });
  updateProcessing();
};

// 暴露方法给父组件
defineExpose({
  reset,
  getCurrentSettings,
  loadSettings
});

// 更新参数值
const updateParamValue = (param, newValue) => {
  if (param.updateValue) {
    // 使用参数定义中的类型安全更新函数
    param.value = param.updateValue(newValue);
  } else {
    // 降级处理
    const inputType = getValueType(newValue);
    param.value = convert(newValue, inputType, param.expectedType || 'number');
  }
  updateProcessing();
};

// 打开效果选择器
const openEffectSelector = () => {
  showEffectSelector.value = true;
};
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