<template>
  <div class="toolbar" :class="{'toolbar--border': border, 'toolbar--dark': dark}">
    <slot name="icon">
      <svg class="toolbar__icon"><use :xlink:href="iconHref"></use></svg>
    </slot>
    <span class="fn__flex-1 fn__flex-center toolbar__text" v-if="$slots.title">
      <slot name="title"></slot>
    </span>
    <slot></slot>
  </div>
</template>

<script setup>
const props = defineProps({
  border: {
    type: Boolean,
    default: false
  },
  dark: {
    type: Boolean,
    default: false
  },
  iconHref: {
    type: String,
    default: ''
  }
});
</script>

<style scoped>
/* 基础样式会从思源的CSS中继承 */
</style> 