<template>
  <div class="sync-test-container">
    <!-- 连接状态和控制面板 -->
    <div class="connection-panel">
      <div class="status-display">
        <span class="status-dot" :class="{ 'connected': isConnected }"></span>
        状态: {{ status }}
        <span v-if="siyuanEnabled" class="siyuan-badge">思源已连接</span>
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
          
          <!-- 添加光标指示器容器 -->
          <div class="editor-wrapper" ref="editorWrapper">
            <div class="cursors-layer">
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
            </div>
            
            <div
              ref="editor"
              class="editor"
              contenteditable="true"
              @input="handleTextChange"
              @keydown="handleKeyDown"
              @select="handleSelection"
              @scroll="handleScroll"
              :style="{
                padding: '8px',
                lineHeight: `${lineHeight}px`,
                fontFamily: 'monospace',
                fontSize: '14px',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word'
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

    <!-- 如果还没有初始化完成，显示加载状态 -->
    <div v-else class="loading-state">
      正在初始化同步存储...
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

// 更新 cursorList 计算属性
const cursorList = computed(() => {
  if (!cursors.value || !(cursors.value instanceof Map)) {
    return []
  }

  return Array.from(cursors.value.entries())
    .filter(([id]) => id !== clientId.value) // 过滤掉本地光标
    .map(([id, data]) => {
      const { left, top } = getCursorPosition(data?.start || 0)
      const color = generateColor(id) // 使用生成的颜色
      return {
        id,
        left,
        top,
        color,
        username: data?.username || `用户-${id}`
      }
    })
})

// 添加getNodeAndOffset函数定义
const getNodeAndOffset = (container, position) => {
  // 处理边界情况
  if (!container || position < 0) return null;
  if (container.textContent.length < position) {
    position = container.textContent.length;
  }
  
  let currentPos = 0;
  let targetNode = null;
  let targetOffset = 0;
  
  // 遍历文本节点找到目标位置
  const treeWalker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  
  let node = treeWalker.nextNode();
  while (node) {
    const length = node.textContent.length;
    if (currentPos + length >= position) {
      targetNode = node;
      targetOffset = position - currentPos;
      break;
    }
    currentPos += length;
    node = treeWalker.nextNode();
  }
  
  // 如果没有文本节点，返回容器本身
  if (!targetNode && position === 0) {
    // 创建一个新的文本节点，如果没有
    const textNode = document.createTextNode('');
    container.appendChild(textNode);
    return { node: textNode, offset: 0 };
  }
  
  // 如果找到目标节点，返回节点和偏移
  if (targetNode) {
    return { node: targetNode, offset: targetOffset };
  }
  
  return null;
};

// 初始化同步存储
const initSyncStore = async () => {
  try {
    if (syncManager) {
      await syncManager.disconnect()
    }

    syncManager = await useSyncStore({
      roomName: roomName.value,
      initialState: {
        text: '欢迎使用协同编辑器！',
        lastUpdate: Date.now()
      },
      autoSync: {
        enabled: autoSyncEnabled.value,
        interval: syncInterval.value,
        heartbeatField: 'lastUpdate'
      },
      // 添加思源配置
      siyuan: {
        enabled: siyuanConfig.value.enabled,
        port: siyuanConfig.value.port,
        host: siyuanConfig.value.host,
        channel: siyuanConfig.value.channel,
        token: siyuanConfig.value.token
      }
    })

    // 初始化状态
    sharedState.value = syncManager.store
    isConnected.value = syncManager.isConnected
    status.value = syncManager.status
    siyuanEnabled.value = syncManager.siyuanEnabled

    // 确保所有必要的属性都被初始化
    if (!sharedState.value.text) sharedState.value.text = ''
    if (!sharedState.value.lastUpdate) sharedState.value.lastUpdate = Date.now()

    // 监听状态变化
    watch(() => syncManager.isConnected, (newValue) => {
      isConnected.value = newValue
    })

    watch(() => syncManager.status, (newValue) => {
      status.value = newValue
    })

    // 监听同步状态
    setInterval(() => {
      if (syncManager) {
        const syncStatus = syncManager.getAutoSyncStatus()
        changeFrequency.value = Math.round(syncStatus.changeFrequency * 100) / 100
        lastSyncTime.value = new Date(syncStatus.lastSyncTime).toLocaleTimeString()
      }
    }, 1000)

    // 初始化 Y.Text 支持
    if (syncManager?.provider?.awareness) {
      const cleanup = setupAwarenessHandlers(syncManager.provider.awareness)
      onUnmounted(() => cleanup && cleanup())
    }

    // 添加显式的远程数据变化回调
    syncManager.onRemoteChange = (changedData) => {
      console.log('远程数据变化:', changedData);
      // 确保UI更新
      if (editor.value && changedData.text !== undefined && 
          editor.value.textContent !== changedData.text) {
        console.log('从远程更新编辑器:', changedData.text);
        editor.value.textContent = changedData.text;
      }
    };

  } catch (error) {
    console.error('初始化同步存储失败:', error)
    status.value = '初始化失败'
  }
}

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
  if (!syncManager?.provider?.awareness || !editor.value) return
  
  try {
    const selection = window.getSelection()
    if (!selection.rangeCount) return
    
    const range = selection.getRangeAt(0)
    const container = editor.value
    
    const start = getTextPosition(container, range.startContainer, range.startOffset)
    const end = getTextPosition(container, range.endContainer, range.endOffset)
    
    console.log('选区变化:', { start, end }) // 调试日志
    updateLocalSelection(start, end, syncManager.provider.awareness)
  } catch (err) {
    console.error('Error in handleSelection:', err)
  }
}

