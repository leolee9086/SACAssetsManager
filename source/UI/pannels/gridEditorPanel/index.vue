<template>
  <div class="fn__flex-column">
    <div class="fn__flex fn__flex-1">
      <LayerList
        v-model="list"
        :selected-layer="selectedLayer"
        @select="handleLayerSelect"
      />
      <div class="fn__flex fn__flex-1 fn__flex-column canvas-wrapper fn_overflow_hidden">
        <div class="canvas-container"></div>
      </div>
      <div class="properties-panel" v-if="selectedLayer">
        <div class="panel-header">
          <h3>{{ selectedLayer.name }} 属性</h3>
        </div>
        
        <div class="property-group">
          <label>图层名称</label>
          <input 
            type="text" 
            v-model="selectedLayer.name"
            class="property-input"
          >
        </div>

        <template v-if="selectedLayer.layerType === 'text'">
          <div class="property-group">
            <label>文本内容</label>
            <input 
              type="text" 
              v-model="selectedLayer.config.text"
              class="property-input"
            >
            <label>字体大小</label>
            <input 
              type="number" 
              v-model="selectedLayer.config.size"
              class="property-input"
            >
            <label>颜色</label>
            <input 
              type="color" 
              v-model="selectedLayer.config.color"
              class="property-input"
            >
          </div>
        </template>

        <template v-else-if="selectedLayer.layerType === 'rect'">
          <div class="property-group">
            <label>颜色</label>
            <input 
              type="color" 
              v-model="selectedLayer.config.color"
              class="property-input"
            >
            <label>宽度</label>
            <input 
              type="number" 
              v-model="selectedLayer.config.width"
              class="property-input"
            >
            <label>高度</label>
            <input 
              type="number" 
              v-model="selectedLayer.config.height"
              class="property-input"
            >
          </div>
        </template>

        <template v-else-if="selectedLayer.layerType === 'grid'">
          <div class="property-group">
            <label>网格大小</label>
            <input 
              type="number" 
              v-model="selectedLayer.config.size"
              class="property-input"
            >
            <label>网格颜色</label>
            <input 
              type="color" 
              v-model="selectedLayer.config.color"
              class="property-input"
            >
          </div>
        </template>

        <template v-else-if="selectedLayer.layerType === 'image'">
          <div class="property-group">
            <label>宽度</label>
            <input 
              type="number" 
              v-model="selectedLayer.config.width"
              class="property-input"
            >
            <label>高度</label>
            <input 
              type="number" 
              v-model="selectedLayer.config.height"
              class="property-input"
            >
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import LayerList from './components/LayerList.vue'
import _Konva from '../../../../static/konva.js'
const Konva = _Konva.default

// 舞台和图层的引用
const stageRef = ref<Konva.Stage | null>(null)
const mainLayerRef = ref<Konva.Layer | null>(null)

// 添加选中图层的引用
const selectedLayer = ref<any>(null)

// 添加图层注册表
const layerRegistry = ref(new Map())

