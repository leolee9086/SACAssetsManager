<template>
  <div 
    class="b3-tooltips b3-tooltips__n fn__flex-center" 
    :aria-label="modelValue.toString()"
  >
    <input 
      class="b3-slider"
      :class="size ? `fn__size${size}` : ''"
      type="range"
      :min="min"
      :max="max"
      :step="step"
      :value="modelValue"
      @input="handleInput"
      @change="handleChange"
      :disabled="disabled"
    />
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: 0
  },
  min: {
    type: [String, Number],
    default: 0
  },
  max: {
    type: [String, Number],
    default: 100
  },
  step: {
    type: [String, Number],
    default: 1
  },
  size: {
    type: [String, Number],
    default: 200
  },
  disabled: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'input', 'change']);

const handleInput = (event) => {
  const value = event.target.value;
  event.target.parentElement.setAttribute("aria-label", value);
  emit('update:modelValue', value);
  emit('input', value);
};

const handleChange = (event) => {
  emit('change', event.target.value);
};
</script>

<style scoped>
/* 样式会从思源的CSS中继承 */
</style> 