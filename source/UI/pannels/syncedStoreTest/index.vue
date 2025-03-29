<template>
  <div class="sync-test-container">
    <!-- 连接状态和控制面板 -->
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

    <!-- 房间配置 -->
    <div class="room-config">
      <div class="room-input">
        <input 
          v-model="roomName"
          placeholder="输入房间名称"
          @keyup.enter="handleRoomChange"
        >
        <button @click="handleRoomChange">进入房间</button>
      </div>
      <div class="siyuan-config">
        <label>
          <input 
            type="checkbox"
            v-model="siyuanConfig.enabled"
            @change="handleRoomChange"
          >
          启用思源同步
        </label>
        <input 
          v-if="siyuanConfig.enabled"
          v-model.number="siyuanConfig.port"
          type="number"
          placeholder="思源端口"
        >
      </div>
    </div>

    <!-- 将两个编辑器区域改为左右布局 -->
    <div class="editors-container" v-if="sharedState">
      <!-- CRDT 测试区域 (左侧) -->
      <div class="editor-panel">
        <h3>文本协同编辑 (DIV)</h3>
        <div class="editor-container">
          <div class="editor-info">
            <span>当前编辑者: {{ clientId }}</span>
            <span>光标位置: {{ localSelection.start }}</span>
            <span>选区长度: {{ localSelection.end - localSelection.start }}</span>
          </div>
          
          <!-- 修改编辑器容器，添加本地光标支持 -->
          <div class="editor-wrapper" ref="editorWrapper">
            <div class="cursors-layer">
              <!-- 远程用户光标 -->
              <template v-if="Array.isArray(cursorList)">
                <div 
                  v-for="cursor in cursorList"
                  :key="cursor.id"
                  class="remote-cursor"
                  :style="{
                    left: cursor.left + 'px',
                    top: cursor.top + 'px',
                    backgroundColor: cursor.color
                  }"
                >
                  <div class="cursor-flag" :style="{ backgroundColor: cursor.color }">
                    {{ cursor.username }}
                  </div>
                </div>
              </template>
              
              <!-- 添加本地光标 -->
              <div
                v-if="isEditorFocused && useVirtualCursor"
                class="local-cursor"
                :class="{ 'cursor-hidden': !cursorVisible }"
                :style="{
                  left: localCursorCoords.left + 'px',
                  top: localCursorCoords.top + 'px',
                  height: `${lineHeight}px`,
                  backgroundColor: localCursorColor
                }"
              ></div>
              
              <!-- 添加本地选区显示 -->
              <template v-if="hasLocalSelection && useVirtualCursor">
                <div
                  v-for="(rect, index) in localSelectionRects"
                  :key="`selection-${index}`"
                  class="selection-highlight"
                  :style="{
                    left: rect.left + 'px',
                    top: rect.top + 'px',
                    width: rect.width + 'px',
                    height: rect.height + 'px'
                  }"
                ></div>
              </template>
            </div>
            
            <div
              ref="editor"
              class="editor"
              contenteditable="true"
              @input="handleTextChange"
              @keydown="handleKeyDown"
              @select="handleSelection"
              @click="handleEditorClick"
              @mousedown="handleEditorMouseDown"
              @mouseup="handleEditorMouseUp"
              @scroll="handleScroll"
              @focus="handleEditorFocus"
              @blur="handleEditorBlur"
              :style="{
                padding: '8px',
                lineHeight: `${lineHeight}px`,
                fontFamily: 'monospace',
                fontSize: '14px',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                caretColor: useVirtualCursor ? 'transparent' : 'auto'
              }"
            ></div>
          </div>
        </div>
      </div>

      <!-- 共享文本编辑区 (右侧) -->
      <div class="editor-panel">
        <h3>共享文本 (Textarea)</h3>
        <textarea
          v-model="sharedState.text"
          placeholder="输入一些文本，将自动同步到其他客户端"
          class="editor textarea-editor"
        ></textarea>
      </div>
    </div>

    <!-- 同步状态监控 -->
    <div class="sync-monitor">
      <h3>同步状态监控</h3>
      <div class="sync-stats">
      <input 
        v-model="roomName"
        placeholder="输入房间名称"
        @keyup.enter="handleRoomChange"
      >
      <button @click="handleRoomChange">进入房间</button>
    </div>



    <!-- 同步配置 -->
    <div class="sync-config">
      <h3>同步配置</h3>
      <div class="sync-controls">
        <label>
          <input 
            type="checkbox"
            v-model="autoSyncEnabled"
            @change="updateAutoSync"
          >
          启用自动同步
        </label>
        <input 
          type="number"
          v-model.number="syncInterval"
          :disabled="!autoSyncEnabled"
          @change="updateAutoSync"
        >
        <span>ms</span>
      </div>
    </div>

    <!-- 诊断信息 -->
    <div class="diagnostics">
      <h3>连接诊断</h3>
      <button @click="refreshDiagnostics">刷新诊断</button>
      <pre>{{ diagnosticInfo }}</pre>
    </div>

    <!-- 添加调试信息显示 -->
    <div class="debug-info">
      <h3>调试信息</h3>
      <pre>{{ debugInfo }}</pre>
    </div>
  </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useSyncStore } from '../../../../src/toolBox/feature/useSyncedstore/useSyncstore.js'
