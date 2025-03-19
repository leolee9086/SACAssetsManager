<template>
  <div class="add-provider-button" @click="$emit('add')">
    <span class="add-icon">+</span>
    <span>添加供应商地址</span>
  </div>
</template>

<script setup>
defineEmits(['add'])
</script>

<style scoped>
.add-provider-button {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border: 2px dashed #ccc;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  cursor: pointer;
  transition: all 0.3s;
  gap: 10px;
}

.add-provider-button:hover {
  background: #e0e0e0;
  border-color: #1890ff;
  color: #1890ff;
}

.add-icon {
  font-size: 20px;
  font-weight: bold;
}
</style> 