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
    color: '#cccccc'
  },
  render: (config) => {
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
  }
} 