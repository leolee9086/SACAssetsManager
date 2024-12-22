<template>
  <div class="fn__flex-column editor-container">
    <div class="fn__flex fn__flex-1">
      <div class="left-panel">
        <div class="layer-list">
          <LayerList v-model="list" :selected-layer="selectedLayer" @select="handleLayerSelect"
            @delete="handleDeleteLayer" />
        </div>
        <div class="layer-gallery">
          <div class="gallery-title">图层库</div>
          <VueDraggable v-model="galleryItems" :group="{ name: 'nested', pull: 'clone', put: false }" :sort="false"
            :clone="handleClone" ghostClass="sortable-ghost" chosenClass='sortable-chosen' dragClass='sortable-drag'
            item-key="type" class="cc-nested-item">
            <div v-for="layerPreset in galleryItems" :key="layerPreset.name + 'preset'">
              <div class="gallery-item sortable-drag">
                <div class="item-icon">{{ layerPreset.icon }}</div>
                <div class="item-name">{{ layerPreset.name }}</div>
              </div>
            </div>
          </VueDraggable>
        </div>
      </div>
      <div class="fn__flex fn__flex-1 fn__flex-column canvas-wrapper">
        <VueDraggable v-model="contentLayers" :group="{ name: 'nested', put: true, pull: false }" :sort="false"
          draggable="none" @add="handleLayerAdd" class="canvas-container">
          <div class="canvas-area"></div>
        </VueDraggable>
      </div>


      <!-- 属性面板 -->
      <PropertiesPanel 
        v-if="selectedLayer"
        :layer="selectedLayer"
        @update:layer="handleLayerUpdate"
      />
    </div>

    <!-- 画板工具栏 -->
    <div class="artboard-toolbar">
      <button @click="toggleArtboardMode">
        {{ isArtboardMode ? '退出画板工具' : '画板工具' }}
      </button>
      <button @click="addArtboard">添加画板</button>
      <button @click="exportAllArtboards">导出所有画板</button>
    </div>
  </div>
</template>

<script setup >
import { ref, onMounted, watch, onUnmounted } from 'vue'
import { VueDraggable } from '../../../../static/vue-draggable-plus.js'
import LayerList from './components/LayerList.vue'
import _Konva from '../../../../static/konva.js'
import { ARTBOARD, getArtboardPosition, getArtboardWorldPosition } from './utils/artboardPosition.js'
import { galleryPresets, defaultLayerNames, getDefaultConfig } from './constants/layerPresets.js'
import { coordsHelper } from './utils/coordsHelper.js'
import { createArtboardLayers, exportArtboard } from './utils/artboardManager.js'
import PropertiesPanel from './components/PropertiesPanel.vue'
const Konva = _Konva.default

// 舞台和图层的引用
const stageRef = ref(null)
const mainLayerRef = ref(null)

// 添加选中图层的引用
const selectedLayer = ref(null)

// 添加图层注册表
const layerRegistry = ref(new Map())


// 修改 list 的初始数据，使用画板中心坐标
const list = ref([
  {
    id: 'bg-group',
    name: '底色图层组',
    type: 'folder',
    visible: true,
    locked: true,
    children: [
      {
        id: 'bg-color',
        name: '底色矩形',
        type: 'file',
        visible: true,
        locked: true,
        layerType: 'rect',
        config: {
          x: 0,          // 从画板左上角开
          y: 0,
          width: ARTBOARD.WIDTH,
          height: ARTBOARD.HEIGHT,
          color: '#ffffff'
        }
      }
    ]
  },
  {
    id: 'content-group',
    name: '内容图层组',
    type: 'folder',
    visible: true,
    locked: false,
    children: [
      {
        id: 'title-text',
        name: '欢迎文本',
        type: 'file',
        visible: true,
        locked: false,
        layerType: 'text',
        config: {
          text: '欢迎使用编辑器',
          x: ARTBOARD.WIDTH/2 - 80,  // 居中显示
          y: ARTBOARD.HEIGHT/2 - 12,
          size: 24,
          color: '#333333'
        }
      }
    ]
  }
])

// 扁平化图层列表，获取所有可见的图层
const getFlatLayers = (layers) => {
  return layers.reduce((acc, layer) => {
    if (!layer.visible) return acc

    if (layer.type === 'file') {
      acc.push(layer)
    }

    if (layer.children?.length) {
      acc.push(...getFlatLayers(layer.children))
    }

    return acc
  }, [])
}