import { useYText } from './useYText.js'
import { useAwareness } from './useAwareness.js'
import { useCursor } from './useCursor.js'

// 状态
const roomName = ref('test-room')
const isConnected = ref(false)
const status = ref('未连接')
const syncInterval = ref(1000)
const autoSyncEnabled = ref(true)
const diagnosticInfo = ref({})
const sharedState = ref(null)
const clientId = ref(`客户端-${Math.random().toString(36).slice(2, 7)}`)
const syncLatency = ref(0)
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

// 添加 Y.Text 相关功能
const { cursorPosition, activeUsers, textOps, updateCursor, setupAwareness } = useYText(sharedState?.value)

const editor = ref(null)
const editorWrapper = ref(null)
const lineHeight = 20 // 行高固定值
let scrollTop = 0

const {
  cursors,
  localSelection,
  updateLocalSelection,
  setupAwarenessHandlers,
  getUserColor
} = useAwareness()

// 添加一个隐藏的测量容器
const measureContainer = ref(null)

// 添加本地数据加载状态
const localDataLoaded = ref(false)

// 添加虚拟光标相关状态
const useVirtualCursor = ref(true); // 是否使用虚拟光标
const localCursorColor = '#1a73e8'; // 本地光标颜色
const isEditorFocused = ref(false);
const localCursorCoords = ref({ left: 0, top: 0 });
const localSelectionRects = ref([]);
const hasLocalSelection = computed(() => {
  return localSelection.value && 
         localSelection.value.start !== localSelection.value.end;
});

// 使用光标管理模块 - 添加虚拟光标选项
const { 
  localSelection: cursorLocalSelection,
  selections: cursorSelections,
  saveSelection,
  restoreSelection,
  updateRemoteSelection,
  removeRemoteSelection,
  getCursorCoordinates,
  getLocalCursorCoordinates,  // 新增：获取本地光标坐标
  getTextPosition,
  getNodeAndOffset,
  clearCache,
  incrementContentVersion,
  resetCursorBlink,           // 重置光标闪烁
  isVisible,                  // 光标可见状态（闪烁）
  getPositionFromPoint,      // 导入点击位置计算函数
} = useCursor({ 
  containerRef: editor, 
  lineHeight,
  enableCache: true,
  cacheTimeout: 2000,
  useVirtualCursor: true,     // 启用虚拟光标
  cursorColor: localCursorColor,
  cursorWidth: 2,
  blinkInterval: 530
});

// 光标可见性计算属性，对接闪烁状态
const cursorVisible = computed(() => isVisible.value);

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

// 更新 cursorList 计算属性使用新的光标模块
const cursorList = computed(() => {
  if (!cursors.value || !(cursors.value instanceof Map)) {
    return []
  }

  return Array.from(cursors.value.entries())
    .filter(([id]) => id !== clientId.value) // 过滤掉本地光标
    .map(([id, data]) => {
      // 使用新的光标坐标计算
      const { left, top } = getCursorCoordinates(data?.start || 0)
      const color = generateColor(id)
      return {
        id,
        left,
        top,
        color,
        username: data?.username || `用户-${id}`
      }
    })
})

