<template>
  <button class="cc-panel-toolbar-button" @click="$emit('click')">
    <svg class="panel-toolbar-button-icon">
      <use :xlink:href="iconId"></use>
    </svg>
  </button>
</template>

<script setup>
defineProps({
  iconId: {
    type: String,
    required: true
  }
})

defineEmits(['click'])
</script> 