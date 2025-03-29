<template>
  <div class="connection-panel">
    <div class="status-display">
      <span class="status-dot" :class="{ 'connected': isConnected }"></span>
      状态: {{ status }}
      <span v-if="siyuanEnabled" class="siyuan-badge">思源已连接</span>
      <span v-if="localDataLoaded" class="local-data-badge">本地数据已加载</span>
    </div>
    <div class="connection-controls">
      <button @click="handleConnect" :disabled="isConnected">连接</button>
      <button @click="handleDisconnect" :disabled="!isConnected">断开</button>
      <button @click="handleReconnect">重连</button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  isConnected: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    default: '未连接'
  },
  siyuanEnabled: {
    type: Boolean,
    default: false
  },
  localDataLoaded: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['connect', 'disconnect', 'reconnect'])

const handleConnect = () => {
  emit('connect')
}

const handleDisconnect = () => {
  emit('disconnect')
}

const handleReconnect = () => {
  emit('reconnect')
}
</script>

<style scoped>
.connection-panel {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 4px;
}

.status-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ff4444;
  margin-right: 8px;
}

.status-dot.connected {
  background: #44ff44;
}

.siyuan-badge, .local-data-badge {
  background: #34c759;
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.8em;
  margin-left: 8px;
}
</style> 