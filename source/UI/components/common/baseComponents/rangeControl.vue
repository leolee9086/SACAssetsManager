<template>
  <div class="control-group">
    <span>{{ label }}:</span>
    <input 
      type="range" 
      :value="modelValue" 
      @input="$emit('update:modelValue', Number($event.target.value))"
      :min="min"
      :max="max"
      :step="step"
    >
    <span>{{ modelValue }}{{ unit }}</span>
  </div>
</template>

<script setup>
defineProps({
  label: String,
  modelValue: Number,
  min: Number,
  max: Number,
  step: Number,
  unit: {
    type: String,
    default: ''
  }
})

defineEmits(['update:modelValue'])
</script>
