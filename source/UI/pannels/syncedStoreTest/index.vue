<template>
  <div class="sync-test-container">
    <!-- 连接状态和控制面板 -->
    <ConnectionPanel 
      :isConnected="isConnected"
      :status="status"
      :siyuanEnabled="siyuanEnabled"
      :localDataLoaded="localDataLoaded"
      @connect="handleConnect"
      @disconnect="handleDisconnect" 
      @reconnect="handleReconnect"
    />

    <!-- 房间配置 -->
    <RoomConfigPanel
      :roomName="roomName"
      :siyuanConfig="siyuanConfig"
      @change="handleRoomConfigChange"
    />

    <!-- 编辑器区域 -->
    <div class="editors-container" v-if="sharedState">
      <!-- 协同编辑器 (左侧) -->
      <div class="editor-panel">
        <h3>文本协同编辑 (DIV)</h3>
        <CollaborativeEditor
          ref="collaborativeEditor"
          :clientId="clientId"
          :initialText="sharedState.text"
          :remoteUsers="processedCursorList"
          :lineHeight="lineHeight"
          :useVirtualCursor="useVirtualCursor"
          :cursorColor="localCursorColor"
          @textChange="handleCollaborativeTextChange"
          @selectionChange="handleCollaborativeSelectionChange"
          @cursorUpdate="handleCursorUpdate"
        />
      </div>

      <!-- 共享文本编辑区 (右侧) -->
      <div class="editor-panel">
        <SimpleTextEditor
          :value="sharedState.text"
          @update:value="handleSimpleTextChange"
        />
      </div>
    </div>

    <!-- 同步配置 -->
    <SyncConfigPanel
      :enabled="autoSyncEnabled"
      :interval="syncInterval"
      @change="handleSyncConfigChange"
    />

    <!-- 诊断信息 -->
    <DiagnosticsPanel
      :diagnosticInfo="diagnosticInfo"
      @refresh="refreshDiagnostics"
    />

    <!-- 调试信息显示 -->
    <DebugInfoPanel :debugInfo="debugInfo" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useSyncStore } from '../../../../src/toolBox/feature/useSyncedstore/useSyncstore.js'
import { useAwareness } from './useAwareness.js'

// 导入组件
import ConnectionPanel from './components/ConnectionPanel.vue'
import RoomConfigPanel from './components/RoomConfigPanel.vue'
import CollaborativeEditor from './components/CollaborativeEditor.vue'
import SimpleTextEditor from './components/SimpleTextEditor.vue'
import SyncConfigPanel from './components/SyncConfigPanel.vue'
import DiagnosticsPanel from './components/DiagnosticsPanel.vue'
import DebugInfoPanel from './components/DebugInfoPanel.vue'

// 状态
const roomName = ref('test-room')
const isConnected = ref(false)
const status = ref('未连接')
const syncInterval = ref(1000)
const autoSyncEnabled = ref(true)
const diagnosticInfo = ref({})
const sharedState = ref(null)
const clientId = ref(`客户端-${Math.random().toString(36).slice(2, 7)}`)
const changeFrequency = ref(0)
const lastSyncTime = ref('-')

// 添加思源配置
const siyuanConfig = ref({
  enabled: false,
  port: 6806,
  host: '127.0.0.1',
  channel: 'sync-test',
  token: 'xqatmtk3jfpchiah'
})
const siyuanEnabled = ref(false)

// 存储同步管理器实例
let syncManager = null

// 协同编辑器引用
const collaborativeEditor = ref(null)
const lineHeight = 20 // 行高固定值

const {
  cursors,
  localSelection,
  updateLocalSelection,
  setupAwarenessHandlers
} = useAwareness()

// 添加本地数据加载状态
const localDataLoaded = ref(false)

// 添加虚拟光标相关状态
const useVirtualCursor = ref(true); // 是否使用虚拟光标
const localCursorColor = '#1a73e8'; // 本地光标颜色

