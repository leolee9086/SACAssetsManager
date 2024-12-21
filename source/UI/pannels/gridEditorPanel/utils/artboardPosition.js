// 画板常量
export const ARTBOARD = {
  WIDTH: 595,  // A4 宽度
  HEIGHT: 842, // A4 高度
  PADDING: 50  // 画板周围的内边距
}

// 获取画板位置
export const getArtboardPosition = (containerWidth, containerHeight) => {
  return {
    x: Math.max(ARTBOARD.PADDING, (containerWidth - ARTBOARD.WIDTH) / 2),
    y: Math.max(ARTBOARD.PADDING, (containerHeight - ARTBOARD.HEIGHT) / 2)
  }
}

// 获取画板世界坐标位置
export const getArtboardWorldPosition = (stage) => {
  if (!stage) return { x: 0, y: 0 }
  
  const pos = getArtboardPosition(stage.width(), stage.height())
  return {
    x: pos.x * stage.scaleX() + stage.x(),
    y: pos.y * stage.scaleY() + stage.y()
  }
} 