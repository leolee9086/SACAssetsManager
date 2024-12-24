<template>
  <div class="color-input-wrapper">
    <input 
      type="color" 
      :value="modelValue"
      class="property-input color-input"
      @input="$emit('update:modelValue', $event.target.value)"
      @change="$emit('change')"
    >
    <input 
      type="text" 
      :value="modelValue"
      class="property-input color-text"
      @input="$emit('update:modelValue', $event.target.value)"
      @change="$emit('change')"
    >
  </div>
</template>

<script setup>
defineProps({
  modelValue: String
})
defineEmits(['update:modelValue', 'change'])
</script> 