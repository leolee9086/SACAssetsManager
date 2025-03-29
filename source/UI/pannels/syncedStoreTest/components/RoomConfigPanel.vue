<template>
  <div class="room-config">
    <div class="room-input">
      <input 
        v-model="currentRoomName"
        placeholder="输入房间名称"
        @keyup.enter="handleRoomChange"
      >
      <button @click="handleRoomChange">进入房间</button>
    </div>
    <div class="siyuan-config">
      <label>
        <input 
          type="checkbox"
          v-model="localSiyuanConfig.enabled"
          @change="handleSiyuanConfigChange"
        >
        启用思源同步
      </label>
      <input 
        v-if="localSiyuanConfig.enabled"
        v-model.number="localSiyuanConfig.port"
        type="number"
        placeholder="思源端口"
        @change="handleSiyuanConfigChange"
      >
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watchEffect } from 'vue'

const props = defineProps({
  roomName: {
    type: String,
    default: 'test-room'
  },
  siyuanConfig: {
    type: Object,
    default: () => ({
      enabled: false,
      port: 6806,
      host: '127.0.0.1',
      channel: 'sync-test',
      token: 'xqatmtk3jfpchiah'
    })
  }
})

const emit = defineEmits(['change'])

// 本地状态
const currentRoomName = ref(props.roomName)
const localSiyuanConfig = reactive({ ...props.siyuanConfig })

// 从props更新本地状态
watchEffect(() => {
  currentRoomName.value = props.roomName
  
  // 深拷贝更新siyuan配置
  Object.assign(localSiyuanConfig, props.siyuanConfig)
})

// 处理房间变更
const handleRoomChange = () => {
  emit('change', {
    roomName: currentRoomName.value,
    siyuanConfig: { ...localSiyuanConfig }
  })
}

// 处理思源配置变更
const handleSiyuanConfigChange = () => {
  emit('change', {
    roomName: currentRoomName.value,
    siyuanConfig: { ...localSiyuanConfig }
  })
}
</script>

<style scoped>
.room-config {
  margin-bottom: 20px;
}

.room-input {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.room-input input {
  flex: 1;
  padding: 5px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.siyuan-config {
  display: flex;
  gap: 10px;
  align-items: center;
}

.siyuan-config input[type="number"] {
  width: 80px;
  padding: 5px;
  border: 1px solid #ddd;
  border-radius: 4px;
}
</style> 