// 计算处理过的光标列表，用于协同编辑器
const processedCursorList = computed(() => {
  if (!cursors.value || !(cursors.value instanceof Map)) {
    return []
  }

  return Array.from(cursors.value.entries())
    .filter(([id]) => id !== clientId.value) // 过滤掉本地光标
    .map(([id, data]) => {
      // 使用颜色生成函数
      const color = generateColor(id)
      return {
        id,
        start: data?.start || 0,
        end: data?.end || 0,
        left: data?.left || 0,
        top: data?.top || 0,
        color,
        username: data?.username || `用户-${id}`
      }
    })
})

// 添加颜色生成函数
const generateColor = (id) => {
  // 使用简单的哈希算法
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  // 确保颜色明亮且易于区分
  const h = Math.abs(hash) % 360
  const s = 70 + (Math.abs(hash >> 8) % 30) // 70-100% 饱和度
  const l = 45 + (Math.abs(hash >> 16) % 10) // 45-55% 亮度
  
  return `hsl(${h}, ${s}%, ${l}%)`
}

// 生命周期
onMounted(async () => {
  try {
    // 初始化同步存储
    await initSyncStore();
    
    // 启动周期性同步检查
    startSyncCheck();
    
    // 设置Awareness系统
    setupAwarenessSystem();
  } catch (error) {
    console.error('组件挂载错误:', error);
    status.value = '初始化出错';
  }
});

// 初始化同步存储
const initSyncStore = async () => {
  try {
    // 先清理现有连接
    await cleanupExistingConnection();
    
    // 创建新的同步管理器
    await createSyncManager();
    
    // 初始化组件状态
    initializeComponentState();
    
    // 设置监听器
    setupStateWatchers();
    
    // 初始化Awareness支持
    setupAwarenessSupport();
    
    // 设置远程数据变化回调
    setupRemoteChangeHandler();
    
  } catch (error) {
    console.error('初始化同步存储失败:', error);
    status.value = '初始化失败';
    throw error; // 向上传递错误以便处理
  }
};

// 清理现有连接
const cleanupExistingConnection = async () => {
  if (syncManager) {
    await syncManager.disconnect();
  }
};

// 创建同步管理器
const createSyncManager = async () => {
  syncManager = await useSyncStore({
    roomName: roomName.value,
    initialState: {
      text: '欢迎使用协同编辑器！',
      lastUpdate: Date.now(),
      cursors: {}
    },
    autoSync: {
      enabled: autoSyncEnabled.value,
      interval: syncInterval.value,
      heartbeatField: 'lastUpdate'
    },
    // 思源配置
    siyuan: {
      enabled: siyuanConfig.value.enabled,
      port: siyuanConfig.value.port,
      host: siyuanConfig.value.host,
      channel: siyuanConfig.value.channel,
      token: siyuanConfig.value.token
    }
  });
};

// 初始化组件状态
const initializeComponentState = () => {
  if (!syncManager) return;
  
  // 设置基本状态
  sharedState.value = syncManager.store;
  isConnected.value = syncManager.isConnected;
  status.value = syncManager.status;
  siyuanEnabled.value = syncManager.siyuanEnabled;
  localDataLoaded.value = syncManager.isLocalDataLoaded;
  
  // 确保所有必要的属性都被初始化
  ensureStateProperties();
};

// 确保状态属性初始化
const ensureStateProperties = () => {
  if (!sharedState.value) return;
  
  if (!sharedState.value.text) {
    sharedState.value.text = '';
  }
  
  if (!sharedState.value.lastUpdate) {
    sharedState.value.lastUpdate = Date.now();
  }
};