// 修改渲染函数,使用预设中的render函数
const renderLayers = () => {
  if (!mainLayerRef.value) return

  // 清空现有内容和注册表
  mainLayerRef.value.destroyChildren()
  layerRegistry.value.clear()

  // 获取扁平化的图层
  const layers = getFlatLayers(list.value)
  
  // 确保底色矩形在内容图层最底部渲染
  const bgLayer = layers.find(layer => layer.id === 'bg-color')
  const contentLayers = layers.filter(layer => layer.id !== 'bg-color')
  
  // 先渲染底色矩形
  if (bgLayer) {
    const preset = galleryPresets.find(p => p.type === bgLayer.layerType)
    if (preset?.render) {
      const shapes = preset.render(bgLayer.config, bgLayer.id, stageRef, handleShapeClick)
      if (Array.isArray(shapes)) {
        shapes.forEach(shape => mainLayerRef.value?.add(shape))
        layerRegistry.value.set(bgLayer.id, {
          shapes,
          config: bgLayer.config,
          type: bgLayer.layerType
        })
      } else {
        mainLayerRef.value?.add(shapes)
        layerRegistry.value.set(bgLayer.id, {
          shapes: [shapes],
          config: bgLayer.config,
          type: bgLayer.layerType
        })
      }
    }
  }

  // 再渲染其他内容图层
  contentLayers.forEach(layer => {
    const preset = galleryPresets.find(p => p.type === layer.layerType)
    if (preset?.render) {
      const shapes = preset.render(layer.config, layer.id, stageRef, handleShapeClick)
      if (Array.isArray(shapes)) {
        shapes.forEach(shape => mainLayerRef.value?.add(shape))
        layerRegistry.value.set(layer.id, {
          shapes,
          config: layer.config,
          type: layer.layerType
        })
      } else {
        mainLayerRef.value?.add(shapes)
        layerRegistry.value.set(layer.id, {
          shapes: [shapes],
          config: layer.config,
          type: layer.layerType
        })
      }
    }
  })

  mainLayerRef.value.batchDraw()
}

// 初始化 Konva 舞台
onMounted(() => {
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
    
    // 添加缩放处���
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

  // 组件卸载时清理
  onUnmounted(() => {
    resizeObserver.disconnect()
  })
})

// 监听图层变化
watch(list, () => {
  renderLayers()
}, { deep: true })

