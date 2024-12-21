import Konva from '../../../../../static/konva.js'

// 调整图层效果处理函数
export const adjustmentEffects = {
  // 亮度调整
  brightness: (shape, value) => {
    shape.brightness(value)
  },

  // 对比度调整
  contrast: (shape, value) => {
    shape.contrast(value)
  },

  // 饱和度调整
  saturation: (shape, value) => {
    shape.saturation(value)
  }
}

// 应用所有效果
export const applyAllEffects = (shape, config) => {
  // 启用缓存以提高性能
  shape.cache()
  
  // 添加必要的滤镜
  const filters = []
  
  if (config.brightness !== undefined) {
    filters.push(Konva.Filters.Brighten)
    adjustmentEffects.brightness(shape, config.brightness)
  }
  
  if (config.contrast !== undefined) {
    filters.push(Konva.Filters.Contrast)
    adjustmentEffects.contrast(shape, config.contrast)
  }
  
  if (config.saturation !== undefined) {
    filters.push(Konva.Filters.HSL)
    adjustmentEffects.saturation(shape, config.saturation)
  }
  
  shape.filters(filters)
}
