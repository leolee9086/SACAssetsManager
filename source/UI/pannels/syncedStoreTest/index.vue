<template>
  <div class="dual-editor-container">
    <div class="controls">
      <h1>同步编辑器测试</h1>
      <div class="sync-controls">
        <label class="toggle-switch">
          <input type="checkbox" v-model="autoSyncEnabled" @change="toggleAutoSync">
          <span class="switch-slider"></span>
          <span class="switch-label">{{ autoSyncEnabled ? '自动同步已启用' : '自动同步已禁用' }}</span>
        </label>
        
        <div v-if="autoSyncEnabled" class="sync-settings">
          <label>同步间隔: 
            <select v-model="syncInterval" @change="updateSyncInterval">
              <option :value="2000">2秒</option>
              <option :value="5000">5秒</option>
              <option :value="10000">10秒</option>
              <option :value="30000">30秒</option>
            </select>
          </label>
        </div>
        
        <div class="sync-status" v-if="autoSyncStatus">
          <span :class="{'sync-active': autoSyncStatus.active}">
            {{ autoSyncStatus.active ? '同步活跃中' : '同步未活跃' }}
          </span>
        </div>
      </div>
      <div v-if="errorMessage" class="error-message">
        <span>{{ errorMessage }}</span>
        <button @click="errorMessage = ''" class="clear-error">✕</button>
      </div>
      <div class="room-control">
        <input v-model="sharedRoomId" placeholder="输入房间ID" />
        <button @click="connectBoth">连接到同一房间</button>
        <button @click="reconnectAll" class="reconnect-btn">重新连接</button>
        <span class="room-info">当前房间: {{ sharedRoomId }}</span>
      </div>
    </div>
    
    <div class="editors">
      <div class="editor-container">
        <h2>编辑器 A</h2>
        <div class="editor-frame">
          <div class="connection-status">
            <div :class="['status-indicator', isConnectedA ? 'connected' : 'disconnected']"></div>
            <span>状态: {{ statusA }}</span>
          </div>
          
          <div class="document-editor">
            <div class="form-group">
              <label>标题:</label>
              <input v-model="storeA.title" placeholder="请输入文档标题" />
            </div>
            
            <div class="form-group">
              <label>内容:</label>
              <textarea 
                v-model="storeA.content" 
                placeholder="请输入文档内容..."
                rows="8"
              ></textarea>
            </div>
            
            <div class="form-group">
              <button @click="updateTimestampA">更新时间戳</button>
              <p v-if="storeA.lastEdited">
                最后编辑: {{ new Date(storeA.lastEdited).toLocaleString() }}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div class="editor-container">
        <h2>编辑器 B</h2>
        <div class="editor-frame">
          <div class="connection-status">
            <div :class="['status-indicator', isConnectedB ? 'connected' : 'disconnected']"></div>
            <span>状态: {{ statusB }}</span>
          </div>
          
          <div class="document-editor">
            <div class="form-group">
              <label>标题:</label>
              <input v-model="storeB.title" placeholder="请输入文档标题" />
            </div>
            
            <div class="form-group">
              <label>内容:</label>
              <textarea 
                v-model="storeB.content" 
                placeholder="请输入文档内容..."
                rows="8"
              ></textarea>
            </div>
            
            <div class="form-group">
              <button @click="updateTimestampB">更新时间戳</button>
              <p v-if="storeB.lastEdited">
                最后编辑: {{ new Date(storeB.lastEdited).toLocaleString() }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="connection-actions">
      <button @click="checkConnectivity" class="diagnostic-btn">检查连接状态</button>
      <button @click="forceSync" class="sync-btn">强制同步</button>
      <button @click="toggleAutoSync(!autoSyncEnabled)" class="auto-sync-btn">
        {{ autoSyncEnabled ? '禁用自动同步' : '启用自动同步' }}
      </button>
    </div>
    
    <div v-if="diagnosticInfo" class="diagnostic-info">
      <h3>连接诊断信息</h3>
      <pre>{{ JSON.stringify(diagnosticInfo, null, 2) }}</pre>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useSyncStore, resetAllConnections, resetRoomConnection, forceSyncRoom, checkAndFixRoomConnection, setRoomAutoSync, getRoomAutoSyncStatus } from '../../../../src/toolBox/feature/useSyncedstore/sync-store.js'

// 生成随机房间ID
const generateRoomId = () => `room-${Math.random().toString(36).substring(2, 9)}`
const sharedRoomId = ref(generateRoomId())

