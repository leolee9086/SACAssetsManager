<template>
  <div class="adjustment-controls">
    <div v-for="control in controls" :key="control.key" class="control-item">
      <div class="control-header">
        <label>
          <input type="checkbox" v-model="control.enabled" />
          {{ control.label }}
        </label>
        <span class="value-display">{{ control.value }}</span>
      </div>
      <input type="range" v-model="control.value" :min="control.min" :max="control.max" :step="control.step"
        @input="updateProcessing" :disabled="!control.enabled">
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import {
  调整锐度, 调整平滑度, 调整清晰度,
  调整锐化半径, 调整细节保护, 调整细节
} from '../../../../utils/fromDeps/sharpInterface/useSharp/adjust/clarity.js';
import { 调整亮度, 调整对比度, 调整阴影 } from '../../../../utils/fromDeps/sharpInterface/useSharp/adjust/light.js';
import { 调整色相偏移 } from '../../../../utils/fromDeps/sharpInterface/useSharp/adjust/color.js';
import { 自动曝光 } from '../../../../utils/image/adjust/exposure.js';
const controls = ref([
  { key: '自动曝光', label: '自动曝光矫正', value: 0, min: 0, max: 1, step: 0.01, enabled: false },

  { key: 'lightness', label: '亮度', value: 0, min: -1, max: 1, step: 0.1, enabled: false },
  { key: '调整对比度', label: '对比度', value: 0, min: -1, max: 1, step: 0.1, enabled: false },
  { key: '调整阴影', label: '阴影', value: 0, min: -10, max: 10, step: 0.1, enabled: false },
  { key: '调整色相偏移', label: '色相', value: 0, min: -180, max: 180, step: 0.1, enabled: false },

  { key: 'sharpness', label: '锐度', value: 0, min: -1, max: 1, step: 0.1, enabled: false },
  { key: 'smoothness', label: '平滑度', value: 0, min: 0, max: 20, step: 1, enabled: false },
  { key: 'clarity', label: '清晰度', value: 0, min: -1, max: 1, step: 0.1, enabled: false },
  { key: 'radius', label: '锐化半径', value: 1, min: 0.5, max: 5, step: 0.1, enabled: false },
  { key: 'detail', label: '细节', value: 0, min: -1, max: 1, step: 0.1, enabled: false },
  { key: 'protection', label: '细节保护', value: 0.5, min: 0, max: 1, step: 0.1, enabled: false }
]);

// 处理函数映射
const processingFunctions = {
  sharpness: 调整锐度,
  smoothness: 调整平滑度,
  clarity: 调整清晰度,
  radius: 调整锐化半径,
  detail: 调整细节,
  protection: 调整细节保护,
  lightness: 调整亮度,
  调整对比度,
  调整阴影,
  调整色相偏移,
  自动曝光
};

// 创建处理管道
const createProcessingPipeline = () => {
  return async (sharpInstance) => {
    let processed = sharpInstance;

    for await (const control of controls.value) {
      const value = parseFloat(control.value);
      // 只处理启用的特效且非默认值
      if (control.enabled && value !== 0 && value !== control.min) {
        const processFunc = processingFunctions[control.key];
        if (processFunc) {
          processed = await processFunc(processed, value);
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
    control.value = control.key === 'protection' ? 0.5 : 0;
  });
  updateProcessing();
};

// 导出当前设置
const getCurrentSettings = () => {
  return controls.value.reduce((acc, control) => {
    acc[control.key] = control.value;
    return acc;
  }, {});
};

// 导出加载设置函数
const loadSettings = (settings) => {
  controls.value.forEach(control => {
    if (settings[control.key] !== undefined) {
      control.value = settings[control.key];
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
</script>

<style scoped>
.adjustment-controls {
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
}

.control-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.control-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #fff;
  font-size: 12px;
}

.value-display {
  color: #888;
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
</style>