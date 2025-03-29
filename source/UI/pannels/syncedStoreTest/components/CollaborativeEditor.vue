<template>
  <div class="collaborative-editor-container">
    <!-- 协作状态指示器 -->
    <div class="collaboration-status" v-if="showStatus">
      <div class="status-indicator" :class="{ connected: isConnected }"></div>
      <span>{{ isConnected ? '已连接' : '连接中...' }}</span>
      <span v-if="isConnected && remoteUsersCount > 0" class="user-count">
        {{ remoteUsersCount }}人在线
      </span>
    </div>
    
    <!-- 协作者光标层 -->
    <div class="collaborators-container" ref="collaboratorsContainerRef">
      <!-- 远程用户光标 -->
      <div 
        v-for="user in remoteUsers" 
        :key="user.clientId" 
        class="remote-cursor" 
        :style="{
          left: user.cursor?.left + 'px',
          top: user.cursor?.top + 'px',
          height: `${lineHeight}px`,
          backgroundColor: user.color
        }"
      >
        <div class="cursor-flag" :style="{ backgroundColor: user.color }">
          {{ user.name || '用户' + user.clientId }}
        </div>
      </div>
      
      <!-- 远程用户选区 -->
      <template v-for="user in remoteUsers" :key="`selection-${user.clientId}`">
        <div
          v-for="(rect, index) in user.selectionRects || []"
          :key="`selection-${user.clientId}-${index}`"
          class="remote-selection-highlight"
          :style="{
            left: rect.left + 'px',
            top: rect.top + 'px',
            width: rect.width + 'px',
            height: rect.height + 'px',
            backgroundColor: `${user.color}33`
          }"
        ></div>
      </template>
    </div>
    
    <!-- 基础编辑器 -->
    <BaseEditor
      ref="editorRef"
      v-model="localText"
      :line-height="lineHeight"
      :font-size="fontSize"
      :font-family="fontFamily"
      :padding="padding"
      :cursor-color="cursorColor"
      :cursor-width="cursorWidth"
      :selection-color="selectionColor"
      :read-only="readOnly"
      :auto-focus="autoFocus"
      :should-handle-enter="shouldHandleEnter"
      :use-internal-cursor="useInternalCursor"
      :show-info="showInfo"
      :editor-style="editorStyle"
      @focus="handleFocus"
      @blur="handleBlur"
      @selection-change="handleSelectionChange"
      @cursor-move="handleCursorMove"
      @ready="handleEditorReady"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import BaseEditor from './BaseEditor.vue'
import { throttle } from '/plugins/SACAssetsManager/source/UI/pannels/syncedStoreTest/utils.js'

// 组件属性
const props = defineProps({
  // 编辑器内容
  modelValue: {
    type: String,
    default: ''
  },
  
  // 样式相关
  lineHeight: {
    type: Number,
    default: 20
  },
  fontSize: {
    type: Number,
    default: 14
  },
  fontFamily: {
    type: String,
    default: 'monospace'
  },
  padding: {
    type: Number,
    default: 8
  },
  cursorColor: {
    type: String,
    default: '#1a73e8'
  },
  cursorWidth: {
    type: Number,
    default: 2
  },
  selectionColor: {
    type: String,
    default: 'rgba(26, 115, 232, 0.3)'
  },
  
  // 行为相关
  readOnly: {
    type: Boolean,
    default: false
  },
  autoFocus: {
    type: Boolean,
    default: false
  },
  shouldHandleEnter: {
    type: Boolean,
    default: true
  },
  
  // 协作相关
  syncProvider: {
    type: Object,
    required: true
  },
  awarenessState: {
    type: Object,
    default: () => ({})
  },
  
  // 特性开关
  useInternalCursor: {
    type: Boolean,
    default: true
  },
  showInfo: {
    type: Boolean,
    default: false
  },
  showStatus: {
    type: Boolean,
    default: true
  },
  
  // 其他样式
  editorStyle: {
    type: Object,
    default: () => ({})
  }
})

// 触发事件
const emit = defineEmits([
  'update:modelValue',      // 内容变更
  'focus',                 // 获得焦点
  'blur',                  // 失去焦点
  'selection-change',       // 选区变更
  'cursor-move',            // 光标移动
  'ready',                 // 编辑器就绪
  'remote-presence-change', // 远程用户状态变更
  'connection-status-change' // 连接状态变更
])

// 编辑器引用
const editorRef = ref(null)
const collaboratorsContainerRef = ref(null)

// 编辑器状态
const localText = ref(props.modelValue)
const isConnected = ref(false)
const updating = ref(false)
const localSyncVersion = ref(0)

// 协作者状态
const remoteUsers = reactive([])
const colors = ['#F44336', '#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#795548']

