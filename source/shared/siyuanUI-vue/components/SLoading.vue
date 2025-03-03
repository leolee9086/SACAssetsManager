<template>
  <div class="fn__loading" :class="{'fn__none': !show}">
    <img width="64px" src="/stage/loading-pure.svg">
  </div>
</template>

<script setup>
const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
});
</script> 