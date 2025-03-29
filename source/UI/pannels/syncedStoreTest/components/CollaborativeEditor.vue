<template>
  <div class="editor-container">
    <div class="editor-info">
      <span>当前编辑者: {{ clientId }}</span>
      <span>光标位置: {{ localSelection.start }}</span>
      <span>选区长度: {{ localSelection.end - localSelection.start }}</span>
    </div>
    
    <!-- 编辑器容器，添加本地光标支持 -->
    <div class="editor-wrapper" ref="editorWrapper">
      <!-- 光标和选区层 -->
      <div class="cursors-layer">
        <!-- 远程用户光标 -->
        <template v-if="remoteCursors.length > 0">
          <div 
            v-for="cursor in remoteCursors"
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
        
        <!-- 本地光标 -->
        <div
          v-if="isEditorFocused && useVirtualCursor"
          class="local-cursor"
          :class="{ 'cursor-hidden': !cursorVisible }"
          :style="{
            left: localCursorCoords.left + 'px',
            top: localCursorCoords.top + 'px',
            height: `${lineHeight}px`,
            backgroundColor: cursorColor
          }"
        ></div>
        
        <!-- 本地选区显示 -->
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
      
      <!-- 可编辑区域 -->
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
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, watch, computed, nextTick } from 'vue'
import { useCursor } from '../useCursor.js'

const props = defineProps({
  // 编辑器基本属性
  clientId: {
    type: String,
    required: true
  },
  // 初始文本内容
  initialText: {
    type: String,
    default: ''
  },
  // 是否使用虚拟光标
  useVirtualCursor: {
    type: Boolean,
    default: true
  },
  // 光标颜色
  cursorColor: {
    type: String,
    default: '#1a73e8'
  },
  // 光标列表 - 修改为直接接收原始数据
  remoteUsers: {
    type: Array,
    default: () => []
  },
  // 行高
  lineHeight: {
    type: Number,
    default: 20
  },
  // Awareness对象，可选，直接传入允许更直接的交互
  awareness: {
    type: Object,
    default: null
  }
});

const emit = defineEmits([
  'textChange',       // 文本内容变化
  'selectionChange',  // 选区变化
  'focus',           // 编辑器获取焦点
  'blur',            // 编辑器失去焦点
  'cursorUpdate'     // 光标位置更新 - 新增
]);

// DOM 引用
const editor = ref(null);
const editorWrapper = ref(null);

// 编辑器状态
const isEditorFocused = ref(false);
const localCursorCoords = ref({ left: 0, top: 0 });
const localSelectionRects = ref([]);
const editorContent = ref(''); // 存储当前编辑器内容
const editorVersion = ref(0);  // 编辑器内容版本号

// 使用光标管理模块
const { 
  localSelection,
  selections: cursorSelections,
  saveSelection,
  restoreSelection,
  getCursorCoordinates,
  getTextPosition,
  getNodeAndOffset,
  clearCache,
  incrementContentVersion,
  resetCursorBlink,
  isVisible,
  getPositionFromPoint,
} = useCursor({ 
  containerRef: editor, 
  lineHeight: props.lineHeight,
  enableCache: true,
  cacheTimeout: 2000,
  useVirtualCursor: props.useVirtualCursor,
  cursorColor: props.cursorColor,
  cursorWidth: 2,
  blinkInterval: 530
});

// 计算属性
const cursorVisible = computed(() => isVisible.value);

const hasLocalSelection = computed(() => {
  return localSelection.value && 
         localSelection.value.start !== localSelection.value.end;
});

// 改进的远程光标列表生成，确保计算正确的坐标
const remoteCursors = computed(() => {
  // 检查remoteUsers格式是否正确
  if (!Array.isArray(props.remoteUsers) || props.remoteUsers.length === 0) {
    return [];
  }

  return props.remoteUsers.map(user => {
    // 确保用户有光标位置信息
    if (!user || typeof user.start !== 'number') {
      return null;
    }

    // 计算当前文本中光标的坐标
    const { left, top } = getCursorCoordinates(user.start);
    
    return {
      id: user.id,
      left,
      top,
      color: user.color || generateRandomColor(user.id),
      username: user.username || `用户-${user.id}`,
      start: user.start,
      end: user.end
    };
  }).filter(Boolean); // 过滤掉无效的光标
});

// 生命周期
onMounted(async () => {
  // 初始化编辑器内容
  if (editor.value) {
    editor.value.textContent = props.initialText || '';
    editorContent.value = props.initialText || '';
    
    // 初始化完成后，将光标移至文本末尾
    await nextTick();
    setSelectionToEnd();
  }
  
  // 监听文档点击事件，处理编辑器外部点击
  document.addEventListener('click', handleDocumentClick);
});