// 连接状态相关
const remoteUsersCount = computed(() => remoteUsers.length)

// 本地光标信息
const localCursorInfo = reactive({
  position: 0,
  selection: { start: 0, end: 0 }
})

// 唯一客户端ID
const clientId = Math.floor(Math.random() * 10000)

// 处理编辑器事件
const handleEditorReady = (data) => {
  emit('ready', data)
  setupSync()
}

const handleFocus = () => {
  emit('focus')
}

const handleBlur = () => {
  emit('blur')
}

// 光标和选区变化处理
const handleSelectionChange = throttle((selection) => {
  localCursorInfo.selection = selection
  updateLocalAwareness()
}, 100)

const handleCursorMove = throttle((position) => {
  localCursorInfo.position = position
  updateLocalAwareness()
}, 100)

// 文本内容同步处理
watch(() => props.modelValue, (newText) => {
  if (!updating.value && newText !== localText.value) {
    localText.value = newText
  }
}, { immediate: true })

watch(() => localText.value, (newText) => {
  if (!updating.value) {
    updating.value = true
    emit('update:modelValue', newText)
    
    if (props.syncProvider && props.syncProvider.doc) {
      try {
        // 将本地文本同步到共享文档
        const ytext = props.syncProvider.doc.getText('content')
        const currentContent = ytext.toString()
        
        if (currentContent !== newText) {
          ytext.delete(0, currentContent.length)
          ytext.insert(0, newText)
          localSyncVersion.value++
        }
      } catch (error) {
        console.error('同步文本失败:', error)
      }
    }
    
    updating.value = false
  }
})

// 更新本地状态到awareness系统
const updateLocalAwareness = () => {
  if (!props.syncProvider || !props.syncProvider.awareness) return
  
  try {
    // 获取当前光标位置的坐标
    const cursorCoords = editorRef.value?.getCursorCoordinates?.(localCursorInfo.position)
    
    // 计算选区的可视区域
    let selectionRects = []
    if (localCursorInfo.selection.start !== localCursorInfo.selection.end) {
      // 确保所有必要的组件已准备就绪
      if (editorRef.value && collaboratorsContainerRef.value && editorRef.value.editorRef?.value) {
        const selection = localCursorInfo.selection
        selectionRects = getSelectionRects(selection.start, selection.end)
      }
    }
    
    // 更新awareness状态
    props.syncProvider.awareness.setLocalState({
      ...props.awarenessState,
      user: {
        name: props.awarenessState.name || `用户${clientId}`,
        color: props.awarenessState.color || colors[clientId % colors.length],
        clientId
      },
      cursor: cursorCoords,
      selection: localCursorInfo.selection,
      selectionRects
    })
  } catch (error) {
    console.error('更新协作状态失败:', error)
  }
}

// 计算选区矩形
const getSelectionRects = (start, end) => {
  // 如果编辑器或容器没有准备好，返回空数组
  if (!editorRef.value || !editorRef.value.getState || !collaboratorsContainerRef.value) return []
  
  try {
    // 获取选区的DOM范围
    const range = document.createRange()
    const editorEl = editorRef.value.editorRef?.value
    
    // 如果找不到编辑器元素，返回空数组
    if (!editorEl) return []
    
    // 这是一个简化的实现，实际情况需要更复杂的计算
    // 遍历文本节点找到正确的开始和结束位置
    const result = findNodesForRange(editorEl, start, end)
    if (!result.startNode || !result.endNode) return []
    
    range.setStart(result.startNode, result.startOffset)
    range.setEnd(result.endNode, result.endOffset)
    
    // 获取选区的客户端矩形
    const rects = range.getClientRects()
    const containerRect = collaboratorsContainerRef.value.getBoundingClientRect()
    
    // 转换为相对于容器的坐标
    return Array.from(rects).map(rect => ({
      left: rect.left - containerRect.left,
      top: rect.top - containerRect.top,
      width: rect.width,
      height: rect.height
    }))
  } catch (error) {
    console.error('计算选区矩形失败:', error)
    return []
  }
}

// 辅助函数：查找给定偏移量的节点和偏移
const findNodesForRange = (container, start, end) => {
  const result = {
    startNode: null,
    startOffset: 0,
    endNode: null,
    endOffset: 0
  }
  
  // 遍历文本节点
  let currentLength = 0
  
  function traverse(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const nodeLength = node.textContent.length
      
      // 找到start位置
      if (!result.startNode && currentLength + nodeLength >= start) {
        result.startNode = node
        result.startOffset = start - currentLength
      }
      
      // 找到end位置
      if (!result.endNode && currentLength + nodeLength >= end) {
        result.endNode = node
        result.endOffset = end - currentLength
        return true // 找到结束位置，停止遍历
      }
      
      currentLength += nodeLength
    } else {
      for (const child of node.childNodes) {
        if (traverse(child)) return true
      }
    }
    
    return false
  }
  
  traverse(container)
  return result
}

