<template>
  <div class="fn__flex-column editor-container">
    <div class="fn__flex fn__flex-1">
      <!-- 修改工具条 -->
      <div class="tools-bar">
        <!-- 使用动态生成的工具组 -->
        <template v-for="(group, groupId) in sortedToolGroups" :key="groupId">
          <div class="tool-group">
            <div class="tool-item" :class="{ active: currentTool === groupId }" @click="handleToolClick(groupId)">
              <i class="icon">{{ group.icon }}</i>
              <span>{{ group.name }}</span>
            </div>
          </div>
        </template>

        <!-- 保留画板工具组 -->
        <div class="tool-group">
          <div class="tool-item" @click="handleToolClick('artboard')">
            <i class="icon">📋</i>
            <span>画板</span>
          </div>
        </div>
      </div>
      <div class="left-panel">
        <!-- 图层列表部分 -->
        <div class="layer-section">
          <div class="section-title">图层</div>
          <div class="layer-list">
            <LayerList v-model="list" :selected-layer="selectedLayer" @select="handleLayerSelect"
              @delete="handleDeleteLayer" />
          </div>
        </div>

        <!-- 预设内容部分 -->
        <div class="preset-section">
          <div class="section-title">{{ getPanelTitle }}</div>
          <div class="preset-content">
            <template v-if="currentTool === 'artboard'">
              <!-- 画板工具面板内容 -->
              <div class="artboard-panel">
                <div class="artboard-controls">
                  <button class="btn" @click="toggleArtboardMode">
                    {{ isArtboardMode ? '退出画板工具' : '画板工具' }}
                  </button>
                  <button class="btn" @click="addArtboard">添加画板</button>
                  <button class="btn" @click="openGalleryView">预览画板</button>
                  <button class="btn" @click="exportAllArtboards">导出所有画板</button>
                </div>
                <div class="artboard-list">
                  <div v-for="(artboard, index) in artboards" :key="artboard.id" class="artboard-item">
                    <span>{{ artboard.name }}</span>
                    <div class="artboard-actions">
                      <button class="btn-icon" @click="() => renameArtboard(index)">✏️</button>
                      <button class="btn-icon" @click="() => deleteArtboard(index)">🗑️</button>
                    </div>
                  </div>
                </div>
              </div>
            </template>

            <template v-else>
              <VueDraggable v-model="currentPresets" :group="{ name: 'nested', pull: 'clone', put: false }"
                :sort="false" :clone="handleClone" item-key="type" class="preset-grid">
                <template v-for="element in currentPresets">
                  <div class="preset-item">
                    <div class="item-icon">{{ element.icon }}</div>
                    <div class="item-name">{{ element.name }}</div>
                  </div>
                </template>
              </VueDraggable>
            </template>
          </div>
        </div>
      </div>
      <div class="fn__flex fn__flex-1 fn__flex-column canvas-wrapper">
        <VueDraggable v-model="contentLayers" :group="{ name: 'nested', put: true, pull: false }" :sort="false"
          draggable="none" @add="handleLayerAdd" class="canvas-container">
          <div class="canvas-area"></div>
        </VueDraggable>
      </div>


      <!-- 属性面板 -->
      <PropertiesPanel v-if="selectedLayer" :layer="selectedLayer" @update:layer="handleLayerUpdate" />
    </div>

    <!-- 添加画廊视图 -->
    <div v-if="showGalleryView" class="gallery-view-overlay">
      <button class="gallery-nav-btn prev" @click="prevArtboard">
        <i class="icon">←</i>
      </button>

      <div class="gallery-content">
        <div class="gallery-artboard">
          <h3>{{ currentArtboard.name }}</h3>
          <div class="gallery-preview" ref="galleryPreviewRef"></div>
        </div>

        <div class="gallery-controls">
          <span>{{ currentIndex + 1 }} / {{ artboards.length }}</span>
          <button class="btn" @click="exportCurrentArtboard">导出当前画板</button>
          <button class="btn" @click="exportAllArtboards">导出所有画板</button>
          <button class="btn secondary" @click="closeGalleryView">关闭预览</button>
        </div>
      </div>

      <button class="gallery-nav-btn next" @click="nextArtboard">
        <i class="icon">→</i>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onUnmounted, computed, nextTick } from 'vue'