// 重写获取文本位置的函数
const getTextPosition = (container, node, offset) => {
  // 如果节点是文本节点，直接计算
  if (node.nodeType === Node.TEXT_NODE) {
    let position = offset
    let currentNode = node
    
    // 向前遍历所有文本节点
    while (currentNode.previousSibling || currentNode.parentNode !== container) {
      if (currentNode.previousSibling) {
        currentNode = currentNode.previousSibling
        position += currentNode.textContent?.length || 0
      } else {
        currentNode = currentNode.parentNode
      }
    }
    
    return position
  }
  
  // 如果节点是元素节点
  let position = 0
  const treeWalker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null,
    false
  )
  
  let currentNode = treeWalker.nextNode()
  while (currentNode && currentNode !== node) {
    position += currentNode.textContent.length
    currentNode = treeWalker.nextNode()
  }
  
  return position + offset
}

// 重写光标位置计算函数
const getCursorPosition = (position) => {
  try {
    if (!editor.value) return { left: 0, top: 0 }
    
    // 创建一个范围来定位光标
    const range = document.createRange()
    let currentPos = 0
    let targetNode = null
    let targetOffset = 0
    
    // 遍历文本节点找到目标位置
    const treeWalker = document.createTreeWalker(
      editor.value,
      NodeFilter.SHOW_TEXT,
      null,
      false
    )
    
    let node = treeWalker.nextNode()
    while (node) {
      const length = node.textContent.length
      if (currentPos + length >= position) {
        targetNode = node
        targetOffset = position - currentPos
        break
      }
      currentPos += length
      node = treeWalker.nextNode()
    }
    
    // 如果没找到目标节点，使用最后一个节点
    if (!targetNode && editor.value.lastChild) {
      targetNode = editor.value.lastChild
      targetOffset = targetNode.textContent.length
    }
    
    // 如果找到了目标节点，设置范围
    if (targetNode) {
      range.setStart(targetNode, targetOffset)
      range.setEnd(targetNode, targetOffset)
      
      const rect = range.getBoundingClientRect()
      const editorRect = editor.value.getBoundingClientRect()
      
      return {
        left: rect.left - editorRect.left + editor.value.scrollLeft,
        top: rect.top - editorRect.top + editor.value.scrollTop
      }
    }
    
    return { left: 0, top: 0 }
  } catch (err) {
    console.error('计算光标位置出错:', err)
    return { left: 0, top: 0 }
  }
}

// 修改文本监听器，增加深度监听和immediate选项
watch(() => sharedState.value?.text, (newText, oldText) => {
  if (!editor.value) return;
  if (newText === editor.value.textContent) return;
  
  try {
    console.log('接收到远端文本更新:', newText);
    
    // 更新文本内容
    editor.value.textContent = newText || '';
    
    // 保存选区信息，因为内容更新可能会导致选区丢失
    try {
      const selection = window.getSelection();
      // 在设置完文本后，强制重新聚焦编辑器
      if (document.activeElement === editor.value && selection.rangeCount > 0) {
        // 内容改变后保持用户当前焦点状态
        setTimeout(() => {
          editor.value.focus();
        }, 0);
      }
    } catch (e) {
      console.warn('保存选区失败:', e);
    }
  } catch (err) {
    console.error('远端文本同步错误:', err);
  }
}, { deep: true, immediate: true }); // 添加深度监听和立即执行选项