// 编辑器A的状态
let syncStoreA = null
const storeA = ref({})
const isConnectedA = ref(false)
const statusA = ref('初始化中')

// 编辑器B的状态
let syncStoreB = null
const storeB = ref({})
const isConnectedB = ref(false)
const statusB = ref('初始化中')

// 添加诊断信息显示
const diagnosticInfo = ref(null)
// 添加错误信息显示
const errorMessage = ref('') 

// 添加清理函数声明
let cleanupA = null
let cleanupB = null

// 添加一个共享存储变量
let sharedSyncStore = null

// 添加自动同步控制变量
const autoSyncEnabled = ref(false)
const syncInterval = ref(5000)
const autoSyncStatus = ref(null)

// 修改连接逻辑
const connectBoth = async () => {
  // 重置错误信息
  errorMessage.value = ''
  
  // 显示连接状态
  statusA.value = '正在连接...'
  statusB.value = '正在连接...'
  
  // 清理现有连接
  if (cleanupA) {
    cleanupA()
    cleanupA = null
  }
  if (cleanupB) {
    cleanupB()
    cleanupB = null
  }
  
  if (syncStoreA) {
    syncStoreA.disconnect()
    syncStoreA = null
  }
  if (syncStoreB) {
    syncStoreB.disconnect()
    syncStoreB = null
  }
  
  // 清理共享存储
  if (sharedSyncStore) {
    sharedSyncStore.disconnect()
    sharedSyncStore = null
  }
  
  const currentRoomName = sharedRoomId.value
  
  // 确保连接断开后再连接
  await new Promise(resolve => setTimeout(resolve, 800))
  
  try {
    // 先重置房间连接
    await resetRoomConnection(currentRoomName)
    
    // 等待清理完成
    await new Promise(resolve => setTimeout(resolve, 800))
    
    // 创建单个共享连接
    const result = await useSyncStore({
      roomName: currentRoomName,
      initialState: {
        title: '新文档',
        content: '开始编辑你的协作文档...',
        lastEdited: Date.now()
      },
      persist: true,
      retryStrategy: {
        maxRetries: 8,
        initialDelay: 1000,
        maxDelay: 15000
      },
      autoSync: {
        enabled: autoSyncEnabled.value,
        interval: syncInterval.value,
        syncOnChange: true,
        heartbeatField: '_lastSyncTime'
      }
    })
    
    // 保存共享连接
    sharedSyncStore = result
    
    // 为两个编辑器设置相同的存储引用
    syncStoreA = result
    syncStoreB = result
    storeA.value = result.store
    storeB.value = result.store
    
    // 设置连接状态监听
    isConnectedA.value = result.isConnected.value
    statusA.value = result.status.value
    
    isConnectedB.value = result.isConnected.value
    statusB.value = result.status.value
    
    // 为A编辑器设置状态监听
    const stopWatchStatusA = watch(() => result.status.value, (newStatus) => {
      statusA.value = newStatus
    }, { immediate: true })
    
    const stopWatchConnectionA = watch(() => result.isConnected.value, (newConnected) => {
      isConnectedA.value = newConnected
      console.log(`编辑器A连接状态变更: ${newConnected ? '已连接' : '已断开'}`)
    }, { immediate: true })
    
    // 为B编辑器设置状态监听
    const stopWatchStatusB = watch(() => result.status.value, (newStatus) => {
      statusB.value = newStatus
    }, { immediate: true })
    
    const stopWatchConnectionB = watch(() => result.isConnected.value, (newConnected) => {
      isConnectedB.value = newConnected
      console.log(`编辑器B连接状态变更: ${newConnected ? '已连接' : '已断开'}`)
    }, { immediate: true })
    
    // 返回清理函数
    cleanupA = () => {
      stopWatchStatusA()
      stopWatchConnectionA()
    }
    
    cleanupB = () => {
      stopWatchStatusB()
      stopWatchConnectionB()
      // 只在B的清理函数中断开连接，避免重复断开
      if (sharedSyncStore) {
        try {
          sharedSyncStore.disconnect()
        } catch (e) {
          console.error('断开共享连接时出错:', e)
        }
        sharedSyncStore = null
      }
    }
    
    // 获取自动同步状态
    updateAutoSyncStatus()
    
    console.log('编辑器A和B已连接到共享房间:', currentRoomName)
  } catch (e) {
    errorMessage.value = `连接失败: ${e.message || '未知错误'}`
    console.error('连接房间失败:', e)
  }
}