// 初始化同步存储 - 拆分为更小的函数
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
    
    // 初始化编辑器
    console.log('[本地优先] 立即初始化编辑器内容:', sharedState.value.text);
    initializeEditor();
    
    // 初始化Awareness支持
    setupAwarenessSupport();
    
    // 设置远程数据变化回调
    setupRemoteChangeHandler();
    
  } catch (error) {
    console.error('初始化同步存储失败:', error);
    status.value = '初始化失败';
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
    
    // 确保UI更新
    if (editor.value && changedData.text !== undefined && 
        editor.value.textContent !== changedData.text) {
      console.log('从远程更新编辑器:', changedData.text);
      editor.value.textContent = changedData.text;
    }
  };
};

// 连接控制
const handleConnect = () => syncManager?.connect()
const handleDisconnect = () => syncManager?.disconnect()
const handleReconnect = () => syncManager?.reconnect()

// 房间切换
const handleRoomChange = () => {
  initSyncStore()
}

// 更新同步配置
const updateAutoSync = () => {
  syncManager?.setAutoSync({
    enabled: autoSyncEnabled.value,
    interval: syncInterval.value
  })
}

// 刷新诊断信息
const refreshDiagnostics = async () => {
  if (syncManager) {
    diagnosticInfo.value = await syncManager.getDiagnostics()
  }
}

// 处理键盘事件,主要是为了处理回车键
const handleKeyDown = (event) => {
  if (event.key === 'Enter') {
    event.preventDefault()
    document.execCommand('insertLineBreak')
  }
}

// 修改选区变化处理函数
const handleSelection = () => {
  if (!syncManager?.provider?.awareness || !editor.value) return;
  
  try {
    // 使用新的保存选区函数，它会返回序列化的选区信息
    const selection = saveSelection();
    if (!selection) return;
    
    // 更新本地虚拟光标位置
    updateLocalCursorPosition();
    
    // 使用awareness API更新选区
    updateLocalSelection(
      selection.start,
      selection.end,
      syncManager.provider.awareness,
      {
        username: clientId.value,
        timestamp: selection.timestamp,
        text: editor.value.textContent
      }
    );
  } catch (err) {
    console.error('处理选区变化错误:', err);
  }
};

// 修改处理文本变更函数，集成版本管理
const handleTextChange = (event) => {
  if (!syncManager?.provider?.awareness || !editor.value) return;
  
  try {
    // 标记内容已变化，更新缓存版本
    incrementContentVersion();
    
    // 保存当前的选区，这将同时更新cursorLocalSelection
    const selection = saveSelection();
    
    // 更新光标相关状态
    updateEditorState(selection);
    
    // 同步文本内容变更
    syncTextContent(selection);
  } catch (err) {
    console.error('处理文本变更错误:', err);
  }
};

// 更新编辑器状态
const updateEditorState = (selection) => {
  // 更新虚拟光标位置
  updateLocalCursorPosition();
  
  // 重置光标闪烁状态
  resetCursorBlink();
};

// 同步文本内容变更
const syncTextContent = (selection) => {
  if (!sharedState.value || !editor.value) return;
  
  // 只有当内容真正改变时才更新共享状态
  if (sharedState.value.text === editor.value.textContent) return;
  
  console.log(`本地编辑器内容变更:`, editor.value.textContent);
  
  // 同时更新文本和时间戳
  sharedState.value.text = editor.value.textContent;
  sharedState.value.lastUpdate = Date.now();
  
  // 同步选区信息
  syncSelectionToAwareness(selection);
  
  // 主动触发同步
  triggerSync();
};

// 同步选区到Awareness
const syncSelectionToAwareness = (selection) => {
  if (!selection || !syncManager?.provider?.awareness || !editor.value) return;
  
  updateLocalSelection(
    selection.start,
    selection.end,
    syncManager.provider.awareness,
    {
      username: clientId.value,
      timestamp: selection.timestamp,
      text: editor.value.textContent
    }
  );
};

