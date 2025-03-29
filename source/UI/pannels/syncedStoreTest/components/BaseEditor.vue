<template>
  <div class="base-editor-container" ref="wrapperRef">
    <!-- 编辑器信息状态栏 -->
    <div class="editor-info" v-if="showInfo">
      <span>光标位置: {{ state.selection.start }}</span>
      <span>选区长度: {{ state.selection.end - state.selection.start }}</span>
    </div>
    
    <!-- 编辑器容器 -->
    <div class="editor-wrapper">
      <!-- 光标和选区层 -->
      <div class="cursors-layer" v-if="useInternalCursor">
        <!-- 本地光标 -->
        <div
          v-if="state.focused"
          class="cursor"
          :class="{ 'cursor-hidden': !cursorVisible }"
          :style="{
            left: cursorCoords.left + 'px',
            top: cursorCoords.top + 'px',
            height: `${lineHeight}px`,
            backgroundColor: cursorColor,
            width: `${cursorWidth}px`
          }"
        ></div>
        
        <!-- 选区高亮显示 -->
        <template v-if="hasSelection">
          <div
            v-for="(rect, index) in selectionRects"
            :key="`selection-${index}`"
            class="selection-highlight"
            :style="{
              left: rect.left + 'px',
              top: rect.top + 'px',
              width: rect.width + 'px',
              height: rect.height + 'px',
              backgroundColor: selectionColor
            }"
          ></div>
        </template>
      </div>
      
      <!-- 可编辑区域 -->
      <div
        ref="editorRef"
        class="editor"
        contenteditable="true"
        @input="handleInput"
        @keydown="handleKeyDown"
        @click="handleClick"
        @focus="handleFocus"
        @blur="handleBlur"
        @mousedown="handleMouseDown"
        @mouseup="handleMouseUp"
        @compositionstart="handleCompositionStart"
        @compositionend="handleCompositionEnd"
        @paste="handlePaste"
        @cut="handleCut"
        @copy="handleCopy"
        :style="{
          padding: padding + 'px',
          lineHeight: lineHeight + 'px',
          fontFamily: fontFamily,
          fontSize: fontSize + 'px',
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
          caretColor: useInternalCursor ? 'transparent' : 'auto',
          ...editorStyle
        }"
      ></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useEditor } from '../useEditor.js'

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
  blinkInterval: {
    type: Number,
    default: 530
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
  
  // 其他样式
  editorStyle: {
    type: Object,
    default: () => ({})
  }
})

// 触发事件
const emit = defineEmits([
  'update:modelValue', // 内容变更
  'focus',            // 获得焦点
  'blur',             // 失去焦点
  'selection-change',  // 选区变更
  'cursor-move',       // 光标移动
  'ready'             // 编辑器就绪
])

// 使用编辑器核心
const {
  // 引用
  editorRef,
  wrapperRef,
  
  // 状态
  state,
  cursorVisible,
  cursorCoords,
  selectionRects,
  hasSelection,
  selectedText,
  
  // 方法
  getText,
  setText,
  insertText,
  deleteText,
  setSelectionRange,
  selectAll,
  focus,
  blur,
  getCursorCoordinates,
  
  // 事件处理
  handleInput,
  handleKeyDown,
  handleFocus,
  handleBlur,
  handleClick,
  handleCompositionStart,
  handleCompositionEnd,
  
  // 内部方法
  updateCursorPosition
} = useEditor({
  initialText: props.modelValue,
  lineHeight: props.lineHeight,
  shouldHandleEnter: props.shouldHandleEnter,
  useInternalCursor: props.useInternalCursor,
  cursorWidth: props.cursorWidth,
  blinkInterval: props.blinkInterval,
  cursorColor: props.cursorColor,
  
  // 回调函数
  onTextChange: (data) => {
    emit('update:modelValue', data.text)
  },
  onSelectionChange: (data) => {
    emit('selection-change', data)
    if (data.start === data.end) {
      emit('cursor-move', data.start)
    }
  }
})

// 追踪外部模型值的变化
watch(() => props.modelValue, (newText) => {
  if (newText !== getText()) {
    setText(newText)
  }
}, { immediate: true })

// 监听只读状态变化
watch(() => props.readOnly, (isReadOnly) => {
  if (editorRef.value) {
    editorRef.value.contentEditable = isReadOnly ? 'false' : 'true'
  }
}, { immediate: true })

// 处理复制/剪切/粘贴事件
const handleCopy = (event) => {
  // 复制已经由浏览器处理，这里只需处理选择相关UI更新
  resetCursorBlink()
}

const handleCut = (event) => {
  // 剪切已经由浏览器处理，这里需更新状态
  state.text = editorRef.value.textContent
  state.version++
  updateCursorPosition()
  resetCursorBlink()
  
  emit('update:modelValue', state.text)
}

const handlePaste = (event) => {
  // 粘贴已经由浏览器处理，这里需更新状态
  setTimeout(() => {
    state.text = editorRef.value.textContent
    state.version++
    updateCursorPosition()
    resetCursorBlink()
    
    emit('update:modelValue', state.text)
  }, 0)
}

// 鼠标事件
const handleMouseDown = (event) => {
  if (props.readOnly) return
  resetCursorBlink()
}

const handleMouseUp = (event) => {
  if (props.readOnly) return
  resetCursorBlink()
}

// 重置光标闪烁
const resetCursorBlink = () => {
  if (cursorVisible) {
    cursorVisible.value = true
  }
}

// 暴露方法给父组件
defineExpose({
  focus,
  blur,
  selectAll,
  getText,
  setText,
  insertText,
  deleteText,
  setSelectionRange,
  updateCursorPosition,
  getState: () => state,
  getSelection: () => ({
    start: state.selection.start,
    end: state.selection.end,
    text: selectedText.value
  })
})

// 生命周期
onMounted(() => {
  if (props.autoFocus && !props.readOnly) {
    // 延迟获取焦点，确保组件已渲染
    setTimeout(() => {
      focus()
      // 将光标移至末尾
      setSelectionRange(state.text.length, state.text.length)
    }, 0)
  }
  
  // 通知编辑器已准备好
  emit('ready', {
    editor: editorRef.value,
    container: wrapperRef.value
  })
})
</script>

<style scoped>
.base-editor-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}

.editor-info {
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
  font-size: 0.85em;
  color: #666;
}

.editor-wrapper {
  position: relative;
  flex: 1;
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 100px;
}

.editor {
  width: 100%;
  height: 100%;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow-y: auto;
  outline: none;
  flex: 1;
  position: relative;
  z-index: 1;
  background-color: #fff;
}

/* 光标和选区样式 */
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

.cursor {
  position: absolute;
  width: 2px;
  height: 20px;
  background-color: #1a73e8;
  z-index: 3;
  pointer-events: none;
  animation: cursor-blink 1s infinite;
}

.cursor-hidden {
  opacity: 0;
}

.selection-highlight {
  position: absolute;
  pointer-events: none;
  z-index: 1;
}

/* 光标闪烁动画 */
@keyframes cursor-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
</style> 