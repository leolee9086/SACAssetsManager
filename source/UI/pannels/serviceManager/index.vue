<template>
  <div class="service-manager-panel">
    <div class="panel-header">
      <div class="panel-title">服务管理</div>
      <div class="panel-actions">
        <button @click="refreshStatus" class="btn btn-refresh" title="刷新状态">
          <svg><use xlink:href="#iconRefresh"></use></svg>
        </button>
        <button @click="restartAllServices" class="btn btn-restart" title="重启所有服务">
          <svg><use xlink:href="#iconRefresh"></use></svg> 重启全部
        </button>
      </div>
    </div>
    
    <div class="service-cards">
      <!-- 主服务卡片 -->
      <div class="service-card" :class="{ 'service-running': mainService.isRunning }">
        <div class="service-header">
          <div class="service-name">主服务</div>
          <div class="service-status" :class="mainService.isRunning ? 'status-running' : 'status-stopped'">
            {{ mainService.isRunning ? '运行中' : '已停止' }}
          </div>
        </div>
        <div class="service-info">
          <div v-if="mainService.isRunning" class="service-port">
            端口: {{ mainService.port || '未知' }}
          </div>
          <div v-if="mainService.isRunning" class="service-uptime">
            运行时间: {{ formatUptime(mainService.uptime) }}
          </div>
        </div>
        <div class="service-actions">
          <button v-if="!mainService.isRunning" @click="startService('main')" class="btn btn-start">
            启动
          </button>
          <button v-if="mainService.isRunning" @click="restartService('main')" class="btn btn-restart">
            重启
          </button>
          <button v-if="mainService.isRunning" @click="openDevTools" class="btn btn-dev">
            控制台
          </button>
        </div>
      </div>
      
      <!-- 静态服务卡片 -->
      <div class="service-card" :class="{ 'service-running': staticService.isRunning }">
        <div class="service-header">
          <div class="service-name">静态服务</div>
          <div class="service-status" :class="staticService.isRunning ? 'status-running' : 'status-stopped'">
            {{ staticService.isRunning ? '运行中' : '已停止' }}
          </div>
        </div>
        <div class="service-info">
          <div v-if="staticService.isRunning" class="service-port">
            URL: {{ staticService.url || '未知' }}
          </div>
          <div v-if="staticService.isRunning" class="service-uptime">
            运行时间: {{ formatUptime(staticService.uptime) }}
          </div>
        </div>
        <div class="service-actions">
          <button v-if="!staticService.isRunning" @click="startService('static')" class="btn btn-start">
            启动
          </button>
          <button v-if="staticService.isRunning" @click="restartService('static')" class="btn btn-restart">
            重启
          </button>
          <button v-if="staticService.isRunning" @click="openDevTools" class="btn btn-dev">
            控制台
          </button>
        </div>
      </div>
      
      <!-- 无服务运行时的提示 -->
      <div v-if="!mainService.isRunning && !staticService.isRunning" class="no-services-message">
        当前没有服务正在运行
        <button @click="startAllServices" class="btn btn-start-all">启动服务</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
// 使用和collection.vue相同的导入方式
import { plugin } from 'runtime'

// 使用ref创建响应式状态
const mainService = ref({
  isRunning: false,
  port: null,
  uptime: null,
  startTime: null
})

const staticService = ref({
  isRunning: false,
  url: null,
  uptime: null,
  startTime: null
})

let refreshInterval = null
let checkStatusInterval = null

// 刷新服务状态
const refreshStatus = async () => {
  try {
    // 检查主服务状态
    // 使用更可靠的检测方法
    const 主服务活跃 = await isMainServerActive()
    mainService.value.isRunning = 主服务活跃
    
    if (主服务活跃) {
      mainService.value.port = plugin.http服务端口号
      
      if (!mainService.value.startTime) {
        mainService.value.startTime = Date.now()
      }
    } else {
      // 如果服务不活跃但之前认为是运行的，重置状态
      if (mainService.value.startTime) {
        mainService.value.startTime = null
        mainService.value.uptime = null
      }
    }
    
    // 检查静态服务状态
    // 使用更可靠的检测方法
    const 静态服务活跃 = await isStaticServerActive()
    staticService.value.isRunning = 静态服务活跃
    
    if (静态服务活跃) {
      // 尝试获取正确的静态服务URL
      try {
        // 首先尝试从插件中获取url
        if (typeof plugin.getStaticServerUrl === 'function') {
          staticService.value.url = await plugin.getStaticServerUrl()
        } else {
          // 退回到构建URL的方式
          staticService.value.url = `http://localhost:${plugin.https服务端口号}`
        }
      } catch (error) {
        console.warn('获取静态服务URL失败:', error)
        staticService.value.url = `http://localhost:${plugin.https服务端口号}`
      }
      
      if (!staticService.value.startTime) {
        staticService.value.startTime = Date.now()
      }
    } else {
      // 如果服务不活跃但之前认为是运行的，重置状态
      if (staticService.value.startTime) {
        staticService.value.startTime = null
        staticService.value.uptime = null
      }
    }
    
    // 更新运行时间
    updateUptime()
  } catch (error) {
    console.error('刷新服务状态失败:', error)
  }
}

