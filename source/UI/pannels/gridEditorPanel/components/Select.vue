<template>
  <select 
    class="property-select"
    :value="modelValue"
    @change="handleChange"
  >
    <option 
      v-for="option in normalizedOptions" 
      :key="option.value" 
      :value="option.value"
    >
      {{ option.label }}
    </option>
  </select>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: [String, Number],
    required: true
  },
  // 支持多种选项格式
  options: {
    type: Array,
    required: true,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

// 标准化选项格式
const normalizedOptions = computed(() => {
  return props.options.map(option => {
    if (typeof option === 'object') {
      return option
    }
    return {
      label: option.toString(),
      value: option
    }
  })
})

const handleChange = (event) => {
  const value = event.target.value
  emit('update:modelValue', value)
  emit('change', value)
}
</script>

<style scoped>
.property-select {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid var(--cc-border-color, #e0e0e0);
  border-radius: 4px;
  background: var(--cc-theme-surface-light, #ffffff);
  color: var(--cc-theme-on-background, #333333);
  font-size: 14px;
  margin-bottom: 8px;
}
</style> 