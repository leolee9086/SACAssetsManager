<template>
  <div class="synced-store-panel">
    <h2>多视图协同编辑测试</h2>
    
    <!-- 连接控制面板 -->
    <ConnectionPanel
      :connection-status="connectionStatus"
      :client-id="clientId"
      :is-host="isHost"
      :sync-provider="syncManager?.provider"
      :active-users="activeUsers"
      @connect="connectRoom"
      @disconnect="disconnectRoom"
    />
    
    <!-- 房间配置面板 -->
    <RoomConfigPanel
      v-model:room-id="roomId"
      v-model:username="username"
      :connection-status="connectionStatus"
      @connect="connectRoom"
    />
    
    <!-- 同步配置面板 -->
    <SyncConfigPanel
      v-model:connection-provider="connectionProvider"
      v-model:use-virtual-cursor="useVirtualCursor"
      v-model:line-height="lineHeight"
      :connection-status="connectionStatus"
    />
    
    <!-- 编辑器区域 -->
    <div class="editor-section">
      <div class="editor-wrapper">
        <h3>本地编辑器</h3>
        <editor-selector
          v-model="editorContent"
          :read-only="false"
          :default-type="editorType"
          @type-change="handleEditorTypeChange"
          @change="handleEditorChange"
          title="本地文档"
        />
      </div>
      
      <div class="collaboration-wrapper" v-if="hasCollaborationEnabled">
        <h3>协作编辑器</h3>
        <editor-selector
          v-model="collaborativeContent"
          :read-only="!isHost"
          :default-type="editorType"
          @change="handleCollaborativeChange"
          title="共享文档"
        />
      </div>
    </div>
    
    <!-- 诊断信息面板 -->
    <DiagnosticsPanel
      :connection-status="connectionStatus"
      :client-id="clientId"
      :provider-name="connectionProvider"
      :is-host="isHost"
      :active-users="activeUsers"
      :y-doc="yDoc"
      :sync-provider="syncManager"
      @refresh="refreshDiagnostics"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import * as Y from '../../../../static/yjs.js'
import { generateRandomColor, getRelativeRoomId } from './utils.js'
import { throttle } from './utils.js'
import { SyncManager } from './syncManager.js'

// 组件导入
import ConnectionPanel from './components/ConnectionPanel.vue'
import RoomConfigPanel from './components/RoomConfigPanel.vue'
import EditorSelector from './components/EditorSelector.vue'
import SyncConfigPanel from './components/SyncConfigPanel.vue'
import DiagnosticsPanel from './components/DiagnosticsPanel.vue'

// 连接状态
const connectionStatus = ref('disconnected') // 连接状态: disconnected, connecting, connected
const clientId = ref('Guest-' + Math.floor(Math.random() * 1000))
const roomId = ref(getRelativeRoomId('编辑器测试'))
const username = ref('用户' + Math.floor(Math.random() * 1000))
const isHost = ref(false)
const activeUsers = ref([])
const yDoc = ref(null)
const syncManager = ref(null)
const hasCollaborationEnabled = computed(() => connectionStatus.value === 'connected')

// 配置选项
const connectionProvider = ref('websocket')
const lineHeight = ref(24)
const useVirtualCursor = ref(true)
const localCursorColor = '#1a73e8'

// 编辑器状态
const editorContent = ref('# 欢迎使用多视图编辑器\n\n这是一个示例文档，您可以切换不同的视图方式来编辑它。')
const collaborativeContent = ref('')
const editorType = ref('dom')


