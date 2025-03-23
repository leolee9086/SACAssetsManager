<template>
  <div class="customizer-card" :class="{ 'floating-mode': isFloating }">
    <div class="card-header">
      <h3>自定义模板</h3>
      <button v-if="isFloating" class="close-float-btn" @click="closeFloating">×</button>
    </div>
    <div class="customization-fields-container">
      <div class="customization-fields">
        <div v-for="(field, key) in template.customizableFields" :key="key" class="field-item">
          <label>{{ field.label }}</label>
          <input 
            v-if="field.type === 'text'" 
            type="text" 
            :value="customValues[key]"
            @input="updateField(key, $event.target.value)" 
          />
          <div v-else-if="field.type === 'color'" class="color-input-container">
            <div class="color-preview" :style="{ backgroundColor: customValues[key] }"></div>
            <input 
              type="color" 
              :value="customValues[key]"
              @input="updateField(key, $event.target.value)" 
            />
          </div>
          <div v-else-if="field.type === 'number'" class="number-input-container">
            <input 
              type="number" 
              :value="customValues[key]"
              @input="updateField(key, Number($event.target.value))" 
              :min="field.min" 
              :max="field.max"
            />
            <div class="number-controls">
              <button 
                class="number-control-btn" 
                @click="updateField(key, Math.min((customValues[key] || 0) + 1, field.max || Infinity))"
              >+</button>
              <button 
                class="number-control-btn" 
                @click="updateField(key, Math.max((customValues[key] || 0) - 1, field.min || -Infinity))"
              >−</button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-if="isFloating" class="floating-actions">
      <button class="apply-button" @click="closeFloating">确定</button>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  template: {
    type: Object,
    required: true
  },
  customValues: {
    type: Object,
    required: true
  },
  isFloating: {
    type: Boolean,
    default: false
  },
  onClose: {
    type: Function,
    default: () => {}
  },
  onUpdate: {
    type: Function,
    default: null
  }
});

const emit = defineEmits(['update:values']);

const updateField = (key, value) => {
  const newValues = { ...props.customValues, [key]: value };
  
  if (props.isFloating && props.onUpdate) {
    props.onUpdate(newValues);
  } else {
    emit('update:values', newValues);
  }
};

const closeFloating = () => {
  if (props.isFloating && props.onClose) {
    props.onClose();
  }
};
</script>

<style scoped>
.customizer-card {
  background-color: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  height: auto;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.card-header {
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.close-float-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background-color: #f0f0f0;
  color: #666;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  line-height: 1;
}

.close-float-btn:hover {
  background-color: #e0e0e0;
  color: #333;
}

.customization-fields-container {
  padding: 16px;
  overflow-y: auto;
  flex: 1;
}

/* 浮动模式样式 */
.floating-mode {
  height: 100%;
}

.floating-mode .customization-fields-container {
  max-height: none;
}

.floating-actions {
  padding: 12px 16px;
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid #f0f0f0;
}

.apply-button {
  padding: 8px 16px;
  background-color: #3a86ff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
}

.apply-button:hover {
  background-color: #2a75f0;
}

/* 其余样式保持不变 */
.customization-fields {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;
}

.field-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-item label {
  font-size: 14px;
  font-weight: 500;
  color: #555;
}

.field-item input[type="text"] {
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 10px 12px;
  font-size: 14px;
  width: 100%;
  transition: border-color 0.2s;
}

.field-item input[type="text"]:focus {
  border-color: #3a86ff;
  outline: none;
  box-shadow: 0 0 0 2px rgba(58, 134, 255, 0.2);
}

.color-input-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-preview {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
}

.color-input-container input[type="color"] {
  -webkit-appearance: none;
  width: calc(100% - 32px);
  height: 36px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background-color: transparent;
  cursor: pointer;
  padding: 0;
}

.color-input-container input[type="color"]::-webkit-color-swatch-wrapper {
  padding: 0;
}

.color-input-container input[type="color"]::-webkit-color-swatch {
  border: none;
  border-radius: 4px;
}

.number-input-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.number-input-container input[type="number"] {
  flex-grow: 1;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 10px 12px;
  font-size: 14px;
  -moz-appearance: textfield;
}

.number-input-container input[type="number"]::-webkit-outer-spin-button,
.number-input-container input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.number-controls {
  display: flex;
  flex-direction: column;
  height: 36px;
}

.number-control-btn {
  height: 18px;
  width: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f0f0f0;
  border: 1px solid #e0e0e0;
  cursor: pointer;
  font-size: 12px;
  padding: 0;
  color: #555;
}

.number-control-btn:first-child {
  border-radius: 4px 4px 0 0;
  border-bottom: none;
}

.number-control-btn:last-child {
  border-radius: 0 0 4px 4px;
}

.number-control-btn:hover {
  background-color: #e0e0e0;
}

@media (max-width: 600px) {
  .customization-fields {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 12px;
  }
  
  .card-header {
    padding: 12px 16px;
  }
  
  .customization-fields-container {
    padding: 12px;
  }
}
</style> 