import { VueDraggable } from '../../../../static/vue-draggable-plus.js'
import LayerList from './components/LayerList.vue'
import _Konva from '../../../../static/konva.js'
import { ARTBOARD } from './utils/artboardPosition.js'
import { defaultLayerNames, TOOL_GROUPS, getGroupPresets, getLayerTypeConfig } from './core/layerLoader.js'
import { createArtboardLayers, exportArtboard, createNewArtboard, updateArtboardById, removeArtboard } from './core/artboardManager.js'
import PropertiesPanel from './components/PropertiesPanel.vue'
import JSZip from '../../../../static/jszip.js'
import {
  renderLayers,
  removeLayer,
  ensureLayerIds,
  findLayer,
  getLayerAdjustments,
  loadDefaultLayers
} from './core/LayerManager.js'
import { shallowRef } from '../../../../static/vue.esm-browser.js'
const Konva = _Konva.default

// 舞台和图层的引用
const stageRef = ref(null)
const mainLayerRef = ref(null)

// 添加选中图层的引用
const selectedLayer = ref(null)

// 添加图层注册表
const layerRegistry = ref(new Map())


// 修改 list 的定义
const list = ref([])


// 修改渲染图层的调用
watch(() => list.value, () => {
  if (mainLayerRef.value && stageRef.value) {
    renderLayers(
      list.value,
      mainLayerRef.value,
      layerRegistry.value,
      stageRef.value,
      handleShapeClick
    )
  }
}, { deep: true, immediate: true })

// 初始化 Konva 舞台
onMounted(async () => {
  //使用vueDrag需要时刻注意保持数组是同一个否则就会出错

  list.value.push(...await loadDefaultLayers())

  const container = document.querySelector('.canvas-container')
  if (!container) {
    console.error('Canvas container not found')
    return
  }

  // 初始化舞台
  const initStage = () => {
    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight

    // 如果舞台已存在，仅更新尺寸
    if (stageRef.value) {
      stageRef.value.width(containerWidth)
      stageRef.value.height(containerHeight)
      stageRef.value.batchDraw()
      return
    }

    // 创建新舞台
    stageRef.value = new Konva.Stage({
      container,
      width: containerWidth,
      height: containerHeight,
      draggable: true
    })

    // 创建主图层
    mainLayerRef.value = new Konva.Layer()
    stageRef.value.add(mainLayerRef.value)

    // 初始渲染图层
    nextTick(() => {
      renderLayers(
        list.value,
        mainLayerRef.value,
        layerRegistry.value,
        stageRef.value,
        handleShapeClick
      )
    })

    // 添加缩放处
    const debouncedWheel = useDebounceFn((e) => {
      e.evt.preventDefault()

      const stage = stageRef.value
      const oldScale = stage.scaleX()

      const pointer = stage.getPointerPosition()
      const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
      }

      const scaleBy = 1.1
      const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy

      const minScale = 0.1
      const maxScale = 5
      if (newScale < minScale || newScale > maxScale) return

      stage.scale({ x: newScale, y: newScale })

      const newPos = {
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      }
      stage.position(newPos)
      stage.batchDraw()
    }, 16)

    stageRef.value.on('wheel', debouncedWheel)

    // 初始化画板层
    createArtboardLayers(
      stageRef.value,
      artboards.value,
      mainLayerRef,
      isArtboardMode.value
    )
  }

  // 初始化
  initStage()

  // 添加 resize 监听，使用防抖
  const debouncedResize = useDebounceFn(() => {
    initStage()
  }, 100)

  const resizeObserver = new ResizeObserver(debouncedResize)
  resizeObserver.observe(container)

  // 组卸载时清理
  onUnmounted(() => {
    resizeObserver.disconnect()
  })
})

// 修改图层选择处理
const handleLayerSelect = (layer) => {
  if (layer.type === 'folder') return

  // 隐藏之前选中图层的变换器
  if (selectedLayer.value) {
    const registered = layerRegistry.value.get(selectedLayer.value.id)
    if (registered?.shapes) {
      const tr = registered.shapes.find(obj => obj instanceof Konva.Transformer)
      if (tr) tr.hide()
    }
  }

  selectedLayer.value = layer

  // 显示新选中图层的变换器
  const registered = layerRegistry.value.get(layer.id)
  if (registered?.shapes) {
    const tr = registered.shapes.find(obj => obj instanceof Konva.Transformer)
    if (tr) tr.show()
  }
}

// 生成唯一ID
const generateId = () => Math.random().toString(36).substr(2, 9)