// 设置状态监听器
const setupStateWatchers = () => {
  if (!syncManager) return;
  
  // 连接状态监听
  watch(() => syncManager.isConnected, (newValue) => {
    isConnected.value = newValue;
  });
  
  // 状态文本监听
  watch(() => syncManager.status, (newValue) => {
    status.value = newValue;
  });
  
  // 同步状态监听
  const syncStatusInterval = setInterval(() => {
    if (syncManager) {
      const syncStatus = syncManager.getAutoSyncStatus();
      changeFrequency.value = Math.round(syncStatus.changeFrequency * 100) / 100;
      lastSyncTime.value = new Date(syncStatus.lastSyncTime).toLocaleTimeString();
    }
  }, 1000);
  
  // 清理定时器
  onUnmounted(() => {
    clearInterval(syncStatusInterval);
  });
};

// 设置Awareness支持
const setupAwarenessSupport = () => {
  if (!syncManager?.provider?.awareness) return;
  
  const cleanup = setupAwarenessHandlers(syncManager.provider.awareness);
  
  // 添加到卸载清理队列
  onUnmounted(() => cleanup && cleanup());
};

// 设置远程数据变化处理器
const setupRemoteChangeHandler = () => {
  if (!syncManager) return;
  
  syncManager.onRemoteChange = (changedData) => {
    console.log('远程数据变化:', changedData);
    
    // 确保编辑器更新
    if (changedData.text !== undefined && collaborativeEditor.value) {
      collaborativeEditor.value.setText(changedData.text);
    }
  };
};

// 连接控制
const handleConnect = () => syncManager?.connect()
const handleDisconnect = () => syncManager?.disconnect()
const handleReconnect = () => syncManager?.reconnect()

// 房间配置变更处理
const handleRoomConfigChange = (config) => {
  roomName.value = config.roomName;
  siyuanConfig.value = config.siyuanConfig;
  
  // 重新初始化同步存储
  initSyncStore();
}

// 同步配置变更处理
const handleSyncConfigChange = (config) => {
  autoSyncEnabled.value = config.enabled;
  syncInterval.value = config.interval;
  
  // 更新同步配置
  syncManager?.setAutoSync({
    enabled: autoSyncEnabled.value,
    interval: syncInterval.value
  });
}

// 协同编辑器文本变更处理
const handleCollaborativeTextChange = (data) => {
  if (!sharedState.value) return;
  
  // 更新共享状态
  sharedState.value.text = data.text;
  sharedState.value.lastUpdate = Date.now();
  
  // 主动触发同步
  triggerSync();
}

// 协同编辑器选区变更处理
const handleCollaborativeSelectionChange = (data) => {
  if (!syncManager?.provider?.awareness) return;
  
  // 使用awareness API更新选区
  updateLocalSelection(
    data.start,
    data.end,
    syncManager.provider.awareness,
    {
      username: clientId.value,
      timestamp: Date.now(),
      text: data.text
    }
  );
}

// 协同编辑器光标更新处理 - 添加
const handleCursorUpdate = (data) => {
  if (!syncManager?.provider?.awareness) return;
  
  // 更新光标坐标到awareness
  updateLocalSelection(
    data.start,
    data.end,
    syncManager.provider.awareness,
    {
      username: clientId.value,
      timestamp: data.timestamp,
      coords: data.coords, // 添加坐标信息
      text: data.text
    }
  );
}

// 简单文本编辑器变更处理
const handleSimpleTextChange = (text) => {
  if (!sharedState.value) return;
  
  // 更新共享状态
  sharedState.value.text = text;
  sharedState.value.lastUpdate = Date.now();
  
  // 确保协同编辑器同步更新
  if (collaborativeEditor.value) {
    collaborativeEditor.value.setText(text);
  }
  
  // 主动触发同步
  triggerSync();
}

