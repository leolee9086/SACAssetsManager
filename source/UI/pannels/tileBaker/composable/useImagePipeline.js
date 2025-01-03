import {ref} from '../../../../../static/vue.esm-browser.js'
import { createImageStack } from '../ImageStack.js'

export function useImagePipeline() {
  const imageStack = ref(null)
  const currentCTX = ref(null)
  const processingSteps = ref([])
  const hasImage = ref(false)
  const hasResult = ref(false)
  const resultCTX = ref(null)
  const imageLoadDuration = ref(0)

  // 创建处理步骤
  const createProcessingStep = (name, processor) => {
    return {
      name,
      processor,
      ctx: null,
      duration: 0,
      processed: false
    }
  }

  // 初始化处理管线
  const initializePipeline = () => {
    imageStack.value = createImageStack()

    // 注册处理器并创建预览步骤
    const steps = [
      createProcessingStep('灰度处理', async (ctx) => {
        const { pixels } = ctx
        for (let i = 0; i < pixels.length; i += 4) {
          const avg = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3
          pixels[i] = avg
          pixels[i + 1] = avg
          pixels[i + 2] = avg
        }
        return ctx
      }),
      createProcessingStep('反相', async (ctx) => {
        const { pixels } = ctx
        for (let i = 0; i < pixels.length; i += 4) {
          pixels[i] = 255 - pixels[i]
          pixels[i + 1] = 255 - pixels[i + 1]
          pixels[i + 2] = 255 - pixels[i + 2]
        }
        return ctx
      })
    ]

    // 注册处理器
    steps.forEach(step => {
      imageStack.value.registerProcessor(step.name, step.processor)
    })

    processingSteps.value = steps
  }

  // 执行处理管线
  const executePipeline = async () => {
    if (!currentCTX.value || !imageStack.value) return

    try {
      const pipelineStartTime = Date.now()
      let currentContext = currentCTX.value.clone()
      hasResult.value = false

      // 重置所有步骤状态
      processingSteps.value.forEach(step => {
        step.processed = false
        step.duration = 0
        step.ctx = null
      })

      // 逐步处理
      for await (const step of processingSteps.value) {
        const startTime = Date.now()
        
        await step.processor(currentContext)
        step.ctx = currentContext.clone()
        step.duration = Date.now() - startTime
        step.processed = true
        
        currentContext = currentContext.clone()
      }
      console.log(currentContext)
      // 保存最终结果和处理时间
      resultCTX.value = currentContext
      imageLoadDuration.value = Date.now() - pipelineStartTime
      hasResult.value = true

      return resultCTX.value
    } catch (error) {
      console.error('处理失败:', error)
      throw error
    }
  }

  return {
    currentCTX,
    processingSteps,
    hasImage,
    hasResult,
    resultCTX,
    imageLoadDuration,
    initializePipeline,
    executePipeline
  }
}