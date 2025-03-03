<template>
  <span 
    :data-type="type" 
    class="block__icon" 
    :class="tooltipClass"
    :aria-label="ariaLabel"
    @click="$emit('click', $event)"
  >
    <svg><use :xlink:href="iconHref"></use></svg>
  </span>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  type: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    required: true
  },
  tooltip: {
    type: String,
    default: ''
  },
  tooltipDirection: {
    type: String,
    default: 'sw',
    validator: (value) => ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].includes(value)
  },
  hotkeyTip: {
    type: String,
    default: ''
  }
});

defineEmits(['click']);

const iconHref = computed(() => {
  return `#icon${props.icon}`;
});

const tooltipClass = computed(() => {
  return props.tooltip ? `b3-tooltips b3-tooltips__${props.tooltipDirection}` : '';
});

const ariaLabel = computed(() => {
  return props.hotkeyTip ? `${props.tooltip} ${props.hotkeyTip}` : props.tooltip;
});
</script>

<style scoped>
/* 基础样式会从思源的CSS中继承 */
.block__icon {
  padding: 4px;
  border-radius: 4px;
  cursor: pointer;
  color: var(--b3-theme-on-surface);
}

.block__icon:hover {
  background-color: var(--b3-theme-background-hover);
}
</style> 