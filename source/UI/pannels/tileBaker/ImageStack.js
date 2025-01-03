import { createTypedStack } from './stack.js'
import { ImageState } from './ImageCTX.js'

/**
 * 图像上下文验证
 */
const isValidImageContext = (ctx) => {
  return ctx && 
         typeof ctx.width === 'number' && 
         typeof ctx.height === 'number' &&
         ctx.pixels instanceof Uint8ClampedArray &&
         ctx.state instanceof ImageState
}

/**
 * 创建图像处理器
 */
const createImageProcessor = (fn, name, metadata = {}) => {
  const processor = async (ctx) => {
    try {
      const newCTX = ctx.clone()
      await fn(newCTX)
      newCTX.state.addHistoryStep({
        name,
        timestamp: Date.now(),
        metadata
      })
      return newCTX
    } catch (error) {
      console.error(`处理器 ${name} 执行失败:`, error)
      throw error
    }
  }
  
  return { 
    processor,
    metadata: {
      ...metadata,
      name
    }
  }
}

// 创建图像处理堆栈
const createImageStack = () => {
  const registry = new Map()
  
  const stack = createTypedStack('image', {
    validators: {
      context: isValidImageContext
    },
    processorRegistry: registry
  })

  // 添加图像特定的静态方法
  stack.registerProcessor = (name, processorFn, metadata = {}) => {
    registry.set(name, createImageProcessor(processorFn, name, metadata))
  }

  stack.getProcessor = (name) => {
    const entry = registry.get(name)
    if (!entry) throw new Error(`未知的处理器: ${name}`)
    return entry
  }

  return stack
}

export { createImageStack }