// 修改图层管道函数以返回 Konva 对象
const layerPipes = {
  rect: (config: any) => {
    const rect = new Konva.Rect({
      x: config.x || 0,
      y: config.y || 0,
      width: config.width || 595,
      height: config.height || 842,
      fill: config.color || '#f0f0f0',
      draggable: !config.locked,
    })
    
    // 添加事件监听
    rect.on('dragend', () => {
      config.x = rect.x()
      config.y = rect.y()
    })
    
    rect.on('transform', () => {
      config.width = rect.width() * rect.scaleX()
      config.height = rect.height() * rect.scaleY()
      rect.scaleX(1)
      rect.scaleY(1)
    })
    
    return rect
  },
  
  grid: (config: any) => {
    const group = new Konva.Group()
    const size = config.size || 20
    const color = config.color || '#cccccc'
    
    // 绘制垂直线
    for (let x = 0; x <= 595; x += size) {
      group.add(new Konva.Line({
        points: [x, 0, x, 842],
        stroke: color,
        strokeWidth: 0.5,
      }))
    }
    
    // 绘制水平线
    for (let y = 0; y <= 842; y += size) {
      group.add(new Konva.Line({
        points: [0, y, 595, y],
        stroke: color,
        strokeWidth: 0.5,
      }))
    }
    
    return group
  },
  
  text: (config: any) => {
    const textNode = new Konva.Text({
      x: config.x || 100,
      y: config.y || 100,
      text: config.text || '示例文本',
      fontSize: config.size || 24,
      fill: config.color || '#000000',
      draggable: !config.locked,
    })
    
    // 添加变换器
    const tr = new Konva.Transformer({
      nodes: [textNode],
      enabledAnchors: ['middle-left', 'middle-right'],
      visible: false,
    })
    
    // 双击编辑文本
    textNode.on('dblclick', () => {
      if (config.locked) return
      
      const textPosition = textNode.absolutePosition()
      const textarea = document.createElement('textarea')
      document.body.appendChild(textarea)
      
      textarea.value = textNode.text()
      textarea.style.position = 'absolute'
      textarea.style.top = `${textPosition.y}px`
      textarea.style.left = `${textPosition.x}px`
      textarea.style.width = `${textNode.width()}px`
      textarea.style.height = `${textNode.height()}px`
      textarea.style.fontSize = `${textNode.fontSize()}px`
      textarea.style.border = 'none'
      textarea.style.padding = '0px'
      textarea.style.margin = '0px'
      textarea.style.overflow = 'hidden'
      textarea.style.background = 'none'
      textarea.style.outline = 'none'
      textarea.style.resize = 'none'
      textarea.style.lineHeight = textNode.lineHeight().toString()
      textarea.style.fontFamily = textNode.fontFamily()
      textarea.style.transformOrigin = 'left top'
      textarea.style.textAlign = textNode.align()
      textarea.style.color = textNode.fill()
      
      textarea.focus()
      
      textarea.addEventListener('blur', function() {
        config.text = textarea.value
        textNode.text(textarea.value)
        document.body.removeChild(textarea)
      })
    })
    
    // 点击显示变换器
    textNode.on('click', () => {
      if (!config.locked) {
        tr.show()
      }
    })
    
    // 拖拽结束时更新位置
    textNode.on('dragend', () => {
      config.x = textNode.x()
      config.y = textNode.y()
    })
    
    // 变换结束时更新大小
    textNode.on('transform', () => {
      config.size = textNode.fontSize() * textNode.scaleX()
      textNode.fontSize(config.size)
      textNode.scaleX(1)
      textNode.scaleY(1)
    })
    
    return [textNode, tr]
  },
  
  image: (config: any) => {
    const rect = new Konva.Rect({
      x: config.x || 50,
      y: config.y || 150,
      width: config.width || 200,
      height: config.height || 100,
      fill: config.color || '#ff5722',
      draggable: !config.locked,
    })
    
    // 添加事件监听
    rect.on('dragend', () => {
      config.x = rect.x()
      config.y = rect.y()
    })
    
    rect.on('transform', () => {
      config.width = rect.width() * rect.scaleX()
      config.height = rect.height() * rect.scaleY()
      rect.scaleX(1)
      rect.scaleY(1)
    })
    
    return rect
  }
}

// 修改 list 的类型定义和初始数据
const list = ref([
  {
    id: 'bg-group',
    name: '背景图层组',
    type: 'folder',
    visible: true,
    locked: false,
    children: [
      {
        id: 'bg-color',
        name: '背景色',
        type: 'file',
        visible: true,
        locked: false,
        layerType: 'rect',
        config: {
          color: '#ffffff'
        }
      },
      {
        id: 'grid',
        name: '网格',
        type: 'file',
        visible: true,
        locked: true,
        layerType: 'grid',
        config: {
          size: 20,
          color: '#e0e0e0'
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
        name: '标题文本',
        type: 'file',
        visible: true,
        locked: false,
        layerType: 'text',
        config: {
          text: '标题示例',
          x: 100,
          y: 100,
          size: 24,
          color: '#333333'
        }
      },
      {
        id: 'image1',
        name: '图片1',
        type: 'file',
        visible: true,
        locked: false,
        layerType: 'image',
        config: {
          x: 50,
          y: 150,
          width: 200,
          height: 100,
          color: '#ff5722'
        }
      }
    ]
  }
])

// 扁平化图层列表，获取所有可见的图层
const getFlatLayers = (layers: any[]): any[] => {
  return layers.reduce((acc: any[], layer) => {
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

// 修改渲染函数,使用注册表
const renderLayers = () => {
  if (!mainLayerRef.value) return
  
  // 清空现有内容和注册表
  mainLayerRef.value.destroyChildren()
  layerRegistry.value.clear()
  
  const layers = getFlatLayers(list.value).reverse()
  
  layers.forEach(layer => {
    const pipe = layerPipes[layer.layerType]
    if (pipe) {
      const shapes = pipe(layer.config)
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
  
  console.log('Initializing Konva stage...')
  stageRef.value = new Konva.Stage({
    container: container as HTMLDivElement,
    width: 595,
    height: 842,
  })
  
  mainLayerRef.value = new Konva.Layer()
  stageRef.value.add(mainLayerRef.value)
  
  console.log('Rendering layers...')
  renderLayers()
})

// 监听图层变化
watch(list, () => {
  renderLayers()
}, { deep: true })

// 修改图层选择处理
const handleLayerSelect = (layer: any) => {
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

// 添加更新图层配置的函数
const updateLayerConfig = (newConfig: any) => {
  if (!selectedLayer.value) return
  selectedLayer.value.config = { ...selectedLayer.value.config, ...newConfig }
}

// 确保每个图层都有唯一ID
const ensureLayerIds = (layers: any[]) => {
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
  // ... rest of the mounting code ...
})
</script>

<style scoped>
.canvas-wrapper {
  width: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--cc-theme-surface-lighter);
}

.canvas-container {
  width: 595px;
  height: 842px;
  border: 1px solid var(--cc-border-color);
  position: relative;
  overflow: hidden;
  margin: auto;
  background: white;
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
</style>
