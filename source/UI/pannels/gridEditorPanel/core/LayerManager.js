import { galleryPresets, getLayerTypeConfig } from './layerLoader.js'

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

// 渲染图层到舞台
export const renderLayers = (layers, mainLayer, layerRegistry, stage, handleShapeClick) => {
  if (!mainLayer) return

  // 清空现有内容和注册表
  mainLayer.destroyChildren()
  layerRegistry.clear()

  // 获取扁平化的图层
  const flatLayers = getFlatLayers(layers)

  // 确保底色矩形在内容图层最底部渲染
  const bgLayer = flatLayers.find(layer => layer.id === 'bg-color')
  const contentLayers = flatLayers.filter(layer => layer.id !== 'bg-color')

  // 先渲染底色矩形
  if (bgLayer) {
    renderSingleLayer(bgLayer, mainLayer, layerRegistry, stage, handleShapeClick)
  }

  // 再渲染其他内容图层
  contentLayers.forEach(layer => {
    renderSingleLayer(layer, mainLayer, layerRegistry, stage, handleShapeClick)
  })

  mainLayer.batchDraw()
}

// 渲染单个图层
const renderSingleLayer = (layer, mainLayer, layerRegistry, stage, handleShapeClick) => {
  const layerConfig = getLayerTypeConfig(layer.layerType)
  if (!layerConfig?.render) return

  const shapes = layerConfig.render(layer.config, layer.id, stage, handleShapeClick)
  
  if (Array.isArray(shapes)) {
    shapes.forEach(shape => {
      mainLayer.add(shape)
      addTransformListeners(shape, layer, shapes)
    })
    layerRegistry.set(layer.id, {
      shapes,
      config: layer.config,
      type: layer.layerType
    })
  } else {
    mainLayer.add(shapes)
    addTransformListeners(shapes, layer, [shapes])
    layerRegistry.set(layer.id, {
      shapes: [shapes],
      config: layer.config,
      type: layer.layerType
    })
  }
}

// 添加形状变换监听器
const addTransformListeners = (shape, layer, shapes) => {
  // 排除 Transformer 对象
  if (shape.getClassName() === 'Transformer') return

  // 监听拖拽和变换结束事件
  shape.on('dragend transformend', () => {
    // 获取形状的新属性
    const newAttrs = shape.getAttrs()
    
    // 更新图层配置
    Object.assign(layer.config, {
      x: newAttrs.x,
      y: newAttrs.y,
      width: newAttrs.width,
      height: newAttrs.height,
      rotation: newAttrs.rotation,
      scaleX: newAttrs.scaleX,
      scaleY: newAttrs.scaleY
    })

    // 如果是文本图层,还需要同步文本内容
    if (layer.layerType === 'text' && newAttrs.text) {
      layer.config.text = newAttrs.text
    }

    // 通知 Konva 更新画布
    shape.getStage()?.batchDraw()
  })
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

  // 更新图层配置
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
