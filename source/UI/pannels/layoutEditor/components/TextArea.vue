<template>
  <textarea
    class="property-textarea"
    :value="modelValue"
    @input="$emit('update:modelValue', $event.target.value)"
    rows="4"
  ></textarea>
</template>

<script setup>
defineProps({
  modelValue: {
    type: String,
    required: true
  }
})

defineEmits(['update:modelValue'])
</script>

<style scoped>
.property-textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--cc-border-color, #e0e0e0);
  border-radius: 4px;
  background: var(--cc-theme-surface-light, #ffffff);
  color: var(--cc-theme-on-background, #333333);
  font-size: 14px;
  margin-bottom: 8px;
  resize: vertical;
  min-height: 80px;
  font-family: monospace;
}

.property-textarea:focus {
  outline: none;
  border-color: var(--cc-theme-primary, #4a90e2);
}
</style> 