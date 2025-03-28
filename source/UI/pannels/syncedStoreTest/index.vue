<template>
  <div class="editor-container">
    <div class="controls">
      <h1>同步编辑器</h1>
      <div class="sync-controls">
        <label class="toggle-switch">
          <input type="checkbox" v-model="autoSyncEnabled" @change="toggleAutoSync">
          <span class="switch-slider"></span>
          <span class="switch-label">{{ autoSyncEnabled ? '自动同步已启用' : '自动同步已禁用' }}</span>
        </label>
        
        <div v-if="autoSyncEnabled" class="sync-settings">
          <label>智能同步: 
            <select v-model="adaptiveMode" @change="updateSyncSettings">
              <option :value="true">启用</option>
              <option :value="false">禁用</option>
            </select>
          </label>
          
          <label v-if="!adaptiveMode">同步间隔: 
            <select v-model="syncInterval" @change="updateSyncSettings">
              <option :value="2000">2秒</option>
              <option :value="5000">5秒</option>
              <option :value="10000">10秒</option>
              <option :value="30000">30秒</option>
            </select>
          </label>
          
          <div v-if="adaptiveMode && autoSyncStatus && autoSyncStatus.currentInterval" class="adaptive-info">
            <span>当前间隔: {{ Math.round(autoSyncStatus.currentInterval / 1000) }}秒</span>
            <span v-if="autoSyncStatus.changeFrequency">变更频率: {{ autoSyncStatus.changeFrequency }}/分钟</span>
            <span v-if="autoSyncStatus.networkStatus">网络延迟: {{ autoSyncStatus.networkStatus.latency }}ms</span>
          </div>
        </div>
      </div>
      <div v-if="errorMessage" class="error-message">
        <span>{{ errorMessage }}</span>
        <button @click="errorMessage = ''" class="clear-error">✕</button>
      </div>
      <div class="room-control">
        <input v-model="sharedRoomId" placeholder="输入房间ID" />
        <button @click="connect">连接房间</button>
        <span class="room-info">当前房间: {{ sharedRoomId }}</span>
      </div>
    </div>
    
    <div class="editor-frame">
      <div class="connection-status">
        <div :class="['status-indicator', isConnected ? 'connected' : 'disconnected']"></div>
        <span>状态: {{ status }}</span>
      </div>
      
      <div class="document-editor">
        <div class="form-group">
          <label>标题:</label>
          <input v-model="store.title" placeholder="请输入文档标题" />
        </div>
        
        <div class="form-group">
          <label>内容:</label>
          <textarea 
            v-model="store.content" 
            placeholder="请输入文档内容..."
            rows="8"
          ></textarea>
        </div>
        
        <div class="form-group">
          <button @click="updateTimestamp">更新时间戳</button>
          <p v-if="store.lastEdited">
            最后编辑: {{ new Date(store.lastEdited).toLocaleString() }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useSyncStore, resetRoomConnection, setRoomAutoSync, getRoomAutoSyncStatus } from '../../../../src/toolBox/feature/useSyncedstore/useSyncstore.js'

// 基础状态
const generateRoomId = () => `room-${Math.random().toString(36).substring(2, 9)}`
const sharedRoomId = ref(generateRoomId())
const errorMessage = ref('')

// 编辑器状态
let syncStore = null
const store = ref({})
const isConnected = ref(false)
const status = ref('初始化中')
let cleanup = null

// 同步控制
const autoSyncEnabled = ref(false)
const syncInterval = ref(5000)
const adaptiveMode = ref(true)
const autoSyncStatus = ref(null)

