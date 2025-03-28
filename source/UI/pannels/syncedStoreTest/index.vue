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

    <!-- CRDT 测试区域 -->
    <div class="crdt-test-area" v-if="sharedState">
      <!-- 文本协同编辑 -->
      <div class="test-section">
        <h3>文本协同编辑</h3>
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

      <!-- 结构化数据编辑 -->
      <div class="test-section">
        <h3>结构化数据编辑</h3>
        <div class="structured-data">
          <div class="counter-ops">
            <span>计数器: {{ sharedState.counter || 0 }}</span>
            <button @click="increment">+1</button>
            <button @click="decrement">-1</button>
          </div>
          <div class="array-ops">
            <h4>数组操作</h4>
            <input 
              v-model="newItem"
              placeholder="新项目"
              @keyup.enter="addArrayItem"
            >
            <button @click="addArrayItem">添加</button>
            <button @click="shuffleArray">随机排序</button>
            <ul>
              <li v-for="(item, index) in sharedState.array" :key="index">
                {{ item }}
                <button @click="removeArrayItem(index)">删除</button>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- 并发操作测试 -->
      <div class="test-section">
        <h3>并发操作测试</h3>
        <div class="concurrent-test">
          <button @click="simulateConcurrentEdits">模拟并发编辑</button>
          <div class="conflict-log">
            <h4>冲突日志</h4>
            <ul>
              <li v-for="(log, index) in conflictLogs" :key="index">
                {{ log }}
              </li>
            </ul>
          </div>
        </div>
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

    <!-- 共享数据编辑区 -->
    <div class="shared-content" v-if="sharedState">
      <div class="editor-section">
        <h3>共享文本</h3>
        <textarea
          v-model="sharedState.text"
          placeholder="输入一些文本，将自动同步到其他客户端"
        ></textarea>
      </div>
      
      <div class="todo-section">
        <h3>共享待办事项</h3>
        <div class="todo-input">
          <input 
            v-model="newTodo"
            placeholder="添加新待办"
            @keyup.enter="addTodo"
          >
          <button @click="addTodo">添加</button>
        </div>
        <ul class="todo-list">
          <li v-for="(todo, index) in sharedState.todos" :key="index">
            <input 
              type="checkbox"
              v-model="todo.completed"
            >
            <span :class="{ 'completed': todo.completed }">{{ todo.text }}</span>
            <button @click="removeTodo(index)">删除</button>
          </li>
        </ul>
      </div>
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
const newTodo = ref('')
const syncInterval = ref(1000)
const autoSyncEnabled = ref(true)
const diagnosticInfo = ref({})
const sharedState = ref(null)
const clientId = ref(`客户端-${Math.random().toString(36).slice(2, 7)}`)
const newItem = ref('')
const conflictLogs = ref([])
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

