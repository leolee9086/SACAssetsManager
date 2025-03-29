<template>
  <div class="mindmap-container" ref="containerRef">
    <div class="mindmap-toolbar" v-if="!readOnly">
      <button @click="addChildNode" title="添加子节点">
        <span>添加节点</span>
      </button>
      <button @click="deleteNode" :disabled="!selectedNode" title="删除节点">
        <span>删除节点</span>
      </button>
      <button @click="centerMap" title="居中显示">
        <span>居中</span>
      </button>
      <div class="zoom-controls">
        <button @click="zoomIn" title="放大">+</button>
        <span>{{ Math.round(zoom * 100) }}%</span>
        <button @click="zoomOut" title="缩小">-</button>
      </div>
    </div>
    
    <div class="mindmap-canvas-container" ref="canvasContainerRef" @wheel="handleWheel">
      <div 
        class="mindmap-canvas" 
        ref="canvasRef"
        :style="{
          transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
          transformOrigin: '50% 50%'
        }"
        @mousedown="startDrag"
        @mousemove="onDrag"
        @mouseup="stopDrag"
        @mouseleave="stopDrag"
      >
        <!-- 根节点 -->
        <div v-if="rootNode" class="node-container">
          <mind-node 
            :node="rootNode" 
            :selected="selectedNode === rootNode" 
            :read-only="readOnly"
            @select="selectNode"
            @update="updateNode"
            :zoom="zoom"
            :is-root="true"
          />
        </div>
        
        <!-- 连接线 -->
        <svg class="connections" ref="connectionsRef" xmlns="http://www.w3.org/2000/svg">
          <g>
            <path v-for="(path, index) in connections" 
                  :key="index" 
                  :d="path"
                  stroke="#666"
                  stroke-width="2"
                  fill="none" />
          </g>
        </svg>
        
        <!-- 没有数据时的提示 -->
        <div v-if="!rootNode" class="no-data">
          点击"添加节点"创建一个新的思维导图
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import MindNode from './MindNode.vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  readOnly: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

// 引用
const containerRef = ref(null)
const canvasContainerRef = ref(null)
const canvasRef = ref(null)
const connectionsRef = ref(null)

// 状态
const rootNode = ref(null)
const selectedNode = ref(null)
const zoom = ref(1)
const position = reactive({ x: 0, y: 0 })
const isDragging = ref(false)
const dragStart = reactive({ x: 0, y: 0 })
const connections = ref([])

// 初始化思维导图
const initMindMap = () => {
  try {
    if (props.modelValue) {
      // 尝试解析为JSON
      try {
        rootNode.value = JSON.parse(props.modelValue)
      } catch (err) {
        console.log('输入不是JSON格式，尝试解析为文本:', err)
        // 如果不是JSON，则解析为文本格式
        rootNode.value = parseTextToMindMap(props.modelValue)
      }
    } else {
      resetMap()
    }
  } catch (err) {
    console.error('解析思维导图数据失败:', err)
    resetMap()
  }
  
  nextTick(() => {
    updateConnections()
    centerMap()
  })
}