// 连接函数
const connect = async () => {
  errorMessage.value = ''
  status.value = '正在连接...'
  
  if (cleanup) {
    cleanup()
    cleanup = null
  }
  
  if (syncStore) {
    syncStore.disconnect()
    syncStore = null
  }
  
  try {
    await resetRoomConnection(sharedRoomId.value)
    
    const result = await useSyncStore({
      roomName: sharedRoomId.value,
      initialState: {
        title: '新文档',
        content: '开始编辑...',
        lastEdited: Date.now()
      },
      persist: true,
      autoSync: {
        enabled: autoSyncEnabled.value,
        interval: syncInterval.value,
        adaptiveMode: adaptiveMode.value
      }
    })
    
    syncStore = result
    store.value = result.store
    isConnected.value = result.isConnected.value
    status.value = result.status.value
    
    const stopWatchStatus = watch(() => result.status.value, (newStatus) => {
      status.value = newStatus
    })
    
    const stopWatchConnection = watch(() => result.isConnected.value, (newConnected) => {
      isConnected.value = newConnected
    })
    
    cleanup = () => {
      stopWatchStatus()
      stopWatchConnection()
      if (syncStore) {
        syncStore.disconnect()
      }
    }
    
    updateAutoSyncStatus()
  } catch (e) {
    errorMessage.value = `连接失败: ${e.message || '未知错误'}`
  }
}

// 更新时间戳
const updateTimestamp = () => {
  if (store.value) {
    store.value.lastEdited = Date.now()
  }
}

// 其他必要函数保持不变
const toggleAutoSync = async (value) => {
  try {
    autoSyncEnabled.value = typeof value === 'boolean' ? value : autoSyncEnabled.value
    if (syncStore) {
      await setRoomAutoSync(sharedRoomId.value, {
        enabled: autoSyncEnabled.value,
        interval: syncInterval.value
      })
      updateAutoSyncStatus()
    }
  } catch (e) {
    errorMessage.value = `设置自动同步失败: ${e.message}`
  }
}

const updateSyncSettings = async () => {
  if (syncStore && autoSyncEnabled.value) {
    await setRoomAutoSync(sharedRoomId.value, {
      enabled: autoSyncEnabled.value,
      interval: syncInterval.value,
      adaptiveMode: adaptiveMode.value
    })
    updateAutoSyncStatus()
  }
}

const updateAutoSyncStatus = async () => {
  if (syncStore) {
    autoSyncStatus.value = await getRoomAutoSyncStatus(sharedRoomId.value)
  }
}

// 组件生命周期
onMounted(async () => {
  await connect()
})

onUnmounted(() => {
  if (cleanup) cleanup()
})
</script>

<style scoped>
.editor-container {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.controls {
  margin-bottom: 20px;
  padding: 15px;
  background-color: #f0f7ff;
  border-radius: 8px;
  text-align: center;
}

.room-control {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.room-info {
  font-weight: bold;
  color: #1976d2;
}

.editor-frame {
  border-radius: 5px;
  overflow: hidden;
}

h1, h2 {
  text-align: center;
  color: #333;
}

.connection-status {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  padding: 10px;
  background-color: #f5f5f5;
  border-radius: 4px;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-right: 10px;
}

.connected {
  background-color: #4caf50;
  box-shadow: 0 0 5px #4caf50;
}

.disconnected {
  background-color: #f44336;
  box-shadow: 0 0 5px #f44336;
}

.document-editor {
  padding: 15px;
  background-color: white;
  border-radius: 4px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.form-group {
  margin-bottom: 15px;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: #333;
}

input, textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

button {
  background-color: #1976d2;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

button:hover {
  background-color: #1565c0;
}

.sync-controls {
  margin: 15px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
}

.toggle-switch {
  position: relative;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.switch-slider {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
  background-color: #ccc;
  border-radius: 24px;
  transition: .4s;
  margin-right: 10px;
}

.switch-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  border-radius: 50%;
  transition: .4s;
}

input:checked + .switch-slider {
  background-color: #4CAF50;
}

input:checked + .switch-slider:before {
  transform: translateX(26px);
}

.switch-label {
  font-weight: 500;
}

.sync-settings {
  display: flex;
  align-items: center;
  gap: 10px;
}

.error-message {
  margin: 10px 0;
  padding: 10px 15px;
  background-color: #ffebee;
  color: #d32f2f;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
}

.clear-error {
  background: transparent;
  color: #d32f2f;
  border: none;
  font-size: 16px;
  cursor: pointer;
  padding: 0 5px;
}

.clear-error:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

/* 添加智能同步相关样式 */
.adaptive-info {
  display: flex;
  flex-direction: column;
  background-color: #f0f4ff;
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 12px;
  margin-left: 10px;
}

.last-sync-time {
  font-size: 11px;
  color: #666;
  margin-left: 8px;
}
</style>