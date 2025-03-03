<template>
  <div 
    class="b3-tooltips" 
    :class="`b3-tooltips__${direction}`" 
    :aria-label="text"
  >
    <slot></slot>
  </div>
</template>

<script setup>
const props = defineProps({
  text: {
    type: String,
    required: true
  },
  direction: {
    type: String,
    default: 'sw',
    validator: (value) => ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].includes(value)
  }
});
</script>

<style scoped>
/* 
提示框位置:
- 默认: 无方向
- b3-tooltips__n: 北/上方
- b3-tooltips__s: 南/下方
- b3-tooltips__e: 东/右方
- b3-tooltips__w: 西/左方
*/
</style> 