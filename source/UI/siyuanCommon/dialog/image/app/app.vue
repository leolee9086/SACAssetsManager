<template>
    <ImageHistogram :imagePath="imagePath"></ImageHistogram>
</template>
<script setup>
import ImageHistogram from '../ImageHistogram.vue';
const imagePath = window.imagePath
</script>