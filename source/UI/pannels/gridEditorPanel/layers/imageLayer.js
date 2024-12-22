import Konva from '../../../../../static/konva.js'

export const imageLayer = {
  name: '图片',
  icon: '🖼️',
  defaultConfig: {
    width: 200,
    height: 100,
    color: '#ff5722'
  },
  render: (config) => {
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
  }
} 