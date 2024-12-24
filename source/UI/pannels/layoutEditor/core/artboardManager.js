import Konva from '../../../../../static/konva.js'
import { ARTBOARD } from '../utils/artboardPosition.js'

// 添加图层缓存
let artboardBgLayer = null
let artboardBorderLayer = null

// 修改创建画板图层函数
export const createArtboardLayers = (stage, artboards, mainLayerRef, isArtboardMode) => {
  if (!stage || !Array.isArray(artboards)) return

  // 复用已存在的图层或创建新图层
  if (!artboardBgLayer) {
    artboardBgLayer = new Konva.Layer()
    artboardBorderLayer = new Konva.Layer()
    stage.add(artboardBgLayer)
    stage.add(mainLayerRef.value)
    stage.add(artboardBorderLayer)
  }

  // 清空现有内容
  artboardBgLayer.destroyChildren()
  artboardBorderLayer.destroyChildren()
  
  // 记录最后一个创建的画板元素
  let lastCreatedElements = null
  
  artboards.forEach((artboardData, index) => {
    const elements = createArtboardElements(
      artboardData,
      index,
      isArtboardMode,
      stage
    )
    
    artboardBgLayer.add(elements.artboardBg)
    artboardBorderLayer.add(elements.border, elements.label, elements.tr)
    
    setupArtboardEvents(
      elements.artboardBg, 
      elements.border, 
      elements.label, 
      elements.tr, 
      artboards, 
      isArtboardMode, 
      stage
    )
    
    lastCreatedElements = elements
  })
  
  // 如果处于画板工具模式，激活最后一个画板
  if (isArtboardMode && lastCreatedElements) {
    lastCreatedElements.tr.visible(true)
  }

  // 确保正确的层级顺序
  artboardBgLayer.setZIndex(0)
  mainLayerRef.value.setZIndex(1)
  artboardBorderLayer.setZIndex(2)
  
  stage.batchDraw()
}

// 创建画板元素
const createArtboardElements = (artboardData, index, isArtboardMode, stage) => {
  const artboardBg = new Konva.Rect({
    x: artboardData.x,
    y: artboardData.y,
    width: artboardData.width,
    height: artboardData.height,
    fill: 'white',
    stroke: '#ccc',
    strokeWidth: 1,
    name: `artboard-${artboardData.id}`,
    draggable: Boolean(isArtboardMode),
    id: artboardData.id
  })
  
  const border = new Konva.Rect({
    x: artboardData.x,
    y: artboardData.y,
    width: artboardData.width,
    height: artboardData.height,
    stroke: '#666',
    strokeWidth: 1,
    dash: [4, 4],
    fill: null,
    listening: false
  })
  
  const label = createArtboardLabel(artboardData, index)
  
  const tr = new Konva.Transformer({
    nodes: [artboardBg],
    visible: Boolean(isArtboardMode),
    rotateEnabled: false,
    keepRatio: false,
    boundBoxFunc: (oldBox, newBox) => {
      return newBox.width < 100 || newBox.height < 100 ? oldBox : newBox
    },
    enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right']
  })
  return { artboardBg, border, label, tr }
}

// 创建画板标签
const createArtboardLabel = (artboardData, index) => {
  const label = new Konva.Label({
    x: artboardData.x,
    y: artboardData.y - 20
  })
  
  label.add(new Konva.Tag({
    fill: '#666',
    cornerRadius: 2,
    pointerDirection: 'down',
    pointerWidth: 6,
    pointerHeight: 4,
    lineJoin: 'round'
  }))
  
  label.add(new Konva.Text({
    text: `画板 ${index + 1}`,
    fontSize: 11,
    fontFamily: 'Arial',
    fill: 'white',
    padding: 4
  }))
  
  return label
}

// 设置画板事件
const setupArtboardEvents = (artboardBg, border, label, tr, artboards, isArtboardMode, stage) => {
  if (!artboardBg || !border || !label || !tr || !Array.isArray(artboards) || !stage) return
  
  // 拖动事件
  artboardBg.on('dragmove', () => {
    if (!isArtboardMode) return
    
    const newX = artboardBg.x()
    const newY = artboardBg.y()
    
    updateArtboardPosition(border, label, newX, newY)
    updateArtboardData(artboards, artboardBg.id(), { x: newX, y: newY })
  })
  
  // 变换事件
  artboardBg.on('transform', () => {
    if (!isArtboardMode) return
    handleArtboardTransform(artboardBg, border, label, artboards)
  })
  
  // 点击事件
  artboardBg.on('click', () => {
    if (!isArtboardMode) return
    
    // 隐藏所有变换器
    stage.find('Transformer').forEach(transformer => {
      transformer.visible(false)
    })
    
    // 只显示当前画板的变换器
    tr.visible(true)
    
    // 将当前画板移到顶层
    artboardBg.moveToTop()
    border.moveToTop()
    label.moveToTop()
    tr.moveToTop()
    
    stage.batchDraw()
  })
  
  // 初始状态下隐藏变换器
  tr.visible(false)
}

