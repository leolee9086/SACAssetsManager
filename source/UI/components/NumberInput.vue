<template>
  <div class="number-input">
    <button class="control-btn" @click="decrease">-</button>
    <span class="value">{{ displayValue }}</span>
    <button class="control-btn" @click="increase">+</button>
  </div>
</template>

<script setup>
import { computed } from 'vue';

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
    default: Infinity
  },
  step: {
    type: Number,
    default: 1
  },
  unit: {
    type: String,
    default: ''
  },
  precision: {
    type: Number,
    default: 0
  }
});

const emit = defineEmits(['update:modelValue']);

const displayValue = computed(() => {
  const formatted = props.modelValue.toFixed(props.precision);
  return `${formatted}${props.unit}`;
});

const increase = () => {
  const newValue = Math.min(props.modelValue + props.step, props.max);
  emit('update:modelValue', newValue);
};

const decrease = () => {
  const newValue = Math.max(props.modelValue - props.step, props.min);
  emit('update:modelValue', newValue);
};
</script>

<style scoped>
.number-input {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-btn {
  padding: 4px 8px;
  border: 1px solid var(--cc-border-color);
  background: transparent;
  cursor: pointer;
  border-radius: 4px;
}

.control-btn:hover {
  background: var(--cc-bg-hover);
}

.value {
  min-width: 60px;
  text-align: center;
  font-size: 13px;
}
</style> 