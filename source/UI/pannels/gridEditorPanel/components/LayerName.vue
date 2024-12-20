<template>
  <span class="layer-name">{{ name }}</span>
</template>

<script setup>
defineProps({
  name: {
    type: String,
    default: ''
  }
})
</script> 