<template>
  <div class="sync-store-tester">
    <h2>SyncStore 测试面板</h2>
    
    <!-- 连接设置 -->
    <div class="settings-section">
      <h3>连接设置</h3>
      <div class="form-group">
        <label for="room-name">房间名称：</label>
        <input id="room-name" v-model="roomName" type="text" placeholder="输入房间名称" />
      </div>
      
      <div class="options-group">
        <div class="checkbox-group">
          <input id="persist" type="checkbox" v-model="persist" />
          <label for="persist">启用本地持久化</label>
        </div>
        
        <div class="checkbox-group">
          <input id="use-siyuan" type="checkbox" v-model="useSiyuan" />
          <label for="use-siyuan">使用思源同步</label>
        </div>
        
        <div class="checkbox-group">
          <input id="use-synced-store" type="checkbox" v-model="useSyncedStore" />
          <label for="use-synced-store">使用useSyncedStore API</label>
        </div>
      </div>
      
      <!-- 详细的连接配置选项 -->
      <div class="connection-config">
        <h4>连接配置</h4>
        
        <div class="config-tabs">
          <div 
            :class="['config-tab', { active: activeConfigTab === 'basic' }]"
            @click="activeConfigTab = 'basic'"
          >
            基本配置
          </div>
          <div 
            :class="['config-tab', { active: activeConfigTab === 'webrtc' }]"
            @click="activeConfigTab = 'webrtc'"
          >
            WebRTC配置
          </div>
          <div 
            :class="['config-tab', { active: activeConfigTab === 'siyuan' }]"
            @click="activeConfigTab = 'siyuan'"
          >
            思源配置
          </div>
        </div>
        
        <!-- 基本配置 -->
        <div v-if="activeConfigTab === 'basic'" class="config-panel">
          <div class="form-group">
            <label>连接方式：</label>
            <div class="radio-group">
              <label>
                <input type="radio" v-model="connectionType" value="auto" />
                自动选择
              </label>
              <label>
                <input type="radio" v-model="connectionType" value="webrtc-only" />
                仅WebRTC
              </label>
              <label>
                <input type="radio" v-model="connectionType" value="siyuan-only" />
                仅思源
              </label>
              <label>
                <input type="radio" v-model="connectionType" value="webrtc-siyuan" />
                WebRTC优先+思源备用
              </label>
              <label>
                <input type="radio" v-model="connectionType" value="siyuan-webrtc" />
                思源优先+WebRTC备用
              </label>
            </div>
          </div>
          
          <div class="checkbox-group">
            <input id="auto-connect" type="checkbox" v-model="autoConnect" />
            <label for="auto-connect">自动连接</label>
          </div>
          
          <div class="form-group">
            <label for="load-timeout">加载超时(ms)：</label>
            <input id="load-timeout" v-model.number="loadTimeout" type="number" min="1000" step="1000" />
          </div>
        </div>
        
        <!-- WebRTC配置 -->
        <div v-if="activeConfigTab === 'webrtc'" class="config-panel">
          <div class="form-group">
            <label for="ice-servers">ICE服务器：</label>
            <textarea 
              id="ice-servers" 
              v-model="webrtcConfig.iceServers" 
              rows="3" 
              placeholder="每行一个服务器URL"
            ></textarea>
          </div>
          
          <div class="form-group">
            <label for="ping-interval">Ping间隔(ms)：</label>
            <input id="ping-interval" v-model.number="webrtcConfig.pingInterval" type="number" min="500" step="500" />
          </div>
          
          <div class="form-group">
            <label for="max-conns">最大连接数：</label>
            <input id="max-conns" v-model.number="webrtcConfig.maxConns" type="number" min="1" max="50" />
          </div>
          
          <div class="form-group">
            <label for="max-retries">最大重试次数：</label>
            <input id="max-retries" v-model.number="webrtcConfig.maxRetries" type="number" min="1" max="20" />
          </div>
          
          <div class="checkbox-group">
            <input id="trickle" type="checkbox" v-model="webrtcConfig.trickle" />
            <label for="trickle">启用Trickle ICE</label>
          </div>
          
          <div class="checkbox-group">
            <input id="filter-bc-conns" type="checkbox" v-model="webrtcConfig.filterBcConns" />
            <label for="filter-bc-conns">过滤广播连接</label>
          </div>
        </div>
        
        <!-- 思源配置 -->
        <div v-if="activeConfigTab === 'siyuan'" class="config-panel">
          <div class="form-group">
            <label for="siyuan-host">主机地址：</label>
            <input id="siyuan-host" v-model="siyuanConfig.host" type="text" placeholder="例如：127.0.0.1" />
          </div>
          
          <div class="form-group">
            <label for="siyuan-port">端口号：</label>
            <input id="siyuan-port" v-model.number="siyuanConfig.port" type="number" min="1" max="65535" />
          </div>
          
          <div class="form-group">
            <label for="siyuan-token">访问令牌：</label>
            <input id="siyuan-token" v-model="siyuanConfig.token" type="text" placeholder="思源API访问令牌" />
          </div>
          
          <div class="form-group">
            <label for="siyuan-channel">通道名称：</label>
            <input id="siyuan-channel" v-model="siyuanConfig.channel" type="text" placeholder="WebSocket通道名称" />
          </div>
          
          <div class="form-group">
            <label for="reconnect-interval">重连间隔(ms)：</label>
            <input id="reconnect-interval" v-model.number="siyuanConfig.reconnectInterval" type="number" min="500" step="500" />
          </div>
          
          <div class="form-group">
            <label for="max-reconnect">最大重连次数：</label>
            <input id="max-reconnect" v-model.number="siyuanConfig.maxReconnectAttempts" type="number" min="1" max="20" />
          </div>
          
          <div class="checkbox-group">
            <input id="siyuan-auto-reconnect" type="checkbox" v-model="siyuanConfig.autoReconnect" />
            <label for="siyuan-auto-reconnect">自动重连</label>
          </div>
        </div>
      </div>
      
      <div class="button-group">
        <button 
          @click="connectRoom" 
          :disabled="isConnected || isConnecting"
          :class="{'primary-button': !isConnected && !isConnecting}"
        >
          连接房间
        </button>
        <button 
          @click="disconnectRoom" 
          :disabled="!isConnected && !isConnecting"
          :class="{'danger-button': isConnected || isConnecting}"
        >
          断开连接
        </button>
        <button @click="clearLocalData" :disabled="isConnected">清除本地数据</button>
      </div>
    </div>
    
    <!-- 连接状态 -->
    <div class="status-section">
      <h3>同步状态</h3>
      <div class="status-card">
        <div class="status-item">
          <span class="status-label">连接状态：</span>
          <span :class="['status-value', getStatusClass]">{{ connectionStatusText }}</span>
        </div>
        <div class="status-item">
          <span class="status-label">同步状态：</span>
          <span class="status-value">{{ syncStore?.$status?.value || '未连接' }}</span>
        </div>
        <div class="status-item">
          <span class="status-label">在线节点：</span>
          <span class="status-value">{{ peersCount }}</span>
        </div>
        <div class="status-item">
          <span class="status-label">数据加载：</span>
          <span :class="['status-value', {'status-success': isLocalDataLoaded}]">
            {{ isLocalDataLoaded ? '已加载' : '未加载' }}
          </span>
        </div>
      </div>
      
      <div class="action-buttons">
        <button @click="triggerSync" :disabled="!isConnected">手动同步</button>
        <button @click="getDiagnostics" :disabled="!isConnected">诊断网络</button>
        <button @click="testNetworkDisruption" :disabled="!isConnected || networkDisruptionActive">模拟断网</button>
      </div>
      
      <!-- 网络中断测试控制面板 -->
      <div v-if="networkDisruptionActive" class="network-disruption-panel">
        <h4>网络中断测试 ({{ networkDisruptionRemaining }}秒)</h4>
        <div class="progress-bar">
          <div 
            class="progress-bar-inner" 
            :style="{width: `${(networkDisruptionRemaining / networkDisruptionDuration) * 100}%`}"
          ></div>
        </div>
        <button @click="cancelNetworkDisruption" class="cancel-button">取消测试</button>
      </div>
    </div>
    
    <!-- 数据编辑 -->
    <div class="data-section">
      <h3>同步数据</h3>
      <div v-if="isConnected" class="data-editor">
        <div class="data-tabs">
          <div 
            v-for="tab in dataTabs" 
            :key="tab.id"
            :class="['tab', { active: currentTab === tab.id }]"
            @click="currentTab = tab.id"
          >
            {{ tab.name }}
          </div>
        </div>
        
        <!-- 基础数据编辑 -->
        <div v-if="currentTab === 'basic'" class="data-panel">
          <div class="form-group">
            <label for="shared-title">标题：</label>
            <input id="shared-title" v-model="sharedData.title" type="text" />
          </div>
          
          <div class="form-group">
            <label for="shared-desc">描述：</label>
            <textarea id="shared-desc" v-model="sharedData.description" rows="3"></textarea>
          </div>
          
          <div class="form-group">
            <label>计数器：</label>
            <div class="counter-controls">
              <button @click="decrementCounter">-</button>
              <span class="counter-value">{{ sharedData.counter }}</span>
              <button @click="incrementCounter">+</button>
            </div>
          </div>
        </div>
        
        <!-- 数组数据编辑 -->
        <div v-if="currentTab === 'array'" class="data-panel">
          <div class="items-list">
            <div v-for="(item, index) in sharedData.items" :key="index" class="item-row">
              <input v-model="sharedData.items[index]" type="text" />
              <button @click="removeItem(index)" class="remove-button">删除</button>
            </div>
            
            <div class="add-item-form">
              <input v-model="newItem" type="text" placeholder="新项目" />
              <button @click="addItem" :disabled="!newItem">添加</button>
            </div>
          </div>
        </div>
        
        <!-- 嵌套对象编辑 -->
        <div v-if="currentTab === 'nested'" class="data-panel">
          <h4>嵌套对象</h4>
          
          <div class="nested-form" v-if="sharedData.config">
            <div class="form-group">
              <label for="theme">主题：</label>
              <select id="theme" v-model="sharedData.config.theme">
                <option value="light">亮色</option>
                <option value="dark">暗色</option>
                <option value="auto">自动</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="fontSize">字体大小：</label>
              <input id="fontSize" v-model.number="sharedData.config.fontSize" type="number" min="8" max="30" />
            </div>
            
            <div v-if="sharedData.config.advanced" class="nested-form">
              <h5>高级选项</h5>
              <div class="form-group">
                <label for="syncInterval">同步间隔 (ms)：</label>
                <input id="syncInterval" v-model.number="sharedData.config.advanced.syncInterval" type="number" min="100" />
              </div>
              
              <div class="checkbox-group">
                <input id="debug-mode" type="checkbox" v-model="sharedData.config.advanced.debugMode" />
                <label for="debug-mode">调试模式</label>
              </div>
            </div>
          </div>
        </div>
        
        <!-- JSON数据查看 -->
        <div v-if="currentTab === 'json'" class="data-panel">
          <h4>JSON格式数据</h4>
          <pre class="json-view">{{ JSON.stringify(sharedData, null, 2) }}</pre>
        </div>
      </div>
      <div v-else class="not-connected-message">
        请先连接到同步房间
      </div>
    </div>
    
    <!-- 诊断信息弹窗 -->
    <div v-if="showDiagnostics" class="diagnostics-modal">
      <div class="diagnostics-content">
        <h3>网络诊断信息</h3>
        <button class="close-button" @click="showDiagnostics = false">×</button>
        
        <div v-if="diagnosticsResult" class="diagnostics-details">
          <div class="diagnostics-item">
            <span class="diagnostics-label">房间名称：</span>
            <span>{{ diagnosticsResult.roomName }}</span>
          </div>
          
          <div class="diagnostics-item">
            <span class="diagnostics-label">连接类型：</span>
            <span>{{ diagnosticsResult.connection.type === 'webrtc' ? 'WebRTC' : '思源' }}</span>
          </div>
          
          <div class="diagnostics-item">
            <span class="diagnostics-label">连接状态：</span>
            <span :class="['status-value', diagnosticsResult.connection.connected ? 'status-success' : 'status-error']">
              {{ diagnosticsResult.connection.connected ? '已连接' : '未连接' }}
            </span>
          </div>
          
          <div class="diagnostics-item">
            <span class="diagnostics-label">在线节点数：</span>
            <span>{{ diagnosticsResult.connection.peers }}</span>
          </div>
          
          <div class="diagnostics-item">
            <span class="diagnostics-label">RTT (ms)：</span>
            <span>{{ diagnosticsResult.connection.rtt || '未知' }}</span>
          </div>
          
          <div class="diagnostics-item">
            <span class="diagnostics-label">网络质量：</span>
            <span :class="['quality-' + diagnosticsResult.quality]">
              {{ getQualityText(diagnosticsResult.quality) }}
            </span>
          </div>
          
          <div class="diagnostics-item">
            <span class="diagnostics-label">持久化：</span>
            <span>{{ diagnosticsResult.storage.enabled ? '已启用' : '已禁用' }}</span>
          </div>
          
          <div class="diagnostics-item">
            <span class="diagnostics-label">数据大小：</span>
            <span>{{ formatByteSize(diagnosticsResult.storage.size) }}</span>
          </div>
          
          <div class="diagnostics-message">
            <h4>诊断结果</h4>
            <p>{{ diagnosticsResult.message }}</p>
          </div>
        </div>
        <div v-else class="diagnostics-loading">
          正在获取诊断信息...
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from '../../../../static/vue.esm-browser.js'
import { createSyncStore, useSyncedStore as createSyncedStore } from '../../../../src/toolBox/feature/useSyncedstore/useSyncstore.js'