onUnmounted(() => {
  // 清理全局事件监听
  document.removeEventListener('click', handleDocumentClick);
  
  // 清理缓存
  clearCache();
});

// 观察initialText变化
watch(() => props.initialText, (newText) => {
  if (newText !== editorContent.value) {
    setText(newText);
  }
});

// 处理键盘事件，主要是处理回车键
const handleKeyDown = (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    document.execCommand('insertLineBreak');
  }
};

// 处理选区变化
const handleSelection = () => {
  if (!editor.value) return;
  
  try {
    // 保存选区信息
    const selection = saveSelection();
    if (!selection) return;
    
    // 更新本地虚拟光标位置
    updateLocalCursorPosition();
    
    // 发送选区变化事件
    emit('selectionChange', {
      ...selection,
      clientId: props.clientId,
      text: editor.value.textContent,
      version: editorVersion.value
    });
    
    // 发送光标更新事件 - 新增
    emit('cursorUpdate', {
      clientId: props.clientId,
      start: selection.start,
      end: selection.end,
      coords: {
        left: localCursorCoords.value.left,
        top: localCursorCoords.value.top
      },
      timestamp: Date.now()
    });
  } catch (err) {
    console.error('处理选区变化错误:', err);
  }
};

// 处理文本变更
const handleTextChange = (event) => {
  if (!editor.value) return;
  
  try {
    // 增加内容版本
    incrementContentVersion();
    editorVersion.value++;
    
    // 保存当前选区
    const selection = saveSelection();
    
    // 更新光标状态
    updateEditorState(selection);
    
    // 更新本地内容状态
    editorContent.value = editor.value.textContent;
    
    // 发送文本变更事件
    emit('textChange', {
      text: editor.value.textContent,
      selection,
      clientId: props.clientId,
      version: editorVersion.value
    });
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

// 处理滚动事件
const handleScroll = (event) => {
  if (!editor.value) return;
  
  // 触发光标位置更新
  updateLocalCursorPosition();
  
  // 如果有选区，更新选区矩形
  if (hasLocalSelection.value) {
    calculateSelectionRects();
  }
};

// 处理文档点击事件
const handleDocumentClick = (event) => {
  // 检查点击是否在编辑器外部
  if (editor.value && !editor.value.contains(event.target) && 
      editorWrapper.value && !editorWrapper.value.contains(event.target)) {
    isEditorFocused.value = false;
  }
};

// 编辑器焦点处理
const handleEditorFocus = () => {
  isEditorFocused.value = true;
  updateLocalCursorPosition();
  emit('focus');
};

const handleEditorBlur = () => {
  // 不立即设置焦点状态，让document click事件处理
  // 这样可以防止点击光标层时失去焦点
  setTimeout(() => {
    if (document.activeElement !== editor.value) {
      isEditorFocused.value = false;
      emit('blur');
    }
  }, 10);
};

// 点击事件处理
const handleEditorClick = (event) => {
  if (!props.useVirtualCursor || !editor.value) return;
  
  try {
    isEditorFocused.value = true;
    
    // 计算相对于编辑器的点击坐标
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
      const savedSelection = saveSelection();
      updateLocalCursorPosition();
      resetCursorBlink();
      
      // 发送选区更新事件
      if (savedSelection) {
        emit('selectionChange', {
          ...savedSelection,
          clientId: props.clientId,
          text: editor.value.textContent
        });
      }
    }
  } catch (err) {
    console.error('处理编辑器点击事件错误:', err);
  }
};

// 鼠标按下事件处理
const handleEditorMouseDown = (event) => {
  if (!props.useVirtualCursor) return;
  
  // 鼠标按下时，保持光标可见状态（不闪烁）
  isEditorFocused.value = true;
  editor.value.focus();
};

// 鼠标松开事件处理
const handleEditorMouseUp = (event) => {
  if (!props.useVirtualCursor || !editor.value) return;
  
  // 延迟处理，确保选择已经完成
  setTimeout(() => {
    const selection = saveSelection();
    updateLocalCursorPosition();
    resetCursorBlink();
    
    // 如果形成了选区，立即更新选区高亮显示
    if (hasLocalSelection.value) {
      calculateSelectionRects();
    }
    
    // 发送选区更新
    if (selection) {
      emit('selectionChange', {
        ...selection,
        clientId: props.clientId,
        text: editor.value.textContent
      });
      
      // 发送光标更新事件
      emit('cursorUpdate', {
        clientId: props.clientId,
        start: selection.start,
        end: selection.end,
        coords: {
          left: localCursorCoords.value.left,
          top: localCursorCoords.value.top
        },
        timestamp: Date.now()
      });
    }
  }, 10);
};

// 更新本地光标位置
const updateLocalCursorPosition = () => {
  if (!props.useVirtualCursor || !editor.value) return;
  
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

// 更新光标坐标 - 改进计算逻辑，确保准确性
const updateCursorCoordinates = (selectionInfo) => {
  // 优先使用保存的选区信息
  if (localSelection.value) {
    // 获取结束位置的坐标
    const coords = getCursorCoordinates(localSelection.value.end);
    
    // 确保坐标有效
    if (coords && typeof coords.left === 'number' && typeof coords.top === 'number') {
      localCursorCoords.value = coords;
      return;
    }
  }
  
  // 备用：使用DOM选区计算
  calculateCoordinatesFromDOMRange(selectionInfo.range);
};

// 从DOM范围计算坐标
const calculateCoordinatesFromDOMRange = (range) => {
  if (!editor.value || !range) return;
  
  try {
    const editorRect = editor.value.getBoundingClientRect();
    const rangeRect = range.getBoundingClientRect();
    
    if (rangeRect.width === 0 && rangeRect.height === 0) {
      // 如果范围矩形为空，尝试创建一个临时元素获取位置
      const span = document.createElement('span');
      span.textContent = '|';
      
      // 保存原始范围
      const savedRange = range.cloneRange();
      
      // 插入临时元素
      range.insertNode(span);
      
      // 获取临时元素位置
      const spanRect = span.getBoundingClientRect();
      
      // 移除临时元素并恢复范围
      span.remove();
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(savedRange);
      
      // 使用临时元素位置
      localCursorCoords.value = {
        left: spanRect.left - editorRect.left + editor.value.scrollLeft,
        top: spanRect.top - editorRect.top + editor.value.scrollTop
      };
    } else {
      // 使用范围矩形
      localCursorCoords.value = {
        left: rangeRect.right - editorRect.left + editor.value.scrollLeft,
        top: rangeRect.top - editorRect.top + editor.value.scrollTop
      };
    }
  } catch (err) {
    console.error('计算光标坐标出错:', err);
  }
};

// 计算选区矩形 - 改进计算方法
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

// 将选区设置到文本末尾
const setSelectionToEnd = () => {
  if (!editor.value) return;
  
  const length = editor.value.textContent.length;
  restoreSelection({
    start: length,
    end: length
  });
  
  // 更新光标位置
  updateLocalCursorPosition();
};

// 生成随机颜色 - 保证光标颜色可识别
const generateRandomColor = (seed) => {
  // 使用简单的哈希算法
  let hash = 0;
  const str = String(seed);
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash; // 转为32位整数
  }
  
  // 确保颜色明亮且易于区分
  const h = Math.abs(hash) % 360;
  const s = 70 + (Math.abs(hash >> 8) % 30); // 70-100% 饱和度
  const l = 45 + (Math.abs(hash >> 16) % 10); // 45-55% 亮度
  
  return `hsl(${h}, ${s}%, ${l}%)`;
};

// 对外暴露的方法
// 设置编辑器文本内容
const setText = (text) => {
  if (!editor.value) return;
  
  try {
    // 保存当前选区
    const savedSelection = saveSelection();
    
    // 更新内容
    editor.value.textContent = text || '';
    editorContent.value = text || '';
    
    // 增加版本号
    editorVersion.value++;
    
    // 选区处理
    if (savedSelection && document.activeElement === editor.value) {
      // 尝试恢复选区
      setTimeout(() => {
        restoreSelection(savedSelection);
        updateLocalCursorPosition();
      }, 0);
    } else {
      // 将光标设置到文本末尾
      setTimeout(() => {
        setSelectionToEnd();
      }, 0);
    }
  } catch (err) {
    console.error('设置编辑器文本失败:', err);
  }
};

// 获取当前文本内容
const getText = () => {
  return editor.value ? editor.value.textContent : '';
};

// 获取当前版本号
const getVersion = () => {
  return editorVersion.value;
};

// 获取当前光标位置的坐标
const getCurrentCursorCoords = () => {
  return { ...localCursorCoords.value };
};

// 暴露组件方法
defineExpose({
  setText,
  getText,
  getVersion,
  setSelectionToEnd,
  updateLocalCursorPosition,
  getCurrentCursorCoords,
  localSelection
});
</script>

<style scoped>
.editor-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
}

.editor-info {
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
  font-size: 0.9em;
  color: #666;
}

.editor-wrapper {
  position: relative;
  width: 100%;
  flex: 1;
  display: flex;
}

.editor {
  width: 100%;
  height: 250px;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow-y: auto;
  outline: none;
  flex: 1;
  position: relative;
  z-index: 1;
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

.remote-cursor {
  position: absolute;
  width: 2px;
  height: 20px;
  z-index: 3;
  pointer-events: none;
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
  z-index: 4;
  transform: translateX(-50%);
  opacity: 0.9;
}

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

/* 光标闪烁动画 */
@keyframes cursor-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style> 