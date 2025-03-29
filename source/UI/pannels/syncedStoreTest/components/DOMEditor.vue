<template>
  <div class="dom-editor-container">
    <div class="toolbar" v-if="showToolbar">
      <button @click="formatText('bold')" :class="{ active: isFormatActive('bold') }">
        <span class="icon">B</span>
      </button>
      <button @click="formatText('italic')" :class="{ active: isFormatActive('italic') }">
        <span class="icon">I</span>
      </button>
      <button @click="formatText('underline')" :class="{ active: isFormatActive('underline') }">
        <span class="icon">U</span>
      </button>
      <select @change="applyHeading($event.target.value)" class="heading-select">
        <option value="">段落</option>
        <option value="h1">标题1</option>
        <option value="h2">标题2</option>
        <option value="h3">标题3</option>
      </select>
    </div>
    
    <div 
      ref="editorRef"
      class="editor-content"
      contenteditable="true"
      @input="handleInput"
      @keydown="handleKeyDown"
      @click="handleClick"
      @focus="handleFocus"
      @blur="handleBlur"
      @mousedown="resetCursorBlink"
      @mouseup="resetCursorBlink"
      @compositionstart="handleCompositionStart"
      @compositionend="handleCompositionEnd"
    ></div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import { useEditor } from '../useEditor.js'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  showToolbar: {
    type: Boolean,
    default: true
  },
  readOnly: {
    type: Boolean,
    default: false
  },
  autoFocus: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'focus', 'blur', 'change', 'selection-change'])

const editorRef = ref(null)
const currentFormat = ref({ bold: false, italic: false, underline: false, heading: '' })

// 使用基础编辑器核心
const {
  state,
  getText,
  setText,
  insertText,
  deleteText,
  setSelectionRange,
  selectAll,
  handleInput,
  handleKeyDown,
  handleFocus,
  handleBlur,
  handleClick,
  handleCompositionStart,
  handleCompositionEnd,
  updateCursorPosition,
  getTextPositionFromPoint,
  getNodeAndOffsetFromTextPosition,
  resetCursorBlink
} = useEditor({
  initialText: props.modelValue,
  onTextChange: (data) => {
    emit('update:modelValue', getHTMLContent())
    emit('change', data)
  },
  onSelectionChange: (data) => {
    emit('selection-change', data)
    updateCurrentFormat()
  }
})

// 获取编辑器当前HTML内容
const getHTMLContent = () => {
  return editorRef.value ? editorRef.value.innerHTML : ''
}

// 设置HTML内容
const setHTMLContent = (html) => {
  if (editorRef.value) {
    editorRef.value.innerHTML = html
    
    // 更新内部状态
    state.text = editorRef.value.textContent
  }
}

// 格式化文本
const formatText = (format) => {
  document.execCommand(format, false, null)
  updateCurrentFormat()
  editorRef.value.focus()
  emit('update:modelValue', getHTMLContent())
}

// 应用标题格式
const applyHeading = (heading) => {
  if (heading) {
    document.execCommand('formatBlock', false, heading)
  } else {
    document.execCommand('formatBlock', false, 'p')
  }
  
  updateCurrentFormat()
  editorRef.value.focus()
  emit('update:modelValue', getHTMLContent())
}

// 检查特定格式是否处于激活状态
const isFormatActive = (format) => {
  return currentFormat.value[format]
}

// 更新当前活动的格式
const updateCurrentFormat = () => {
  if (!editorRef.value) return
  
  // 检查基本格式
  currentFormat.value.bold = document.queryCommandState('bold')
  currentFormat.value.italic = document.queryCommandState('italic')
  currentFormat.value.underline = document.queryCommandState('underline')
  
  // 检查标题格式
  const formatBlock = document.queryCommandValue('formatBlock')
  currentFormat.value.heading = formatBlock || ''
}

// 将文本内容转换为HTML
const textToHTML = (text) => {
  if (!text) return ''
  
  // 简单处理：将换行符转换为<br>，保留基本格式
  return text
    .replace(/\n/g, '<br>')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// 将HTML内容转换为纯文本
const htmlToText = (html) => {
  if (!html) return ''
  
  // 创建一个临时元素来解析HTML
  const temp = document.createElement('div')
  temp.innerHTML = html
  
  // 获取文本内容
  return temp.textContent || temp.innerText || ''
}

// 观察属性变化
watch(() => props.modelValue, (newValue) => {
  if (newValue !== getHTMLContent()) {
    setHTMLContent(newValue)
  }
}, { immediate: true })

// 观察只读状态
watch(() => props.readOnly, (isReadOnly) => {
  if (editorRef.value) {
    editorRef.value.contentEditable = isReadOnly ? 'false' : 'true'
  }
})

// 组件挂载
onMounted(() => {
  // 初始化HTML内容
  if (props.modelValue) {
    setHTMLContent(props.modelValue)
  }
  
  // 自动聚焦
  if (props.autoFocus && !props.readOnly) {
    nextTick(() => {
      editorRef.value.focus()
    })
  }
  
  // 设置只读状态
  if (props.readOnly) {
    editorRef.value.contentEditable = 'false'
  }
})

// 暴露方法给父组件
defineExpose({
  focus: () => editorRef.value?.focus(),
  blur: () => editorRef.value?.blur(),
  getHTML: getHTMLContent,
  setHTML: setHTMLContent,
  getText: () => editorRef.value?.textContent || '',
  setText: (text) => {
    setHTMLContent(textToHTML(text))
  },
  insertHTML: (html) => {
    document.execCommand('insertHTML', false, html)
    emit('update:modelValue', getHTMLContent())
  },
  formatText,
  selectAll: () => {
    if (editorRef.value) {
      const range = document.createRange()
      range.selectNodeContents(editorRef.value)
      const selection = window.getSelection()
      selection.removeAllRanges()
      selection.addRange(range)
    }
  }
})
</script>

<style scoped>
.dom-editor-container {
  display: flex;
  flex-direction: column;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
}

.toolbar {
  display: flex;
  align-items: center;
  padding: 8px;
  gap: 4px;
  background-color: #f5f5f5;
  border-bottom: 1px solid #ddd;
}

.toolbar button {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 32px;
  height: 32px;
  border: 1px solid #ddd;
  background-color: white;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.2s ease;
}

.toolbar button:hover {
  background-color: #f0f0f0;
}

.toolbar button.active {
  background-color: #e6f2ff;
  border-color: #1a73e8;
  color: #1a73e8;
}

.heading-select {
  height: 32px;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 0 8px;
  background-color: white;
  cursor: pointer;
}

.editor-content {
  flex: 1;
  min-height: 200px;
  padding: 12px;
  overflow-y: auto;
  line-height: 1.5;
  outline: none;
}

.editor-content:focus {
  outline: none;
  border-color: #1a73e8;
}

/* 编辑器内部样式 */
.editor-content h1 {
  font-size: 2em;
  margin-top: 0.5em;
  margin-bottom: 0.5em;
}

.editor-content h2 {
  font-size: 1.5em;
  margin-top: 0.5em;
  margin-bottom: 0.5em;
}

.editor-content h3 {
  font-size: 1.25em;
  margin-top: 0.5em;
  margin-bottom: 0.5em;
}

.editor-content p {
  margin-top: 0.5em;
  margin-bottom: 0.5em;
}
</style> 