// 设置同步功能
const setupSync = () => {
  if (!props.syncProvider) return
  
  try {
    // 监听文档更新
    props.syncProvider.doc.on('update', (update, origin) => {
      if (origin === props.syncProvider) {
        const ytext = props.syncProvider.doc.getText('content')
        const remoteText = ytext.toString()
        
        // 避免本地更新触发循环
        if (localSyncVersion.value > 0) {
          localSyncVersion.value--
          return
        }
        
        // 更新本地文本
        updating.value = true
        localText.value = remoteText
        updating.value = false
      }
    })
    
    // 初始化文本内容
    const ytext = props.syncProvider.doc.getText('content')
    const initialContent = ytext.toString()
    
    // 如果远程有内容但本地为空，使用远程内容
    if (initialContent && !localText.value) {
      updating.value = true
      localText.value = initialContent
      emit('update:modelValue', initialContent)
      updating.value = false
    } 
    // 如果本地有内容但远程为空，向远程同步本地内容
    else if (localText.value && !initialContent) {
      ytext.insert(0, localText.value)
    }
    
    // 监听Awareness状态变化
    if (props.syncProvider.awareness) {
      props.syncProvider.awareness.on('change', handleAwarenessChange)
      
      // 初始更新本地状态
      updateLocalAwareness()
    }
    
    // 监听连接状态
    props.syncProvider.on('status', ({ status }) => {
      isConnected.value = status === 'connected'
      emit('connection-status-change', isConnected.value)
    })
    
    // 检查当前连接状态
    isConnected.value = props.syncProvider.wsconnected
    emit('connection-status-change', isConnected.value)
  } catch (error) {
    console.error('设置同步功能失败:', error)
  }
}

// 处理远程用户状态变化
const handleAwarenessChange = () => {
  if (!props.syncProvider || !props.syncProvider.awareness) return
  
  try {
    const states = props.syncProvider.awareness.getStates()
    const users = []
    
    // 更新远程用户列表
    states.forEach((state, clientID) => {
      // 排除本地用户
      if (clientID !== props.syncProvider.awareness.clientID && state.user) {
        users.push({
          clientId: clientID,
          name: state.user.name,
          color: state.user.color || colors[clientID % colors.length],
          cursor: state.cursor,
          selection: state.selection,
          selectionRects: state.selectionRects
        })
      }
    })
    
    // 更新远程用户状态
    remoteUsers.splice(0, remoteUsers.length, ...users)
    
    // 触发事件
    emit('remote-presence-change', remoteUsers)
  } catch (error) {
    console.error('处理用户状态变化失败:', error)
  }
}

// 暴露方法给父组件
defineExpose({
  focus: () => editorRef.value?.focus(),
  blur: () => editorRef.value?.blur(),
  selectAll: () => editorRef.value?.selectAll(),
  getText: () => editorRef.value?.getText(),
  setText: (text) => editorRef.value?.setText(text),
  insertText: (text) => editorRef.value?.insertText(text),
  deleteText: (start, end) => editorRef.value?.deleteText(start, end),
  setSelectionRange: (start, end) => editorRef.value?.setSelectionRange(start, end),
  updateRemotePresence: updateLocalAwareness,
  getEditor: () => editorRef.value
})

// 清理函数
onUnmounted(() => {
  if (props.syncProvider) {
    if (props.syncProvider.doc) {
      props.syncProvider.doc.off('update')
    }
    
    if (props.syncProvider.awareness) {
      props.syncProvider.awareness.off('change', handleAwarenessChange)
    }
    
    props.syncProvider.off('status')
  }
})
</script>

<style scoped>
.collaborative-editor-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.collaboration-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 0.85em;
  color: #666;
}

.status-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: #bdbdbd;
}

.status-indicator.connected {
  background-color: #4CAF50;
}

.user-count {
  margin-left: auto;
  background-color: #f0f0f0;
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 0.85em;
}

.collaborators-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 10;
}

.remote-cursor {
  position: absolute;
  width: 2px;
  height: 20px;
  background-color: #ff5722;
  z-index: 12;
  pointer-events: none;
}

.cursor-flag {
  position: absolute;
  top: 0;
  left: 0;
  transform: translateY(-100%);
  padding: 2px 6px;
  border-radius: 2px;
  font-size: 12px;
  color: white;
  white-space: nowrap;
  user-select: none;
}

.remote-selection-highlight {
  position: absolute;
  pointer-events: none;
  z-index: 11;
}
</style> 