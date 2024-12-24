<template>
  <input 
    type="text" 
    :value="modelValue"
    class="property-input"
    @input="$emit('update:modelValue', $event.target.value)"
    @change="$emit('change')"
  >
</template>

<script setup>
defineProps({
  modelValue: String
})
defineEmits(['update:modelValue', 'change'])
</script> 