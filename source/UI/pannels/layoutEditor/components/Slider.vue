<template>
  <div class="slider-container" :style="{ gap: gap + 'px' }">
    <div v-if="label" class="slider-label">{{ label }}</div>
    <input
      type="range"
      :min="min"
      :max="max"
      :step="step"
      :value="validValue"
      @input="updateValue"
      :class="{ 'invalid': !isValid }"
      class="range-input"
      :style="{
        height: `${trackHeight}px`,
        '--thumb-size': `${thumbSize}px`,
      }"
    />
    <div 
      class="slider-value"
      :class="{ 'invalid': !isValid }"
    >
      {{ displayValue }}{{ unit }}
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: Number,
    required: true
  },
  min: {
    type: Number,
    default: 0
  },
  max: {
    type: Number,
    default: 100
  },
  step: {
    type: Number,
    default: 1
  },
  label: {
    type: String,
    default: ''
  },
  unit: {
    type: String,
    default: ''
  },
  gap: {
    type: Number,
    default: 8
  },
  trackHeight: {
    type: Number,
    default: 4
  },
  thumbSize: {
    type: Number,
    default: 16
  }
})

const emit = defineEmits(['update:modelValue'])

// 检查值是否有效
const isValid = computed(() => {
  return !isNaN(props.modelValue) && props.modelValue !== undefined
})

// 获取有效值，如果无效则使用最小值
const validValue = computed(() => {
  return isValid.value ? props.modelValue : props.min
})

// 显示值
const displayValue = computed(() => {
  return isValid.value ? props.modelValue : '无效值'
})

const updateValue = (event) => {
  emit('update:modelValue', Number(event.target.value))
}
</script>

<style scoped>
.slider-container {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.slider-value {
  min-width: 40px;
  text-align: right;
  font-size: 12px;
  color: var(--cc-theme-on-background-muted, #666666);
}

.slider-value.invalid {
  color: var(--cc-theme-error, #ff4444);
}

.range-input {
  -webkit-appearance: none;
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: var(--cc-border-color, #e0e0e0);
  outline: none;
}

.range-input.invalid {
  background: var(--cc-theme-error-light, #ffeeee);
}

.range-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--cc-theme-primary, #4a90e2);
  cursor: pointer;
}

.range-input.invalid::-webkit-slider-thumb {
  background: var(--cc-theme-error, #ff4444);
}

.range-input::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--cc-theme-primary, #4a90e2);
  cursor: pointer;
  border: none;
}

.range-input.invalid::-moz-range-thumb {
  background: var(--cc-theme-error, #ff4444);
}

.slider-label {
  font-size: 12px;
  color: var(--cc-theme-on-background-muted, #666666);
  white-space: nowrap;
}

.range-input::-webkit-slider-thumb {
  width: var(--thumb-size);
  height: var(--thumb-size);
}

.range-input::-moz-range-thumb {
  width: var(--thumb-size);
  height: var(--thumb-size);
}
</style> 