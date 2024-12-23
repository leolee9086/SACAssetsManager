import { getLayerTypeConfig } from './layerLoader.js'
import Konva from '../../../../../static/konva.js'

const getFlatLayers = (layers) => {
    return layers.reduce((acc, layer) => {
      if (!layer.visible) return acc
  
      if (layer.children?.length) {
        // 先处理子元素
        acc.push(...getFlatLayers(layer.children))
      }
      
      // 再处理当前层
      if (layer.type === 'file') {
        acc.push(layer)
      }
  
      return acc
    }, [])
}
  
// 创建防抖函数
const debounce = (fn, delay) => {
  let timer = null
  return function (...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(this, args)
    }, delay)
  }
}

// 渲染图层到舞台
export const renderLayers = (() => {
  let bufferLayer = null
  let mainLayer = null
  
  const renderLayersImpl = async (
    layers, 
    targetLayer, 
    layerRegistry, 
    stage, 
    handleShapeClick,
    artboards = [],
    isArtboardMode = false
  ) => {
    const totalStartTime = performance.now()
    
    // 打印图层结构
    console.group('当前图层结构:')
    const printLayerStructure = (layers, depth = 0) => {
      layers.forEach(layer => {
        const indent = '  '.repeat(depth)
        const visibility = layer.visible ? '👁️' : '❌'
        console.log(`${indent}${visibility} ${layer.layerType || 'group'}: ${layer.id}${layer.name ? ` (${layer.name})` : ''}`)
        if (layer.children?.length) {
          printLayerStructure(layer.children, depth + 1)
        }
      })
    }
    printLayerStructure(layers)
    console.groupEnd()

    // 初始化缓冲层
    if (!bufferLayer) {
      mainLayer = targetLayer
      bufferLayer = new Konva.Layer()
      stage.add(bufferLayer)
      bufferLayer.hide()
    }

    // 清空缓冲层
    bufferLayer.destroyChildren()
    layerRegistry.clear()
    // 渲染内容层
    const flatLayers = getFlatLayers(layers)
    for (const layer of flatLayers) {
      await renderSingleLayer(layer, bufferLayer, layerRegistry, stage, handleShapeClick)
    }
    // 交换缓冲层时保持层级关系
    const mainLayerIndex = mainLayer.getZIndex()
    bufferLayer.show()
    mainLayer.hide()
    const temp = mainLayer
    mainLayer = bufferLayer
    bufferLayer = temp

    // 确保维持原有的层级关系
    mainLayer.setZIndex(mainLayerIndex)
    stage.batchDraw()

    console.log(`总渲染耗时: ${(performance.now() - totalStartTime).toFixed(2)}ms`)
  }

  return debounce(renderLayersImpl, 15)
})()

// 渲染单个图层
const renderSingleLayer = async (layer, mainLayer, layerRegistry, stage, handleShapeClick) => {
  const layerStartTime = performance.now()
  const layerConfig = getLayerTypeConfig(layer.layerType)
  if (!layerConfig?.render) return

  const existingLayer = layerRegistry.get(layer.id)
  
  if (existingLayer && JSON.stringify(existingLayer.config) === JSON.stringify(layer.config)) {
    console.log(`图层 ${layer.id} 无需更新，跳过渲染`)
    return
  }

  try {
    // 渲染新节点
    const renderStartTime = performance.now()
    const newShapes = await Promise.resolve(layerConfig.render(layer.config, layer.id, stage, handleShapeClick))
    const renderTime = performance.now() - renderStartTime
    
    // 删除旧节点
    if (existingLayer) {
      const destroyStartTime = performance.now()
      existingLayer.shapes.forEach(shape => shape.destroy())
      console.log(`删除旧节点耗时: ${(performance.now() - destroyStartTime).toFixed(2)}ms`)
    }

    // 添加新节点
    const addStartTime = performance.now()
    if (Array.isArray(newShapes)) {
      newShapes.forEach((shape, index) => {
        mainLayer.add(shape)
        shape.setZIndex(layer.zIndex || index)
        addTransformListeners(shape, layer, newShapes)
      })
      layerRegistry.set(layer.id, {
        shapes: newShapes,
        config: layer.config,
        type: layer.layerType
      })
    } else if (newShapes) {
      mainLayer.add(newShapes)
      newShapes.setZIndex(layer.zIndex || 0)
      addTransformListeners(newShapes, layer, [newShapes])
      layerRegistry.set(layer.id, {
        shapes: [newShapes],
        config: layer.config,
        type: layer.layerType
      })
    }
    console.log(`添加新节点耗时: ${(performance.now() - addStartTime).toFixed(2)}ms`)
    
    const totalLayerTime = performance.now() - layerStartTime
    console.log(`图层 ${layer.id} (${layer.layerType}) 总耗时: ${totalLayerTime.toFixed(2)}ms`)
    console.log(`  - 渲染耗时: ${renderTime.toFixed(2)}ms`)
    
  } catch (error) {
    console.error(`渲染图层 ${layer.id} 失败:`, error)
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

    // 如果是文本图层,还需要步文本内容
    if (layer.layerType === 'text' && newAttrs.text) {
      layer.config.text = newAttrs.text
    }
    // 通知 Konva 更新画布
    shape.getStage()?.batchDraw()
  })
} 