// 刷新诊断信息
const refreshDiagnostics = async () => {
  try {
    if (!syncManager) {
      diagnosticInfo.value = { error: '同步管理器未初始化' };
      return;
    }
    
    // 设置诊断状态
    diagnosticInfo.value = { status: '正在获取诊断信息...' };
    
    // 获取诊断信息
    const diagInfo = await syncManager.getDiagnostics();
    
    // 增强诊断信息
    diagnosticInfo.value = {
      ...diagInfo,
      clientId: clientId.value,
      roomName: roomName.value,
      editorStatus: collaborativeEditor.value ? '已加载' : '未加载',
      localState: {
        connected: isConnected.value,
        statusText: status.value,
        localDataLoaded: localDataLoaded.value,
        cursorCount: cursors.value?.size || 0
      },
      timestamp: new Date().toLocaleString()
    };
    
    console.log('诊断信息已更新:', diagnosticInfo.value);
  } catch (error) {
    console.error('获取诊断信息失败:', error);
    diagnosticInfo.value = { error: `获取诊断信息失败: ${error.message}` };
  }
};

// 集成周期性同步检查
const startSyncCheck = () => {
  const syncCheckInterval = setInterval(() => {
    if (sharedState.value && collaborativeEditor.value && document.visibilityState === 'visible') {
      const editorText = collaborativeEditor.value.getText() || '';
      const sharedText = sharedState.value.text || '';
      
      if (editorText !== sharedText) {
        // 编辑器和共享状态不同步，优先使用共享状态文本
        console.log('检测到不同步，修正编辑器内容');
        collaborativeEditor.value.setText(sharedText);
      }
    }
  }, 3000); // 每3秒检查一次
  
  onUnmounted(() => {
    clearInterval(syncCheckInterval);
  });
};

// 设置Awareness系统
const setupAwarenessSystem = () => {
  if (!syncManager?.provider?.awareness) {
    console.warn('无法访问awareness提供者');
    return;
  }

  // 防止重复初始化
  if (syncManager._awarenessInitialized) {
    console.log('Awareness系统已初始化，跳过');
    return;
  }
  
  console.log('初始化awareness系统');
  
  // 设置光标监听
  const cleanup = setupAwarenessHandlers(syncManager.provider.awareness);
  
  // 监听远程光标更新 - 优化为使用节流函数
  const changeHandler = throttle(() => {
    if (!syncManager?.provider?.awareness) return;
    
    const states = syncManager.provider.awareness.getStates();
    
    // 处理远程用户状态变化
    if (states.size > 0) {
      console.log(`Awareness状态更新: ${states.size} 个用户`);
    }
  }, 300);
  
  syncManager.provider.awareness.on('change', changeHandler);
  
  // 标记为已初始化
  syncManager._awarenessInitialized = true;
  
  onUnmounted(() => {
    console.log('清理awareness系统');
    cleanup();
    
    if (syncManager?.provider?.awareness) {
      syncManager.provider.awareness.off('change', changeHandler);
    }
  });
};

// 添加节流函数优化高频事件处理
const throttle = (fn, delay) => {
  let lastTime = 0;
  return (...args) => {
    const now = Date.now();
    if (now - lastTime >= delay) {
      lastTime = now;
      fn(...args);
    }
  };
}

// 防抖函数
const debounce = (fn, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

// 触发同步
const triggerSync = () => {
  if (typeof syncManager?.triggerSync === 'function') {
    syncManager.triggerSync();
  }
};

// 添加调试信息显示
const debugInfo = computed(() => ({
  cursorsCount: cursors.value?.size || 0,
  localSelection: localSelection.value,
  awarenessConnected: !!syncManager?.provider?.awareness,
  currentStates: syncManager?.provider?.awareness 
    ? Array.from(syncManager.provider.awareness.getStates().entries())
    : []
}))

// 在组件卸载时清理
onUnmounted(() => {
  // 断开连接
  syncManager?.disconnect();
})
</script>

<style scoped>
.sync-test-container {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.editors-container {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.editor-panel {
  flex: 1; /* 使两边均等分空间 */
  display: flex;
  flex-direction: column;
  min-width: 0; /* 防止flex项目溢出 */
}

.editor-panel h3 {
  margin-bottom: 10px;
}

button {
  padding: 5px 10px;
  border-radius: 4px;
  border: 1px solid #ddd;
  background: #fff;
  cursor: pointer;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>