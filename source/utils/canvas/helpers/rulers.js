export const drawRulers = (params) => {
    const {
      isRepeat,
      horizontalRulerRef,
      verticalRulerRef,
      containerRef,
      realSize,
      uvScale,
      imageAspectRatio
    } = params
  
    if (!isRepeat) return
  
    const pixelsPerMeter = 100
  
    // 绘制水平标尺
    const drawHorizontalRuler = () => {
      const hCtx = horizontalRulerRef.getContext('2d')
      const hCanvas = horizontalRulerRef
      hCanvas.width = containerRef.clientWidth
      hCanvas.height = 30
      
      // 填充背景
      hCtx.fillStyle = '#2c2c2c'
      hCtx.fillRect(0, 0, hCanvas.width, hCanvas.height)
      
      // 设置刻度样式
      hCtx.strokeStyle = '#fff'
      hCtx.fillStyle = '#fff'
      hCtx.font = '10px Arial'
      hCtx.textAlign = 'center'
      
      const totalWidth = containerRef.clientWidth / pixelsPerMeter
      for (let i = 0; i <= totalWidth; i += 0.5) {
        const x = i * pixelsPerMeter
        const height = i % 1 === 0 ? 15 : 10
        
        hCtx.beginPath()
        hCtx.moveTo(x, hCanvas.height)
        hCtx.lineTo(x, hCanvas.height - height)
        hCtx.stroke()
        
        if (i % 1 === 0) {
          hCtx.fillText(`${i}m`, x, hCanvas.height - 18)
        }
      }
    }
  
    // 绘制垂直标尺
    const drawVerticalRuler = () => {
      const vCtx = verticalRulerRef.getContext('2d')
      const vCanvas = verticalRulerRef
      vCanvas.width = 30
      vCanvas.height = containerRef.clientHeight
      
      // 填充背景
      vCtx.fillStyle = '#2c2c2c'
      vCtx.fillRect(0, 0, vCanvas.width, vCanvas.height)
      
      // 设置刻度样式
      vCtx.strokeStyle = '#fff'
      vCtx.fillStyle = '#fff'
      vCtx.font = '10px Arial'
      vCtx.textAlign = 'right'
      
      const totalHeight = containerRef.clientHeight / pixelsPerMeter
      for (let i = 0; i <= totalHeight; i += 0.5) {
        const y = i * pixelsPerMeter
        const width = i % 1 === 0 ? 15 : 10
        
        vCtx.beginPath()
        vCtx.moveTo(vCanvas.width, y)
        vCtx.lineTo(vCanvas.width - width, y)
        vCtx.stroke()
        
        if (i % 1 === 0) {
          vCtx.save()
          vCtx.translate(vCanvas.width - 18, y)
          vCtx.rotate(-Math.PI / 2)
          vCtx.fillText(`${i}m`, 0, 0)
          vCtx.restore()
        }
      }
    }
  
    drawHorizontalRuler()
    drawVerticalRuler()
  }
  