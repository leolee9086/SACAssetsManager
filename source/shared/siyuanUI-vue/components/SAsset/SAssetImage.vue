<template>
  <span contenteditable="false" data-type="img" class="img">
    <span> </span>
    <span>
      <span class="protyle-action protyle-icons">
        <span class="protyle-icon protyle-icon--only">
          <svg><use xlink:href="#iconMore"></use></svg>
        </span>
      </span>
      <img :src="src" :data-src="src" :alt="alt" />
      <span class="protyle-action__drag"></span>
      <span class="img__net" v-if="isExternalImage">
        <svg><use xlink:href="#iconLanguage"></use></svg>
      </span>
      <span class="protyle-action__title"></span>
    </span>
    <span> </span>
  </span>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  src: {
    type: String,
    required: true
  },
  alt: {
    type: String,
    default: ''
  }
});

const isExternalImage = computed(() => {
  return !props.src.startsWith('assets/');
});
</script> 