export default {
  name: 'SyncStoreTester',
  
  setup() {
    // 连接设置
    const roomName = ref('sync-test-room')
    const persist = ref(true)
    const useSiyuan = ref(false)
    const useSyncedStore = ref(false)
    const isConnecting = ref(false)
    const isConnected = ref(false)
    const isLocalDataLoaded = ref(false)
    const syncStore = ref(null)
    const connectionStatus = ref('未连接')
    const peersCount = ref(0)
    
    // 诊断信息
    const showDiagnostics = ref(false)
    const diagnosticsResult = ref(null)
    
    // 数据编辑
    const currentTab = ref('basic')
    const newItem = ref('')
    
    // 连接配置面板
    const activeConfigTab = ref('basic')
    
    // 基本连接配置
    const connectionType = ref('auto')  // auto, webrtc-only, siyuan-only, webrtc-siyuan, siyuan-webrtc
    const autoConnect = ref(true)
    const loadTimeout = ref(5000)
    
    // WebRTC配置
    const webrtcConfig = reactive({
      iceServers: 'stun:stun.l.google.com:19302\nstun:stun1.l.google.com:19302',
      pingInterval: 3000,
      maxConns: 20,
      maxRetries: 10,
      trickle: true,
      filterBcConns: true
    })
    
    // 思源配置
    const siyuanConfig = reactive({
      host: '127.0.0.1',
      port: 6806,
      token: 'token',
      channel: 'sync',
      reconnectInterval: 1000,
      maxReconnectAttempts: 10,
      autoReconnect: true
    })
    
    // 初始数据模板
    const initialData = {
      title: '同步测试',
      description: '这是一个用于测试Syncstore的协作面板',
      counter: 0,
      items: ['项目 1', '项目 2', '项目 3'],
      timestamp: Date.now(),
      config: {
        theme: 'light',
        fontSize: 14,
        advanced: {
          syncInterval: 1000,
          debugMode: false
        }
      }
    }
    
    // 同步数据
    const sharedData = reactive({...initialData})
    
    // 标签页定义
    const dataTabs = [
      { id: 'basic', name: '基础数据' },
      { id: 'array', name: '数组操作' },
      { id: 'nested', name: '嵌套对象' },
      { id: 'json', name: 'JSON查看' }
    ]
    
    // 计算连接状态文本
    const connectionStatusText = computed(() => {
      if (isConnecting.value) return '正在连接...'
      return isConnected.value ? '已连接' : '未连接'
    })
    
    // 状态样式计算
    const getStatusClass = computed(() => {
      if (isConnecting.value) return 'status-connecting'
      return isConnected.value ? 'status-success' : 'status-error'
    })
    
    // 网络中断测试
    const networkDisruptionActive = ref(false)
    const networkDisruptionRemaining = ref(0)
    const networkDisruptionDuration = 10 // 默认10秒
    let networkDisruptionTimer = null
    let countdownTimer = null
    
    // 监听连接类型变化并更新useSiyuan
    watch(connectionType, (newType) => {
      if (newType === 'siyuan-only' || newType === 'siyuan-webrtc') {
        useSiyuan.value = true
      } else if (newType === 'webrtc-only') {
        useSiyuan.value = false
      }
    })
    
    // 连接到同步房间
    async function connectRoom() {
      if (isConnected.value) return
      
      connectionStatus.value = '正在连接...'
      isConnecting.value = true
      
      try {
        // 准备连接配置
        const baseConfig = {
          roomName: roomName.value,
          persist: persist.value,
          autoConnect: autoConnect.value,
          loadTimeout: loadTimeout.value,
          autoSync: {
            enabled: true,
            interval: 1000
          }
        }
        
        // 根据连接类型设置WebRTC和思源选项
        switch (connectionType.value) {
          case 'webrtc-only':
            baseConfig.disableWebRTC = false
            baseConfig.siyuan = { enabled: false }
            break
          case 'siyuan-only':
            baseConfig.disableWebRTC = true
            baseConfig.siyuan = { 
              enabled: true,
              ...siyuanConfig
            }
            break
          case 'webrtc-siyuan':
            baseConfig.disableWebRTC = false
            baseConfig.siyuan = { 
              enabled: true, 
              ...siyuanConfig
            }
            break
          case 'siyuan-webrtc':
            baseConfig.disableWebRTC = false
            baseConfig.forceSiyuan = true
            baseConfig.siyuan = { 
              enabled: true,
              ...siyuanConfig
            }
            break
          default: // 'auto'
            baseConfig.disableWebRTC = useSiyuan.value
            baseConfig.siyuan = { 
              enabled: useSiyuan.value,
              ...siyuanConfig
            }
        }
        
        // 添加WebRTC配置
        baseConfig.webrtcOptions = {
          peerOpts: {
            config: {
              iceServers: parseIceServers(webrtcConfig.iceServers),
              iceCandidatePoolSize: 10,
              bundlePolicy: 'max-bundle',
              rtcpMuxPolicy: 'require',
              sdpSemantics: 'unified-plan'
            },
            trickle: webrtcConfig.trickle
          },
          pingInterval: webrtcConfig.pingInterval,
          maxConns: webrtcConfig.maxConns,
          connect: false,
          filterBcConns: webrtcConfig.filterBcConns,
          maxRetries: webrtcConfig.maxRetries
        }
        
        // 根据选择使用不同的API创建同步存储
        if (useSyncedStore.value) {
          // 使用useSyncedStore API
          syncStore.value = await createSyncedStore(initialData, baseConfig)
        } else {
          // 使用createSyncStore API
          baseConfig.initialState = initialData
          syncStore.value = await createSyncStore(baseConfig)
        }
        
        // 监听状态变化
        watch(() => syncStore.value.status, (val) => {
          connectionStatus.value = val
        }, { immediate: true })
        
        watch(() => syncStore.value.isConnected, (val) => {
          isConnected.value = val
        }, { immediate: true })
        
        watch(() => syncStore.value.isLocalDataLoaded, (val) => {
          isLocalDataLoaded.value = val
        }, { immediate: true })
        
        // 将同步状态关联到本地状态
        if (syncStore.value && syncStore.value.store && syncStore.value.store.state) {
          // 将初始状态同步到本地状态对象
          // 一次性从store复制到本地，之后通过监听本地变化来更新store
          Object.assign(sharedData, syncStore.value.store.state)
          
          // 设置定时器来更新数据 - 使用单向数据流而不是双向
          const updateTimer = setInterval(() => {
            if (syncStore.value && syncStore.value.store && syncStore.value.store.state) {
              // 从存储同步到本地 - 这是安全的操作
              updateLocalFromStore(sharedData, syncStore.value.store.state)
              
              // 更新节点计数
              updatePeersCount()
            }
          }, 500)
          
          // 监听本地数据变化，更新到存储
          const stopWatchSharedData = watch(() => JSON.stringify(sharedData), () => {
            if (syncStore.value && syncStore.value.store && syncStore.value.store.state) {
              // 使用安全的方式更新存储
              updateStoreFromLocal(syncStore.value.store.state, sharedData)
            }
          }, { deep: true })
          
          // 组件销毁时清除定时器和监听器
          onBeforeUnmount(() => {
            clearInterval(updateTimer)
            stopWatchSharedData()
          })
        }
        
        isConnected.value = true
        isConnecting.value = false
      } catch (err) {
        console.error('连接同步房间出错:', err)
        connectionStatus.value = '连接失败'
        isConnecting.value = false
      }
    }
    
    // 断开连接
    async function disconnectRoom() {
      if (!syncStore.value) return
      
      try {
        await syncStore.value.disconnect()
        syncStore.value = null
        isConnected.value = false
        connectionStatus.value = '已断开'
        
        // 重置数据为初始状态
        Object.assign(sharedData, initialData)
      } catch (err) {
        console.error('断开连接出错:', err)
      }
    }
    
    // 手动触发同步
    function triggerSync() {
      if (!syncStore.value) return
      
      try {
        syncStore.value.sync()
      } catch (err) {
        console.error('触发同步出错:', err)
      }
    }
    
    // 清除本地数据
    async function clearLocalData() {
      if (isConnected.value) {
        console.warn('请先断开连接再清除数据')
        return
      }
      
      if (!syncStore.value) {
        // 创建临时存储来清除数据
        const tempStore = await createSyncStore({
          roomName: roomName.value,
          persist: true,
          autoConnect: false
        })
        
        await tempStore.clearLocalData()
        await tempStore.disconnect()
        
        console.log('已清除本地数据')
      } else {
        await syncStore.value.clearLocalData()
        console.log('已清除本地数据')
      }
    }
    
    // 获取诊断信息
    async function getDiagnostics() {
      if (!syncStore.value) return
      
      try {
        diagnosticsResult.value = await syncStore.value.getDiagnostics()
        showDiagnostics.value = true
      } catch (err) {
        console.error('获取诊断信息出错:', err)
      }
    }
    
    // 增减计数器
    function incrementCounter() {
      sharedData.counter++
    }
    
    function decrementCounter() {
      sharedData.counter--
    }
    
    // 数组操作
    function addItem() {
      if (!newItem.value) return
      sharedData.items.push(newItem.value)
      newItem.value = ''
    }
    
    function removeItem(index) {
      sharedData.items.splice(index, 1)
    }
    
    // 更新节点计数
    function updatePeersCount() {
      if (!syncStore.value) {
        peersCount.value = 0
        return
      }
      
      try {
        const peers = syncStore.value.getPeers()
        peersCount.value = peers ? peers.size : 0
      } catch (err) {
        peersCount.value = 0
      }
    }
    
    // 格式化字节大小
    function formatByteSize(bytes) {
      if (bytes === 0) return '0 B'
      
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }
    
    // 网络质量文本
    function getQualityText(quality) {
      const qualityMap = {
        excellent: '极佳',
        good: '良好',
        fair: '一般',
        poor: '较差',
        bad: '很差',
        unknown: '未知'
      }
      
      return qualityMap[quality] || '未知'
    }
    
    // 安全地将存储数据更新到本地
    function updateLocalFromStore(local, store) {
      try {
        // 检查参数有效性
        if (!local || !store || typeof local !== 'object' || typeof store !== 'object') {
          return;
        }
        
        // 检查是否处理的是Yjs共享文档
        if (store._yjs || store._prelimContent || store._prelimState) {
          // 这是一个Yjs共享对象，使用特殊处理
          try {
            // 对共享对象，我们使用深拷贝方式避免引用问题
            const safeObj = JSON.parse(JSON.stringify(store));
            
            // 然后更新本地对象的每个属性
            Object.keys(safeObj).forEach(key => {
              if (key === '_yjs' || key.startsWith('_') || key === '$syncStore') return;
              local[key] = safeObj[key];
            });
            
            return;
          } catch (e) {
            console.warn('转换Yjs对象时出错，使用备用方式:', e);
            // 继续使用下面的逻辑作为备用
          }
        }
        
        // 处理数组特殊情况
        if (Array.isArray(store)) {
          // 确保本地也是数组
          if (!Array.isArray(local)) {
            console.error('类型不匹配：本地不是数组');
            return;
          }
          
          // 清空本地数组并重新填充 - 不使用直接赋值
          local.splice(0, local.length);
          
          // 安全地添加元素
          store.forEach(item => {
            if (item === null || item === undefined) {
              local.push(item);
            } else if (typeof item === 'object') {
              // 对象类型需要深拷贝
              try {
                const clone = JSON.parse(JSON.stringify(item));
                local.push(clone);
              } catch (err) {
                console.warn('克隆数组元素失败:', err);
                // 如果深拷贝失败，创建一个空对象
                local.push(Array.isArray(item) ? [] : {});
              }
            } else {
              // 基本类型直接添加
              local.push(item);
            }
          });
          
          return; // 数组处理完毕
        }
        
        // 正常对象处理
        Object.keys(store).forEach(key => {
          // 跳过以下划线开头的内部属性
          if (key === '_yjs' || key.startsWith('_') || key === '$syncStore') {
            return;
          }
          
          const storeValue = store[key];
          
          // null 值直接赋值
          if (storeValue === null || storeValue === undefined) {
            local[key] = storeValue;
            return;
          }
          
          // 处理基本类型
          if (typeof storeValue !== 'object') {
            local[key] = storeValue;
            return;
          }
          
          // 处理数组
          if (Array.isArray(storeValue)) {
            // 如果本地属性不存在或不是数组，创建新数组
            if (!local[key] || !Array.isArray(local[key])) {
              local[key] = [];
            }
            
            // 递归处理数组
            updateLocalFromStore(local[key], storeValue);
            return;
          }
          
          // 处理普通对象
          if (!local[key] || typeof local[key] !== 'object' || Array.isArray(local[key])) {
            local[key] = {};
          }
          
          // 递归处理子对象
          updateLocalFromStore(local[key], storeValue);
        });
      } catch (err) {
        console.error('同步到本地时出错:', err);
      }
    }
    
    // 安全地将本地数据更新到存储
    function updateStoreFromLocal(store, local) {
      try {
        // 检查参数
        if (!store || !local || typeof store !== 'object' || typeof local !== 'object') {
          return;
        }
        
        // 判断是否为数组
        if (Array.isArray(store)) {
          // 确保本地也是数组
          if (!Array.isArray(local) || local.length === 0) {
            return;
          }
          
          // 清空store数组 - 使用 Yjs 安全的方式
          while (store.length > 0) {
            try {
              store.pop();
            } catch (e) {
              console.warn('清空数组失败:', e);
              break;
            }
          }
          
          // 填充新元素
          for (let i = 0; i < local.length; i++) {
            try {
              const item = local[i];
              if (item === null || item === undefined) {
                store.push(item);
              } else if (typeof item === 'object') {
                // 对象类型克隆后添加
                const safeItem = JSON.parse(JSON.stringify(item));
                store.push(safeItem);
              } else {
                // 基本类型直接添加
                store.push(item);
              }
            } catch (err) {
              console.warn(`添加数组元素 ${i} 失败:`, err);
            }
          }
          
          return; // 数组处理完毕
        }
        
        // 处理常规对象
        Object.keys(local).forEach(key => {
          try {
            // 跳过内部属性
            if (key === '_yjs' || key.startsWith('_') || key === '$syncStore') {
              return;
            }
            
            const localValue = local[key];
            
            // null 处理
            if (localValue === null || localValue === undefined) {
              store[key] = localValue;
              return;
            }
            
            // 基本类型，直接赋值
            if (typeof localValue !== 'object') {
              store[key] = localValue;
              return;
            }
            
            // 数组类型
            if (Array.isArray(localValue)) {
              // 确保store有此属性且为数组
              if (!store[key]) {
                try {
                  store[key] = [];
                } catch (err) {
                  console.warn(`创建数组失败 (${key}):`, err);
                  return;
                }
              } else if (!Array.isArray(store[key])) {
                try {
                  // 尝试删除现有属性，重新创建为数组
                  delete store[key];
                  store[key] = [];
                } catch (err) {
                  console.warn(`替换为数组失败 (${key}):`, err);
                  return;
                }
              }
              
              // 递归处理数组
              updateStoreFromLocal(store[key], localValue);
              return;
            }
            
            // 普通对象处理
            if (!store[key] || typeof store[key] !== 'object' || Array.isArray(store[key])) {
              try {
                // 创建新对象
                if (Array.isArray(store[key])) {
                  // 如果当前是数组，需要先删除
                  delete store[key];
                }
                store[key] = {};
              } catch (err) {
                console.warn(`创建对象失败 (${key}):`, err);
                return;
              }
            }
            
            // 递归处理子对象
            updateStoreFromLocal(store[key], localValue);
          } catch (keyErr) {
            console.warn(`处理键 ${key} 时出错:`, keyErr);
          }
        });
      } catch (err) {
        console.error('同步到存储时出错:', err);
      }
    }
    
    // 解析ICE服务器字符串为数组
    function parseIceServers(iceServersString) {
      if (!iceServersString) return []
      
      // 分割行并过滤空行
      const servers = iceServersString.split('\n')
        .map(line => line.trim())
        .filter(line => line)
        .map(url => {
          // 判断是否是完整的URL对象格式
          if (url.startsWith('{') && url.endsWith('}')) {
            try {
              return JSON.parse(url)
            } catch (e) {
              console.warn('解析ICE服务器JSON格式失败:', e)
              return { urls: url }
            }
          }
          
          // 简单URL格式转换为对象
          return { urls: url }
        })
      
      return servers
    }
    
    // 模拟网络中断
    function testNetworkDisruption() {
      if (!syncStore.value || !isConnected.value || networkDisruptionActive.value) return
      
      try {
        // 获取当前的provider
        const provider = syncStore.value.getProvider()
        if (!provider) {
          console.warn('无法获取连接提供者')
          return
        }
        
        // 开始网络中断测试
        networkDisruptionActive.value = true
        networkDisruptionRemaining.value = networkDisruptionDuration
        
        // 强制断开连接
        if (typeof provider.disconnect === 'function') {
          provider.disconnect()
        }
        
        // 定时更新倒计时
        countdownTimer = setInterval(() => {
          networkDisruptionRemaining.value--
          if (networkDisruptionRemaining.value <= 0) {
            cancelNetworkDisruption()
          }
        }, 1000)
        
        // 设置定时器在指定时间后恢复连接
        networkDisruptionTimer = setTimeout(() => {
          cancelNetworkDisruption()
        }, networkDisruptionDuration * 1000)
        
      } catch (err) {
        console.error('模拟网络中断出错:', err)
        networkDisruptionActive.value = false
      }
    }
    
    // 取消网络中断测试
    function cancelNetworkDisruption() {
      if (!networkDisruptionActive.value) return
      
      // 清除计时器
      clearTimeout(networkDisruptionTimer)
      clearInterval(countdownTimer)
      
      // 重置状态
      networkDisruptionActive.value = false
      networkDisruptionRemaining.value = 0
      
      // 尝试重新连接
      if (syncStore.value) {
        syncStore.value.reconnect()
      }
    }
    
    // 组件销毁时确保清理资源
    onBeforeUnmount(() => {
      // 清除网络中断相关的定时器
      if (networkDisruptionTimer) {
        clearTimeout(networkDisruptionTimer)
      }
      if (countdownTimer) {
        clearInterval(countdownTimer)
      }
      
      // 其他清理...
    })
    
    return {
      // 状态
      roomName,
      persist,
      useSiyuan,
      useSyncedStore,
      isConnecting,
      isConnected,
      isLocalDataLoaded,
      connectionStatus,
      connectionStatusText,
      getStatusClass,
      peersCount,
      syncStore,
      
      // 连接配置
      activeConfigTab,
      connectionType,
      autoConnect,
      loadTimeout,
      webrtcConfig,
      siyuanConfig,
      
      // 网络中断测试
      networkDisruptionActive,
      networkDisruptionRemaining,
      networkDisruptionDuration,
      testNetworkDisruption,
      cancelNetworkDisruption,
      
      // 诊断
      showDiagnostics,
      diagnosticsResult,
      getQualityText,
      formatByteSize,
      
      // 数据
      sharedData,
      dataTabs,
      currentTab,
      newItem,
      
      // 方法
      connectRoom,
      disconnectRoom,
      triggerSync,
      clearLocalData,
      getDiagnostics,
      incrementCounter,
      decrementCounter,
      addItem,
      removeItem
    }
  }
}
</script>

