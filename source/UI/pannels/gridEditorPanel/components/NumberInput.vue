<template>
  <div class="number-input-wrapper" :class="{ 'invalid': !isValid }">
    <input 
      type="number" 
      :value="displayValue"
      class="property-input"
      :min="min"
      :max="max"
      @input="handleInput"
      @change="handleChange"
    >
    <div class="number-controls">
      <button @click="$emit('adjust', 1)" :disabled="!isValid">▲</button>
      <button @click="$emit('adjust', -1)" :disabled="!isValid">▼</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: Number,
  min: Number,
  max: Number
})

const emit = defineEmits(['update:modelValue', 'change', 'adjust'])

const isValid = computed(() => {
  return !isNaN(props.modelValue) && props.modelValue !== undefined
})

const displayValue = computed(() => {
  return isValid.value ? props.modelValue : ''
})

const handleInput = (event) => {
  const value = event.target.value === '' ? undefined : Number(event.target.value)
  emit('update:modelValue', value)
}

const handleChange = (event) => {
  const value = event.target.value === '' ? undefined : Number(event.target.value)
  emit('update:modelValue', value)
  emit('change')
}
</script>

<style scoped>
.number-input-wrapper {
  display: flex;
  align-items: center;
  border: var(--cc-border-width) solid var(--cc-border-color);
  border-radius: var(--cc-border-radius);
  background: var(--cc-theme-surface-lighter);
  overflow: hidden;
}

.number-input-wrapper.invalid {
  border-color: var(--cc-theme-error, #ff4444);
  background: var(--cc-theme-error-light, #ffeeee);
}

.property-input {
  padding: var(--cc-space-sm);
  border: none;
  background: transparent;
  color: var(--cc-theme-on-background);
  text-align: center;
  -webkit-appearance: textfield;
  -moz-appearance: textfield;
  appearance: textfield;
  flex: 1;
}

.invalid .property-input {
  color: var(--cc-theme-error, #ff4444);
}

.property-input::-webkit-outer-spin-button,
.property-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.property-input:focus {
  outline: none;
}

.number-controls {
  display: flex;
  flex-direction: column;
  border-left: var(--cc-border-width) solid var(--cc-border-color);
}

.invalid .number-controls {
  border-left-color: var(--cc-theme-error, #ff4444);
}

.number-controls button {
  border: none;
  background: transparent;
  color: var(--cc-theme-on-surface);
  padding: var(--cc-space-xs) var(--cc-space-sm);
  cursor: pointer;
  transition: var(--cc-transition);
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.number-controls button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.invalid .number-controls button {
  color: var(--cc-theme-error, #ff4444);
}

.number-controls button:hover:not(:disabled) {
  background: var(--cc-theme-surface-light);
  color: var(--cc-theme-on-background);
}

.invalid .number-controls button:hover:not(:disabled) {
  background: var(--cc-theme-error-light, #ffeeee);
  color: var(--cc-theme-error, #ff4444);
}

.number-controls button:first-child {
  border-bottom: var(--cc-border-width) solid var(--cc-border-color);
}

.invalid .number-controls button:first-child {
  border-bottom-color: var(--cc-theme-error, #ff4444);
}
</style> 