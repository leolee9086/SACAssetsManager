<template>
  <div class="sync-config">
    <h3>同步配置</h3>
    <div class="sync-controls">
      <label>
        <input 
          type="checkbox"
          v-model="localEnabled"
          @change="handleConfigChange"
        >
        启用自动同步
      </label>
      <input 
        type="number"
        v-model.number="localInterval"
        :disabled="!localEnabled"
        @change="handleConfigChange"
      >
      <span>ms</span>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  enabled: {
    type: Boolean,
    default: true
  },
  interval: {
    type: Number,
    default: 1000
  }
})

const emit = defineEmits(['change'])

// 本地状态
const localEnabled = ref(props.enabled)
const localInterval = ref(props.interval)

// 监听属性变化
watch(() => props.enabled, (newValue) => {
  localEnabled.value = newValue
})

watch(() => props.interval, (newValue) => {
  localInterval.value = newValue
})

// 处理配置变更
const handleConfigChange = () => {
  emit('change', {
    enabled: localEnabled.value,
    interval: localInterval.value
  })
}
</script>

<style scoped>
.sync-config {
  margin-bottom: 20px;
}

.sync-config h3 {
  margin-bottom: 10px;
}

.sync-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sync-controls input[type="number"] {
  width: 80px;
  padding: 5px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.sync-controls input[type="checkbox"] {
  margin-right: 4px;
}

.sync-controls input[disabled] {
  opacity: 0.5;
  cursor: not-allowed;
}
</style> 