<template>
    <img :src="currentSrc" v-bind="$attrs" />
  </template>
  
  <script setup>
  import { ref, watch, onMounted } from 'vue';
  
  const props = defineProps({
    src: {
      type: Array,
      required: true
    },
    mode: {
      type: String,
      default: 'sequential', // 'sequential' or 'parallel'
      validator: value => ['sequential', 'parallel'].includes(value)
    }
  });
  
  const currentSrc = ref('');
  const loadImage = (src) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(src);
      img.onerror = () => reject(src);
      img.src = src;
    });
  };
  
  const loadSequentially = async (srcArray) => {
    for (const src of srcArray) {
      try {
        currentSrc.value = await loadImage(src);
        break;
      } catch (error) {
        console.warn(`Failed to load image: ${src}`);
      }
    }
  };
  
  const loadInParallel = (srcArray) => {
    Promise.any(srcArray.map(loadImage))
      .then(src => {
        currentSrc.value = src;
      })
      .catch(errors => {
        console.warn('All images failed to load', errors);
      });
  };
  
  const loadImages = () => {
    if (props.mode === 'sequential') {
      loadSequentially(props.src);
    } else {
      loadInParallel(props.src);
    }
  };
  
  onMounted(loadImages);
  watch(() => props.src, loadImages);
  </script>