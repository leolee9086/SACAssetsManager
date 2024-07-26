<template>
    <template v-if="true" @dragover.prevent="handleDragOver" @dragleave="handleDragLeave" @drop.prevent="handleDrop">
      <slot></slot>
    </template>
  </template>
  <script setup>
  function handleDragOver(event) {
    // Add any additional logic for drag over event
  }
  
  function handleDragLeave(event) {
    // Add any additional logic for drag leave event
  }
  

  </script>