import Konva from '../../../../../static/konva.js'
import { getArtboardPosition } from '../utils/artboardPosition.js'

export const textLayer = {
  name: '简单文本',
  icon: '📝',
  defaultConfig: {
    text: '新建文本',
    size: 24,
    color: '#333333'
  },
  render: (config, layerId, stageRef, handleShapeClick) => {
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

    return [textNode, tr]
  }
} 