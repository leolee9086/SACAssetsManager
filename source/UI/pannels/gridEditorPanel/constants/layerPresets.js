import { ARTBOARD } from '../utils/artboardPosition.js'

// 图层画廊预设项
export const galleryPresets = [
  { type: 'rect', name: '矩形', icon: '' },
  { type: 'text', name: '简单文本', icon: '📝' },
  { type: 'image', name: '图片', icon: '🖼️' },
  { type: 'folder', name: '文件夹', icon: '📁' }
]

// 默认图层名称映射
export const defaultLayerNames = {
  rect: '矩形',
  text: '简单文本',
  folder: '新建文件夹',
  image: '图片'
}

// 默认图层配置
export const getDefaultConfig = (type) => {
  const centerX = ARTBOARD.WIDTH / 2
  const centerY = ARTBOARD.HEIGHT / 2
  
  const configs = {
    rect: {
      x: centerX - 100,
      y: centerY - 50,
      width: 200,
      height: 100,
      color: '#f0f0f0'
    },
    text: {
      x: centerX - 50,
      y: centerY - 12,
      text: '新建文本',
      size: 24,
      color: '#333333'
    },
    image: {
      x: centerX - 100,
      y: centerY - 50,
      width: 200,
      height: 100,
      color: '#ff5722'
    }
  }
  return configs[type] || {}
} 