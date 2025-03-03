<template>
  <input
    type="number"
    class="b3-text-field fn__block"
    :min="min"
    :max="max"
    :step="step"
    :value="modelValue"
    :disabled="disabled"
    @input="handleInput"
    @change="handleChange"
  />
</template>

<script setup>
const props = defineProps({
  modelValue: {
    type: [Number, String],
    default: 0
  },
  min: {
    type: Number,
    default: undefined
  },
  max: {
    type: Number,
    default: undefined
  },
  step: {
    type: Number,
    default: 1
  },
  disabled: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'change']);

const handleInput = (event) => {
  emit('update:modelValue', Number(event.target.value));
};

const handleChange = (event) => {
  emit('change', Number(event.target.value));
};
</script>

<style scoped>
/* 基础样式会从思源的CSS中继承 */
</style> 