// 触发同步
const triggerSync = () => {
  if (typeof syncManager?.triggerSync === 'function') {
    syncManager.triggerSync();
  }
};

// 修改远程文本更新处理逻辑，增加版本更新和缓存清理
watch(() => sharedState.value?.text, (newText, oldText) => {
  // 基本检查
  if (!editor.value || newText === editor.value.textContent) return;
  
  handleRemoteTextUpdate(newText);
}, { deep: true });

// 处理远程文本更新
const handleRemoteTextUpdate = (newText) => {
  try {
    console.log('接收到远端文本更新:', newText);
    
    // 远程更新导致内容变化，需要更新版本号
    incrementContentVersion();
    
    // 保存选区并更新内容
    updateEditorContent(newText);
    
  } catch (err) {
    console.error('远端文本同步错误:', err);
  }
};

// 更新编辑器内容并尝试保持选区
const updateEditorContent = (newText) => {
  if (!editor.value) return;
  
  // 保存当前选区
  const savedSelection = saveSelection();
  
  // 更新编辑器内容
  editor.value.textContent = newText || '';
  
  // 异步恢复选区
  scheduleSelectionRestore(savedSelection);
};

// 计划恢复选区
const scheduleSelectionRestore = (savedSelection) => {
  if (!editor.value) return;
  
  // 异步恢复选区，给DOM有时间更新
  setTimeout(() => {
    restoreEditorSelection(savedSelection);
  }, 10);
};

// 恢复编辑器选区
const restoreEditorSelection = (savedSelection) => {
  if (!editor.value) return;
  
  // 尝试恢复选区
  if (savedSelection && editor.value === document.activeElement) {
    restoreSelection(savedSelection);
    // 更新虚拟光标位置
    updateLocalCursorPosition();
  }
};

// 集成周期性同步检查，确保文本和光标一致性
const startSyncCheck = () => {
  const syncCheckInterval = setInterval(() => {
    if (sharedState.value && editor.value && document.visibilityState === 'visible') {
      const editorText = editor.value.textContent || '';
      const sharedText = sharedState.value.text || '';
      
      if (editorText !== sharedText) {
        // 内容不同步时更新版本号
        incrementContentVersion();
        
        // 编辑器和共享状态不同步，优先使用共享状态文本
        console.log('检测到不同步，修正编辑器内容');
        editor.value.textContent = sharedText;
        
        // 定期清理缓存，防止内存泄漏
        clearCache();
      }
    }
  }, 3000); // 每3秒检查一次
  
  onUnmounted(() => {
    clearInterval(syncCheckInterval);
  });
};

// 添加可见性变化处理函数
const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    // 页面变为可见时，更新版本号确保内容同步最新
    incrementContentVersion();
  } else {
    // 页面隐藏时清理缓存
    clearCache();
  }
};

// 生命周期
onMounted(async () => {
  // 先初始化同步存储，这会优先加载本地数据
  await initSyncStore();
  
  // 如果编辑器引用已存在，立即初始化
  if (editor.value && sharedState.value) {
    initializeEditor();
  }
  
  // 确保编辑器与共享状态同步
  setTimeout(() => {
    ensureEditorSync();
    
    // 启动周期性同步检查
    startSyncCheck();
  }, 100);
  
  // 设置Awareness系统
  setupAwarenessSystem();
  
  // 设置编辑器事件
  setupEditorEvents();
});

// 设置Awareness系统
const setupAwarenessSystem = () => {
  if (!syncManager?.provider?.awareness) {
    console.warn('No awareness provider available');
    return;
  }
  
  console.log('初始化awareness系统');
  
  // 设置光标监听
  const cleanup = setupAwarenessHandlers(syncManager.provider.awareness);
  
  // 监听远程光标更新
  syncManager.provider.awareness.on('change', debounce(() => {
    if (!syncManager?.provider?.awareness) return;
    
    const states = syncManager.provider.awareness.getStates();
    
    // 更新所有远程用户的选区
    Array.from(states.entries())
      .filter(([id]) => id !== syncManager.provider.awareness.clientID)
      .forEach(([id, state]) => {
        if (state.cursor) {
          updateRemoteSelection(id, {
            start: state.cursor.start,
            end: state.cursor.end,
            username: state.cursor.username || `用户-${id}`,
            timestamp: state.cursor.timestamp || Date.now()
          });
        }
      });
  }, 50));
  
  onUnmounted(() => {
    console.log('清理awareness系统');
    cleanup();
  });
};

