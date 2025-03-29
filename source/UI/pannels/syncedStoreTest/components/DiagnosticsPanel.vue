/**
 * 增强诊断面板，显示更多来自高级同步管理器的诊断信息
 */

<template>
  <div class="diagnostics-panel">
    <h3>诊断信息</h3>
    <div class="diagnostics-grid">
      <div class="diagnostics-item">
        <div class="label">连接状态:</div>
        <div class="value" :class="connectionStatusClass">{{ connectionStatus }}</div>
      </div>
      
      <div class="diagnostics-item">
        <div class="label">客户端ID:</div>
        <div class="value">{{ clientId }}</div>
      </div>
      
      <div class="diagnostics-item">
        <div class="label">提供器类型:</div>
        <div class="value">{{ providerName }}</div>
      </div>
      
      <div class="diagnostics-item">
        <div class="label">主机状态:</div>
        <div class="value">{{ isHost ? '是主机' : '非主机' }}</div>
      </div>
      
      <div class="diagnostics-item">
        <div class="label">活跃用户:</div>
        <div class="value">{{ activeUsers.length }}人</div>
      </div>
      
      <!-- 添加高级网络诊断 -->
      <div class="diagnostics-item" v-if="advancedDiagnostics.networkInfo">
        <div class="label">网络质量:</div>
        <div class="value" :class="networkQualityClass">
          {{ advancedDiagnostics.networkInfo.quality || '未知' }}
        </div>
      </div>
      
      <!-- 添加同步状态诊断 -->
      <div class="diagnostics-item" v-if="advancedDiagnostics.syncInfo">
        <div class="label">同步间隔:</div>
        <div class="value">
          {{ (advancedDiagnostics.syncInfo.adaptiveInterval || 0) }}ms
        </div>
      </div>
      
      <!-- 添加持久化状态 -->
      <div class="diagnostics-item" v-if="advancedDiagnostics.persistInfo">
        <div class="label">持久化状态:</div>
        <div class="value">
          {{ advancedDiagnostics.persistInfo.enabled ? '已启用' : '未启用' }}
        </div>
      </div>
    </div>
    
    <div class="users-section" v-if="activeUsers.length > 0">
      <h4>活跃用户列表</h4>
      <ul class="users-list">
        <li v-for="user in activeUsers" :key="user.id" 
            class="user-item" 
            :class="{ 'local-user': user.isLocal }">
          <div class="user-color" :style="{ backgroundColor: user.color }"></div>
          <div class="user-name">{{ user.name }}</div>
          <div class="user-id">ID: {{ user.id }}</div>
        </li>
      </ul>
    </div>
    
    <div class="doc-stats" v-if="yDoc">
      <h4>Y.Doc 统计</h4>
      <div class="stats-grid">
        <div class="stats-item">
          <div class="label">客户端ID:</div>
          <div class="value">{{ yDoc.clientID }}</div>
        </div>
        <div class="stats-item">
          <div class="label">垃圾回收:</div>
          <div class="value">{{ yDoc.gc ? '启用' : '禁用' }}</div>
        </div>
      </div>
    </div>
    
    <!-- 添加高级诊断详情 -->
    <div class="advanced-diagnostics" v-if="hasAdvancedDiagnostics">
      <h4>高级诊断</h4>
      
      <div v-if="advancedDiagnostics.connectionQuality" class="quality-indicator">
        <div class="label">连接质量评分:</div>
        <div class="quality-bar">
          <div class="quality-fill" 
               :style="{ width: `${advancedDiagnostics.connectionQuality}%`, 
                        backgroundColor: getQualityColor(advancedDiagnostics.connectionQuality) }">
          </div>
        </div>
        <div class="quality-value">{{ advancedDiagnostics.connectionQuality }}%</div>
      </div>
      
      <div v-if="advancedDiagnostics.diagnosticMessage" class="diagnostic-message">
        <div class="label">诊断结果:</div>
        <div class="message">{{ advancedDiagnostics.diagnosticMessage }}</div>
      </div>
      
      <div v-if="advancedDiagnostics.syncInfo" class="sync-stats">
        <h5>同步统计</h5>
        <div class="stats-grid">
          <div class="stats-item">
            <div class="label">自动同步:</div>
            <div class="value">{{ advancedDiagnostics.syncInfo.enabled ? '启用' : '禁用' }}</div>
          </div>
          <div class="stats-item">
            <div class="label">变更频率:</div>
            <div class="value">{{ advancedDiagnostics.syncInfo.changeFrequency || 0 }}次/分钟</div>
          </div>
          <div class="stats-item">
            <div class="label">上次同步:</div>
            <div class="value">{{ formatTimeAgo(advancedDiagnostics.syncInfo.lastSyncTime) }}</div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="actions">
      <button @click="$emit('refresh')" :disabled="connectionStatus === 'disconnected'">
        刷新诊断
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'

// 属性定义
const props = defineProps({
  connectionStatus: {
    type: String,
    default: 'disconnected'
  },
  clientId: {
    type: String,
    default: ''
  },
  providerName: {
    type: String,
    default: ''
  },
  isHost: {
    type: Boolean,
    default: false
  },
  activeUsers: {
    type: Array,
    default: () => []
  },
  yDoc: {
    type: Object,
    default: null
  },
  syncProvider: {
    type: Object,
    default: null
  }
})

// 事件
const emit = defineEmits(['refresh'])

// 高级诊断数据
const advancedDiagnostics = ref({
  connectionQuality: null,
  networkInfo: null,
  syncInfo: null,
  persistInfo: null,
  diagnosticMessage: null
})

