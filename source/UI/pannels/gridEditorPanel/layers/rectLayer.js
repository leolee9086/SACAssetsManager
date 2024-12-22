import Konva from '../../../../../static/konva.js'

export const rectLayer = {
  name: '矩形',
  icon: '⬜',
  defaultConfig: {
    width: 200,
    height: 100,
    color: '#f0f0f0'
  },
  render: (config, layerId, stage) => {
    const rect = new Konva.Rect({
      x: (config.x || 0),
      y: (config.y || 0),
      width: config.width || 595,
      height: config.height || 842,
      fill: config.color || '#f0f0f0',
      draggable: !config.locked,
    })

    rect.on('dragend', () => {
      config.x = rect.x()
      config.y = rect.y()
    })

    return rect
  }
} 