// 设置编辑器事件
const setupEditorEvents = () => {
  if (!editor.value) return;
  
  const handleFocus = () => {
    // 当编辑器获得焦点时，确保版本号是最新的
    incrementContentVersion();
  };
  
  const handleBlur = () => {
    // 当编辑器失去焦点时，清理缓存减少内存占用
    clearCache();
  };
  
  editor.value.addEventListener('focus', handleFocus);
  editor.value.addEventListener('blur', handleBlur);
  
  // 监听窗口可见性变化
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // 清理
  onUnmounted(() => {
    if (editor.value) {
      editor.value.removeEventListener('focus', handleFocus);
      editor.value.removeEventListener('blur', handleBlur);
    }
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    
    // 断开连接
    syncManager?.disconnect();
  });
};

// 添加监视器以检查光标更新
watch(cursors, (newCursors) => {
  console.log('Cursors updated:', Array.from(newCursors.entries()))
}, { deep: true })

// 添加调试信息显示
const debugInfo = computed(() => ({
  cursorsCount: cursors.value.size,
  localSelection: localSelection.value,
  awarenessConnected: !!syncManager?.provider?.awareness,
  currentStates: syncManager?.provider?.awareness 
    ? Array.from(syncManager.provider.awareness.getStates().entries())
    : []
}))

// 在组件卸载时清理
onUnmounted(() => {
  if (measureContainer.value) {
    document.body.removeChild(measureContainer.value)
  }
})