// 将文本内容解析为思维导图数据结构
const parseTextToMindMap = (text) => {
  if (!text || typeof text !== 'string') {
    return createDefaultRoot()
  }

  // 尝试解析为Markdown结构
  const lines = text.split('\n').filter(line => line.trim() !== '')
  
  if (lines.length === 0) {
    return createDefaultRoot()
  }

  // 处理第一行作为根节点
  let rootText = lines[0].replace(/^#+\s+/, '').trim() || '中心主题'
  const root = {
    id: generateId(),
    text: rootText,
    children: []
  }

  if (lines.length <= 1) {
    return root
  }

  // 通过首行判断文档类型
  const isMarkdown = lines.some(line => line.trim().match(/^#+\s+/))
  const isListFormat = lines.some(line => line.trim().match(/^[*\-+]\s+/) || line.trim().match(/^\d+\.\s+/))
  
  if (isMarkdown) {
    // 解析Markdown格式
    return parseMarkdownToMindMap(lines, root)
  } else if (isListFormat) {
    // 解析列表格式
    return parseListToMindMap(lines, root)
  } else {
    // 默认处理为简单文本
    return parseSimpleTextToMindMap(lines, root)
  }
}

// 创建默认的根节点
const createDefaultRoot = () => {
  return {
    id: generateId(),
    text: '中心主题',
    children: []
  }
}

// 解析Markdown格式
const parseMarkdownToMindMap = (lines, root) => {
  // 从第二行开始解析子节点
  let currentLevel = 0
  let currentParent = root
  let parentStack = [root]
  let levelStack = [0]

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    const trimmedLine = line.trim()
    
    // 跳过空行
    if (trimmedLine === '') continue
    
    // 检测标题级别
    const headingMatch = trimmedLine.match(/^(#+)\s+(.+)$/)
    if (headingMatch) {
      // 这是一个Markdown标题
      const level = headingMatch[1].length
      const text = headingMatch[2].trim()
      
      // 创建新节点
      const newNode = {
        id: generateId(),
        text,
        children: []
      }
      
      // 确定父节点
      if (level > currentLevel) {
        // 进入下一级
        parentStack.push(currentParent)
        levelStack.push(currentLevel)
        currentParent = parentStack[parentStack.length - 1]
      } else if (level < currentLevel) {
        // 返回上一级
        while (levelStack.length > 0 && level <= levelStack[levelStack.length - 1]) {
          parentStack.pop()
          levelStack.pop()
        }
        currentParent = parentStack[parentStack.length - 1] || root
      }
      
      // 添加到父节点
      currentParent.children.push(newNode)
      currentLevel = level
      currentParent = newNode
    } else {
      // 普通文本行，作为当前父节点的子节点
      const newNode = {
        id: generateId(),
        text: trimmedLine,
        children: []
      }
      
      // 如果没有明确的层级，就添加到根节点
      const parent = parentStack[parentStack.length - 1] || root
      parent.children.push(newNode)
    }
  }
  
  return root
}

// 解析列表格式（支持*、-、+和数字列表）
const parseListToMindMap = (lines, root) => {
  let currentLevel = 0
  let currentParent = root
  let parentStack = [root]
  let levelStack = [0]

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    const trimmedLine = line.trim()
    
    // 跳过空行
    if (trimmedLine === '') continue
    
    // 计算缩进级别
    const indentMatch = line.match(/^(\s*)/)[1]
    const indent = indentMatch.length
    const level = Math.floor(indent / 2) + 1
    
    // 检测列表符号
    const listItemMatch = trimmedLine.match(/^([*\-+]|\d+\.)\s+(.+)$/)
    if (listItemMatch) {
      const text = listItemMatch[2].trim()
      
      // 创建新节点
      const newNode = {
        id: generateId(),
        text,
        children: []
      }
      
      // 确定父节点
      if (level > currentLevel) {
        parentStack.push(currentParent)
        levelStack.push(currentLevel)
      } else if (level < currentLevel) {
        while (levelStack.length > 0 && level <= levelStack[levelStack.length - 1]) {
          parentStack.pop()
          levelStack.pop()
        }
      } else if (level === currentLevel && currentParent !== parentStack[parentStack.length - 1]) {
        // 同级别，回到上一个父节点
        currentParent = parentStack[parentStack.length - 1]
      }
      
      // 添加到父节点
      const parent = parentStack[parentStack.length - 1] || root
      parent.children.push(newNode)
      
      currentLevel = level
      currentParent = newNode
    } else {
      // 普通文本行，作为当前父节点的子节点
      const newNode = {
        id: generateId(),
        text: trimmedLine,
        children: []
      }
      
      // 添加到根节点
      root.children.push(newNode)
    }
  }
  
  return root
}

// 解析简单文本（每行一个节点）
const parseSimpleTextToMindMap = (lines, root) => {
  // 从第二行开始解析子节点，每行作为根节点的一个子节点
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line === '') continue
    
    root.children.push({
      id: generateId(),
      text: line,
      children: []
    })
  }
  
  return root
}

// 重置思维导图
const resetMap = () => {
  rootNode.value = {
    id: generateId(),
    text: '中心主题',
    children: []
  }
}

// 生成唯一ID
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
}

