<template>
  <button 
    class="b3-button b3-button--text" 
    :class="[
      type ? `b3-button--${type}` : '',
      tooltipDirection ? `b3-tooltips b3-tooltips__${tooltipDirection}` : '',
      disabled ? 'b3-button--disabled' : ''
    ]"
    @click="handleClick"
    :disabled="disabled"
    :aria-label="tooltip"
  >
    <svg><use :xlink:href="`#icon${icon}`"></use></svg>
  </button>
</template>

<script setup>
const props = defineProps({
  icon: {
    type: String,
    required: true
  },
  type: {
    type: String,
    default: '',
    validator: (value) => ['', 'text', 'cancel', 'error', 'primary'].includes(value)
  },
  tooltip: {
    type: String,
    default: ''
  },
  tooltipDirection: {
    type: String,
    default: '',
    validator: (value) => ['', 'n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'].includes(value)
  },
  disabled: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['click']);

const handleClick = (event) => {
  if (!props.disabled) {
    emit('click', event);
  }
};
</script>

<style scoped>
/* 基础样式会从思源的CSS中继承 */
</style> 