// 添加防抖函数来优化文本更新
const debounce = (fn, delay) => {
  let timeoutId
  return (...args) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

// 使用防抖优化文本更新
const debouncedTextUpdate = debounce((text) => {
  if (sharedState.value) {
    sharedState.value.text = text
  }
}, 100)

// 为了安全起见，处理滚动事件也需要添加类似的检查
const handleScroll = (event) => {
  if (!editor.value) return;
  scrollTop = editor.value.scrollTop;
};

// 统一编辑器初始化和同步函数
const initializeEditor = (options = { forceSync: false }) => {
  if (!editor.value || !sharedState.value) return;
  
  const { forceSync = false } = options;
  const editorText = editor.value.textContent || '';
  const sharedText = sharedState.value.text || '';
  
  // 检查是否需要更新内容
  const needsUpdate = forceSync || editorText !== sharedText;
  
  if (needsUpdate) {
    console.log(forceSync ? '强制同步编辑器文本:' : '初始化编辑器文本:', sharedText);
    
    // 保存当前选区
    const savedSelection = saveSelection();
    
    // 更新内容
    editor.value.textContent = sharedText;
    
    // 处理缺省内容的情况
    if (!editor.value.textContent && sharedState.value) {
      const defaultText = '欢迎使用协同编辑器！';
      sharedState.value.text = defaultText;
      editor.value.textContent = defaultText;
    }
    
    // 恢复或初始化选区
    restoreOrInitializeSelection(savedSelection);
  }
};

// 恢复或初始化选区位置
const restoreOrInitializeSelection = (savedSelection) => {
  if (!editor.value) return;
  
  setTimeout(() => {
    // 如果有保存的选区且编辑器处于焦点状态，则恢复选区
    if (savedSelection && document.activeElement === editor.value) {
      restoreSelection(savedSelection);
    } else {
      // 将光标设置到文本末尾
      setSelectionToEnd();
    }
  }, 0);
};

// 将选区设置到文本末尾
const setSelectionToEnd = () => {
  if (!editor.value) return;
  
  const length = editor.value.textContent.length;
  restoreSelection({
    start: length,
    end: length
  });
};

// 确保编辑器和共享状态同步 - 使用统一的初始化函数
const ensureEditorSync = () => {
  initializeEditor({ forceSync: true });
};

// 添加编辑器焦点处理
const handleEditorFocus = () => {
  isEditorFocused.value = true;
  updateLocalCursorPosition();
};

const handleEditorBlur = () => {
  isEditorFocused.value = false;
};

// 添加点击事件处理函数
const handleEditorClick = (event) => {
  if (!useVirtualCursor.value || !editor.value) return;
  
  try {
    // 计算相对于编辑器的点击坐标
    const editorRect = editor.value.getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;
    
    // 使用点击位置获取文本位置
    const result = getPositionFromPoint(editor.value, x, y);
    
    // 如果找到了有效位置，手动设置选择范围
    if (result.node) {
      const selection = window.getSelection();
      const range = document.createRange();
      range.setStart(result.node, result.offset);
      range.setEnd(result.node, result.offset);
      
      selection.removeAllRanges();
      selection.addRange(range);
      
      // 保存选区并更新虚拟光标
      saveSelection();
      updateLocalCursorPosition();
      resetCursorBlink();
    }
  } catch (err) {
    console.error('处理编辑器点击事件错误:', err);
  }
};

// 添加鼠标按下事件处理
const handleEditorMouseDown = (event) => {
  if (!useVirtualCursor.value) return;
  
  // 鼠标按下时，保持光标可见状态（不闪烁）
  isEditorFocused.value = true;
};

// 添加鼠标松开事件处理
const handleEditorMouseUp = (event) => {
  if (!useVirtualCursor.value || !editor.value) return;
  
  // 延迟处理，确保选择已经完成
  setTimeout(() => {
    const selection = saveSelection();
    updateLocalCursorPosition();
    resetCursorBlink();
    
    // 如果形成了选区，立即更新选区高亮显示
    if (hasLocalSelection.value) {
      calculateSelectionRects();
    }
  }, 10);
};

// 重构更新本地光标位置函数，与事件处理分离
const updateLocalCursorPosition = () => {
  if (!useVirtualCursor.value || !editor.value) return;
  
  try {
    // 获取并验证选区
    const selectionInfo = getValidSelection();
    if (!selectionInfo) return;
    
    // 获取光标坐标
    updateCursorCoordinates(selectionInfo);
    
    // 更新选区矩形（如有需要）
    if (selectionInfo.hasTextSelection) {
      calculateSelectionRects();
    } else {
      localSelectionRects.value = [];
    }
  } catch (err) {
    console.error('更新虚拟光标位置错误:', err);
  }
};

// 获取有效的选区信息
const getValidSelection = () => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  
  const range = selection.getRangeAt(0);
  
  // 检查选区是否在编辑器内
  if (!editor.value.contains(range.startContainer) && 
      !editor.value.contains(range.endContainer)) return null;
  
  return {
    selection,
    range,
    hasTextSelection: selection.toString().length > 0
  };
};

// 更新光标坐标
const updateCursorCoordinates = (selectionInfo) => {
  // 优先使用保存的选区信息
  if (cursorLocalSelection.value) {
    localCursorCoords.value = getCursorCoordinates(cursorLocalSelection.value.end);
    return;
  }
  
  // 备用：使用DOM选区计算
  calculateCoordinatesFromDOMRange(selectionInfo.range);
};

// 从DOM范围计算坐标
const calculateCoordinatesFromDOMRange = (range) => {
  if (!editor.value) return;
  
  const editorRect = editor.value.getBoundingClientRect();
  const rangeRect = range.getBoundingClientRect();
  
  localCursorCoords.value = {
    left: rangeRect.right - editorRect.left + editor.value.scrollLeft,
    top: rangeRect.top - editorRect.top + editor.value.scrollTop
  };
};

// 优化计算选区矩形函数
const calculateSelectionRects = () => {
  const selectionInfo = getValidSelection();
  if (!selectionInfo) {
    localSelectionRects.value = [];
    return;
  }
  
  try {
    const rects = getRangeClientRects(selectionInfo.range);
    if (!rects || rects.length === 0) {
      localSelectionRects.value = [];
      return;
    }
    
    // 转换为编辑器内相对坐标
    localSelectionRects.value = transformRectsToEditorCoordinates(rects);
  } catch (err) {
    console.error('计算选区矩形错误:', err);
    localSelectionRects.value = [];
  }
};

