<template>
  <div class="block__icons">
    <slot></slot>
  </div>
</template>

<style scoped>
/* 基础样式会从思源的CSS中继承 */
.block__icons {
  padding: 4px 8px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--b3-border-color);
  background-color: var(--b3-theme-background);
}
</style> 