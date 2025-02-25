/**
 * P3M1计算器 - 处理P3M1对称群的所有计算逻辑
 * 使用工厂函数模式创建计算器
 * @returns {Object} 包含各种计算方法的对象
 */
export function createP3M1Calculator() {
  /**
   * 计算三角形中心
   * @param {Array} trianglePoints - 三角形的三个顶点
   * @returns {Object} 中心点坐标
   */
  const calculateTriangleCenter = (trianglePoints) => {
    const [A, B, C] = trianglePoints
    return {
      x: (A.x + B.x + C.x) / 3,
      y: (A.y + B.y + C.y) / 3
    }
  }
  
  /**
   * 计算点关于线的镜像
   * @param {Object} point - 点坐标
   * @param {Object} lineStart - 线的起点
   * @param {Object} lineEnd - 线的终点
   * @returns {Object} 镜像点坐标
   */
  const mirrorPointOverLine = (point, lineStart, lineEnd) => {
    // 计算线的向量
    const dx = lineEnd.x - lineStart.x
    const dy = lineEnd.y - lineStart.y
    
    // 计算线的长度的平方
    const lineLengthSq = dx * dx + dy * dy
    
    // 计算点到线的投影比例
    const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lineLengthSq
    
    // 计算投影点
    const projX = lineStart.x + t * dx
    const projY = lineStart.y + t * dy
    
    // 计算镜像点
    return {
      x: 2 * projX - point.x,
      y: 2 * projY - point.y
    }
  }
  
  /**
   * 应用旋转对称
   * @param {Object} line - 原始线条
   * @param {Array} trianglePoints - 三角形的三个顶点
   * @param {Object} currentDrawingOptions - 当前绘制选项
   * @returns {Array} 旋转对称后的线条数组
   */
  const applyRotationalSymmetry = (line, trianglePoints, currentDrawingOptions) => {
    const rotatedLines = []
    const center = calculateTriangleCenter(trianglePoints)
    
    // 创建120度和240度旋转的线条
    for (let angle = 120; angle < 360; angle += 120) {
      const rotatedPoints = []
      
      for (let i = 0; i < line.points.length; i += 2) {
        const x = line.points[i]
        const y = line.points[i + 1]
        
        // 旋转变换
        const radians = (angle * Math.PI) / 180
        const dx = x - center.x
        const dy = y - center.y
        
        const newX = center.x + dx * Math.cos(radians) - dy * Math.sin(radians)
        const newY = center.y + dx * Math.sin(radians) + dy * Math.cos(radians)
        
        rotatedPoints.push(newX, newY)
      }
      
      rotatedLines.push({
        id: `rot-${angle}-${line.id}`,
        points: rotatedPoints,
        stroke: currentDrawingOptions?.stroke || line.stroke,
        strokeWidth: currentDrawingOptions?.strokeWidth || line.strokeWidth,
        opacity: 0.7
      })
    }
    
    return rotatedLines
  }
  
  /**
   * 应用镜像对称
   * @param {Object} line - 原始线条
   * @param {Array} trianglePoints - 三角形的三个顶点
   * @param {Object} currentDrawingOptions - 当前绘制选项
   * @returns {Array} 镜像对称后的线条数组
   */
  const applyMirrorSymmetry = (line, trianglePoints, currentDrawingOptions) => {
    const mirroredLines = []
    const [A, B, C] = trianglePoints
    
    // 对每条边进行镜像
    const edges = [
      { p1: A, p2: B },
      { p1: B, p2: C },
      { p1: C, p2: A }
    ]
    
    edges.forEach((edge, index) => {
      const mirroredPoints = []
      
      for (let i = 0; i < line.points.length; i += 2) {
        const x = line.points[i]
        const y = line.points[i + 1]
        
        // 计算点关于线的镜像
        const mirroredPoint = mirrorPointOverLine(
          { x, y },
          edge.p1,
          edge.p2
        )
        
        mirroredPoints.push(mirroredPoint.x, mirroredPoint.y)
      }
      
      mirroredLines.push({
        id: `mirror-${index}-${line.id}`,
        points: mirroredPoints,
        stroke: currentDrawingOptions?.stroke || line.stroke,
        strokeWidth: currentDrawingOptions?.strokeWidth || line.strokeWidth,
        opacity: 0.7
      })
    })
    
    return mirroredLines
  }
  
  /**
   * 应用平移对称
   * @param {Object} line - 原始线条
   * @param {Array} trianglePoints - 三角形的三个顶点
   * @param {Object} currentDrawingOptions - 当前绘制选项
   * @returns {Array} 平移对称后的线条数组
   */
  const applyTranslationalSymmetry = (line, trianglePoints, currentDrawingOptions) => {
    const translatedLines = []
    
    // 计算基本平移向量
    const [A, B, C] = trianglePoints
    const vectors = [
      { dx: B.x - A.x, dy: B.y - A.y },
      { dx: C.x - B.x, dy: C.y - B.y },
      { dx: A.x - C.x, dy: A.y - C.y }
    ]
    
    // 应用平移 (简单实现，只平移一次)
    vectors.forEach((vector, index) => {
      const translatedPoints = []
      
      for (let i = 0; i < line.points.length; i += 2) {
        const x = line.points[i]
        const y = line.points[i + 1]
        
        translatedPoints.push(x + vector.dx, y + vector.dy)
      }
      
      translatedLines.push({
        id: `trans-${index}-${line.id}`,
        points: translatedPoints,
        stroke: currentDrawingOptions?.stroke || line.stroke,
        strokeWidth: currentDrawingOptions?.strokeWidth || line.strokeWidth,
        opacity: 0.7
      })
      
      // 可以添加更多平移，如平移两次、三次等
    })
    
    return translatedLines
  }
  
  /**
   * 计算网格线
   * @param {Array} trianglePoints - 三角形的三个顶点
   * @returns {Array} 网格线数组
   */
  const calculateGridLines = (trianglePoints) => {
    const lines = []
    
    // 添加三角形边界
    lines.push({
      id: 'triangle',
      points: [
        ...trianglePoints.map(p => [p.x, p.y]).flat(),
        trianglePoints[0].x, trianglePoints[0].y // 闭合
      ],
      stroke: '#ddd',
      strokeWidth: 1
    })
    
    // 添加三角形中心点标记
    const center = calculateTriangleCenter(trianglePoints)
    lines.push({
      id: 'center-marker',
      points: [
        center.x - 5, center.y - 5,
        center.x + 5, center.y + 5,
        center.x - 5, center.y + 5,
        center.x + 5, center.y - 5
      ],
      stroke: '#aaa',
      strokeWidth: 1,
      closed: true
    })
    
    // 可以添加更多网格线，如辅助线、坐标轴等
    
    return lines
  }
  
  /**
   * 计算对称线条
   * @param {Array} lines - 原始线条
   * @param {Array} trianglePoints - 三角形的三个顶点
   * @param {Object} options - 对称选项
   * @param {Object} currentDrawingOptions - 当前绘制选项
   * @returns {Array} 对称线条数组
   */
  const calculateSymmetricLines = (lines, trianglePoints, options, currentDrawingOptions) => {
    let symmetricLines = []
    
    lines.forEach(line => {
      // 应用旋转对称
      if (options.showRotationalSymmetry) {
        symmetricLines = symmetricLines.concat(
          applyRotationalSymmetry(line, trianglePoints, currentDrawingOptions)
        )
      }
      
      // 应用镜像对称
      if (options.showMirrorSymmetry) {
        symmetricLines = symmetricLines.concat(
          applyMirrorSymmetry(line, trianglePoints, currentDrawingOptions)
        )
      }
      
      // 应用平移对称
      if (options.showTranslationalSymmetry) {
        symmetricLines = symmetricLines.concat(
          applyTranslationalSymmetry(line, trianglePoints, currentDrawingOptions)
        )
      }
    })
    
    return symmetricLines
  }
  
  // 返回包含所有计算方法的对象
  return {
    calculateGridLines,
    calculateSymmetricLines,
    calculateTriangleCenter,
    applyRotationalSymmetry,
    applyMirrorSymmetry,
    applyTranslationalSymmetry,
    mirrorPointOverLine
  }
}

// 为了方便使用，也可以导出一个默认实例
export const p3m1Calculator = createP3M1Calculator() 