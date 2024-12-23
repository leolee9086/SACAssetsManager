import { galleryPresets, getLayerTypeConfig } from './layerLoader.js'
import { renderLayers } from './layerRenderer.js'
export {renderLayers}
// 扁平化图层列表,获取所有可见图层
export const getFlatLayers = (layers) => {
  return layers.reduce((acc, layer) => {
    if (!layer.visible) return acc

    if (layer.type === 'file') {
      acc.push(layer)
    }

    if (layer.children?.length) {
      acc.push(...getFlatLayers(layer.children))
    }

    return acc
  }, [])
}

// 递归查找并更新图层
export const updateLayer = (layers, updatedLayer) => {
  for (let i = 0; i < layers.length; i++) {
    if (layers[i].id === updatedLayer.id) {
      layers[i] = updatedLayer
      return true
    }
    if (layers[i].children?.length) {
      if (updateLayer(layers[i].children, updatedLayer)) {
        return true
      }
    }
  }
  return false
}

// 递归查找并删除图层
export const removeLayer = (layers, layerId) => {
  const index = layers.findIndex(l => l.id === layerId)
  if (index !== -1) {
    layers.splice(index, 1)
    return true
  }

  for (const layer of layers) {
    if (layer.children?.length) {
      if (removeLayer(layer.children, layerId)) {
        return true
      }
    }
  }
  return false
}

// 确保每个图层都有唯一ID
export const ensureLayerIds = (layers) => {
  layers.forEach(layer => {
    if (!layer.id) {
      layer.id = Math.random().toString(36).substr(2, 9)
    }
    if (layer.children?.length) {
      ensureLayerIds(layer.children)
    }
  })
}

// 查找图层
export const findLayer = (layers, layerId) => {
  for (const layer of layers) {
    if (layer.id === layerId) {
      return layer
    }
    if (layer.children?.length) {
      const found = findLayer(layer.children, layerId)
      if (found) return found
    }
  }
  return null
}

// 获取图层的调整参数配置
export const getLayerAdjustments = (layerType) => {
  if (!layerType) return []
  
  const layerConfig = getLayerTypeConfig(layerType)
  if (!layerConfig) return []
  
  return layerConfig.adjustments || []
}

// 应用图层调整
export const applyLayerAdjustment = (layers, layerId, adjustments) => {
  const layer = findLayer(layers, layerId)
  
  if (!layer) return false

  // 更新层配置
  Object.assign(layer.config, adjustments)
  return true
}

// 添加新的加载默认图层数据的函数
export const loadDefaultLayers = async () => {
  try {
    const response = await fetch('/plugins/SACAssetsManager/source/UI/pannels/gridEditorPanel/data/defaultLayers.json')
    const defaultLayersData = await response.json()
    
    // 确保所有图层都有ID
    ensureLayerIds(defaultLayersData.layers)
    
    return defaultLayersData.layers
  } catch (error) {
    console.error('加载默认图层数据失败:', error)
    // 返回基础默认值
    return [{
      id: "content-group",
      name: "内容图层组",
      type: "folder",
      visible: true,
      locked: false,
      children: []
    }]
  }
}
