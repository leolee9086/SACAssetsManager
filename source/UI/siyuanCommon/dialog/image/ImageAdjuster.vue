<template>
    <div class="adjustment-controls">
      <div v-for="control in controls" 
           :key="control.key" 
           class="control-item">
        <div class="control-header">
          <label>{{ control.label }}</label>
          <span class="value-display">{{ control.value }}</span>
        </div>
        <input type="range" 
               v-model="control.value" 
               :min="control.min" 
               :max="control.max" 
               :step="control.step"
               @input="updateProcessing">
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, watch } from 'vue';
  import { 
    调整锐度, 调整平滑度, 调整清晰度, 
    调整锐化半径, 调整细节保护, 调整细节 
  } from '../../../../utils/fromDeps/sharpInterface/useSharp/adjust/clarity.js';
  
  const controls = ref([
    { key: 'sharpness', label: '锐度', value: 0, min: -1, max: 1, step: 0.1 },
    { key: 'smoothness', label: '平滑度', value: 0, min: 0, max: 20, step: 1 },
    { key: 'clarity', label: '清晰度', value: 0, min: -1, max: 1, step: 0.1 },
    { key: 'radius', label: '锐化半径', value: 1, min: 0.5, max: 5, step: 0.1 },
    { key: 'detail', label: '细节', value: 0, min: -1, max: 1, step: 0.1 },
    { key: 'protection', label: '细节保护', value: 0.5, min: 0, max: 1, step: 0.1 }
  ]);
  
  // 处理函数映射
  const processingFunctions = {
    sharpness: 调整锐度,
    smoothness: 调整平滑度,
    clarity: 调整清晰度,
    radius: 调整锐化半径,
    detail: 调整细节,
    protection: 调整细节保护
  };
  
  // 创建处理管道
  const createProcessingPipeline = () => {
    return (sharpInstance) => {
      let processed = sharpInstance;
      
      for (const control of controls.value) {
        const value = parseFloat(control.value);
        // 只处理非默认值
        if (value !== 0 && value !== control.min) {
          const processFunc = processingFunctions[control.key];
          if (processFunc) {
            processed = processFunc(processed, value);
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