// 建立房间连接
const connectRoom = async () => {
  // 防止重复连接
  if (connectionStatus.value === 'connecting' || connectionStatus.value === 'connected') {
    console.log('已经连接或正在连接中')
    return
  }
  
  try {
    connectionStatus.value = 'connecting'
    
    // 创建Y文档
    yDoc.value = new Y.Doc()
    
    // 初始化共享状态
    if (!syncManager.value) {
      syncManager.value = new SyncManager({
        ydoc: yDoc.value,
        providerType: connectionProvider.value,
        roomId: roomId.value,
        clientId: clientId.value,
        username: username.value,
        color: localCursorColor,
        onSynced: () => {
          console.log('初始同步完成')
          isHost.value = syncManager.value?.isHost() || false
          connectionStatus.value = 'connected'
          
          // 设置初始共享状态
          setupContentSync()
        },
        onDisconnect: () => {
          console.log('连接断开')
          connectionStatus.value = 'disconnected'
        },
        onAwarenessUpdate: throttle((states) => {
          console.log(`收到感知状态更新，${states.size}个客户端`)
          activeUsers.value = Array.from(states.entries())
            .map(([id, state]) => ({
              id,
              name: state.name || `用户${id}`,
              color: state.color || generateRandomColor(id),
              isLocal: id === syncManager.value?.provider?.awareness?.clientID
            }))
        }, 300),
        // 添加额外高级配置
        persist: true,                   // 启用本地持久化
        autoSync: {
          enabled: true,                 // 启用自动同步
          interval: 1000,                // 同步间隔1秒
          adaptiveInterval: true,        // 启用自适应间隔
          heartbeatField: '_lastSync'    // 心跳字段名
        },
        retryStrategy: {
          maxRetries: 5,                 // 最大重试5次
          initialDelay: 1000,            // 初始延迟1秒
          maxDelay: 10000                // 最大延迟10秒
        },
        // 使用虚拟游标时的相关配置
        cursorTracking: useVirtualCursor.value ? {
          enabled: true,                 // 启用游标跟踪
          lineHeight: lineHeight.value,  // 行高
          throttle: 50                   // 跟踪节流时间
        } : { enabled: false }
      })
    } else {
      await syncManager.value.connect({
        ydoc: yDoc.value,
        providerType: connectionProvider.value,
        roomId: roomId.value,
        clientId: clientId.value,
        username: username.value,
        // 添加额外高级配置
        persist: true,                   // 启用本地持久化
        cursorTracking: useVirtualCursor.value ? {
          enabled: true,
          lineHeight: lineHeight.value,
          throttle: 50
        } : { enabled: false }
      })
      
      isHost.value = syncManager.value?.isHost() || false
      connectionStatus.value = 'connected'
      
      // 设置初始共享状态
      setupContentSync()
    }
  } catch (err) {
    console.error('连接失败:', err)
    connectionStatus.value = 'disconnected'
  }
}

// 断开房间连接
const disconnectRoom = () => {
  connectionStatus.value = 'disconnected'
  syncManager.value?.disconnect()
}

// 刷新诊断信息
const refreshDiagnostics = () => {
  console.log('刷新诊断信息')
  // 触发活跃用户列表更新
  if (syncManager.value?.provider?.awareness) {
    const states = syncManager.value.provider.awareness.getStates()
    activeUsers.value = Array.from(states.entries())
      .map(([id, state]) => ({
        id,
        name: state.name || `用户${id}`,
        color: state.color || generateRandomColor(id),
        isLocal: id === syncManager.value?.provider?.awareness?.clientID
      }))
  }
}

// 组件卸载时断开连接
onUnmounted(() => {
  syncManager?.disconnect()
})

// 处理编辑器类型变更
const handleEditorTypeChange = (type) => {
  editorType.value = type
  console.log(`编辑器类型变更为: ${type}`)
}

// 处理编辑器内容变更
const handleEditorChange = (data) => {
  // 如果是主机，则同步到yDoc
  if (isHost.value && yDoc.value) {
    const yText = yDoc.value.getText('content')
    yText.delete(0, yText.length)
    yText.insert(0, data.value)
  }
}

// 处理协作编辑器内容变更
const handleCollaborativeChange = (data) => {
  // 仅当是主机时才允许更新yDoc
  if (isHost.value && yDoc.value) {
    const yText = yDoc.value.getText('content')
    yText.delete(0, yText.length)
    yText.insert(0, data.value)
  }
}

// 当yDoc内容变化时，更新协作内容
const setupContentSync = () => {
  if (!yDoc.value) return
  
  const yText = yDoc.value.getText('content')
  
  // 初始化
  if (isHost.value && yText.toString() === '') {
    yText.insert(0, editorContent.value)
  } else {
    collaborativeContent.value = yText.toString()
  }
  
  // 监听远程变更
  yText.observe(event => {
    collaborativeContent.value = yText.toString()
  })
}

// 在建立连接后设置内容同步
watch(connectionStatus, (newStatus) => {
  if (newStatus === 'connected') {
    setupContentSync()
  }
})
</script>

<style scoped>
.synced-store-panel {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

h2 {
  margin-top: 0;
  margin-bottom: 20px;
}

.editor-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-top: 20px;
  height: 500px;
}

.editor-wrapper, .collaboration-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.editor-wrapper h3, .collaboration-wrapper h3 {
  margin-top: 0;
  margin-bottom: 10px;
}

.control-group {
  margin-bottom: 15px;
}

button {
  padding: 8px 12px;
  margin-right: 10px;
  border: 1px solid #ddd;
  background-color: #f5f5f5;
  cursor: pointer;
  border-radius: 4px;
}

button:hover {
  background-color: #e0e0e0;
}

button[disabled] {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .editor-section {
    grid-template-columns: 1fr;
  }
}
</style>