// 修改 getDefaultLayerName 的使用
const getDefaultLayerName = (type) => {
  return defaultLayerNames[type] + Date.now() || '新图层'
}

// 获取配置

// 修改删除图层处理函数
const handleDeleteLayer = (layer) => {
  // 如果要删除的是选中的图层,清除选中状态
  if (selectedLayer.value?.id === layer.id) {
    selectedLayer.value = null
  }

  removeLayer(list.value, layer.id)
}

// 组件挂载时确保所有图层都有ID
onMounted(() => {
  ensureLayerIds(list.value)
})


// 用于接收拖入的图层
const contentLayers = shallowRef([])

// 修改克隆处理函数
const handleClone = (item) => {
  const layerConfig = getLayerTypeConfig(item.layerType)
  if (!layerConfig) return null

  return {
    id: generateId(),
    name: getDefaultLayerName(item.layerType) || item.name,
    type: 'file',
    layerType: item.layerType,
    visible: true,
    locked: false,
    config: {
      ...layerConfig.defaultConfig,
      ...item.config
    }
  }
}

const handleLayerAdd = (evt) => {
  const newLayer = evt.clonedData
  console.error(evt, newLayer)
  const stage = stageRef.value
  if (!stage) return

  // 获取图层的调整参数配置
  const adjustments = getLayerAdjustments(newLayer)

  // 确保配置对象包含所有声明的参数
  if (adjustments.length && newLayer.config) {
    adjustments.forEach(adj => {
      if (newLayer.config[adj.key] === undefined) {
        newLayer.config[adj.key] = adj.defaultValue
      }
    })
  }

  const pointerPosition = stage.getPointerPosition()

  if (pointerPosition && newLayer.config) {

    // 创建新的配置对象而不是修改原对象
    const newConfig = {
      ...newLayer.config,
    }
    newLayer.config = newConfig
  }

  // 使用数组方法保持响应式
  const contentGroup = list.value.find(layer => layer.id === 'content-group')
  if (contentGroup && contentGroup.children) {
    contentGroup.children = [newLayer, ...contentGroup.children]
  }

  // 选中新添加的图层
  selectedLayer.value = newLayer

  // 清空临时数组
  contentLayers.value = []
}

// 修改画布元素点击处理函数
const handleShapeClick = (layerId) => {
  const layer = findLayer(list.value, layerId)
  if (layer) {
    handleLayerSelect(layer)
  }
}

// 修改画板数据的响应式处理
const artboards = ref([
  {
    id: 'artboard-1',
    name: '画板 1',
    x: 100,
    y: 100,
    width: ARTBOARD.WIDTH,
    height: ARTBOARD.HEIGHT
  }
])

const isArtboardMode = ref(false) // 画板工具模式开关

// 修改画板工具模式切换
const toggleArtboardMode = () => {
  isArtboardMode.value = !isArtboardMode.value
  const stage = stageRef.value
  if (!stage) return

  // 强制更新画板状态
  createArtboardLayers(
    stage,
    artboards.value,
    mainLayerRef,
    isArtboardMode.value
  )
}

// 修改添加画板函数
const addArtboard = () => {
  const newArtboard = createNewArtboard(artboards.value)
  artboards.value = [...artboards.value, newArtboard]
  
  // 重新创建画板图层
  createArtboardLayers(
    stageRef.value,
    artboards.value,
    mainLayerRef,
    isArtboardMode.value
  )
}

// 修改重命名画板函数
const renameArtboard = (index) => {
  const artboard = artboards.value[index]
  const newName = prompt('请输入新的画板名称:', artboard.name)
  if (!newName?.trim()) return
  
  if (updateArtboardById(artboards.value, artboard.id, { name: newName.trim() })) {
    // 触发视图更新
    artboards.value = [...artboards.value]
  }
}

// 修改删除画板函数
const deleteArtboard = (index) => {
  if (!confirm('确定要删除这个画板吗?')) return
  
  const artboard = artboards.value[index]
  if (removeArtboard(artboards.value, artboard.id)) {
    // 触发视图更新
    artboards.value = [...artboards.value]
    
    // 重新创建画板图层
    createArtboardLayers(
      stageRef.value,
      artboards.value,
      mainLayerRef,
      isArtboardMode.value
    )
  } else {
    alert('至少需要保留一个画板')
  }
}

