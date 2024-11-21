<template>
<span>
    <svg class="api-icon" :class="{ 'api-icon--enabled': props.apiEnabled }">
        <use xlink:href="#iconSearch"></use>
    </svg>
</span>
</template>

<script setup>
const props = defineProps(['apiEnabled','apiLocation'])
</script>

<style scoped>
.api-icon {

  /* 使用全局变量替换局部变量 */
  width: var(--cc-size-icon-lg);
  height: var(--cc-size-icon-lg);
  color: var(--cc-icon-color-default);
  transition: var(--cc-color-transition);
}

.api-icon--enabled {
  color: var(--cc-icon-color-enabled);
}

.api-icon:hover {
  opacity: var(--cc-opacity-hover);
}

.api-icon:active {
  transform: scale(var(--cc-scale-active));
}
</style>