// 检查主服务是否活跃
const isMainServerActive = async () => {
  // 首先检查插件和服务器容器是否存在
  if (!plugin || !plugin.serverContainer) return false
  
  try {
    // 尝试使用ping功能（如果存在）
    if (typeof plugin.pingServer === 'function') {
      return await plugin.pingServer()
    }
    
    // 否则，检查心跳
    if (plugin.serverContainerWebContentsID) {
      return true // 如果ID存在，假设服务是活的
    }
    
    // 如果以上都不行，检查窗口是否被销毁
    if (plugin.serverContainer && 
        typeof plugin.serverContainer.isDestroyed === 'function' &&
        !plugin.serverContainer.isDestroyed()) {
      return true
    }
    
    return false
  } catch (error) {
    console.warn('主服务活跃检查失败:', error)
    // 如果出错，保守地假设服务还在运行（避免误报）
    return !!plugin.serverContainer
  }
}

// 检查静态服务是否活跃
const isStaticServerActive = async () => {
  // 首先检查插件和静态服务器容器是否存在
  if (!plugin || !plugin.staticServerContainer) return false
  
  try {
    // 尝试使用ping功能（如果存在）
    if (typeof plugin.pingStaticServer === 'function') {
      return await plugin.pingStaticServer()
    }
    
    // 否则，检查最后一次心跳响应时间
    if (plugin.staticServerLastPong) {
      // 如果30秒内有心跳响应，认为服务活跃
      return (Date.now() - plugin.staticServerLastPong) < 30000
    }
    
    // 如果以上都不行，检查窗口是否被销毁
    if (plugin.staticServerContainer && 
        typeof plugin.staticServerContainer.isDestroyed === 'function' &&
        !plugin.staticServerContainer.isDestroyed()) {
      return true
    }
    
    return false
  } catch (error) {
    console.warn('静态服务活跃检查失败:', error)
    // 如果出错，保守地假设服务还在运行（避免误报）
    return !!plugin.staticServerContainer
  }
}

// 更新运行时间
const updateUptime = () => {
  const now = Date.now()
  
  if (mainService.value.startTime) {
    mainService.value.uptime = now - mainService.value.startTime
  }
  
  if (staticService.value.startTime) {
    staticService.value.uptime = now - staticService.value.startTime
  }
}

// 格式化运行时间
const formatUptime = (ms) => {
  if (!ms) return '0秒'
  
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) {
    return `${days}天${hours % 24}小时`
  } else if (hours > 0) {
    return `${hours}小时${minutes % 60}分钟`
  } else if (minutes > 0) {
    return `${minutes}分钟${seconds % 60}秒`
  } else {
    return `${seconds}秒`
  }
}

// 启动服务
const startService = (type) => {
  if (type === 'main' && plugin && typeof plugin.rebuildServerContainer === 'function') {
    plugin.rebuildServerContainer()
  } else if (type === 'static') {
    // 尝试导入并使用启动静态服务器函数
    import('/plugins/SACAssetsManager/source/server/main.js')
      .then(module => {
        if (module && typeof module.启动静态服务器 === 'function') {
          module.启动静态服务器()
        }
      })
      .catch(err => {
        console.error('启动静态服务器失败:', err)
      })
  }
}

// 重启服务
const restartService = (type) => {
  if (type === 'main' && plugin && typeof plugin.rebuildServerContainer === 'function') {
    plugin.rebuildServerContainer()
  } else if (type === 'static') {
    // 尝试导入并使用重启静态服务器函数
    import('/plugins/SACAssetsManager/source/server/main.js')
      .then(module => {
        if (module && typeof module.重启静态服务器 === 'function') {
          module.重启静态服务器()
        }
      })
      .catch(err => {
        console.error('重启静态服务器失败:', err)
      })
  }
}

// 重启所有服务
const restartAllServices = () => {
  restartService('main')
  restartService('static')
}

// 启动所有服务
const startAllServices = () => {
  startService('main')
  startService('static')
}