// 修改更新画板预览函数
const 更新画板预览 = () => {
  const stage = stageRef.value
  if (!stage || !galleryPreviewRef.value) return

  const artboard = currentArtboard.value
  if (!artboard) return

  // 直接使用 exportArtboard 函数
  exportArtboard(stage, artboard).then(blob => {
    if (!blob) return

    // 创建预览图片的 URL
    const url = URL.createObjectURL(blob)
    
    // 更新预览图片
    galleryPreviewRef.value.innerHTML = ''
    const img = document.createElement('img')
    img.src = url
    img.style.width = '100%'
    img.style.height = '100%'
    img.style.objectFit = 'contain'
    galleryPreviewRef.value.appendChild(img)

    // 清理 URL
    setTimeout(() => URL.revokeObjectURL(url), 100)
  })
}

// 修改导出当前画板函数
const exportCurrentArtboard = async () => {
  const stage = stageRef.value
  if (!stage) return

  try {
    const artboard = currentArtboard.value
    if (!artboard) return

    const blob = await exportArtboard(stage, artboard)
    if (!blob) return

    // 下载图片
    const link = document.createElement('a')
    link.download = `${artboard.name || `画板_${currentIndex.value + 1}`}.png`
    link.href = URL.createObjectURL(blob)
    link.click()

    // 清理 URL 对象
    setTimeout(() => URL.revokeObjectURL(link.href), 100)
  } catch (error) {
    console.error('导出画板时发生错误:', error)
  }
}

// 修改导出所有画板函数
const exportAllArtboards = async () => {
  const stage = stageRef.value
  if (!stage) return

  try {
    // 创建 ZIP 文件
    const zip = new JSZip()

    // 导出所有画板
    for (let i = 0; i < artboards.value.length; i++) {
      const artboard = artboards.value[i]
      const blob = await exportArtboard(stage, artboard)
      if (blob) {
        zip.file(`${artboard.name || `画板_${i + 1}`}.png`, blob)
      }
    }

    // 生成并下载 ZIP 文件
    const zipBlob = await zip.generateAsync({ type: 'blob' })
    const link = document.createElement('a')
    link.download = '所有画板.zip'
    link.href = URL.createObjectURL(zipBlob)
    link.click()

    // 清理 URL 对象
    setTimeout(() => URL.revokeObjectURL(link.href), 100)
  } catch (error) {
    console.error('导出所有画板时发生错误:', error)
  }
}

// 添加防抖函数
function useDebounceFn(fn, delay) {
  let timeoutId = null

  return function (...args) {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      fn.apply(this, args)
      timeoutId = null
    }, delay)
  }
}

// 修改图层更新处理函数
const handleLayerUpdate = (updatedLayer) => {
  // 使用 Vue 的响应式方法更新图层
  const layer = findLayer(list.value, updatedLayer.id)
  if (layer) {
    // 使用 Object.assign 保持响应式
    Object.assign(layer, updatedLayer)

  }
}

// 添加当前工具状态
const currentTool = ref('layer') // 默认显示图层面板

// 修改工具点击处理函数
const handleToolClick = (tool) => {
  currentTool.value = tool
}

// 添加面板标题计算属性
const getPanelTitle = computed(() => {
  const titles = {
    template: '模板预设',
    text: '文本预设',
    image: '图片预设',
    shape: '形状预设',
    background: '背景预设',
    custom: '自定义预设',
    artboard: '画板设置'
  }
  return titles[currentTool.value] || ''
})

// 添加画廊视图相关的状态
const showGalleryView = ref(false)
const currentIndex = ref(0)
const galleryPreviewRef = ref(null)

// 计算当前画板
const currentArtboard = computed(() => artboards.value[currentIndex.value])

// 导航方法
const nextArtboard = () => {
  if (currentIndex.value < artboards.value.length - 1) {
    currentIndex.value++
    更新画板预览()
  }
}

const prevArtboard = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--
    更新画板预览()
  }
}

// 简化清理函数
const closeGalleryView = () => {
  showGalleryView.value = false
}

// 组件卸载时清理
onUnmounted(() => {
  if (galleryStageRef.value) {
    galleryStageRef.value.destroy()
  }
})

// 监听画板切换
watch(currentIndex, () => {
  nextTick(() => {
    更新画板预览()
  })
})

// 添加画廊预览相关函数
const openGalleryView = () => {
  showGalleryView.value = true
  currentIndex.value = 0
  nextTick(() => {
    更新画板预览()
  })
}

