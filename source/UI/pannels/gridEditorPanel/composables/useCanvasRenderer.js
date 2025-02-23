import { ref } from '../../../../../static/vue.esm-browser.js'
import { createPattern } from '../patterns.js'
import { createPerfStats, updatePerfStats } from '../performanceState.js'
import { 创建遮罩画布元素 } from '../utils.js'
import { hasRectangularUnit, getRectangularUnit } from '../../../../utils/image/textures/pattern/recUnit.js'
import {drawImageWithConfig} from '../../../../utils/canvas/draw/simpleDraw/images.js'
import { 在画布上下文批量绘制线条 } from '../../../../utils/canvas/draw/simpleDraw/lines.js'

export function useCanvasRenderer() {
  const width = ref(300)
  const height = ref(300)
  const renderer = ref(null)
  const canvas = ref(null)

  // 离屏缓冲相关
  let backBufferCanvas = null
  let backBufferCtx = null

  const initializeBuffers = () => {
    if (!backBufferCanvas) {
      backBufferCanvas = document.createElement('canvas')
      backBufferCtx = backBufferCanvas.getContext('2d')
      backBufferCtx.clearRect(0, 0, width.value, height.value)
    }
    backBufferCanvas.width = width.value
    backBufferCanvas.height = height.value
  }

  // 核心渲染函数
  const genGridStyle = (() => {
    const state = {
      isRendering: false,
      lastRenderTime: 0,
      pendingRender: null
    }
    const THROTTLE_INTERVAL = 15
    const perfStats = createPerfStats()

    // 核心渲染逻辑
    const executeRender = async (patternConfig) => {
      const startTime = performance.now()
      perfStats.totalCalls++
      try {
        initializeBuffers()
        console.log(patternConfig)
        const pattern = await createPattern({
          symmetryType: patternConfig.symmetryType,
          basis1: patternConfig.basis1,
          basis2: patternConfig.basis2,
          processedNodeImage: await patternConfig.processedNodeImage,
          nodeTransform: patternConfig.nodeTransform,
          fillImageUrl: patternConfig.fillImageUrl,
          fillTransform: patternConfig.fillTransform,
          lineColor: patternConfig.lineColor,
          lineWidth: patternConfig.lineWidth
        })
        await renderToBuffer(pattern)
        await updateMainCanvas()
        await drawSeamlessUnitBox(patternConfig)
      } finally {
        updatePerfStats(perfStats, performance.now() - startTime)
      }
    }

    // 渲染到缓冲区
    const renderToBuffer = async (pattern) => {

      const result = pattern.render(backBufferCtx, {
        width: width.value,
        height: height.value,
        x: width.value / 2,
        y: height.value / 2,
      })
      if(!result){
        console.error('图案计算器无结果')
        return
      }
      const { imageConfigs, lineConfigs }=result
      backBufferCtx.save();
      backBufferCtx.translate(width.value / 2, height.value / 2 );
      if (imageConfigs) {
        for (const { position, lattice, imageConfig, shouldClip, image } of imageConfigs) {
          backBufferCtx.save();
          backBufferCtx.translate(position.x, position.y);
          drawImageWithConfig(
            backBufferCtx,
            image,
            lattice,
            imageConfig,
            shouldClip // 该参数在节点生成器中会自动为undefined

          );
          backBufferCtx.restore();
        }
      }
      if(lineConfigs){
        在画布上下文批量绘制线条(backBufferCtx, lineConfigs)
      }
      backBufferCtx.restore();
    }
    // 更新主画布
    const updateMainCanvas = async () => {
      if (!renderer.value) {
        renderer.value = {
          canvas: canvas.value,
          ctx: canvas.value.getContext('2d')
        }
      }
      renderer.value.canvas.width = width.value
      renderer.value.canvas.height = height.value
      renderer.value.ctx.clearRect(0, 0, width.value, height.value)
      renderer.value.ctx.drawImage(backBufferCanvas, 0, 0)
    }

    // 节流处理
    return async (patternConfig) => {
      if (state.isRendering) {
        state.pendingRender = true
        return
      }

      const now = Date.now()
      const timeSinceLastRender = now - state.lastRenderTime

      if (timeSinceLastRender < THROTTLE_INTERVAL) {
        if (!state.pendingRender) {
          state.pendingRender = true
          setTimeout(async () => {
            state.pendingRender = false
            state.isRendering = true
            try {
              await executeRender(patternConfig)
            } finally {
              state.isRendering = false
              state.lastRenderTime = Date.now()
            }
          }, THROTTLE_INTERVAL - timeSinceLastRender)
        }
        return
      }

      state.isRendering = true
      try {
        await executeRender(patternConfig)
      } finally {
        state.isRendering = false
        state.lastRenderTime = Date.now()
      }
    }
  })()

  const drawSeamlessUnitBox = (patternConfig) => {
    if (!canvas.value) return

    // 移除旧的覆盖层
    const oldOverlay = canvas.value.parentElement.querySelector('.overlay-canvas')
    if (oldOverlay) {
      oldOverlay.remove()
    }

    // 将对称群类型转换为小写
    const wallpaperGroup = patternConfig.symmetryType.toLowerCase()
    const hasRect = hasRectangularUnit(
      patternConfig.basis1,
      patternConfig.basis2,
      wallpaperGroup
    )

    if (!hasRect) return

    // 获取矩形重复单元的尺寸和变换信息
    const rectUnit = getRectangularUnit(
      patternConfig.basis1,
      patternConfig.basis2,
      wallpaperGroup
    )
    if (!rectUnit) return

    // 创建覆盖层
    const overlayCanvas = 创建遮罩画布元素(width.value, height.value)
    const ctx = overlayCanvas.getContext('2d')
    ctx.translate(width.value / 2, height.value / 2)

    // 应用变换并绘制矩形重复单元边界
    ctx.save()
    ctx.rotate(rectUnit.transform.rotation)
    ctx.setLineDash([5, 5])
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)'
    ctx.lineWidth = 3

    // 绘制矩形边界
    ctx.beginPath()
    ctx.rect(
      rectUnit.transform.origin.x,
      rectUnit.transform.origin.y,
      rectUnit.width,
      rectUnit.height
    )
    ctx.stroke()
    ctx.restore()

    // 添加新的覆盖层
    canvas.value.parentElement.appendChild(overlayCanvas)
  }

  const handleResize = () => {
    if (canvas.value) {
      const container = canvas.value.parentElement
      width.value = container.clientWidth
      height.value = container.clientHeight
    }
  }

  return {
    width,
    height,
    canvas,
    renderer,
    genGridStyle,
    drawSeamlessUnitBox,
    handleResize
  }
} 