// 初始化同步存储
const initSyncStore = async () => {
  try {
    if (syncManager) {
      await syncManager.disconnect()
    }

    syncManager = await useSyncStore({
      roomName: roomName.value,
      initialState: {
        text: '',
        counter: 0,
        array: [],
        todos: [],
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
    if (typeof sharedState.value.counter !== 'number') sharedState.value.counter = 0
    if (!Array.isArray(sharedState.value.array)) sharedState.value.array = []
    if (!Array.isArray(sharedState.value.todos)) sharedState.value.todos = []
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

// 待办事项操作
const addTodo = () => {
  if (!newTodo.value.trim() || !sharedState.value) return
  sharedState.value.todos.push({
    text: newTodo.value,
    completed: false
  })
  newTodo.value = ''
}

const removeTodo = (index) => {
  if (!sharedState.value) return
  sharedState.value.todos.splice(index, 1)
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

// 修改文本内容同步监听
watch(() => sharedState.value?.text, (newText, oldText) => {
  if (!editor.value || newText === editor.value.textContent) return
  
  try {
    // 保存当前选区
    const selection = window.getSelection()
    const currentRange = selection.getRangeAt(0)
    const start = getTextPosition(editor.value, currentRange.startContainer, currentRange.startOffset)
    const end = getTextPosition(editor.value, currentRange.endContainer, currentRange.endOffset)
    
    // 更新文本内容
    editor.value.textContent = newText || ''
    
    // 如果是本地更新，恢复光标位置
    if (localSelection.value) {
      const range = document.createRange()
      const pos = getNodeAndOffset(editor.value, start)
      if (pos) {
        range.setStart(pos.node, pos.offset)
        range.setEnd(pos.node, pos.offset)
        selection.removeAllRanges()
        selection.addRange(range)
      }
    }
  } catch (err) {
    console.error('Error in text sync:', err)
  }
}, { immediate: true }) // 添加 immediate: true 确保初始化时同步

// 计数器操作
const increment = () => {
  if (!sharedState.value) return
  sharedState.value.counter = (sharedState.value.counter || 0) + 1
  logOperation(`${clientId.value} 增加计数器`)
}

const decrement = () => {
  if (!sharedState.value) return
  sharedState.value.counter = (sharedState.value.counter || 0) - 1
  logOperation(`${clientId.value} 减少计数器`)
}

// 数组操作
const addArrayItem = () => {
  if (!newItem.value.trim() || !sharedState.value) return
  if (!Array.isArray(sharedState.value.array)) {
    sharedState.value.array = []
  }
  sharedState.value.array.push(`${clientId.value}: ${newItem.value}`)
  newItem.value = ''
  logOperation(`${clientId.value} 添加数组项`)
}

const removeArrayItem = (index) => {
  if (!sharedState.value || !Array.isArray(sharedState.value.array)) return
  sharedState.value.array.splice(index, 1)
  logOperation(`${clientId.value} 删除数组项`)
}

const shuffleArray = () => {
  if (!sharedState.value || !Array.isArray(sharedState.value.array)) return
  const array = [...sharedState.value.array]
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]
  }
  sharedState.value.array = array
  logOperation(`${clientId.value} 打乱数组顺序`)
}

// 并发操作测试
const simulateConcurrentEdits = async () => {
  if (!sharedState.value) return
  
  const operations = [
    () => { sharedState.value.counter = (sharedState.value.counter || 0) + 1 },
    () => { sharedState.value.counter = (sharedState.value.counter || 0) - 1 },
    () => { sharedState.value.array.push(`测试项-${Date.now()}`) },
    () => { sharedState.value.text += ' 并发测试 ' }
  ]

  // 快速执行多个操作
  for (let i = 0; i < 5; i++) {
    const op = operations[Math.floor(Math.random() * operations.length)]
    op()
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  
  logOperation(`${clientId.value} 执行并发测试`)
}

// 日志记录
const logOperation = (message) => {
  const time = new Date().toLocaleTimeString()
  conflictLogs.value.unshift(`${time} - ${message}`)
  if (conflictLogs.value.length > 10) {
    conflictLogs.value.pop()
  }
}

// 生命周期
onMounted(async () => {
  await initSyncStore()
  
  // 初始化编辑器文本
  if (editor.value && sharedState.value?.text) {
    editor.value.textContent = sharedState.value.text
  }
  
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

// 保留这个使用防抖的handleTextChange定义
const handleTextChange = (event) => {
  if (!syncManager?.provider?.awareness || !editor.value) return
  
  try {
    const selection = window.getSelection()
    const range = selection.getRangeAt(0)
    const start = getTextPosition(editor.value, range.startContainer, range.startOffset)
    
    // 使用防抖更新文本
    debouncedTextUpdate(editor.value.textContent)
    
    // 立即更新光标位置
    updateLocalSelection(start, start, syncManager.provider.awareness)
  } catch (err) {
    console.error('Error in handleTextChange:', err)
  }
}
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
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.editor-section textarea {
  width: 100%;
  height: 200px;
  margin-top: 10px;
}

.todo-list {
  list-style: none;
  padding: 0;
}

.todo-list li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px 0;
}

.completed {
  text-decoration: line-through;
  color: #888;
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

.editor-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.editor-controls {
  display: flex;
  gap: 8px;
}

.active-users {
  font-size: 0.9em;
  padding: 4px;
  background: #f5f5f5;
  border-radius: 4px;
}

.user-cursor {
  padding: 2px 4px;
  margin: 2px 0;
}

.editor-wrapper {
  position: relative;
  width: 100%;
}

.cursors-layer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.remote-cursor {
  position: absolute;
  width: 2px;
  height: 20px;
  pointer-events: none;
}

.cursor-flag {
  position: absolute;
  top: -18px;
  left: 0;
  padding: 2px 6px;
  font-size: 12px;
  color: white;
  white-space: nowrap;
  border-radius: 3px;
  transform: translateX(-50%);
}

.editor {
  width: 100%;
  height: 200px;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow-y: auto;
  outline: none;
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