<style>
.sync-store-tester {
  font-family: Arial, sans-serif;
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
  color: #333;
}

h2 {
  margin-bottom: 20px;
  color: #333;
  border-bottom: 2px solid #eee;
  padding-bottom: 10px;
}

h3 {
  margin: 20px 0 15px;
  color: #444;
}

.settings-section,
.status-section,
.data-section {
  background: #f9f9f9;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

input[type="text"],
input[type="number"],
textarea,
select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-sizing: border-box;
}

.checkbox-group {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.checkbox-group input {
  margin-right: 8px;
}

.options-group {
  display: flex;
  gap: 20px;
  margin-bottom: 15px;
}

.button-group {
  display: flex;
  gap: 10px;
}

button {
  padding: 8px 12px;
  background: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

button:hover:not(:disabled) {
  background: #e7e7e7;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.primary-button {
  background: #4CAF50;
  color: white;
  border-color: #43A047;
}

.primary-button:hover:not(:disabled) {
  background: #43A047;
}

.danger-button {
  background: #F44336;
  color: white;
  border-color: #E53935;
}

.danger-button:hover:not(:disabled) {
  background: #E53935;
}

.status-card {
  background: white;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 15px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  padding: 5px 0;
  border-bottom: 1px solid #eee;
}

.status-item:last-child {
  border-bottom: none;
}

.status-label {
  font-weight: bold;
}

.status-success {
  color: #4CAF50;
}

.status-error {
  color: #F44336;
}

.status-connecting {
  color: #FFC107;
}

.action-buttons {
  display: flex;
  gap: 10px;
}

.data-tabs {
  display: flex;
  gap: 2px;
  margin-bottom: 15px;
  background: #e9e9e9;
  border-radius: 6px 6px 0 0;
  overflow: hidden;
}

.tab {
  padding: 10px 15px;
  cursor: pointer;
  background: #e0e0e0;
  transition: background 0.2s;
}

.tab:hover {
  background: #d5d5d5;
}

.tab.active {
  background: white;
  font-weight: bold;
}

.data-panel {
  background: white;
  border-radius: 0 0 6px 6px;
  padding: 15px;
}

.counter-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.counter-value {
  font-size: 18px;
  min-width: 40px;
  text-align: center;
}

.items-list {
  max-height: 300px;
  overflow-y: auto;
}

.item-row {
  display: flex;
  gap: 10px;
  margin-bottom: 8px;
}

.add-item-form {
  display: flex;
  gap: 10px;
  margin-top: 15px;
}

.remove-button {
  background: #f0f0f0;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #ddd;
  cursor: pointer;
}

.json-view {
  background: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  max-height: 300px;
  overflow: auto;
  font-family: monospace;
  white-space: pre-wrap;
}

.not-connected-message {
  padding: 40px 20px;
  text-align: center;
  color: #777;
  background: white;
  border-radius: 6px;
}

.diagnostics-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.diagnostics-content {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 20px;
  position: relative;
}

.close-button {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 30px;
  height: 30px;
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
}

.diagnostics-details {
  margin-top: 15px;
}

.diagnostics-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}

.diagnostics-label {
  font-weight: bold;
}

.diagnostics-message {
  margin-top: 20px;
  padding: 10px;
  background: #f9f9f9;
  border-radius: 6px;
}

.diagnostics-loading {
  text-align: center;
  padding: 20px;
  color: #777;
}

.quality-excellent {
  color: #2E7D32;
}

.quality-good {
  color: #4CAF50;
}

.quality-fair {
  color: #FFC107;
}

.quality-poor {
  color: #FF9800;
}

.quality-bad {
  color: #F44336;
}

.quality-unknown {
  color: #9E9E9E;
}

.nested-form {
  margin-top: 10px;
  padding: 10px;
  background: #f9f9f9;
  border-radius: 4px;
}

h5 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #555;
}

