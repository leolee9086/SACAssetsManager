<template>
  <button class="visibility-toggle" @click.stop="$emit('toggle')">
    <svg width="16" height="16">
      <use :href="visible ? '#iconVisible' : '#iconHidden'" />
    </svg>
  </button>
</template>

<script setup>
defineProps({
  visible: Boolean
})
</script> 