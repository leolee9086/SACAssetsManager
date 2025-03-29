/**
 * 简单、通用的纯文本编辑器核心功能集
 * 提供文本编辑、光标管理、选区处理的基础功能
 * 无UI框架依赖，可与任何前端框架集成
 */
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from '../../../../static/vue.esm-browser.js'

/**
 * 创建通用编辑器核心
 * @param {Object} options - 编辑器配置项
 * @returns {Object} 编辑器API和状态
 */
export function useEditor(options = {}) {
  // 配置项
  const {
    initialText = '',        // 初始文本内容
    lineHeight = 20,         // 行高(px)
    shouldHandleEnter = true, // 是否处理回车键
    useInternalCursor = true, // 是否使用内部光标管理
    cursorWidth = 2,         // 光标宽度(px)
    blinkInterval = 530,     // 光标闪烁间隔(ms)
    cursorColor = '#1a73e8', // 光标颜色
    onTextChange = null,     // 文本变化回调
    onSelectionChange = null // 选区变化回调
  } = options

  // 编辑器状态
  const state = reactive({
    // 文本内容
    text: initialText || '',
    // 编辑器是否获得焦点
    focused: false,
    // 文本历史（用于撤销/重做）
    history: [],
    historyIndex: -1,
    // 内部光标状态 
    selection: {
      start: 0,
      end: 0,
      direction: 'forward' // 'forward' 或 'backward'
    },
    // 版本号，用于追踪变更
    version: 0
  })

  // DOM引用
  const editorRef = ref(null)
  const wrapperRef = ref(null)

  // 内部状态
  const isComposing = ref(false) // 输入法编辑状态
  const cursorVisible = ref(true) // 光标可见性（闪烁控制）

  // 光标位置坐标
  const cursorCoords = reactive({
    left: 0,
    top: 0
  })

  // 选区矩形列表（用于多行选区显示）
  const selectionRects = ref([])

  // 计算属性：是否有选区
  const hasSelection = computed(() => {
    return state.selection.start !== state.selection.end
  })

  // 计算属性：当前选中的文本
  const selectedText = computed(() => {
    if (!hasSelection.value) return ''
    const start = Math.min(state.selection.start, state.selection.end)
    const end = Math.max(state.selection.start, state.selection.end)
    return state.text.substring(start, end)
  })

  // 光标闪烁定时器
  let blinkTimer = null

  // ---------- 基本操作方法 ----------

  /**
   * 设置编辑器文本内容
   * @param {string} newText - 新的文本内容
   * @param {boolean} preserveSelection - 是否保留当前选区
   * @returns {void}
   */
  const setText = (newText, preserveSelection = false) => {
    if (newText === state.text) return

    const oldText = state.text
    state.text = newText || ''

    // 增加版本号
    state.version++

    // 设置DOM内容
    if (editorRef.value) {
      const selection = preserveSelection ? saveSelection() : null
      
      // 更新DOM
      editorRef.value.textContent = state.text
      
      // 尝试恢复选区
      if (preserveSelection && selection) {
        restoreSelection(selection)
      } else {
        // 默认将光标设置到末尾
        setSelectionRange(state.text.length, state.text.length)
      }
    }

    // 调用变更回调
    if (typeof onTextChange === 'function') {
      onTextChange({
        text: state.text,
        oldText,
        version: state.version
      })
    }
  }

  /**
   * 获取当前文本内容
   * @returns {string} 当前文本
   */
  const getText = () => state.text

  /**
   * 在当前光标位置插入文本
   * @param {string} text - 要插入的文本
   * @returns {void}
   */
  const insertText = (text) => {
    if (!text || !editorRef.value) return

    // 记录操作前选区
    const start = Math.min(state.selection.start, state.selection.end)
    const end = Math.max(state.selection.start, state.selection.end)
    
    // 计算新文本
    const before = state.text.substring(0, start)
    const after = state.text.substring(end)
    const newText = before + text + after
    
    // 更新文本
    setText(newText, false)
    
    // 设置新的光标位置（插入文本后）
    const newPosition = start + text.length
    setSelectionRange(newPosition, newPosition)
  }

  /**
   * 删除选中文本或指定范围的文本
   * @param {number} startPos - 起始位置，默认为当前选区起始
   * @param {number} endPos - 结束位置，默认为当前选区结束
   * @returns {string} 删除的文本
   */
  const deleteText = (startPos = null, endPos = null) => {
    // 如果未提供位置，使用当前选区
    const start = startPos !== null ? startPos : Math.min(state.selection.start, state.selection.end)
    const end = endPos !== null ? endPos : Math.max(state.selection.start, state.selection.end)
    
    // 如果范围无效，不执行操作
    if (start === end || start < 0 || end > state.text.length) {
      return ''
    }
    
    // 获取要删除的文本
    const deletedText = state.text.substring(start, end)
    
    // 计算新文本
    const before = state.text.substring(0, start)
    const after = state.text.substring(end)
    const newText = before + after
    
    // 更新文本
    setText(newText, false)
    
    // 将光标设置到删除位置
    setSelectionRange(start, start)
    
    return deletedText
  }

  /**
   * 设置选区范围
   * @param {number} start - 起始位置
   * @param {number} end - 结束位置
   * @param {string} direction - 方向，'forward'或'backward'
   * @returns {void}
   */
  const setSelectionRange = (start, end, direction = 'forward') => {
    // 边界检查
    const textLength = state.text.length
    const safeStart = Math.max(0, Math.min(start, textLength))
    const safeEnd = Math.max(0, Math.min(end, textLength))
    
    // 更新状态
    state.selection.start = safeStart
    state.selection.end = safeEnd
    state.selection.direction = direction
    
    // 如果有DOM引用，同步DOM选区
    if (editorRef.value && document.activeElement === editorRef.value) {
      updateDomSelection(safeStart, safeEnd)
    }
    
    // 计算光标位置
    updateCursorPosition()
    
    // 重置光标闪烁
    resetCursorBlink()
    
    // 调用选区变化回调
    if (typeof onSelectionChange === 'function') {
      onSelectionChange({
        start: safeStart,
        end: safeEnd,
        text: selectedText.value,
        direction,
        timestamp: Date.now()
      })
    }
  }

  /**
   * 获取当前选区范围
   * @returns {Object} 包含start和end的选区对象
   */
  const getSelectionRange = () => {
    return {
      start: state.selection.start,
      end: state.selection.end,
      direction: state.selection.direction
    }
  }

  // ---------- DOM操作方法 ----------

  /**
   * 保存当前DOM选区状态
   * @returns {Object|null} 选区信息
   */
  const saveSelection = () => {
    if (!editorRef.value) return null
    
    try {
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) return null
      
      const range = selection.getRangeAt(0)
      
      // 检查选区是否在编辑器内
      if (!editorRef.value.contains(range.startContainer) || 
          !editorRef.value.contains(range.endContainer)) {
        return null
      }
      
      // 计算文本偏移量
      const start = getTextOffsetFromNode(editorRef.value, range.startContainer, range.startOffset)
      const end = getTextOffsetFromNode(editorRef.value, range.endContainer, range.endOffset)
      
      return {
        start,
        end,
        direction: selection.focusNode === range.startContainer ? 'backward' : 'forward'
      }
    } catch (err) {
      console.error('保存选区失败:', err)
      return null
    }
  }

  /**
   * 恢复选区到DOM
   * @param {Object} selection - 选区信息
   * @returns {boolean} 是否成功
   */
  const restoreSelection = (selection) => {
    if (!editorRef.value || !selection) return false
    
    try {
      // 获取对应的DOM节点和偏移量
      const startNodeInfo = getNodeAndOffsetFromTextPosition(editorRef.value, selection.start)
      const endNodeInfo = getNodeAndOffsetFromTextPosition(editorRef.value, selection.end)
      
      if (!startNodeInfo.node || !endNodeInfo.node) {
        return false
      }
      
      // 设置DOM选区
      const domSelection = window.getSelection()
      domSelection.removeAllRanges()
      
      const range = document.createRange()
      range.setStart(startNodeInfo.node, startNodeInfo.offset)
      range.setEnd(endNodeInfo.node, endNodeInfo.offset)
      
      domSelection.addRange(range)
      
      // 更新状态
      state.selection.start = selection.start
      state.selection.end = selection.end
      state.selection.direction = selection.direction || 'forward'
      
      return true
    } catch (err) {
      console.error('恢复选区失败:', err)
      return false
    }
  }

  /**
   * 从文本偏移量计算DOM节点和偏移量
   * @param {HTMLElement} container - 容器元素
   * @param {number} offset - 文本偏移量
   * @returns {Object} 节点和偏移量信息
   */
  const getNodeAndOffsetFromTextPosition = (container, offset) => {
    if (!container) return { node: null, offset: 0 }
    
    // 确保偏移量在有效范围内
    const textLength = container.textContent.length
    offset = Math.max(0, Math.min(offset, textLength))
    
    if (offset <= 0) {
      // 返回第一个文本节点或容器本身
      const firstTextNode = getFirstTextNode(container)
      return firstTextNode 
        ? { node: firstTextNode, offset: 0 } 
        : { node: container, offset: 0 }
    }
    
    if (offset >= textLength) {
      // 返回最后一个文本节点或容器本身
      const lastTextNode = getLastTextNode(container)
      return lastTextNode
        ? { node: lastTextNode, offset: lastTextNode.textContent.length }
        : { node: container, offset: container.childNodes.length }
    }
    
    // 遍历文本节点查找位置
    let currentOffset = 0
    let resultNode = null
    let resultOffset = 0
    
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null,
      false
    )
    
    let node
    while (node = walker.nextNode()) {
      const nodeLength = node.textContent.length
      
      if (currentOffset + nodeLength >= offset) {
        resultNode = node
        resultOffset = offset - currentOffset
        break
      }
      
      currentOffset += nodeLength
    }
    
    return resultNode 
      ? { node: resultNode, offset: resultOffset }
      : { node: container, offset: 0 }
  }

  /**
   * 从DOM节点和偏移量计算文本偏移量
   * @param {HTMLElement} container - 容器元素
   * @param {Node} node - DOM节点
   * @param {number} offset - 节点内偏移量
   * @returns {number} 文本偏移量
   */
  const getTextOffsetFromNode = (container, node, offset) => {
    if (!container || !node) return 0
    
    // 计算node之前的所有文本长度
    let textOffset = 0
    
    if (node.nodeType === Node.TEXT_NODE) {
      // 文本节点，加上节点内偏移量
      textOffset = offset
      
      // 向上遍历，计算之前所有节点的文本长度
      let current = node
      
      while (current !== container && current.parentNode) {
        let sibling = current.previousSibling
        while (sibling) {
          textOffset += sibling.textContent.length
          sibling = sibling.previousSibling
        }
        
        current = current.parentNode
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // 元素节点，计算前面子节点的长度
      for (let i = 0; i < offset && i < node.childNodes.length; i++) {
        textOffset += node.childNodes[i].textContent.length
      }
      
      // 计算之前的兄弟节点
      let sibling = node.previousSibling
      while (sibling) {
        textOffset += sibling.textContent.length
        sibling = sibling.previousSibling
      }
      
      // 如果是容器的直接子节点，还需遍历到容器
      if (node.parentNode && node.parentNode !== container) {
        let current = node.parentNode
        while (current !== container && current.parentNode) {
          let parentSibling = current.previousSibling
          while (parentSibling) {
            textOffset += parentSibling.textContent.length
            parentSibling = parentSibling.previousSibling
          }
          current = current.parentNode
        }
      }
    }
    
    return textOffset
  }

  /**
   * 获取容器中第一个文本节点
   * @param {HTMLElement} container - 容器元素
   * @returns {Node|null} 文本节点
   */
  const getFirstTextNode = (container) => {
    if (!container) return null
    
    if (container.nodeType === Node.TEXT_NODE) {
      return container
    }
    
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null,
      false
    )
    
    return walker.nextNode()
  }

  /**
   * 获取容器中最后一个文本节点
   * @param {HTMLElement} container - 容器元素
   * @returns {Node|null} 文本节点
   */
  const getLastTextNode = (container) => {
    if (!container) return null
    
    if (container.nodeType === Node.TEXT_NODE) {
      return container
    }
    
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null,
      false
    )
    
    let lastNode = null
    let node
    
    while (node = walker.nextNode()) {
      lastNode = node
    }
    
    return lastNode
  }

  /**
   * 更新DOM选区
   * @param {number} start - 起始位置
   * @param {number} end - 结束位置
   * @returns {boolean} 是否成功
   */
  const updateDomSelection = (start, end) => {
    if (!editorRef.value) return false
    
    try {
      const startInfo = getNodeAndOffsetFromTextPosition(editorRef.value, start)
      const endInfo = getNodeAndOffsetFromTextPosition(editorRef.value, end)
      
      if (!startInfo.node || !endInfo.node) return false
      
      const selection = window.getSelection()
      selection.removeAllRanges()
      
      const range = document.createRange()
      range.setStart(startInfo.node, startInfo.offset)
      range.setEnd(endInfo.node, endInfo.offset)
      
      selection.addRange(range)
      return true
    } catch (err) {
      console.error('更新DOM选区失败:', err)
      return false
    }
  }

  /**
   * 获取光标坐标
   * @param {number} offset - 文本偏移量
   * @returns {Object} 坐标信息
   */
  const getCursorCoordinates = (offset) => {
    if (!editorRef.value) return { left: 0, top: 0 }
    
    try {
      const { node, offset: nodeOffset } = getNodeAndOffsetFromTextPosition(editorRef.value, offset)
      if (!node) return { left: 0, top: 0 }
      
      // 创建一个范围来获取坐标
      const range = document.createRange()
      range.setStart(node, nodeOffset)
      range.setEnd(node, nodeOffset)
      
      // 获取范围的客户端矩形
      const rects = range.getClientRects()
      if (rects.length > 0) {
        const rect = rects[0]
        const containerRect = editorRef.value.getBoundingClientRect()
        
        return {
          left: rect.left - containerRect.left + editorRef.value.scrollLeft,
          top: rect.top - containerRect.top + editorRef.value.scrollTop
        }
      }
      
      // 备用方法：如果没有有效的矩形，使用行和列估算
      const containerStyle = window.getComputedStyle(editorRef.value)
      const fontSizePx = parseInt(containerStyle.fontSize, 10) || 16
      const text = editorRef.value.textContent.substring(0, offset)
      const lines = text.split('\n')
      const lineIndex = lines.length - 1
      const colIndex = lines[lineIndex].length
      
      return {
        left: colIndex * (fontSizePx * 0.6), // 估算字符宽度
        top: lineIndex * lineHeight
      }
    } catch (err) {
      console.error('获取光标坐标失败:', err)
      return { left: 0, top: 0 }
    }
  }

  /**
   * 更新光标位置
   */
  const updateCursorPosition = () => {
    if (!editorRef.value) return
    
    // 计算当前光标位置的坐标
    const coords = getCursorCoordinates(state.selection.end)
    cursorCoords.left = coords.left
    cursorCoords.top = coords.top
    
    // 如果有选区，计算选区矩形
    if (hasSelection.value) {
      calculateSelectionRects()
    } else {
      selectionRects.value = []
    }
  }

  /**
   * 计算选区矩形
   */
  const calculateSelectionRects = () => {
    if (!editorRef.value || !hasSelection.value) {
      selectionRects.value = []
      return
    }
    
    try {
      // 获取选区的起始和结束
      const start = Math.min(state.selection.start, state.selection.end)
      const end = Math.max(state.selection.start, state.selection.end)
      
      // 获取DOM范围
      const startInfo = getNodeAndOffsetFromTextPosition(editorRef.value, start)
      const endInfo = getNodeAndOffsetFromTextPosition(editorRef.value, end)
      
      if (!startInfo.node || !endInfo.node) {
        selectionRects.value = []
        return
      }
      
      const range = document.createRange()
      range.setStart(startInfo.node, startInfo.offset)
      range.setEnd(endInfo.node, endInfo.offset)
      
      // 获取客户端矩形列表
      const clientRects = range.getClientRects()
      if (clientRects.length === 0) {
        selectionRects.value = []
        return
      }
      
      // 转换为相对于编辑器的坐标
      const containerRect = editorRef.value.getBoundingClientRect()
      
      selectionRects.value = Array.from(clientRects).map(rect => ({
        left: rect.left - containerRect.left + editorRef.value.scrollLeft,
        top: rect.top - containerRect.top + editorRef.value.scrollTop,
        width: rect.width,
        height: rect.height
      }))
    } catch (err) {
      console.error('计算选区矩形失败:', err)
      selectionRects.value = []
    }
  }

  /**
   * 根据点击位置获取文本位置
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @returns {number} 文本位置
   */
  const getTextPositionFromPoint = (x, y) => {
    if (!editorRef.value) return 0
    
    try {
      let node, offset
      
      // 使用标准API获取位置
      if (document.caretPositionFromPoint) {
        const position = document.caretPositionFromPoint(x, y)
        if (position) {
          node = position.offsetNode
          offset = position.offset
        }
      } else if (document.caretRangeFromPoint) {
        const range = document.caretRangeFromPoint(x, y)
        if (range) {
          node = range.startContainer
          offset = range.startOffset
        }
      } else {
        return 0
      }
      
      // 确保节点在编辑器内
      if (node && editorRef.value.contains(node)) {
        return getTextOffsetFromNode(editorRef.value, node, offset)
      }
      
      return 0
    } catch (err) {
      console.error('从点击位置获取文本位置失败:', err)
      return 0
    }
  }

  // ---------- 光标闪烁控制 ----------

  /**
   * 开始光标闪烁
   */
  const startCursorBlink = () => {
    stopCursorBlink()
    
    cursorVisible.value = true
    blinkTimer = setInterval(() => {
      cursorVisible.value = !cursorVisible.value
    }, blinkInterval)
  }

  /**
   * 停止光标闪烁
   * @param {boolean} finalState - 最终状态
   */
  const stopCursorBlink = (finalState = true) => {
    if (blinkTimer) {
      clearInterval(blinkTimer)
      blinkTimer = null
    }
    
    cursorVisible.value = finalState
  }

  /**
   * 重置光标闪烁（输入时）
   */
  const resetCursorBlink = () => {
    stopCursorBlink(true)
    
    if (state.focused) {
      startCursorBlink()
    }
  }

  // ---------- 事件处理函数 ----------

  /**
   * 处理文本输入
   * @param {Event} event - 输入事件
   */
  const handleInput = (event) => {
    if (isComposing.value) return // 输入法编辑中，不处理
    
    // 获取新文本
    const newText = event.target.textContent
    
    // 如果文本未变化，不处理
    if (newText === state.text) return
    
    // 保存当前选区
    let selection = saveSelection()
    if (!selection) {
      selection = { 
        start: state.selection.start, 
        end: state.selection.end 
      }
    }
    
    // 更新文本
    state.text = newText
    state.version++
    
    // 更新选区状态
    state.selection.start = selection.start
    state.selection.end = selection.end
    
    // 更新光标位置
    updateCursorPosition()
    
    // 重置光标闪烁
    resetCursorBlink()
    
    // 调用变更回调
    if (typeof onTextChange === 'function') {
      onTextChange({
        text: state.text,
        selection,
        version: state.version
      })
    }
  }

  /**
   * 处理选区变化
   */
  const handleSelectionChange = () => {
    if (!editorRef.value || !state.focused) return
    
    const selection = saveSelection()
    if (!selection) return
    
    // 更新状态
    state.selection.start = selection.start
    state.selection.end = selection.end
    state.selection.direction = selection.direction
    
    // 更新光标位置
    updateCursorPosition()
    
    // 重置光标闪烁
    resetCursorBlink()
    
    // 调用选区变化回调
    if (typeof onSelectionChange === 'function') {
      onSelectionChange({
        start: selection.start,
        end: selection.end,
        text: selectedText.value,
        direction: selection.direction,
        timestamp: Date.now()
      })
    }
  }

  /**
   * 处理键盘事件
   * @param {KeyboardEvent} event - 键盘事件
   */
  const handleKeyDown = (event) => {
    // 处理回车键
    if (shouldHandleEnter && event.key === 'Enter') {
      event.preventDefault()
      insertText('\n')
    }
  }

  /**
   * 处理焦点获取
   */
  const handleFocus = () => {
    state.focused = true
    startCursorBlink()
  }

  /**
   * 处理焦点失去
   */
  const handleBlur = () => {
    state.focused = false
    stopCursorBlink(false)
  }

  /**
   * 处理点击事件
   * @param {MouseEvent} event - 鼠标事件
   */
  const handleClick = (event) => {
    if (!editorRef.value) return
    
    // 获取点击位置对应的文本位置
    const textPosition = getTextPositionFromPoint(event.clientX, event.clientY)
    
    // 设置选区
    setSelectionRange(textPosition, textPosition)
  }

  /**
   * 处理输入法开始
   */
  const handleCompositionStart = () => {
    isComposing.value = true
  }

  /**
   * 处理输入法结束
   */
  const handleCompositionEnd = () => {
    isComposing.value = false
    
    // 手动触发一次输入处理
    handleInput({ target: editorRef.value })
  }

  /**
   * 全选文本
   */
  const selectAll = () => {
    setSelectionRange(0, state.text.length)
  }

  /**
   * 激活编辑器并获取焦点
   */
  const focus = () => {
    if (!editorRef.value) return
    
    editorRef.value.focus()
    state.focused = true
    startCursorBlink()
  }

  /**
   * 使编辑器失去焦点
   */
  const blur = () => {
    if (!editorRef.value) return
    
    editorRef.value.blur()
    state.focused = false
    stopCursorBlink(false)
  }

  // ---------- 生命周期钩子 ----------
  
  onMounted(() => {
    // 在组件挂载后，初始化文本内容
    nextTick(() => {
      if (editorRef.value && state.text) {
        editorRef.value.textContent = state.text
      }
    })
    
    // 监听全局选区变化
    document.addEventListener('selectionchange', handleSelectionChange)
  })
  
  onUnmounted(() => {
    // 清理资源
    document.removeEventListener('selectionchange', handleSelectionChange)
    stopCursorBlink()
  })

  // ---------- 返回API ----------
  
  return {
    // 状态
    state,
    editorRef,
    wrapperRef,
    cursorVisible,
    cursorCoords,
    selectionRects,
    hasSelection,
    selectedText,
    isComposing,
    
    // 方法
    getText,
    setText,
    insertText,
    deleteText,
    setSelectionRange,
    getSelectionRange,
    selectAll,
    focus,
    blur,
    getCursorCoordinates,
    
    // 事件处理器
    handleInput,
    handleKeyDown,
    handleFocus,
    handleBlur,
    handleClick,
    handleCompositionStart,
    handleCompositionEnd,
    
    // 内部光标控制
    updateCursorPosition,
    startCursorBlink,
    stopCursorBlink,
    resetCursorBlink,
    
    // DOM操作
    getTextPositionFromPoint,
    getNodeAndOffsetFromTextPosition,
    getTextOffsetFromNode
  }
} 