<template>
  <div class="block__icons">
    <div class="block__logo">
      <svg class="block__logoicon"><use :xlink:href="`#icon${icon}`"></use></svg>
      {{ title }}
    </div>
    <span class="fn__flex-1 fn__space"></span>
    <slot></slot>
  </div>
</template>

<script setup>
defineProps({
  icon: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  }
});
</script> 