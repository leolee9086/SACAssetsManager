import { ARTBOARD } from '../utils/artboardPosition.js'
import { rectLayer } from '../layers/rectLayer.js'
import { textLayer } from '../layers/textLayer.js'
import { gridLayer } from '../layers/gridLayer.js'
import { imageLayer } from '../layers/imageLayer.js'
import { adjustmentLayer } from '../layers/adjustmentLayer.js'

// 定义所有支持的图层类型及其配置
export const LAYER_TYPES = {
  rect: rectLayer,
  text: textLayer,
  grid: gridLayer,
  image: imageLayer,
  adjustment: adjustmentLayer
}


// 本地图层类型注册表
const localLayerTypes = new Map()

// 图层画廊预设项
export const galleryPresets = [
  // 添加文件夹类型
  { type: 'folder', name: '文件夹', icon: '📁', render: null }
]

// 默认图层名称映射
export const defaultLayerNames = {
  folder: '新建文件夹'
}

// 注册新的图层类型
function registerLayerType(type, config) {
  if (localLayerTypes.has(type)) {
    console.warn(`图层类型 "${type}" 已存在，将被覆盖`)
  }
  
  const layerConfig = {
    name: config.name || '未命名图层',
    icon: config.icon || '❓',
    defaultConfig: config.defaultConfig || {},
    render: config.render || null
  }
  
  localLayerTypes.set(type, layerConfig)

  // 更新画廊预设
  const presetIndex = galleryPresets.findIndex(preset => preset.type === type)
  const preset = {
    type,
    name: layerConfig.name,
    icon: layerConfig.icon,
    render: layerConfig.render
  }
  
  if (presetIndex >= 0) {
    galleryPresets[presetIndex] = preset
  } else {
    galleryPresets.push(preset)
  }

  // 更新默认图层名称
  defaultLayerNames[type] = layerConfig.name
}

// 在文件开头初始化时加载默认图层类型
Object.entries(LAYER_TYPES).forEach(([type, config]) => {
  registerLayerType(type, config)
})

// 获取默认图层配置
export const getDefaultConfig = (type) => {
  const centerX = ARTBOARD.WIDTH / 2
  const centerY = ARTBOARD.HEIGHT / 2
  
  const layerType = localLayerTypes.get(type)
  if (!layerType) return {}

  const defaultConfig = { ...layerType.defaultConfig }
  
  // 为需要位置信息的图层类型添加中心位置
  if (['rect', 'text', 'image'].includes(type)) {
    const width = defaultConfig.width || 200
    const height = defaultConfig.height || 100
    defaultConfig.x = centerX - width / 2
    defaultConfig.y = centerY - height / 2
  }
  
  return defaultConfig
}

// 从加载器加载图层类型
export async function loadLayerTypesFromLoader(loader) {
  if (!loader || typeof loader.getLayerTypes !== 'function') {
    throw new Error('无效的加载器：缺少 getLayerTypes 方法')
  }

  try {
    const customLayerTypes = await loader.getLayerTypes()
    
    // 注册每个自定义图层类型
    customLayerTypes.forEach(({ type, config }) => {
      registerLayerType(type, config)
    })

  } catch (error) {
    console.error('加载自定义图层类型时出错：', error)
    throw error
  }
}

// 从管线配置创建预设
export const createPresetFromPipe = (pipe) => {
  if (!pipe || !pipe.type) {
    throw new Error('无效的管线配置')
  }

  const layerType = localLayerTypes.get(pipe.type)
  return {
    type: pipe.type,
    name: defaultLayerNames[pipe.type] || '未命名图层',
    icon: layerType?.icon || '❓',
    render: layerType?.render || null,
    config: {
      ...getDefaultConfig(pipe.type),
      ...pipe.config
    }
  }
} 