// 添加画板管理相关函数


// 添加排序后的工具组计算属性
const sortedToolGroups = computed(() => {
  return Object.entries(TOOL_GROUPS)
    .sort(([, a], [, b]) => a.order - b.order)
    .reduce((acc, [key, value]) => {
      acc[key] = value
      return acc
    }, {})
})

// 修改当前预设计算属性
const currentPresets = computed(() => {
  if (currentTool.value === 'artboard') return []
  return getGroupPresets(currentTool.value) || []
})
</script>

<style scoped>
.editor-container {
  height: 100%;
  width: 100%;
}

.canvas-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  /* 改为 hidden 以防止滚动条 */
  background: #f0f0f0;
  /* 更改为浅灰色背景 */
}

.canvas-container {
  position: relative;
  width: 100%;
  height: 100%;
  background-image: linear-gradient(45deg, #80808010 25%, transparent 25%),
    linear-gradient(-45deg, #80808010 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #80808010 75%),
    linear-gradient(-45deg, transparent 75%, #80808010 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
  cursor: default;
}

.canvas-container:active {
  cursor: grab;
}

.properties-panel {
  width: 280px;
  min-width: 280px;
  padding: var(--cc-space-md);
  background: var(--cc-theme-surface);
  border-left: 1px solid var(--cc-border-color);
  overflow-y: auto;
}

.panel-header {
  margin-bottom: var(--cc-space-md);
  padding-bottom: var(--cc-space-sm);
  border-bottom: 1px solid var(--cc-border-color);
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  color: var(--cc-theme-on-background);
}

.property-group {
  margin-bottom: var(--cc-space-md);
}

.property-group label {
  display: block;
  margin-bottom: var(--cc-space-xs);
  font-size: 12px;
  color: var(--cc-theme-on-background-muted);
}

.property-input {
  width: 100%;
  padding: var(--cc-space-xs);
  border: 1px solid var(--cc-border-color);
  border-radius: var(--cc-border-radius);
  background: var(--cc-theme-surface-light);
  color: var(--cc-theme-on-background);
  font-size: 14px;
  margin-bottom: var(--cc-space-sm);
}

.property-input[type="color"] {
  height: 32px;
  padding: 2px;
}

/* 左侧面板样式 */
.left-panel {
  display: flex;
  flex-direction: column;
  width: 280px;
  min-width: 280px;
  background: var(--cc-theme-surface);
  border-right: 1px solid var(--cc-border-color);
}

.layer-section,
.preset-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.section-title {
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 500;
  border-bottom: 1px solid var(--cc-border-color);
}

.layer-list,
.preset-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 4px;
}

.preset-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  background: var(--cc-theme-surface-light);
  border: 1px solid var(--cc-border-color);
  border-radius: var(--cc-border-radius);
  cursor: move;
  transition: all 0.2s;
}

.preset-item:hover {
  background: var(--cc-theme-surface-hover);
  transform: translateY(-2px);
}

.item-icon {
  font-size: 24px;
  margin-bottom: var(--cc-space-xs);
}

.item-name {
  font-size: 12px;
  color: var(--cc-theme-on-background);
}

.artboard-toolbar {
  padding: var(--cc-space-sm);
  background: var(--cc-theme-surface);
  border-bottom: 1px solid var(--cc-border-color);
  display: flex;
  gap: var(--cc-space-sm);
}

.artboard-toolbar button {
  padding: var(--cc-space-xs) var(--cc-space-sm);
  border: 1px solid var(--cc-border-color);
  border-radius: var(--cc-border-radius);
  background: var(--cc-theme-surface-light);
  cursor: pointer;
  white-space: nowrap;
}

.artboard-toolbar button:hover {
  background: var(--cc-theme-surface-hover);
}

/* 更新工具栏样式 */
.tools-bar {
  width: 80px;
  min-width: 80px;
  background: var(--cc-theme-surface);
  border-right: 1px solid var(--cc-border-color);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 12px 0;
}

.tool-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 更新左侧面板样式 */
.left-panel {
  display: flex;
  flex-direction: column;
  width: 280px;
  min-width: 280px;
  background: var(--cc-theme-surface);
  border-right: 1px solid var(--cc-border-color);
}

.layer-section,
.preset-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.section-title {
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 500;
  border-bottom: 1px solid var(--cc-border-color);
}

.layer-list,
.preset-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 4px;
}