// 更新时间戳
const updateTimestampA = () => {
  if (storeA.value) {
    storeA.value.lastEdited = Date.now()
  }
}

const updateTimestampB = () => {
  if (storeB.value) {
    storeB.value.lastEdited = Date.now()
  }
}

// 重连所有编辑器 - 改进重连逻辑
const reconnectAll = async () => {
  // 重置错误信息
  errorMessage.value = ''
  
  statusA.value = '正在重新连接...'
  statusB.value = '正在重新连接...'
  
  try {
    // 首先断开现有连接，但保留实例
    if (syncStoreA) {
      // 使用修复后的重连逻辑
      await syncStoreA.reconnect()
      console.log('编辑器A重连已发起')
    }
    
    if (syncStoreB) {
      // 使用修复后的重连逻辑
      await syncStoreB.reconnect()
      console.log('编辑器B重连已发起')
    }
    
    // 等待连接状态更新
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 检查连接状态
    setTimeout(checkConnectivity, 2000)
  } catch (e) {
    errorMessage.value = `重连失败: ${e.message || '未知错误'}`
    console.error('重连过程中出错:', e)
    
    // 如果重连失败，尝试完全重新初始化
    try {
      if (cleanupA) {
        cleanupA()
        cleanupA = null
      }
      if (cleanupB) {
        cleanupB()
        cleanupB = null
      }
      
      // 确保连接断开后再连接
      await new Promise(resolve => setTimeout(resolve, 800))
      
      cleanupA = await connectBoth()
    } catch (initError) {
      errorMessage.value = `完全重连失败: ${initError.message || '未知错误'}`
    }
  }
}

// 强制同步数据 - 使用核心库中的新方法
const forceSync = async () => {
  try {
    const success = forceSyncRoom(sharedRoomId.value)
    
    if (success) {
      console.log('已触发强制同步')
      updateAutoSyncStatus()
      alert('已触发强制同步，请检查内容是否一致')
    } else {
      errorMessage.value = '强制同步失败：无法访问房间'
    }
  } catch (e) {
    console.error('强制同步时出错:', e)
    errorMessage.value = `强制同步失败: ${e.message || '未知错误'}`
  }
}

// 检查连接状态 - 使用核心库中的新方法
const checkConnectivity = async () => {
  diagnosticInfo.value = null
  errorMessage.value = ''
  
  try {
    // 使用新的检查和修复方法
    const checkResult = await checkAndFixRoomConnection(sharedRoomId.value)
    
    // 如果状态有修复，更新UI状态
    if (checkResult.status === 'fixed' || checkResult.status === 'attempted_fix') {
      // 修复了状态不一致或尝试了重连
      if (syncStoreA) {
        isConnectedA.value = syncStoreA.isConnected.value
        statusA.value = syncStoreA.status.value
      }
      
      if (syncStoreB) {
        isConnectedB.value = syncStoreB.isConnected.value
        statusB.value = syncStoreB.status.value
      }
    }
    
    // 获取诊断信息
    const diagA = syncStoreA ? await syncStoreA.getDiagnostics() : { status: '未初始化' }
    
    // 设置诊断信息
    diagnosticInfo.value = {
      roomId: sharedRoomId.value,
      timestamp: new Date().toISOString(),
      connectionCheck: checkResult,
      editorA: diagA,
      // 如果使用同一个连接，不需要诊断B
      comparison: checkResult.status === 'healthy' ? 
        'A与B使用相同连接，状态已同步' : 
        '连接状态异常，请检查详细信息'
    }
    
    console.log('连接诊断结果:', diagnosticInfo.value)
  } catch (e) {
    console.error('诊断连接时出错:', e)
    errorMessage.value = `诊断失败: ${e.message || '未知错误'}`
  }
}

// 添加自动同步控制函数
const toggleAutoSync = async (value) => {
  try {
    const newValue = typeof value === 'boolean' ? value : autoSyncEnabled.value
    autoSyncEnabled.value = newValue
    
    if (sharedSyncStore) {
      const result = await setRoomAutoSync(sharedRoomId.value, {
        enabled: newValue,
        interval: syncInterval.value
      })
      
      if (result) {
        console.log(`自动同步已${newValue ? '启用' : '禁用'}，间隔: ${syncInterval.value}ms`)
        updateAutoSyncStatus()
      } else {
        errorMessage.value = '更新自动同步设置失败'
      }
    }
  } catch (e) {
    errorMessage.value = `设置自动同步时出错: ${e.message || '未知错误'}`
    console.error('设置自动同步时出错:', e)
  }
}