// 获取范围的客户端矩形
const getRangeClientRects = (range) => {
  if (!range) return [];
  return range.getClientRects();
};

// 转换矩形到编辑器坐标
const transformRectsToEditorCoordinates = (clientRects) => {
  if (!editor.value || !clientRects.length) return [];
  
  const containerRect = editor.value.getBoundingClientRect();
  
  return Array.from(clientRects).map(rect => ({
    left: rect.left - containerRect.left + editor.value.scrollLeft,
    top: rect.top - containerRect.top + editor.value.scrollTop,
    width: rect.width,
    height: rect.height
  }));
};
</script>

<style scoped>
.sync-test-container {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

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

.room-config {
  margin-bottom: 20px;
}

.shared-content {
  display: none; /* 隐藏旧的编辑区 */
}

.crdt-test-area {
  display: none; /* 隐藏旧的测试区 */
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

.editor-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
}

.editor-wrapper {
  position: relative;
  width: 100%;
  flex: 1;
  display: flex;
}

.editor {
  width: 100%;
  height: 250px; /* 增加编辑器高度 */
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow-y: auto;
  outline: none;
  flex: 1;
}

.textarea-editor {
  padding: 8px;
  font-family: monospace;
  font-size: 14px;
  line-height: 1.5;
  resize: none; /* 禁止调整大小 */
}

.sync-monitor {
  margin-bottom: 20px;
}

.sync-stats {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sync-config {
  margin-bottom: 20px;
}

.sync-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.diagnostics pre {
  background: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  overflow: auto;
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

input[type="text"],
input[type="number"] {
  padding: 5px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.loading-state {
  text-align: center;
  padding: 20px;
  color: #666;
  background: #f5f5f5;
  border-radius: 4px;
  margin: 20px 0;
}

.editor-info {
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
  font-size: 0.9em;
  color: #666;
}

.debug-info {
  margin-top: 20px;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 4px;
}

.debug-info pre {
  white-space: pre-wrap;
  word-break: break-all;
}

/* 添加本地数据加载状态指示器样式 */
.local-data-badge {
  background: #34c759;
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.8em;
  margin-left: 8px;
}

.remote-cursor {
  position: absolute;
  width: 2px;
  height: 20px; /* 与lineHeight匹配 */
  background-color: #ff4081;
  z-index: 2;
  pointer-events: none; /* 允许点击穿透 */
  animation: cursor-blink 1s infinite;
}

.cursor-flag {
  position: absolute;
  top: -20px;
  left: 0;
  padding: 2px 6px;
  font-size: 12px;
  color: white;
  white-space: nowrap;
  border-radius: 2px;
  z-index: 3;
  transform: translateX(-50%);
  opacity: 0.9;
}

/* 添加光标闪烁动画 */
@keyframes cursor-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* 确保光标层覆盖整个编辑区域 */
.cursors-layer {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  z-index: 1;
  pointer-events: none; /* 确保不阻碍编辑 */
}

/* 增强光标和选区样式 */
.local-cursor {
  position: absolute;
  width: 2px;
  height: 20px;
  background-color: #1a73e8;
  z-index: 3;
  pointer-events: none;
  transition: opacity 0.1s ease;
}

.cursor-hidden {
  opacity: 0;
}

.selection-highlight {
  position: absolute;
  background-color: rgba(26, 115, 232, 0.3);
  pointer-events: none;
  z-index: 1;
}

/* 强化光标层样式，确保覆盖编辑区 */
.cursors-layer {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  z-index: 2;
  pointer-events: none;
  overflow: hidden;
}

/* 远程光标样式修改，提高z-index以避免与选区冲突 */
.remote-cursor {
  position: absolute;
  width: 2px;
  height: 20px;
  z-index: 3;
  pointer-events: none;
  animation: cursor-blink 1s infinite;
}

.cursor-flag {
  z-index: 4;
}

/* 编辑器样式增强 */
.editor {
  position: relative;
  z-index: 1;
  /* 当使用虚拟光标时隐藏真实光标 */
  caret-color: transparent;
}
</style>