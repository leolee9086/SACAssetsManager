import  Konva  from '../../../../../static/konva.js'
import { ARTBOARD } from './artboardPosition.js'
import { getArtboardPosition } from './artboardPosition.js'
import { adjustmentEffects } from './adjustmentEffects.js'
import { watch } from '../../../../../static/vue.esm-browser.js'

// 图层渲染管道
export const layerPipes = {
  rect: (config, layerId, stageRef) => {
    const artboardPos = getArtboardPosition(
      stageRef.value?.width() || 0,
      stageRef.value?.height() || 0
    )
    
    const rect = new Konva.Rect({
      x: artboardPos.x + (config.x || 0),
      y: artboardPos.y + (config.y || 0),
      width: config.width || 595,
      height: config.height || 842,
      fill: config.color || '#f0f0f0',
      draggable: !config.locked,
    })

    rect.on('dragend', () => {
      const artboardPos = getArtboardPosition(
        stageRef.value?.width() || 0,
        stageRef.value?.height() || 0
      )
      config.x = rect.x() - artboardPos.x
      config.y = rect.y() - artboardPos.y
    })

    return rect
  },

  grid: (config) => {
    const group = new Konva.Group()
    const size = config.size || 20
    const color = config.color || '#cccccc'

    // 绘制网格线
    for (let x = 0; x <= ARTBOARD.WIDTH; x += size) {
      group.add(new Konva.Line({
        points: [x, 0, x, ARTBOARD.HEIGHT],
        stroke: color,
        strokeWidth: 0.5,
      }))
    }

    for (let y = 0; y <= ARTBOARD.HEIGHT; y += size) {
      group.add(new Konva.Line({
        points: [0, y, ARTBOARD.WIDTH, y],
        stroke: color,
        strokeWidth: 0.5,
      }))
    }

    return group
  },

  text: (config, layerId, stageRef, handleShapeClick) => {
    const artboardPos = getArtboardPosition(
      stageRef.value?.width() || 0,
      stageRef.value?.height() || 0
    )
    
    const textNode = new Konva.Text({
      x: artboardPos.x + (config.x || 0),
      y: artboardPos.y + (config.y || 0),
      text: config.text || '示例文本',
      fontSize: config.size || 24,
      fill: config.color || '#000000',
      draggable: !config.locked,
    })

    const tr = new Konva.Transformer({
      nodes: [textNode],
      enabledAnchors: ['middle-left', 'middle-right'],
      boundBoxFunc: (oldBox, newBox) => ({
        ...newBox,
        height: oldBox.height,
        scaleY: 1,
      }),
      visible: false,
    })

    // ... 其他事件处理保持不变 ...

    return [textNode, tr]
  },

  image: (config) => {
    const rect = new Konva.Rect({
      x: config.x || 50,
      y: config.y || 150,
      width: config.width || 200,
      height: config.height || 100,
      fill: config.color || '#ff5722',
      draggable: !config.locked,
    })

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

  adjustment: (config, layerId, stageRef) => {
    const artboardPos = getArtboardPosition(
      stageRef.value?.width() || 0,
      stageRef.value?.height() || 0
    )
    
    // 创建一个不可见的矩形作为调整图层的占位符
    const rect = new Konva.Rect({
      x: artboardPos.x,
      y: artboardPos.y,
      width: ARTBOARD.WIDTH,
      height: ARTBOARD.HEIGHT,
      visible: false,
      id: layerId
    })

    // 获取所有受影响的图层并应用效果
    const applyEffects = () => {
      const stage = stageRef.value
      if (!stage) return
      
      // 获取当前图层之前的所有图层
      const layers = stage.find('Image, Rect, Text')
      const currentIndex = layers.findIndex(layer => layer.id() === layerId)
      const targetLayers = layers.slice(0, currentIndex)
      
      // 应用效果到每个目标图层
      targetLayers.forEach(layer => {
        if (layer.visible()) {
          applyAllEffects(layer, config)
        }
      })
    }

    // 监听配置变化
    watch(() => config, () => {
      applyEffects()
    }, { deep: true })

    // 初始应用效果
    applyEffects()

    return rect
  }
}

// 获取受影响的图层（在当前调整图层下方的所有图层）
function getAffectedLayers(adjustmentLayerId, stage) {
  if (!stage) return []
  
  const layers = stage.find('Image, Rect, Text')
  const adjustmentIndex = layers.findIndex(layer => layer.id() === adjustmentLayerId)
  
  return layers.slice(0, adjustmentIndex)
} 