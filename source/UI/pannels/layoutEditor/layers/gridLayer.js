import Konva from '../../../../../static/konva.js'
import { ARTBOARD } from '../utils/artboardPosition.js'

export const gridLayer = {
  name: '网格',
  icon: '🎨',
  group: 'background',
  presets: [
    {
      name: '默认网格',
      icon: '⊞',
      config: {
        size: 20,
        color: '#cccccc'
      }
    },
    {
      name: '密集网格',
      icon: '⊟',
      config: {
        size: 10,
        color: '#dddddd'
      }
    },
    {
      name: '稀疏网格',
      icon: '⊡',
      config: {
        size: 40,
        color: '#bbbbbb'
      }
    },
    {
      name: '深色网格',
      icon: '⊞',
      config: {
        size: 20,
        color: '#999999'
      }
    }
  ],
  defaultConfig: {
    size: 20,
    color: '#cccccc',
    x: 0,
    y: 0,
    locked: false
  },
  render: (config, layerId) => {
    const size = config.size || 20
    const color = config.color || '#cccccc'

    const shape = new Konva.Shape({
      draggable: !config.locked,
      name: 'gridShape',
      id: layerId,
      x: config.x || 0,
      y: config.y || 0,
      listening: true,
      sceneFunc: (context, shape) => {
        const width = ARTBOARD.WIDTH
        const height = ARTBOARD.HEIGHT
        
        // 首先绘制一个可点击的背景
        context.beginPath()
        context.rect(0, 0, width, height)
        context.fillStyle = 'rgba(0,0,0,0.01)'  // 几乎透明但不完全透明
        context.fill()
        
        // 绘制垂直线
        for (let x = 0; x <= width; x += size) {
          context.beginPath()
          context.moveTo(x, 0)
          context.lineTo(x, height)
          context.strokeStyle = color
          context.lineWidth = 0.5
          context.stroke()
        }

        // 绘制水平线
        for (let y = 0; y <= height; y += size) {
          context.beginPath()
          context.moveTo(0, y)
          context.lineTo(width, y)
          context.strokeStyle = color
          context.lineWidth = 0.5
          context.stroke()
        }

        context.fillStrokeShape(shape)
      },
      width: ARTBOARD.WIDTH,
      height: ARTBOARD.HEIGHT
    })

    // 创建一个透明的拖拽手柄矩形
    const dragHandle = new Konva.Rect({
      x: config.x || 0,
      y: config.y || 0,
      width: ARTBOARD.WIDTH,
      height: ARTBOARD.HEIGHT,
      fill: 'rgba(0,0,0,0.01)',
      draggable: !config.locked,
      name: 'gridDragHandle',
      id: `${layerId}-handle`
    })

    // 将网格shape的拖拽相关事件转移到dragHandle上
    dragHandle.on('dragstart', () => {
      console.log('开始拖拽网格')
    })

    dragHandle.on('dragmove', () => {
      console.log('正在拖拽网格')
      // 让网格跟随拖拽手柄移动
      shape.x(dragHandle.x())
      shape.y(dragHandle.y())
    })

    dragHandle.on('dragend', () => {
      console.log('结束拖拽网格')
      config.x = dragHandle.x()
      config.y = dragHandle.y()
    })

    dragHandle.on('mouseenter', () => {
      console.log('鼠标进入网格')
      document.body.style.cursor = 'move'
    })

    dragHandle.on('mouseleave', () => {
      console.log('鼠标离开网格')
      document.body.style.cursor = 'default'
    })

    // 禁用原始shape的拖拽功能
    shape.draggable(false)

    // 返回包含两个元素的数组
    return [shape, dragHandle]
  }
} 