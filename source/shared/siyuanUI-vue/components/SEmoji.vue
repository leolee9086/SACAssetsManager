<template>
  <span class="b3-list-item__icon" :class="customClass">
    {{ emoji }}
  </span>
</template>

<script setup>
defineProps({
  emoji: {
    type: String,
    required: true
  },
  customClass: {
    type: String,
    default: ''
  }
});
</script> 