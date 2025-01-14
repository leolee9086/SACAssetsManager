import {ref} from '../../../../../static/vue.esm-browser.js'
import { createImageStack } from '../ImageStack.js'
import { DarkChannelDehaze } from '../../../../../source/wgslLibs/DarkChannelDehaze.js'

export function useImagePipeline() {
  const imageStack = ref(null)
  const currentCTX = ref(null)
  const processingSteps = ref([])
  const hasImage = ref(false)
  const hasResult = ref(false)
  const resultCTX = ref(null)
  const imageLoadDuration = ref(0)

  // 创建处理步骤
  const createProcessingStep = (name, processor, params = []) => {
    // 初始化参数默认值
    const paramValues = {}
    params.forEach(param => {
      paramValues[param.name] = param.default
    })

    return {
      name,
      processor,
      params,
      paramValues, // 使用初始化的默认值
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
      createProcessingStep('暗通道去雾', async (ctx, params, step) => {
        const dehazer = new DarkChannelDehaze();
        
        // 从参数中获取设置
        const omega = params.omega || 0.5;
        const airlight = params.airlight || '#ffffff';
        
        // 将十六进制颜色转换为 RGB 数组
        const hex2rgb = (hex) => {
          const r = parseInt(hex.slice(1, 3), 16) / 255;
          const g = parseInt(hex.slice(3, 5), 16) / 255;
          const b = parseInt(hex.slice(5, 7), 16) / 255;
          return [r, g, b];
        };

        // 设置参数
        dehazer.params = {
          atmosphere: hex2rgb(airlight),
          beta: omega
        };

        // 创建临时画布用于处理
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = ctx.width;
        tempCanvas.height = ctx.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        // 创建 ImageData 并填充像素数据
        const imageData = new ImageData(
          new Uint8ClampedArray(ctx.pixels),
          ctx.width,
          ctx.height
        );
        tempCtx.putImageData(imageData, 0, 0);

        // 处理图像并获取调试信息
        const result = await dehazer.process(tempCanvas);
        if(dehazer.getDebugInfo){
          const debugInfo = dehazer.getDebugInfo();
          // 存储调试信息到步骤中
          step.debugInfo = {
            darkChannel: debugInfo.darkChannel,
            transmission: debugInfo.transmission,
            edges: debugInfo.edges,
            features: debugInfo.features,
            atmosphericLight: debugInfo.atmosphericLight
          };
  
        }
        
        // 获取处理后的图像数据
        const resultCtx = result.getContext('2d');
        const resultData = resultCtx.getImageData(0, 0, ctx.width, ctx.height);
        
        // 更新原始 ImageCTX 的像素数据
        ctx.pixels.set(resultData.data);
        
        return ctx;
      }, [
        { 
          name: 'omega', 
          label: '去雾强度', 
          type: 'range', 
          min: 0.1, // 修改最小值为 0.1
          max: 1, 
          default: 0.5, 
          step: 0.1 
        },
        { 
          name: 'airlight', 
          label: '大气光照', 
          type: 'color', 
          default: '#ffffff' 
        }
      ]),

    /*  createProcessingStep('灰度处理', async (ctx) => {
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
      }),*/
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
        step.debugInfo = null
      })

      // 逐步处理
      for await (const step of processingSteps.value) {
        const startTime = Date.now()
        
        // 传入参数到处理器，同时传入 step 对象
        await step.processor(currentContext, step.paramValues, step)
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