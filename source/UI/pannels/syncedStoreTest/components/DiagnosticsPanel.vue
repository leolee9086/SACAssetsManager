<template>
  <div class="diagnostics">
    <h3>连接诊断</h3>
    <button @click="handleRefresh">刷新诊断</button>
    <pre>{{ diagnosticInfo }}</pre>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'

defineProps({
  diagnosticInfo: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['refresh'])

const handleRefresh = () => {
  emit('refresh')
}
</script>

<style scoped>
.diagnostics {
  margin-bottom: 20px;
}

.diagnostics h3 {
  margin-bottom: 10px;
}

.diagnostics button {
  margin-bottom: 10px;
  padding: 5px 10px;
  border-radius: 4px;
  border: 1px solid #ddd;
  background: #fff;
  cursor: pointer;
}

.diagnostics pre {
  background: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  overflow: auto;
  font-family: monospace;
  font-size: 12px;
  max-height: 200px;
}
</style> 