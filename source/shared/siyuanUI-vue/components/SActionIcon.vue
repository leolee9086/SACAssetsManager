<template>
  <span 
    :data-type="type" 
    class="block__icon" 
    :class="tooltipClass" 
    :aria-label="tooltip"
    @click="$emit('click', $event)"
  >
    <svg><use :xlink:href="`#icon${icon}`"></use></svg>
  </span>
</template>

<script setup>
const props = defineProps({
  type: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    required: true
  },
  tooltip: String,
  tooltipPosition: {
    type: String,
    default: 'sw'
  }
});

defineEmits(['click']);

const tooltipClass = computed(() => {
  return props.tooltip ? `b3-tooltips b3-tooltips__${props.tooltipPosition}` : '';
});
</script>

<script>
import { computed } from 'vue';
export default {
  name: 'SActionIcon'
};
</script> 