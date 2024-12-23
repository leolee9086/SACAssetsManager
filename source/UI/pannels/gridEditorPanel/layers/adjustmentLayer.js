import Konva from '../../../../../static/konva.js'
import { ARTBOARD } from '../utils/artboardPosition.js'
import { getArtboardPosition } from '../utils/artboardPosition.js'
import { watch } from '../../../../../static/vue.esm-browser.js'
import { applyAllEffects } from '../utils/adjustmentEffects.js'

export const adjustmentLayer = {
  name: '调整图层',
  icon: '✨',
  group: 'effect',
  defaultConfig: {
    effects: []
  },
  render: (config, layerId, stageRef) => {
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