.preset-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  background: var(--cc-theme-surface-light);
  border: 1px solid var(--cc-border-color);
  border-radius: var(--cc-border-radius);
  cursor: move;
  transition: all 0.2s;
}

.preset-item:hover {
  background: var(--cc-theme-surface-hover);
  transform: translateY(-2px);
}

.item-icon {
  font-size: 24px;
  margin-bottom: var(--cc-space-xs);
}

.item-name {
  font-size: 12px;
  color: var(--cc-theme-on-background);
}

.artboard-toolbar {
  padding: var(--cc-space-sm);
  background: var(--cc-theme-surface);
  border-bottom: 1px solid var(--cc-border-color);
  display: flex;
  gap: var(--cc-space-sm);
}

.artboard-toolbar button {
  padding: var(--cc-space-xs) var(--cc-space-sm);
  border: 1px solid var(--cc-border-color);
  border-radius: var(--cc-border-radius);
  background: var(--cc-theme-surface-light);
  cursor: pointer;
  white-space: nowrap;
}

.artboard-toolbar button:hover {
  background: var(--cc-theme-surface-hover);
}

/* 添加工具条样式 */
.tools-bar {
  width: 80px;
  min-width: 80px;
  background: var(--cc-theme-surface);
  border-right: 1px solid var(--cc-border-color);
  display: flex;
  flex-direction: column;
  padding: 12px 0;
}

.tool-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 0;
  cursor: pointer;
  transition: background-color 0.2s;
}

.tool-item:hover {
  background-color: var(--cc-theme-surface-hover);
}

.tool-item .icon {
  font-size: 20px;
  margin-bottom: 4px;
}

.tool-item span {
  font-size: 12px;
  color: var(--cc-theme-on-background);
}

/* 添加新的样式 */
.tool-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.panel-title {
  padding: 16px;
  font-size: 16px;
  font-weight: 500;
  border-bottom: 1px solid var(--cc-border-color);
}

.panel-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

/* 更新工具条激活状态样式 */
.tool-item.active {
  background-color: var(--cc-theme-surface-hover);
  position: relative;
}

.tool-item.active::after {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background-color: var(--cc-theme-primary);
}

/* 添加新的画板板样式 */
.artboard-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.artboard-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.btn {
  padding: 8px 16px;
  border: 1px solid var(--cc-border-color);
  border-radius: var(--cc-border-radius);
  background: var(--cc-theme-surface-light);
  cursor: pointer;
  transition: all 0.2s;
}

.btn:hover {
  background: var(--cc-theme-surface-hover);
}

.artboard-list {
  border-top: 1px solid var(--cc-border-color);
  padding-top: 16px;
}

/* 添加画廊视图样式 */
.gallery-view-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.gallery-content {
  background: var(--cc-theme-surface);
  border-radius: var(--cc-border-radius);
  padding: 24px;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.gallery-artboard {
  text-align: center;
}

.gallery-artboard h3 {
  margin-bottom: 16px;
  color: var(--cc-theme-on-background);
}

.gallery-preview {
  width: 800px;
  height: 600px;
  background: #f5f5f5;
  border: 1px solid var(--cc-border-color);
  border-radius: var(--cc-border-radius);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gallery-preview img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  image-rendering: auto;
  /* 或使用 pixelated 来保持像素清晰 */
}

.gallery-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.gallery-nav-btn {
  background: transparent;
  border: none;
  color: white;
  font-size: 24px;
  padding: 16px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.gallery-nav-btn:hover {
  opacity: 0.8;
}

.gallery-nav-btn.prev {
  margin-right: 16px;
}

.gallery-nav-btn.next {
  margin-left: 16px;
}

.btn.secondary {
  background: var(--cc-theme-surface-light);
  color: var(--cc-theme-on-background-muted);
}

/* 添加新的样式 */
.artboard-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  border: 1px solid var(--cc-border-color);
  border-radius: var(--cc-border-radius);
  margin-bottom: 8px;
}

.artboard-actions {
  display: flex;
  gap: 8px;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: var(--cc-border-radius);
}

.btn-icon:hover {
  background: var(--cc-theme-surface-hover);
}

.gallery-preview {
  width: 800px;
  height: 600px;
  background: #f0f0f0;
  border: 1px solid var(--cc-border-color);
  border-radius: var(--cc-border-radius);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
