<template>
  <div class="b3-label" :class="{'fn__flex': flex, 'config__item': isConfigItem}">
    <div :class="{'fn__flex-1': flex}">
      <slot name="title"></slot>
      <div v-if="description" class="b3-label__text">
        <slot name="description">{{ description }}</slot>
      </div>
    </div>
    <span v-if="flex" class="fn__space"></span>
    <slot></slot>
  </div>
</template>

<script setup>
defineProps({
  flex: {
    type: Boolean,
    default: true
  },
  description: {
    type: String,
    default: ''
  },
  isConfigItem: {
    type: Boolean,
    default: false
  }
});
</script> 