/* 网络中断测试样式 */
.network-disruption-panel {
  margin-top: 15px;
  padding: 12px;
  background: #fff4e5;
  border-radius: 6px;
  border: 1px solid #ffd8a8;
}

.network-disruption-panel h4 {
  margin-top: 0;
  color: #d97706;
}

.progress-bar {
  height: 8px;
  background: #f2f2f2;
  border-radius: 4px;
  margin: 10px 0;
  overflow: hidden;
}

.progress-bar-inner {
  height: 100%;
  background: #ffa726;
  transition: width 1s linear;
}

.cancel-button {
  margin-top: 5px;
  background: #ff9800;
  color: white;
  border-color: #fb8c00;
}

.cancel-button:hover:not(:disabled) {
  background: #fb8c00;
}

/* 连接配置样式 */
.connection-config {
  margin-top: 15px;
  background: #f0f0f0;
  border-radius: 6px;
  padding: 0;
  overflow: hidden;
}

.connection-config h4 {
  margin-top: 0;
  padding: 10px 15px;
  background: #e0e0e0;
  font-size: 16px;
}

.config-tabs {
  display: flex;
  background: #e0e0e0;
}

.config-tab {
  padding: 8px 15px;
  cursor: pointer;
  border-right: 1px solid #ccc;
  transition: background 0.2s;
}

.config-tab:hover {
  background: #d0d0d0;
}

.config-tab.active {
  background: #f9f9f9;
  font-weight: bold;
  border-bottom: 3px solid #4CAF50;
}

.config-panel {
  padding: 15px;
  background: #f9f9f9;
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 10px;
}

.radio-group label {
  display: flex;
  align-items: center;
  font-weight: normal;
}

.radio-group input {
  margin-right: 8px;
}
</style> 