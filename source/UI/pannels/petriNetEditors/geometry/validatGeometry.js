export const validateSize = (size) => {
    const defaultSize = { width: 280, height: 160 }
    const minSize = { width: 232, height: 132 }
    if (!size) {
      console.warn('[CardContainer] 尺寸信息缺失，使用默认值:', defaultSize)
      return defaultSize
    }
    const errors = []
    if (typeof size.width !== 'number') {
      errors.push(`宽度无效，应为数字类型，当前值: ${size.width}`)
    } else if (size.width < minSize.width) {
      errors.push(`宽度小于最小值 ${minSize.width}px，当前值: ${size.width}px`)
    }
    if (typeof size.height !== 'number') {
      errors.push(`高度无效，应为数字类型，当前值: ${size.height}`)
    } else if (size.height < minSize.height) {
      errors.push(`高度小于最小值 ${minSize.height}px，当前值: ${size.height}px`)
    }
    if (errors.length > 0) {
      console.warn('[CardContainer] 尺寸验证失败：\n', errors.join('\n'), '\n使用默认值:', defaultSize)
      return defaultSize
    }
    return {
      width: Math.max(minSize.width, size.width),
      height: Math.max(minSize.height, size.height)
    }
  }



// 添加位置和尺寸的验证函数
export const validatePosition = (pos) => {
  const defaultPos = { x: 20, y: 20 }
  if (!pos) {
    console.warn('[CardContainer] 位置信息缺失，使用默认值:', defaultPos)
    return defaultPos
  }
  if (typeof pos.x !== 'number') {
    console.warn('[CardContainer] x坐标无效，应为数字类型，当前值:', pos.x)
    return { ...defaultPos, y: pos.y }
  }
  if (typeof pos.y !== 'number') {
    console.warn('[CardContainer] y坐标无效，应为数字类型，当前值:', pos.y)
    return { ...defaultPos, x: pos.x }
  }
  return { x: pos.x, y: pos.y }
}