// 更新同步间隔
const updateSyncInterval = async () => {
  try {
    if (sharedSyncStore && autoSyncEnabled.value) {
      await setRoomAutoSync(sharedRoomId.value, {
        enabled: true,
        interval: syncInterval.value
      })
      
      updateAutoSyncStatus()
      console.log(`自动同步间隔已更新: ${syncInterval.value}ms`)
    }
  } catch (e) {
    errorMessage.value = `更新同步间隔时出错: ${e.message || '未知错误'}`
  }
}

// 获取自动同步状态
const updateAutoSyncStatus = () => {
  if (sharedSyncStore) {
    autoSyncStatus.value = getRoomAutoSyncStatus(sharedRoomId.value)
  }
}

// 监听房间ID变更
watch(sharedRoomId, (newRoomId, oldRoomId) => {
  if (newRoomId !== oldRoomId) {
    console.log(`房间ID已变更: ${oldRoomId} -> ${newRoomId}`)
    // 房间ID变更时不自动连接，让用户手动点击连接按钮
  }
})

// 组件挂载时初始化 - 更新为异步
onMounted(async () => {
  try {
    // 使用共享连接方法
    await connectBoth()
  } catch (e) {
    errorMessage.value = `初始化失败: ${e.message || '未知错误'}`
  }
  
  // 定期检查连接状态
  const intervalId = setInterval(async () => {
    // 避免过多日志，只在状态为断开时才输出
    const checkA = syncStoreA && !syncStoreA.isConnected.value
    const checkB = syncStoreB && !syncStoreB.isConnected.value
    
    if (checkA || checkB) {
      console.log('定期检查: 检测到连接断开')
      
      if (checkA) {
        console.log('检测到编辑器A连接断开，尝试重新连接')
        syncStoreA.connect()
      }
      
      if (checkB) {
        console.log('检测到编辑器B连接断开，尝试重新连接')
        syncStoreB.connect()
      }
    }
  }, 5000)
  
  // 添加网络状态变化监听
  if (navigator.connection) {
    navigator.connection.addEventListener('change', () => {
      console.log('网络状态变化，尝试检查连接')
      checkConnectivity()
    })
  }
  
  // 添加自动同步状态检查
  const syncStatusInterval = setInterval(() => {
    if (sharedSyncStore) {
      updateAutoSyncStatus()
    }
  }, 10000)
  
  // 组件卸载时清理
  onUnmounted(() => {
    clearInterval(intervalId)
    if (cleanupA) cleanupA()
    if (cleanupB) cleanupB()
    
    // 移除网络状态变化监听
    if (navigator.connection) {
      navigator.connection.removeEventListener('change', checkConnectivity)
    }
    clearInterval(syncStatusInterval)
  })
})
</script>

<style scoped>
.dual-editor-container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'PingFang SC', 'Helvetica Neue', Arial, sans-serif;
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

.editors {
  display: flex;
  gap: 20px;
}

.editor-container {
  flex: 1;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 15px;
  background-color: #fafafa;
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

.reconnect-btn {
  background-color: #ff9800;
}

.reconnect-btn:hover {
  background-color: #f57c00;
}

@media (max-width: 768px) {
  .editors {
    flex-direction: column;
  }
}

.connection-actions {
  margin: 20px 0;
  display: flex;
  justify-content: center;
  gap: 10px;
}

.diagnostic-btn {
  background-color: #9c27b0;
}

.diagnostic-btn:hover {
  background-color: #7b1fa2;
}

.sync-btn {
  background-color: #2196f3;
}

.sync-btn:hover {
  background-color: #1976d2;
}

.diagnostic-info {
  margin-top: 20px;
  padding: 15px;
  background-color: #f5f5f5;
  border-radius: 8px;
  font-family: monospace;
  font-size: 12px;
  max-height: 300px;
  overflow: auto;
  white-space: pre-wrap;
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

.sync-status {
  font-size: 12px;
  background-color: #f5f5f5;
  padding: 5px 10px;
  border-radius: 4px;
  color: #666;
}

.sync-active {
  color: #4CAF50;
  font-weight: bold;
}

.auto-sync-btn {
  background-color: #8bc34a;
}

.auto-sync-btn:hover {
  background-color: #7cb342;
}
</style>