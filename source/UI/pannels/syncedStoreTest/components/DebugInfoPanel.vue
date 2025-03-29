<template>
  <div class="debug-info">
    <h3>调试信息</h3>
    <pre>{{ formattedDebugInfo }}</pre>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  debugInfo: {
    type: Object,
    default: () => ({})
  }
})

// 格式化调试信息显示
const formattedDebugInfo = computed(() => {
  try {
    return JSON.stringify(props.debugInfo, null, 2)
  } catch (err) {
    return `格式化错误: ${err.message}`
  }
})
</script>

<style scoped>
.debug-info {
  margin-top: 20px;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 4px;
}

.debug-info h3 {
  margin-bottom: 10px;
}

.debug-info pre {
  white-space: pre-wrap;
  word-break: break-all;
  font-family: monospace;
  font-size: 12px;
  max-height: 200px;
  overflow: auto;
}
</style> 