// 选择节点
const selectNode = (node) => {
  selectedNode.value = node
}

// 更新节点
const updateNode = (node, newText) => {
  node.text = newText
  emitChange()
}

// 添加子节点
const addChildNode = () => {
  const targetNode = selectedNode.value || rootNode.value
  
  if (!targetNode) return
  
  if (!targetNode.children) {
    targetNode.children = []
  }
  
  const newNode = {
    id: generateId(),
    text: '新节点',
    children: []
  }
  
  targetNode.children.push(newNode)
  selectedNode.value = newNode
  
  emitChange()
  nextTick(() => {
    updateConnections()
  })
}

// 删除节点
const deleteNode = () => {
  if (!selectedNode.value || selectedNode.value === rootNode.value) return
  
  const findAndRemove = (nodeList) => {
    for (let i = 0; i < nodeList.length; i++) {
      if (nodeList[i] === selectedNode.value) {
        nodeList.splice(i, 1)
        return true
      }
      
      if (nodeList[i].children && nodeList[i].children.length) {
        if (findAndRemove(nodeList[i].children)) {
          return true
        }
      }
    }
    
    return false
  }
  
  if (rootNode.value.children) {
    findAndRemove(rootNode.value.children)
  }
  
  selectedNode.value = null
  emitChange()
  nextTick(() => {
    updateConnections()
  })
}

// 更新连接线
const updateConnections = () => {
  if (!canvasRef.value || !connectionsRef.value) return
  
  const paths = []
  
  const drawConnections = (node, nodeEl) => {
    if (!node.children || !node.children.length) return
    
    // 查找子节点元素并绘制连接线
    const childElements = nodeEl.querySelectorAll(':scope > .node-children > .node-container')
    
    childElements.forEach((childEl, index) => {
      const child = node.children[index]
      
      if (!child) return
      
      // 计算连接线的起点和终点
      const parentCenter = {
        x: nodeEl.offsetLeft + nodeEl.offsetWidth / 2,
        y: nodeEl.offsetTop + nodeEl.offsetHeight / 2
      }
      
      const childCenter = {
        x: childEl.offsetLeft + childEl.offsetWidth / 2,
        y: childEl.offsetTop + childEl.offsetHeight / 2
      }
      
      // 创建平滑的曲线路径
      const dx = childCenter.x - parentCenter.x
      const dy = childCenter.y - parentCenter.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      const curveFactor = Math.min(distance * 0.3, 50)
      
      const midX = (parentCenter.x + childCenter.x) / 2
      const midY = (parentCenter.y + childCenter.y) / 2
      
      const path = `M ${parentCenter.x} ${parentCenter.y} 
                   Q ${midX} ${midY - curveFactor} ${childCenter.x} ${childCenter.y}`
      
      paths.push(path)
      
      // 递归绘制子节点的连接线
      drawConnections(child, childEl)
    })
  }
  
  const rootNodeEl = canvasRef.value.querySelector('.node-container')
  if (rootNodeEl && rootNode.value) {
    drawConnections(rootNode.value, rootNodeEl)
  }
  
  connections.value = paths
}

// 居中显示
const centerMap = () => {
  if (!canvasContainerRef.value || !canvasRef.value) return
  
  position.x = canvasContainerRef.value.offsetWidth / 2 - canvasRef.value.offsetWidth / 2
  position.y = canvasContainerRef.value.offsetHeight / 2 - canvasRef.value.offsetHeight / 2
}

