<template>
  <div class="number-input-wrapper">
    <input 
      type="number" 
      :value="modelValue"
      class="property-input"
      :min="min"
      :max="max"
      @input="$emit('update:modelValue', $event.target.value)"
      @change="$emit('change')"
    >
    <div class="number-controls">
      <button @click="$emit('adjust', 1)">▲</button>
      <button @click="$emit('adjust', -1)">▼</button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  modelValue: Number,
  min: Number,
  max: Number
})
defineEmits(['update:modelValue', 'change', 'adjust'])
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

.property-input {
  padding: var(--cc-space-sm);
  border: none;
  background: transparent;
  color: var(--cc-theme-on-background);
  text-align: center;
  /* 隐藏原生箭头 - Chrome, Safari, Edge, Opera */
  -webkit-appearance: textfield;
  -moz-appearance: textfield;
  appearance: textfield;
  flex:1

}

/* 隐藏原生箭头 - Firefox */
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

.number-controls button:hover {
  background: var(--cc-theme-surface-light);
  color: var(--cc-theme-on-background);
}

.number-controls button:first-child {
  border-bottom: var(--cc-border-width) solid var(--cc-border-color);
}
</style> 