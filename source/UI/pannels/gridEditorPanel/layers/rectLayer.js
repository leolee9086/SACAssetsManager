import Konva from '../../../../../static/konva.js'
import { getArtboardPosition } from '../utils/artboardPosition.js'

export const rectLayer = {
  name: '矩形',
  icon: '⬜',
  defaultConfig: {
    width: 200,
    height: 100,
    color: '#f0f0f0'
  },
  render: (config, layerId, stageRef) => {
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
  }
} 