// 放大
const zoomIn = () => {
  zoom.value = Math.min(zoom.value + 0.1, 2)
}

// 缩小
const zoomOut = () => {
  zoom.value = Math.max(zoom.value - 0.1, 0.3)
}

// 处理滚轮缩放
const handleWheel = (e) => {
  if (e.ctrlKey) {
    e.preventDefault()
    
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    const newZoom = Math.max(0.3, Math.min(2, zoom.value + delta))
    
    zoom.value = newZoom
  }
}

// 开始拖拽
const startDrag = (e) => {
  // 忽略节点内部的拖拽事件
  if (e.target.closest('.mind-node')) return
  
  isDragging.value = true
  dragStart.x = e.clientX - position.x
  dragStart.y = e.clientY - position.y
}

// 拖拽移动
const onDrag = (e) => {
  if (!isDragging.value) return
  
  position.x = e.clientX - dragStart.x
  position.y = e.clientY - dragStart.y
}

// 停止拖拽
const stopDrag = () => {
  isDragging.value = false
}

// 发送变更事件
const emitChange = () => {
  try {
    // 如果rootNode包含Markdown风格的文本，处理一下
    checkAndConvertMarkdownFormatting(rootNode.value)
    
    const data = JSON.stringify(rootNode.value)
    emit('update:modelValue', data)
    emit('change', rootNode.value)
  } catch (err) {
    console.error('序列化思维导图数据失败:', err)
  }
}

// 检测并转换可能包含的Markdown格式文本
const checkAndConvertMarkdownFormatting = (node) => {
  if (!node) return
  
  // 处理根节点文本
  if (node.text && typeof node.text === 'string') {
    // 移除开头的#号
    node.text = node.text.replace(/^#+\s+/, '')
  }
  
  // 处理子节点
  if (node.children && Array.isArray(node.children)) {
    node.children.forEach(child => checkAndConvertMarkdownFormatting(child))
  }
}

// 监听模型变化
watch(() => props.modelValue, () => {
  initMindMap()
})

// 监听元素尺寸变化
watch([canvasRef, canvasContainerRef], () => {
  nextTick(() => {
    updateConnections()
  })
})

// 组件挂载
onMounted(() => {
  initMindMap()
  
  const resizeObserver = new ResizeObserver(() => {
    updateConnections()
  })
  
  if (canvasRef.value) {
    resizeObserver.observe(canvasRef.value)
  }
  
  // 清理
  return () => resizeObserver.disconnect()
})

// 暴露方法
defineExpose({
  centerMap,
  zoomIn,
  zoomOut,
  resetZoom: () => { zoom.value = 1 },
  addChildNode,
  deleteNode,
  getRoot: () => rootNode.value
})
</script>

<style scoped>
.mindmap-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
  background-color: #fff;
}

.mindmap-toolbar {
  display: flex;
  padding: 8px;
  gap: 8px;
  border-bottom: 1px solid #ddd;
  background-color: #f5f5f5;
}

.mindmap-toolbar button {
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: white;
  cursor: pointer;
  font-size: 12px;
}

.mindmap-toolbar button:hover:not(:disabled) {
  background-color: #f0f0f0;
}

.mindmap-toolbar button:disabled {
  opacity: 0.5;
  cursor: default;
}

.zoom-controls {
  display: flex;
  align-items: center;
  margin-left: auto;
  gap: 4px;
}

.zoom-controls span {
  min-width: 40px;
  text-align: center;
  font-size: 12px;
}

.zoom-controls button {
  width: 24px;
  height: 24px;
  padding: 0;
  line-height: 1;
}

.mindmap-canvas-container {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.mindmap-canvas {
  position: absolute;
  min-width: 100%;
  min-height: 100%;
  will-change: transform;
  user-select: none;
}

.connections {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.no-data {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #999;
  white-space: nowrap;
  font-style: italic;
}
</style> 