// 修改图层选择处理
const handleLayerSelect = (layer) => {
  if (layer.type === 'folder') return

  // 隐之前选中图层的变换器
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

// 删除图层处理函
const handleDeleteLayer = (layer) => {
  // 递归查找并删除图层
  const removeLayer = (layers) => {
    const index = layers.findIndex(l => l.id === layer.id)
    if (index !== -1) {
      layers.splice(index, 1)
      return true
    }

    for (const l of layers) {
      if (l.children?.length) {
        if (removeLayer(l.children)) {
          return true
        }
      }
    }
    return false
  }

  // 如果要删除的是选中的图层，清除选中状态
  if (selectedLayer.value?.id === layer.id) {
    selectedLayer.value = null
  }

  removeLayer(list.value)
}

// 确保每个图层都有唯一ID
const ensureLayerIds = (layers) => {
  layers.forEach(layer => {
    if (!layer.id) {
      layer.id = Math.random().toString(36).substr(2, 9)
    }
    if (layer.children?.length) {
      ensureLayerIds(layer.children)
    }
  })
}

// 初始化时确保所有图层都有ID
onMounted(() => {
  ensureLayerIds(list.value)
})

// 图层画廊项目
const galleryItems = galleryPresets

// 用于接收拖入的图层
const contentLayers = ref([])

// 处理克隆
const handleClone = (item) => {

  let data = {
    id: generateId(),
    name: getDefaultLayerName(item.type),
    type: item.type === 'folder' ? 'folder' : 'file',
    layerType: item.type,
    visible: true,
    locked: false,
    config: getDefaultConfig(item.type),
    ...(item.type === 'folder' ? { children: [] } : {})
  }
  return data
}

// 修改拖入添加处理，使新图层出现在画板中心
const handleLayerAdd = (evt) => {
  const newLayer = evt.clonedData
  const stage = stageRef.value
  if (!stage) return

  const pointerPosition = stage.getPointerPosition()
  
  if (pointerPosition && newLayer.config) {
    const artboardPos = coordsHelper.stageToArtboard(
      stage,
      pointerPosition.x,
      pointerPosition.y
    )
    
    if (artboardPos.x >= 0 && artboardPos.x <= ARTBOARD.WIDTH &&
        artboardPos.y >= 0 && artboardPos.y <= ARTBOARD.HEIGHT) {
      newLayer.config.x = artboardPos.x
      newLayer.config.y = artboardPos.y
    } else {
      const defaultConfig = getDefaultConfig(newLayer.layerType)
      newLayer.config.x = defaultConfig.x
      newLayer.config.y = defaultConfig.y
    }
  }

  // 找到内容组并添加到上层
  const contentGroup = list.value.find(layer => layer.id === 'content-group')
  if (contentGroup && contentGroup.children) {
    contentGroup.children.unshift(newLayer)
  }

  // 选中新添加的图层
  selectedLayer.value = newLayer

  // 清空临时数组
  contentLayers.value = []
}

// 加画布元素点击处理函数
const handleShapeClick = (layerId) => {
  // 递归查找图层
  const findLayer = (layers) => {
    for (const layer of layers) {
      if (layer.id === layerId) {
        return layer
      }
      if (layer.children?.length) {
        const found = findLayer(layer.children)
        if (found) return found
      }
    }
    return null
  }

  const layer = findLayer(list.value)
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
  const offset = artboards.value.length * 50
  const newArtboard = {
    id: `artboard-${Date.now()}`,
    name: `画板 ${artboards.value.length + 1}`,
    x: 100 + offset,
    y: 100 + offset,
    width: ARTBOARD.WIDTH,
    height: ARTBOARD.HEIGHT
  }
  
  // 使用响应式方式更新数组
  artboards.value = [...artboards.value, newArtboard]
}

// 添加更新画板位置的函数
const updateArtboardPosition = (id, updates) => {
  const index = artboards.value.findIndex(a => a.id === id)
  if (index !== -1) {
    // 创建新的画板对象以触发响应式更新
    artboards.value[index] = {
      ...artboards.value[index],
      ...updates
    }
    // 强制更新整个数组以确保响应式
    artboards.value = [...artboards.value]
  }
}

// 修改 watch 监听器
watch(
  () => ({
    artboards: artboards.value,
    isArtboardMode: isArtboardMode.value
  }),
  (newVal, oldVal) => {
    const stage = stageRef.value
    if (!stage) return

    // 只有在真正需要更新时才重新创建图层
    if (
      JSON.stringify(newVal.artboards) !== JSON.stringify(oldVal?.artboards) ||
      newVal.isArtboardMode !== oldVal?.isArtboardMode
    ) {
      createArtboardLayers(
        stage,
        newVal.artboards,
        mainLayerRef,
        newVal.isArtboardMode
      )
    }
  },
  { deep: true }
)

// 修改导出函数
const exportAllArtboards = async () => {
  const stage = stageRef.value
  if (!stage) return

  try {
    const exportPromises = artboards.value.map(async (artboard, index) => {
      const blob = await exportArtboard(stage, artboard)
      if (!blob) throw new Error('导出图片失败')

      const link = document.createElement('a')
      link.download = `${artboard.name || `画板_${index + 1}`}.png`
      link.href = URL.createObjectURL(blob)
      link.click()
      URL.revokeObjectURL(link.href)
    })

    await Promise.all(exportPromises)
  } catch (error) {
    console.error('导出画板时发生错误:', error)
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

// 添加图层更新处理函数
const handleLayerUpdate = (updatedLayer) => {
  // 递归查找并更新图层
  const updateLayer = (layers) => {
    for (let i = 0; i < layers.length; i++) {
      if (layers[i].id === updatedLayer.id) {
        layers[i] = updatedLayer
        return true
      }
      if (layers[i].children?.length) {
        if (updateLayer(layers[i].children)) {
          return true
        }
      }
    }
    return false
  }

  // 更新图层列表
  updateLayer(list.value)
}
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
  overflow: hidden; /* 改为 hidden 以防止滚动条 */
  background: #f0f0f0; /* 更改为浅灰色背景 */
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


/* 层画廊样式 */
.layer-gallery {
  padding: var(--cc-space-sm);
  background: var(--cc-theme-surface-lighter);
}

.gallery-title {
  font-size: 14px;
  color: var(--cc-theme-on-background-muted);
  margin-bottom: var(--cc-space-sm);
  padding-left: var(--cc-space-xs);
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--cc-space-sm);
}

.gallery-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--cc-space-sm);
  background: var(--cc-theme-surface);
  border: 1px solid var(--cc-border-color);
  border-radius: var(--cc-border-radius);
  cursor: move;
  transition: all 0.2s ease;
}

.gallery-item:hover {
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
</style>