// 打开开发者工具
const openDevTools = () => {
  // 直接使用collection.vue中的方式
  plugin.eventBus.emit('openDevTools')
}

// 事件处理函数
const handleServerStarted = () => {
  mainService.value.isRunning = true
  mainService.value.startTime = Date.now()
  updateUptime()
}

const handleServerStopped = () => {
  mainService.value.isRunning = false
  mainService.value.startTime = null
  mainService.value.uptime = null
}

const handleStaticServerStarted = (data) => {
  staticService.value.isRunning = true
  staticService.value.startTime = Date.now()
  if (data && data.port) {
    staticService.value.url = `http://localhost:${data.port}`
  }
  updateUptime()
}

const handleStaticServerStopped = () => {
  staticService.value.isRunning = false
  staticService.value.startTime = null
  staticService.value.uptime = null
}

const handleServerReady = () => {
  refreshStatus()
}

// 组件挂载后
onMounted(() => {
  refreshStatus()
  
  // 每10秒刷新一次状态和运行时间
  refreshInterval = setInterval(() => {
    updateUptime()
  }, 10000)
  
  // 每30秒检查一次服务状态
  checkStatusInterval = setInterval(() => {
    refreshStatus()
  }, 30000)
  
  // 添加事件监听
  if (plugin && plugin.eventBus) {
    plugin.eventBus.on('server:started', handleServerStarted)
    plugin.eventBus.on('server:stopped', handleServerStopped)
    plugin.eventBus.on('staticServer:started', handleStaticServerStarted)
    plugin.eventBus.on('staticServer:stopped', handleStaticServerStopped)
    plugin.eventBus.on('serverReady', handleServerReady)
  }
})

// 组件卸载前
onBeforeUnmount(() => {
  clearInterval(refreshInterval)
  clearInterval(checkStatusInterval)
  
  // 移除事件监听
  if (plugin && plugin.eventBus) {
    plugin.eventBus.off('server:started', handleServerStarted)
    plugin.eventBus.off('server:stopped', handleServerStopped)
    plugin.eventBus.off('staticServer:started', handleStaticServerStarted)
    plugin.eventBus.off('staticServer:stopped', handleStaticServerStopped)
    plugin.eventBus.off('serverReady', handleServerReady)
  }
})
</script>

<style scoped>
.service-manager-panel {
  display: flex;
  flex-direction: column;
  padding: 16px;
  height: 100%;
  overflow-y: auto;
  color: var(--b3-theme-on-background);
  font-size: 14px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.panel-title {
  font-size: 16px;
  font-weight: bold;
}

.panel-actions {
  display: flex;
  gap: 8px;
}

.service-cards {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.service-card {
  border-radius: 4px;
  padding: 16px;
  background-color: var(--b3-theme-surface);
  border: 1px solid var(--b3-theme-surface-lighter, #e0e0e0);
  transition: all 0.3s ease;
}

.service-running {
  border-left: 4px solid var(--b3-theme-primary, #4285f4);
}

.service-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.service-name {
  font-weight: bold;
}

.service-status {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
}

.status-running {
  background-color: rgba(76, 175, 80, 0.2);
  color: #4caf50;
}

.status-stopped {
  background-color: rgba(244, 67, 54, 0.2);
  color: #f44336;
}

.service-info {
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--b3-theme-on-surface, #606060);
}

.service-info > div {
  margin-bottom: 4px;
}

.service-actions {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 4px 12px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.2s;
  background-color: var(--b3-theme-background, #f5f5f5);
  color: var(--b3-theme-on-background, #333);
  display: flex;
  align-items: center;
  gap: 4px;
}

.btn:hover {
  background-color: var(--b3-theme-background-light, #e0e0e0);
}

.btn-start {
  background-color: var(--b3-theme-primary, #4285f4);
  color: white;
}

.btn-start:hover {
  background-color: var(--b3-theme-primary-darken, #3367d6);
}

.btn-restart {
  background-color: #ff9800;
  color: white;
}

.btn-restart:hover {
  background-color: #f57c00;
}

.btn-dev {
  background-color: #673ab7;
  color: white;
}

.btn-dev:hover {
  background-color: #5e35b1;
}

.btn svg {
  width: 14px;
  height: 14px;
}

.no-services-message {
  text-align: center;
  padding: 20px;
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
  margin-top: 20px;
  color: var(--b3-theme-on-surface, #666);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.btn-start-all {
  background-color: var(--b3-theme-primary, #4285f4);
  color: white;
  padding: 6px 16px;
}

.btn-start-all:hover {
  background-color: var(--b3-theme-primary-darken, #3367d6);
}
</style> 