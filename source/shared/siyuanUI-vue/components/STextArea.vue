<template>
  <textarea 
    class="b3-text-field"
    :class="[
      block ? 'fn__block' : '',
      disabled ? 'b3-text-field--disabled' : ''
    ]"
    :value="modelValue"
    @input="handleInput"
    :placeholder="placeholder"
    :disabled="disabled"
    :spellcheck="spellcheck"
  ></textarea>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  block: {
    type: Boolean,
    default: false
  },
  placeholder: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  },
  spellcheck: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'input']);

const handleInput = (event) => {
  emit('update:modelValue', event.target.value);
  emit('input', event.target.value);
};
</script>

<style scoped>
/* 样式会从思源的CSS中继承 */
</style> 