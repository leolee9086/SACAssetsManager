<template>
  <div class="code-editor-container" :class="{ 'readonly': readOnly }">
    <!-- 行号区域 -->
    <div class="line-numbers" v-if="showLineNumbers">
      <div
        v-for="lineNumber in lineCount"
        :key="lineNumber"
        class="line-number"
        :class="{ 'active': lineNumber === currentLine }"
      >
        {{ lineNumber }}
      </div>
    </div>
    
    <!-- 编辑区域 -->
    <div class="editor-area">
      <pre 
        ref="editorRef"
        class="code-editor"
        contenteditable="true"
        spellcheck="false"
        @input="handleInput"
        @keydown="handleKeyDown"
        @click="handleClick"
        @focus="handleFocus"
        @blur="handleBlur"
        @mousedown="handleMouseDown"
        @mouseup="handleMouseUp"
        @compositionstart="handleCompositionStart"
        @compositionend="handleCompositionEnd"
        @scroll="syncScroll"
      ></pre>
      
      <!-- 语法高亮层 -->
      <pre
        ref="highlightRef"
        class="highlight-layer"
        aria-hidden="true"
      ><code ref="codeRef" :class="languageClass"></code></pre>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useEditor } from '../useEditor.js'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  language: {
    type: String,
    default: 'plaintext'
  },
  showLineNumbers: {
    type: Boolean,
    default: true
  },
  readOnly: {
    type: Boolean,
    default: false
  },
  tabSize: {
    type: Number,
    default: 2
  },
  theme: {
    type: String,
    default: 'light'  // 'light' 或 'dark'
  },
  autoFocus: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'focus', 'blur', 'change', 'line-change'])

// 引用
const editorRef = ref(null)
const highlightRef = ref(null)
const codeRef = ref(null)

// 状态
const currentLine = ref(1)
const currentColumn = ref(1)

// 计算代码行数
const lineCount = computed(() => {
  return (editorRef.value?.textContent || props.modelValue || '').split('\n').length
})

// 计算语言类
const languageClass = computed(() => {
  return `language-${props.language}`
})

// 使用编辑器核心
const {
  state,
  getText,
  setText,
  selectAll,
  focus,
  blur,
  handleInput: baseHandleInput,
  handleKeyDown: baseHandleKeyDown,
  handleFocus,
  handleBlur,
  handleClick,
  handleCompositionStart,
  handleCompositionEnd,
  getSelectionRange,
  setSelectionRange,
  updateCursorPosition
} = useEditor({
  initialText: props.modelValue,
  onTextChange: (data) => {
    emit('update:modelValue', data.text)
    emit('change', data)
    
    // 更新语法高亮
    updateHighlight()
    
    // 计算当前行列号
    updateLineColumnPosition()
  },
  onSelectionChange: (data) => {
    // 更新当前行列号
    updateLineColumnPosition()
  }
})

// 更新语法高亮
const updateHighlight = () => {
  if (!codeRef.value) return
  
  // 对代码进行简单的语法高亮
  const code = getText()
  codeRef.value.textContent = code
  
  // 应用高亮
  applyHighlight()
}