// 判断是否有高级诊断数据
const hasAdvancedDiagnostics = computed(() => {
  return !!(
    advancedDiagnostics.value.connectionQuality || 
    advancedDiagnostics.value.networkInfo || 
    advancedDiagnostics.value.syncInfo || 
    advancedDiagnostics.value.diagnosticMessage
  )
})

// 连接状态样式
const connectionStatusClass = computed(() => {
  switch (props.connectionStatus) {
    case 'connected': return 'status-connected'
    case 'connecting': return 'status-connecting'
    case 'disconnected': return 'status-disconnected'
    default: return ''
  }
})

// 网络质量样式
const networkQualityClass = computed(() => {
  const quality = advancedDiagnostics.value.networkInfo?.quality
  if (!quality) return ''
  
  if (quality === '优') return 'quality-good'
  if (quality === '良') return 'quality-fair'
  return 'quality-poor'
})

// 根据质量评分获取颜色
const getQualityColor = (quality) => {
  if (!quality) return '#ccc'
  
  if (quality >= 80) return '#4caf50'
  if (quality >= 50) return '#ff9800'
  return '#f44336'
}

// 格式化时间间隔
const formatTimeAgo = (timestamp) => {
  if (!timestamp) return '未知'
  
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  
  if (seconds < 60) return `${seconds}秒前`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟前`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}小时前`
  return `${Math.floor(seconds / 86400)}天前`
}

// 更新高级诊断数据
const updateAdvancedDiagnostics = async () => {
  if (props.syncProvider) {
    try {
      // 修复: 使用syncStore而非_syncStore
      const syncStore = props.syncProvider.syncStore
      
      if (syncStore && typeof syncStore.getDiagnostics === 'function') {
        // 使用syncStore.getDiagnostics获取诊断信息
        const diagnostics = await syncStore.getDiagnostics()
        
        if (diagnostics) {
          advancedDiagnostics.value = {
            connectionQuality: diagnostics.connectionQuality,
            networkInfo: {
              quality: getQualityLabel(diagnostics.connectionQuality),
              latency: diagnostics.latency
            },
            syncInfo: diagnostics.autoSyncStatus,
            persistInfo: {
              enabled: diagnostics.persistenceEnabled
            },
            diagnosticMessage: diagnostics.diagnosticMessage
          }
        }
      } else {
        // 向下兼容: 尝试直接从provider获取基本信息
        advancedDiagnostics.value = {
          connectionQuality: null,
          networkInfo: {
            quality: props.connectionStatus === 'connected' ? '未知' : '离线',
            latency: null
          },
          syncInfo: null,
          persistInfo: null,
          diagnosticMessage: null
        }
      }
    } catch (err) {
      console.warn('获取高级诊断信息失败:', err)
    }
  }
}

// 根据连接质量评分获取标签
const getQualityLabel = (quality) => {
  if (!quality) return '未知'
  
  if (quality >= 80) return '优'
  if (quality >= 50) return '良'
  return '差'
}

// 监听连接状态变化
watch(() => props.connectionStatus, (newStatus) => {
  if (newStatus === 'connected') {
    updateAdvancedDiagnostics()
  }
})

// 监听刷新事件
watch(() => props.syncProvider, () => {
  updateAdvancedDiagnostics()
})

// 组件挂载后
onMounted(() => {
  if (props.connectionStatus === 'connected') {
    updateAdvancedDiagnostics()
  }
})
</script>

<style scoped>
.diagnostics-panel {
  margin-top: 20px;
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

h3 {
  margin-top: 0;
  margin-bottom: 15px;
}

.diagnostics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
}

.diagnostics-item {
  display: flex;
  flex-direction: column;
}

.label {
  font-weight: bold;
  margin-bottom: 5px;
  color: #666;
}

.value {
  font-family: monospace;
}

.status-connected {
  color: #4caf50;
  font-weight: bold;
}

.status-connecting {
  color: #ff9800;
  font-weight: bold;
}

.status-disconnected {
  color: #f44336;
  font-weight: bold;
}

.quality-good {
  color: #4caf50;
  font-weight: bold;
}

.quality-fair {
  color: #ff9800;
  font-weight: bold;
}

.quality-poor {
  color: #f44336;
  font-weight: bold;
}

.users-section {
  margin-top: 20px;
}

.users-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.user-item {
  display: flex;
  align-items: center;
  padding: 8px;
  border-bottom: 1px solid #eee;
}

.local-user {
  background-color: rgba(0, 0, 255, 0.05);
}

.user-color {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  margin-right: 10px;
}

.user-name {
  font-weight: bold;
  margin-right: 10px;
}

.user-id {
  font-size: 0.8em;
  color: #666;
}

.doc-stats {
  margin-top: 20px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
}

.stats-item {
  display: flex;
  flex-direction: column;
}

.actions {
  margin-top: 20px;
}

button {
  padding: 8px 12px;
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background-color: #e0e0e0;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 高级诊断样式 */
.advanced-diagnostics {
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px dashed #ddd;
}

.quality-indicator {
  margin: 15px 0;
}

.quality-bar {
  height: 10px;
  background-color: #eee;
  border-radius: 5px;
  margin: 5px 0;
  overflow: hidden;
}

.quality-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.quality-value {
  font-weight: bold;
  text-align: right;
}

.diagnostic-message {
  margin: 15px 0;
  padding: 10px;
  background-color: #f9f9f9;
  border-radius: 4px;
}

.message {
  line-height: 1.5;
}

.sync-stats {
  margin-top: 15px;
}

h5 {
  margin: 10px 0;
}
</style> 