// 添加完全独立的初始化函数
const initializeEditor = () => {
  if (!editor.value || !sharedState.value) return;
  
  console.log('直接初始化编辑器文本:', sharedState.value.text);
  // 初始化编辑器文本
  editor.value.textContent = sharedState.value.text || '';
  
  // 强制触发一次输入事件以确保状态正确同步
  const event = new Event('input', { bubbles: true });
  editor.value.dispatchEvent(event);
};

// 生命周期
onMounted(async () => {
  await initSyncStore();
  
  // 立即初始化编辑器（不等待）
  initializeEditor();
  
  // 然后再使用setTimeout确保DOM和状态都准备好后再次同步
  setTimeout(() => {
    ensureEditorSync();
    
    // 添加轮询检查，确保远程更新能被应用
    const syncInterval = setInterval(() => {
      if (sharedState.value && editor.value) {
        if (sharedState.value.text !== editor.value.textContent) {
          console.log('轮询检测到不同步，强制更新');
          editor.value.textContent = sharedState.value.text || '';
        }
      } else {
        clearInterval(syncInterval);
      }
    }, 2000); // 每2秒检查一次
    
    // 组件卸载时清理
    onUnmounted(() => {
      clearInterval(syncInterval);
    });
  }, 100);
  
  if (syncManager?.provider?.awareness) {
    console.log('Initializing awareness system')
    
    // 初始化本地光标位置
    updateLocalSelection(0, 0, syncManager.provider.awareness)
    
    // 设置光标监听
    const cleanup = setupAwarenessHandlers(syncManager.provider.awareness)
    
    onUnmounted(() => {
      console.log('Cleaning up awareness system')
      cleanup()
      syncManager?.disconnect()
    })
  } else {
    console.warn('No awareness provider available')
  }
})

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

// 修改handleTextChange函数，改进本地更新逻辑
const handleTextChange = (event) => {
  if (!syncManager?.provider?.awareness || !editor.value) return;
  
  try {
    // 记录当前时间以便调试
    const now = new Date().toISOString();
    
    // 只有当内容真正改变时才更新共享状态
    if (sharedState.value && sharedState.value.text !== editor.value.textContent) {
      console.log(`[${now}] 本地编辑器内容变更:`, editor.value.textContent);
      
      // 设置一个标志，表示这是本地更新，避免循环更新
      const isLocalUpdate = true;
      
      // 更新共享状态，使用函数式更新确保触发响应式
      sharedState.value = {
        ...sharedState.value,
        text: editor.value.textContent,
        lastLocalUpdate: now
      };
      
      // 主动触发同步（如果syncManager支持）
      if (typeof syncManager.sync === 'function') {
        syncManager.sync();
      }
    }
    
    // 添加安全检查，确保selection存在且有range
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      console.log('无有效选区，跳过光标位置更新');
      return;
    }
    
    const range = selection.getRangeAt(0);
    const start = getTextPosition(editor.value, range.startContainer, range.startOffset);
    
    // 立即更新光标位置
    updateLocalSelection(start, start, syncManager.provider.awareness);
  } catch (err) {
    console.error('选区处理错误:', err);
  }
};

// 为了安全起见，处理滚动事件也需要添加类似的检查
const handleScroll = (event) => {
  if (!editor.value) return;
  scrollTop = editor.value.scrollTop;
};

// 添加修复初始化函数
const ensureEditorSync = () => {
  if (!editor.value || !sharedState.value) return;
  
  // 强制编辑器内容与共享状态同步
  if (editor.value.textContent !== sharedState.value.text) {
    console.log('强制同步编辑器文本:', sharedState.value.text);
    editor.value.textContent = sharedState.value.text || '';
    
    // 尝试设置光标到末尾
    try {
      const selection = window.getSelection();
      const range = document.createRange();
      const textLength = editor.value.textContent.length;
      
      // 获取最后一个文本节点
      const treeWalker = document.createTreeWalker(
        editor.value, 
        NodeFilter.SHOW_TEXT, 
        null, 
        false
      );
      
      let lastNode = null;
      let node;
      while (node = treeWalker.nextNode()) {
        lastNode = node;
      }
      
      // 如果有文本节点，将光标设置到末尾
      if (lastNode) {
        range.setStart(lastNode, lastNode.textContent.length);
        range.setEnd(lastNode, lastNode.textContent.length);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    } catch (e) {
      console.warn('设置光标位置失败:', e);
    }
  }
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
</style>