// 应用语法高亮
const applyHighlight = () => {
  if (!codeRef.value) return
  
  // 模拟一个简单的语法高亮器
  // 在实际应用中，你可能需要使用 Prism.js 或 highlight.js 等库
  const code = codeRef.value.textContent
  const language = props.language
  
  // 简单的关键字高亮
  let html = code
  
  if (language === 'javascript' || language === 'js') {
    // JavaScript 关键字高亮
    html = code
      .replace(/\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|try|catch|throw)\b/g, '<span class="keyword">$1</span>')
      .replace(/\b(true|false|null|undefined|this)\b/g, '<span class="builtin">$1</span>')
      .replace(/(['"])(?:(?=(\\?))\2.)*?\1/g, '<span class="string">$&</span>')
      .replace(/\/\/.*$/gm, '<span class="comment">$&</span>')
      .replace(/\/\*[\s\S]*?\*\//g, '<span class="comment">$&</span>')
      .replace(/\b(\d+)\b/g, '<span class="number">$1</span>')
  } else if (language === 'json') {
    // JSON 高亮
    html = code
      .replace(/(".*?"):/g, '<span class="property">$1</span>:')
      .replace(/: (".*?")/g, ': <span class="string">$1</span>')
      .replace(/: (true|false|null)/g, ': <span class="builtin">$1</span>')
      .replace(/: (\d+)/g, ': <span class="number">$1</span>')
  } else if (language === 'html') {
    // HTML 高亮
    html = code
      .replace(/(&lt;)(\/?[a-zA-Z0-9-]+)(\s*.*?)(&gt;)/g, '$1<span class="tag">$2</span>$3$4')
      .replace(/(\s+)([a-zA-Z0-9-]+)="(.*?)"/g, '$1<span class="attr-name">$2</span>="<span class="attr-value">$3</span>"')
  } else if (language === 'css') {
    // CSS 高亮
    html = code
      .replace(/([a-zA-Z0-9-_]+)(\s*{)/g, '<span class="selector">$1</span>$2')
      .replace(/(\s+)([a-zA-Z0-9-]+)(\s*:)/g, '$1<span class="property">$2</span>$3')
      .replace(/: (.*?);/g, ': <span class="value">$1</span>;')
  }
  
  // 注入高亮代码
  codeRef.value.innerHTML = html
}

// 计算当前行列号
const updateLineColumnPosition = () => {
  const selection = getSelectionRange()
  if (!selection) return
  
  const cursorPosition = selection.start
  const code = getText()
  
  // 计算当前行号
  const lines = code.substring(0, cursorPosition).split('\n')
  const line = lines.length
  const column = lines[lines.length - 1].length + 1
  
  currentLine.value = line
  currentColumn.value = column
  
  // 通知行变化
  emit('line-change', { line, column })
}

// 同步滚动
const syncScroll = (event) => {
  if (highlightRef.value) {
    highlightRef.value.scrollTop = event.target.scrollTop
    highlightRef.value.scrollLeft = event.target.scrollLeft
  }
}

// 处理Tab键
const handleKeyDown = (event) => {
  // 处理Tab键
  if (event.key === 'Tab') {
    event.preventDefault()
    
    // 插入空格
    const spaces = ' '.repeat(props.tabSize)
    document.execCommand('insertText', false, spaces)
    return
  }
  
  // 其他键调用基础处理器
  baseHandleKeyDown(event)
}

// 自定义输入处理
const handleInput = (event) => {
  baseHandleInput(event)
  
  // 更新高亮
  updateHighlight()
}

// 鼠标按下处理
const handleMouseDown = () => {
  // 重置光标闪烁
}

// 鼠标抬起处理
const handleMouseUp = () => {
  // 更新行列号
  updateLineColumnPosition()
}

// 插入制表符或空格
const insertTab = () => {
  const spaces = ' '.repeat(props.tabSize)
  document.execCommand('insertText', false, spaces)
}

// 观察属性变化
watch(() => props.modelValue, (newValue) => {
  if (newValue !== getText()) {
    setText(newValue)
    updateHighlight()
  }
}, { immediate: true })

// 观察语言变化
watch(() => props.language, () => {
  updateHighlight()
})

// 观察只读状态
watch(() => props.readOnly, (isReadOnly) => {
  if (editorRef.value) {
    editorRef.value.contentEditable = isReadOnly ? 'false' : 'true'
  }
})

// 组件挂载
onMounted(() => {
  // 初始化编辑器
  if (props.modelValue) {
    setText(props.modelValue)
    updateHighlight()
  }
  
  // 设置只读状态
  if (props.readOnly && editorRef.value) {
    editorRef.value.contentEditable = 'false'
  }
  
  // 自动聚焦
  if (props.autoFocus && !props.readOnly) {
    nextTick(() => {
      focus()
    })
  }
})

// 暴露API给父组件
defineExpose({
  focus,
  blur,
  selectAll,
  getText,
  setText: (text) => {
    setText(text)
    updateHighlight()
  },
  setSelectionRange,
  getLineCount: () => lineCount.value,
  getCurrentLine: () => currentLine.value,
  getCurrentColumn: () => currentColumn.value,
  gotoLine: (line, column = 1) => {
    // 计算要跳转的位置
    const lines = getText().split('\n')
    if (line < 1 || line > lines.length) return false
    
    // 计算目标位置
    let position = 0
    for (let i = 0; i < line - 1; i++) {
      position += lines[i].length + 1  // +1 for newline
    }
    
    // 加上列号
    const maxColumn = lines[line - 1].length + 1
    const safeColumn = Math.min(column, maxColumn)
    position += safeColumn - 1
    
    // 设置选区
    setSelectionRange(position, position)
    focus()
    
    return true
  }
})
</script>

<style scoped>
.code-editor-container {
  display: flex;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: 'Fira Code', 'Source Code Pro', Monaco, Menlo, Consolas, 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.5;
  background-color: #f8f8f8;
  height: 100%;
  overflow: hidden;
}

.code-editor-container.readonly {
  background-color: #f5f5f5;
  color: #666;
}

.line-numbers {
  display: flex;
  flex-direction: column;
  padding: 8px 0;
  min-width: 40px;
  text-align: right;
  color: #999;
  background-color: #f0f0f0;
  border-right: 1px solid #ddd;
  user-select: none;
}

.line-number {
  padding: 0 8px;
}

.line-number.active {
  background-color: #e0e0e0;
  color: #333;
}

.editor-area {
  flex: 1;
  position: relative;
  overflow: auto;
}

.code-editor, .highlight-layer {
  margin: 0;
  padding: 8px;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  white-space: pre;
  overflow: auto;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  tab-size: v-bind('props.tabSize');
}

.code-editor {
  z-index: 2;
  color: transparent;
  background: transparent;
  caret-color: #333;
  resize: none;
  outline: none;
}

.highlight-layer {
  z-index: 1;
  pointer-events: none;
  background-color: transparent;
}

/* 语法高亮样式 */
:deep(.keyword) {
  color: #0000ff;
  font-weight: bold;
}

:deep(.string) {
  color: #a31515;
}

:deep(.comment) {
  color: #008000;
}

:deep(.builtin) {
  color: #2b91af;
}

:deep(.number) {
  color: #09885a;
}

:deep(.property) {
  color: #881280;
}

:deep(.tag) {
  color: #800000;
}

:deep(.attr-name) {
  color: #ff0000;
}

:deep(.attr-value) {
  color: #0000ff;
}

:deep(.selector) {
  color: #800000;
}

:deep(.value) {
  color: #0451a5;
}

/* 暗色主题 */
.code-editor-container[data-theme="dark"] {
  background-color: #1e1e1e;
  color: #d4d4d4;
  border-color: #333;
}

.code-editor-container[data-theme="dark"] .line-numbers {
  background-color: #252526;
  color: #858585;
  border-right-color: #333;
}

.code-editor-container[data-theme="dark"] .line-number.active {
  background-color: #264f78;
  color: #fff;
}

.code-editor-container[data-theme="dark"] .code-editor {
  caret-color: #d4d4d4;
}

/* 暗色主题语法高亮 */
.code-editor-container[data-theme="dark"] :deep(.keyword) {
  color: #569cd6;
}

.code-editor-container[data-theme="dark"] :deep(.string) {
  color: #ce9178;
}

.code-editor-container[data-theme="dark"] :deep(.comment) {
  color: #6a9955;
}

.code-editor-container[data-theme="dark"] :deep(.builtin) {
  color: #4ec9b0;
}

.code-editor-container[data-theme="dark"] :deep(.number) {
  color: #b5cea8;
}

.code-editor-container[data-theme="dark"] :deep(.property) {
  color: #9cdcfe;
}

.code-editor-container[data-theme="dark"] :deep(.tag) {
  color: #569cd6;
}

.code-editor-container[data-theme="dark"] :deep(.attr-name) {
  color: #9cdcfe;
}

.code-editor-container[data-theme="dark"] :deep(.attr-value) {
  color: #ce9178;
}

.code-editor-container[data-theme="dark"] :deep(.selector) {
  color: #d7ba7d;
}

.code-editor-container[data-theme="dark"] :deep(.value) {
  color: #ce9178;
}
</style> 