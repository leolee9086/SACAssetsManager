<template>
  <layout-item
    direction="row"
    :gap="gap"
    :align="align"
    :justify="justify"
    :wrap="wrap"
    :auto-grow="autoGrow"
    :fit="fit"
    :full="full"
    :width="width"
    :height="height"
  >
    <slot></slot>
  </layout-item>
</template>

<script setup>
import LayoutItem from './layoutItem.vue';

defineProps({
  gap: {
    type: [String, Number],
    default: 0
  },
  align: {
    type: String,
    default: 'center',
    validator: (value) => ['start', 'end', 'center', 'stretch', 'baseline'].includes(value)
  },
  justify: {
    type: String,
    default: 'flex-start',
    validator: (value) => [
      'flex-start', 
      'flex-end', 
      'center', 
      'space-between', 
      'space-around', 
      'space-evenly'
    ].includes(value)
  },
  wrap: {
    type: Boolean,
    default: false
  },
  autoGrow: {
    type: Boolean,
    default: undefined
  },
  fit: {
    type: Boolean,
    default: false
  },
  full: {
    type: Boolean,
    default: false
  },
  width: {
    type: [String, Number],
    default: undefined
  },
  height: {
    type: [String, Number],
    default: undefined
  }
});
</script>