// 修改导出画板函数
export const exportArtboard = async (stage, artboard) => {
  if (!stage || !artboard) return null
  
  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = artboard.width
  tempCanvas.height = artboard.height
  const ctx = tempCanvas.getContext('2d')
  
  if (!ctx) {
    throw new Error('无法创建canvas上下文')
  }

  // 设置白色背景
  ctx.fillStyle = 'white'
  ctx.fillRect(0, 0, artboard.width, artboard.height)

  // 保存当前舞台状态
  const oldScale = stage.scale()
  const oldPosition = stage.position()

  try {
    // 临时重置舞台状态以确保正确导出
    stage.scale({ x: 1, y: 1 })
    stage.position({ x: 0, y: 0 })
    stage.batchDraw()

    // 使用正确的尺寸和位置渲染舞台内容
    const dataUrl = stage.toDataURL({
      x: artboard.x,
      y: artboard.y,
      width: artboard.width,  // 使用完整的画板宽度
      height: artboard.height, // 使用完整的画板高度
      pixelRatio: 2,  // 保持2倍分辨率以确保清晰度
      mimeType: 'image/png'
    })

    // 创建临时图片并等待加载
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        // 将图片绘制到临时画布上
        ctx.drawImage(
          img,
          0, 0,
          artboard.width, artboard.height  // 确保绘制完整的画板内容
        )
        tempCanvas.toBlob(resolve, 'image/png')
      }
      img.src = dataUrl
    })
  } finally {
    // 恢复舞台状态
    stage.scale(oldScale)
    stage.position(oldPosition)
    stage.batchDraw()
  }
}

// 添加更新画板位置的辅助函数
const updateArtboardPosition = (border, label, x, y) => {
  if (!border || !label) return
  
  border.position({ x, y })
  label.position({ x, y: y - 20 })
}

// 修改更新画板数据的辅助函数
const updateArtboardData = (artboards, id, updates) => {
  if (!Array.isArray(artboards) || !id || !updates) return
  
  const artboard = artboards.find(a => a.id === id)
  if (artboard) {
    Object.assign(artboard, updates)
  }
}

// 添加处理画板变换的辅助函数
const handleArtboardTransform = (artboardBg, border, label, artboards) => {
  if (!artboardBg || !border || !label || !Array.isArray(artboards)) return
  
  const newAttrs = {
    x: artboardBg.x(),
    y: artboardBg.y(),
    width: artboardBg.width() * artboardBg.scaleX(),
    height: artboardBg.height() * artboardBg.scaleY()
  }
  
  artboardBg.setAttrs({
    ...newAttrs,
    scaleX: 1,
    scaleY: 1
  })
  
  border.setAttrs(newAttrs)
  label.position({
    x: newAttrs.x,
    y: newAttrs.y - 20
  })
  
  updateArtboardData(artboards, artboardBg.id(), newAttrs)
}

// 新增纯函数用于画板数据操作
export const createNewArtboard = (artboards, name) => {
  const position = findAvailablePosition(artboards)
  return {
    id: `artboard-${Date.now()}`,
    name: name || `画板 ${artboards.length + 1}`,
    x: position.x,
    y: position.y,
    width: ARTBOARD.WIDTH,
    height: ARTBOARD.HEIGHT
  }
}

export const updateArtboardById = (artboards, id, updates) => {
  const index = artboards.findIndex(a => a.id === id)
  if (index === -1) return false
  
  artboards[index] = {
    ...artboards[index],
    ...updates
  }
  return true
}

export const removeArtboard = (artboards, id) => {
  if (artboards.length <= 1) return false
  const index = artboards.findIndex(a => a.id === id)
  if (index === -1) return false
  
  artboards.splice(index, 1)
  return true
}

// 添加位置计算辅助函数
const findAvailablePosition = (artboards) => {
  let x = 100
  let y = 100
  let found = false

  while (!found) {
    let hasOverlap = false
    for (const artboard of artboards) {
      const margin = 20
      if (
        x < artboard.x + artboard.width + margin &&
        x + ARTBOARD.WIDTH + margin > artboard.x &&
        y < artboard.y + artboard.height + margin &&
        y + ARTBOARD.HEIGHT + margin > artboard.y
      ) {
        hasOverlap = true
        break
      }
    }

    if (!hasOverlap) {
      found = true
    } else {
      x += 50
      if (x > 1000) {
        x = 100
        y += 50
      }
    }
  }

  return { x, y }
}

export {
  createArtboardElements,
  setupArtboardEvents,
  createArtboardLabel,
  // ... 其他辅助函数保持不变
}

